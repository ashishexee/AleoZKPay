const supabase = require('../config/supabase');
const {
    getNotificationRecipients,
    recordNotificationDelivery,
    normalizePaymentTxIds,
    deriveInvoiceAmount
} = require('../services/telegram.service');
const {
    buildInvoiceDetailsUrl,
    buildTransactionExplorerUrl,
    shortHash
} = require('../utils/telegram');
const { tokenTypeToLabel } = require('../utils/invoices');

let workerState = null;

function buildMessage(invoice, eventType, paymentTxId) {
    const amount = deriveInvoiceAmount(invoice);
    const token = tokenTypeToLabel(invoice.token_type);
    let text = eventType === 'payment_received'
        ? `✅ Payment received for \`${invoice.invoice_hash}\``
        : `🏁 Invoice settled: \`${invoice.invoice_hash}\``;

    text += `\nToken: ${token}`;
    if (amount !== null) {
        text += `\nAmount: ${amount}`;
    }
    text += `\nStatus: ${invoice.status}`;

    if (paymentTxId) {
        text += `\nTx: \`${paymentTxId}\``;
    }

    return text;
}

async function notifyRecipients(bot, invoice, eventType, paymentTxId) {
    if (!invoice?.merchant_address_hash) {
        return;
    }

    const recipients = await getNotificationRecipients(invoice.merchant_address_hash);
    if (!recipients.length) {
        return;
    }

    const buttons = [
        [{ text: '📄 Open Invoice Details', url: buildInvoiceDetailsUrl(invoice.invoice_hash) }]
    ];

    if (paymentTxId) {
        buttons.push([
            { text: '🔗 View Transaction', url: buildTransactionExplorerUrl(paymentTxId) }
        ]);
    }

    for (const recipient of recipients) {
        try {
            const shouldSend = await recordNotificationDelivery({
                telegramId: recipient.telegram_id,
                chatId: recipient.chat_id,
                invoiceHash: invoice.invoice_hash,
                eventType,
                paymentTxId
            });

            if (!shouldSend) {
                continue;
            }

            await bot.sendMessage(recipient.chat_id, buildMessage(invoice, eventType, paymentTxId), {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: buttons
                }
            });
        } catch (error) {
            console.error('Telegram notification delivery failed:', error);
        }
    }
}

async function processInvoiceUpdate(bot, oldRecord, newRecord) {
    const oldTxIds = normalizePaymentTxIds(oldRecord?.payment_tx_ids);
    const newTxIds = normalizePaymentTxIds(newRecord?.payment_tx_ids);
    const addedTxIds = newTxIds.filter((txId) => !oldTxIds.includes(txId));

    if (addedTxIds.length > 0) {
        // Collapse a burst of newly-added tx ids into a single Telegram alert for this update.
        const latestTxId = addedTxIds[addedTxIds.length - 1];
        await notifyRecipients(bot, newRecord, 'payment_received', latestTxId);
    }

    if (newRecord?.status === 'SETTLED' && oldRecord?.status !== 'SETTLED') {
        await notifyRecipients(bot, newRecord, 'settled', null);
    }
}

function startPolling(bot) {
    let lastCursor = new Date().toISOString();
    const cache = new Map();

    const intervalId = setInterval(async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .gt('updated_at', lastCursor)
                .order('updated_at', { ascending: true })
                .limit(100);

            if (error) {
                throw error;
            }

            for (const invoice of data || []) {
                const previous = cache.get(invoice.invoice_hash) || {
                    payment_tx_ids: [],
                    status: invoice.status
                };
                await processInvoiceUpdate(bot, previous, invoice);
                cache.set(invoice.invoice_hash, invoice);
                lastCursor = invoice.updated_at || lastCursor;
            }
        } catch (error) {
            console.error('Telegram notification polling failed:', error);
        }
    }, 15000);

    return {
        stop() {
            clearInterval(intervalId);
        }
    };
}

function startInvoiceNotificationWorker(bot) {
    if (!bot || workerState) {
        return workerState;
    }

    try {
        const channel = supabase
            .channel('telegram_invoice_notifications')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'invoices' },
                async (payload) => {
                    await processInvoiceUpdate(bot, payload.old, payload.new);
                }
            )
            .subscribe((status) => {
                if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && workerState?.poller === null) {
                    workerState.poller = startPolling(bot);
                }
            });

        workerState = {
            channel,
            poller: null,
            stop() {
                if (workerState?.channel?.unsubscribe) {
                    workerState.channel.unsubscribe();
                }
                workerState?.poller?.stop?.();
                workerState = null;
            }
        };
    } catch (error) {
        console.error('Telegram realtime worker failed to start, falling back to polling:', error);
        workerState = {
            channel: null,
            poller: startPolling(bot),
            stop() {
                workerState?.poller?.stop?.();
                workerState = null;
            }
        };
    }

    return workerState;
}

module.exports = {
    startInvoiceNotificationWorker
};
