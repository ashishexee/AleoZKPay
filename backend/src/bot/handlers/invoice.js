const {
    createTelegramInvoice,
    getInvoiceForTelegramUser,
    listInvoicesForTelegramUser,
    resolvePayTarget,
    normalizePaymentTxIds,
    deriveInvoiceAmount
} = require('../../services/telegram.service');
const {
    buildInvoiceDetailsUrl,
    buildTransactionExplorerUrl
} = require('../../utils/telegram');
const {
    requireAuth,
    formatInvoiceTypeLabel,
    formatTokenLabel,
    shortHash,
    registerInvoiceCallback,
    resolveInvoiceCallback
} = require('../utils');

const userStates = new Map();

function setState(chatId, nextState) {
    userStates.set(chatId, nextState);
}

function clearState(chatId) {
    userStates.delete(chatId);
}

function getState(chatId) {
    return userStates.get(chatId) || null;
}

function normalizeInvoiceHashInput(value) {
    return String(value || '').trim().replace(/^`+|`+$/g, '');
}

function parseTokenCallback(data, fallbackInvoiceType = null) {
    if (!data || !data.startsWith('CREATE_TOKEN_')) {
        return null;
    }

    const payload = data.replace('CREATE_TOKEN_', '');
    const segments = payload.split('_');

    if (segments.length >= 2) {
        return {
            invoiceType: segments.slice(0, -1).join('_'),
            currency: segments[segments.length - 1]
        };
    }

    return fallbackInvoiceType
        ? { invoiceType: fallbackInvoiceType, currency: payload }
        : null;
}

function buildInvoiceActionRows(invoice, options = {}) {
    const paymentTxIds = normalizePaymentTxIds(invoice.payment_tx_ids);
    const title = options.title || 'Open Invoice';
    const callbackToken = options.chatId
        ? registerInvoiceCallback(options.chatId, invoice.invoice_hash)
        : null;
    const rows = [
        [
            { text: title, url: buildInvoiceDetailsUrl(invoice.invoice_hash) },
            ...(invoice.invoice_transaction_id
                ? [{ text: 'Creation Tx', url: buildTransactionExplorerUrl(invoice.invoice_transaction_id) }]
                : [])
        ]
    ];

    if (options.includeBrowserLink && options.browserUrl) {
        rows.push([{ text: options.browserLabel || 'Open Browser View', url: options.browserUrl }]);
    }

    if (callbackToken) {
        rows.push([
            { text: `Payments (${paymentTxIds.length})`, callback_data: `INVOICE_PAYMENTS_${callbackToken}` },
            { text: 'Receipt Hashes', callback_data: `INVOICE_RECEIPTS_${callbackToken}` }
        ]);
    }

    return rows;
}

async function sendTypePrompt(bot, chatId) {
    await bot.sendMessage(chatId, 'Choose the invoice type you want to create:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Standard', callback_data: 'CREATE_TYPE_standard' },
                    { text: 'Multipay', callback_data: 'CREATE_TYPE_multipay' }
                ],
                [
                    { text: 'Donation', callback_data: 'CREATE_TYPE_donation' },
                    { text: 'Cancel', callback_data: 'CREATE_CANCEL' }
                ]
            ]
        }
    });
}

async function sendTokenPrompt(bot, chatId, invoiceType) {
    const rows = [
        [
            { text: 'CREDITS', callback_data: `CREATE_TOKEN_${invoiceType}_CREDITS` },
            { text: 'USDCX', callback_data: `CREATE_TOKEN_${invoiceType}_USDCX` }
        ],
        [
            { text: 'USAD', callback_data: `CREATE_TOKEN_${invoiceType}_USAD` }
        ]
    ];

    if (invoiceType === 'donation') {
        rows[1].push({ text: 'ANY', callback_data: `CREATE_TOKEN_${invoiceType}_ANY` });
    }

    rows.push([{ text: 'Cancel', callback_data: 'CREATE_CANCEL' }]);

    await bot.sendMessage(chatId, 'Pick the token mode for this invoice:', {
        reply_markup: {
            inline_keyboard: rows
        }
    });
}

function buildDraftSummary(state) {
    const lines = [
        `Type: ${formatInvoiceTypeLabel(state.invoiceType === 'multipay' ? 1 : state.invoiceType === 'donation' ? 2 : 0)}`,
        `Token: ${state.currency}`
    ];

    if (state.currency === 'ANY') {
        lines.push(`Allowed Tokens: CREDITS, USDCX, USAD`);
    }

    if (state.invoiceType !== 'donation') {
        lines.push(`Amount: ${state.amount}`);
    }

    lines.push(`Title: ${state.title || 'None'}`);
    lines.push(`Memo: ${state.memo || 'None'}`);

    return lines.join('\n');
}

async function sendConfirmPrompt(bot, chatId, state) {
    await bot.sendMessage(chatId, `Review your draft:\n\n${buildDraftSummary(state)}`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Create Invoice', callback_data: 'CREATE_CONFIRM' },
                    { text: 'Cancel', callback_data: 'CREATE_CANCEL' }
                ]
            ]
        }
    });
}

async function handleRecentInvoices(bot, msgOrQuery, user) {
    const chatId = msgOrQuery.chat ? msgOrQuery.chat.id : msgOrQuery.message.chat.id;
    const invoices = await listInvoicesForTelegramUser(user, 5);

    if (!invoices.length) {
        await bot.sendMessage(chatId, 'No recent invoices yet. Use /create when you want to issue one.');
        return;
    }

    let text = 'Recent invoices:\n\n';
    const buttons = [];

    invoices.forEach((invoice, index) => {
        const paymentTxIds = normalizePaymentTxIds(invoice.payment_tx_ids);

        text += `${index + 1}. Hash: \`${invoice.invoice_hash}\`\n`;
        text += `Status: ${invoice.status}\n`;
        text += `Token: ${formatTokenLabel(invoice.token_type)}\n`;
        text += `Type: ${formatInvoiceTypeLabel(invoice.invoice_type)}\n`;
        if (invoice.invoice_transaction_id) {
            text += `Creation tx: \`${invoice.invoice_transaction_id}\`\n`;
        }
        text += `Payments: ${paymentTxIds.length}\n`;
        if (invoice.created_at) {
            text += `Created: ${new Date(invoice.created_at).toLocaleString()}\n`;
        }
        text += '\n';

        buttons.push(...buildInvoiceActionRows(invoice, { title: `Invoice ${index + 1}`, chatId }));
    });

    await bot.sendMessage(chatId, text.trim(), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buttons
        }
    });
}

async function sendPaymentTxBreakdown(bot, chatId, invoice) {
    const txIds = normalizePaymentTxIds(invoice.payment_tx_ids);
    const invoiceRef = shortHash(invoice.invoice_hash);

    if (!txIds.length) {
        await bot.sendMessage(chatId, `No payment transaction IDs are recorded yet for invoice \`${invoiceRef}\`.`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Open Invoice Details', url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
                ]]
            }
        });
        return;
    }

    let text = `Payment transaction IDs for invoice \`${invoiceRef}\`\n\n`;
    txIds.forEach((txId, index) => {
        text += `${index + 1}. \`${txId}\`\n`;
    });

    await bot.sendMessage(chatId, text.trim(), {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                ...txIds.map((txId, index) => ([
                    { text: `Open Tx ${index + 1}`, url: buildTransactionExplorerUrl(txId) }
                ])),
                [
                    { text: 'Open Invoice Details', url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
                ]
            ]
        }
    });
}

async function sendReceiptHashBreakdown(bot, chatId, invoice) {
    const paymentCount = normalizePaymentTxIds(invoice.payment_tx_ids).length;
    const amount = deriveInvoiceAmount(invoice);
    let text = `Receipt hashes for invoice \`${shortHash(invoice.invoice_hash)}\`\n\n`;
    text += 'Telegram cannot list or cryptographically verify merchant receipt hashes yet.\n';
    text += 'The frontend verify flow works by scanning your private wallet records, and those private records never leave your device.\n\n';
    text += `Reference invoice status: ${invoice.status}\n`;
    text += `Reference token: ${formatTokenLabel(invoice.token_type)}\n`;
    if (amount !== null) {
        text += `Reference amount: ${amount}\n`;
    }
    text += `Recorded payment txs: ${paymentCount}\n\n`;
    text += 'Open the browser invoice view to inspect private receipt hashes and use the full verify flow.';

    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open Invoice Details', url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
            ]]
        }
    });
}

async function beginVerifyFlow(bot, msg, invoiceHash = '') {
    const user = await requireAuth(bot, msg);
    if (!user) return;

    const normalizedHash = normalizeInvoiceHashInput(invoiceHash);

    if (normalizedHash) {
        const invoice = await getInvoiceForTelegramUser(user, normalizedHash);
        if (!invoice) {
            await bot.sendMessage(msg.chat.id, 'I could not find that invoice under your linked merchant wallet. Send a valid invoice hash or use /cancel.');
            setState(msg.chat.id, { mode: 'verify', step: 'invoice', user });
            return;
        }

        setState(msg.chat.id, { mode: 'verify', step: 'receipt', user, invoice });
        await bot.sendMessage(
            msg.chat.id,
            `Receipt verification started for invoice \`${invoice.invoice_hash}\`.\n\nNow send the receipt hash you want me to check.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    setState(msg.chat.id, { mode: 'verify', step: 'invoice', user });
    await bot.sendMessage(msg.chat.id, 'Send the invoice hash you want to verify a receipt against.');
}

async function handleVerifyState(bot, msg, state) {
    const chatId = msg.chat.id;

    if (state.step === 'invoice') {
        const invoiceHash = normalizeInvoiceHashInput(msg.text);
        if (!invoiceHash) {
            await bot.sendMessage(chatId, 'Send a valid invoice hash, or use /cancel to stop.');
            return;
        }

        const invoice = await getInvoiceForTelegramUser(state.user, invoiceHash);
        if (!invoice) {
            await bot.sendMessage(chatId, 'I could not find that invoice under your linked merchant wallet. Try again or use /cancel.');
            return;
        }

        setState(chatId, { ...state, step: 'receipt', invoice });
        await bot.sendMessage(
            chatId,
            `Invoice found.\n\nHash: \`${invoice.invoice_hash}\`\nStatus: ${invoice.status}\nToken: ${formatTokenLabel(invoice.token_type)}\n\nNow send the receipt hash you want me to check.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const receiptHash = normalizeInvoiceHashInput(msg.text);
    if (!receiptHash) {
        await bot.sendMessage(chatId, 'Send a valid receipt hash, or use /cancel to stop.');
        return;
    }

    const { invoice } = state;
    const amount = deriveInvoiceAmount(invoice);
    clearState(chatId);

    let text = `Receipt check requested\n\n`;
    text += `Invoice: \`${invoice.invoice_hash}\`\n`;
    text += `Receipt hash: \`${receiptHash}\`\n\n`;
    text += 'Telegram cannot validate private receipt hashes yet because the frontend verification flow depends on private wallet records that never leave your device.\n\n';
    text += `Reference token: ${formatTokenLabel(invoice.token_type)}\n`;
    if (amount !== null) {
        text += `Reference amount: ${amount}\n`;
    }
    text += `Invoice status: ${invoice.status}\n\n`;
    text += 'Open the browser invoice view to run the full private verification flow.';

    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open Invoice Details', url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
            ]]
        }
    });
}

module.exports = (bot) => {
    bot.onText(/^\/create(?:\s|$)/, async (msg) => {
        const user = await requireAuth(bot, msg);
        if (!user) return;

        setState(msg.chat.id, {
            mode: 'create',
            invoiceType: null,
            currency: null,
            amount: null,
            title: '',
            memo: '',
            step: null,
            user
        });

        await sendTypePrompt(bot, msg.chat.id);
    });

    bot.onText(/^\/verify(?:\s+(.+))?$/i, async (msg, match) => {
        try {
            await beginVerifyFlow(bot, msg, match?.[1] || '');
        } catch (error) {
            console.error('Telegram verify flow failed:', error);
            await bot.sendMessage(msg.chat.id, 'I could not start the verify flow right now. Please try again in a moment.');
        }
    });

    bot.onText(/^\/cancel(?:\s|$)/, async (msg) => {
        const activeState = getState(msg.chat.id);
        if (!activeState) {
            await bot.sendMessage(msg.chat.id, 'There is no active Telegram flow to cancel.');
            return;
        }

        clearState(msg.chat.id);
        await bot.sendMessage(msg.chat.id, 'The current Telegram flow has been cancelled.');
    });

    bot.onText(/^\/invoice(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const invoiceHash = normalizeInvoiceHashInput(match?.[1] || '');
        const user = await requireAuth(bot, msg);
        if (!user) return;

        if (!invoiceHash) {
            await bot.sendMessage(chatId, 'Use /invoice <hash> so I can look up that invoice from the database.');
            return;
        }

        try {
            const invoice = await getInvoiceForTelegramUser(user, invoiceHash);
            if (!invoice) {
                await bot.sendMessage(chatId, 'I could not find that invoice under your linked merchant wallet.');
                return;
            }

            const txIds = normalizePaymentTxIds(invoice.payment_tx_ids);
            const payTarget = await resolvePayTarget(invoice, user);
            let text = `Invoice details\n\n`;
            text += `Hash: \`${invoice.invoice_hash}\`\n`;
            text += `Status: ${invoice.status}\n`;
            text += `Type: ${formatInvoiceTypeLabel(invoice.invoice_type)}\n`;
            text += `Token: ${formatTokenLabel(invoice.token_type)}\n`;
            if (invoice.created_at) {
                text += `Created: ${new Date(invoice.created_at).toLocaleString()}\n`;
            }
            if (invoice.invoice_transaction_id) {
                text += `Creation tx: \`${invoice.invoice_transaction_id}\`\n`;
            }
            text += `Payments: ${txIds.length}\n`;

            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: buildInvoiceActionRows(invoice, {
                        title: 'Open Invoice',
                        chatId,
                        includeBrowserLink: true,
                        browserUrl: payTarget.url,
                        browserLabel: payTarget.kind === 'invoice' ? 'Open Browser View' : 'Open Pay Route'
                    })
                }
            });
        } catch (error) {
            console.error('Telegram invoice lookup failed:', error);
            await bot.sendMessage(chatId, 'I could not look up that invoice right now. Please try again in a moment.');
        }
    });

    bot.onText(/^\/invoices(?:\s|$)/, async (msg) => {
        const user = await requireAuth(bot, msg);
        if (!user) return;
        await handleRecentInvoices(bot, msg, user);
    });

    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;

        const state = getState(msg.chat.id);
        if (!state) {
            return;
        }

        if (state.mode === 'verify') {
            try {
                await handleVerifyState(bot, msg, state);
            } catch (error) {
                console.error('Telegram verify step failed:', error);
                await bot.sendMessage(msg.chat.id, 'I could not continue the verify flow right now. Please try /verify again in a moment.');
            }
            return;
        }

        if (state.mode !== 'create') {
            return;
        }

        if (!state.invoiceType || !state.currency) {
            return;
        }

        if (state.step === 'amount') {
            const amount = Number(msg.text.trim());
            if (!Number.isFinite(amount) || amount <= 0) {
                await bot.sendMessage(msg.chat.id, 'Enter a positive amount like 12.5.');
                return;
            }

            state.amount = amount;
            state.step = 'title';
            setState(msg.chat.id, state);
            await bot.sendMessage(msg.chat.id, 'Add an optional invoice title to share with the payer, or send `skip`.', {
                parse_mode: 'Markdown'
            });
            return;
        }

        if (state.step === 'title') {
            state.title = msg.text.trim().toLowerCase() === 'skip' ? '' : msg.text.trim();
            state.step = 'memo';
            setState(msg.chat.id, state);
            await bot.sendMessage(msg.chat.id, 'Add an optional memo to share with the payer, or send `skip`.', {
                parse_mode: 'Markdown'
            });
            return;
        }

        state.memo = msg.text.trim().toLowerCase() === 'skip' ? '' : msg.text.trim();
        state.step = 'confirm';
        setState(msg.chat.id, state);
        await sendConfirmPrompt(bot, msg.chat.id, state);
    });

    bot.on('callback_query', async (query) => {
        const chatId = query.message?.chat?.id;
        if (!chatId) {
            await bot.answerCallbackQuery(query.id).catch(() => {});
            return;
        }

        const data = query.data || '';
        const paymentMatch = data.match(/^INVOICE_PAYMENTS_([a-f0-9]+)$/);
        const receiptMatch = data.match(/^INVOICE_RECEIPTS_([a-f0-9]+)$/);

        let state = getState(chatId);
        const syntheticMsg = { chat: query.message.chat, from: query.from };

        if (data === 'LIST_INVOICES') {
            await bot.answerCallbackQuery(query.id);
            const user = await requireAuth(bot, syntheticMsg);
            if (!user) return;
            await handleRecentInvoices(bot, query.message, user);
            return;
        }

        if (paymentMatch || receiptMatch) {
            try {
                await bot.answerCallbackQuery(query.id);
                const user = await requireAuth(bot, syntheticMsg);
                if (!user) return;

                const invoiceHash = resolveInvoiceCallback(chatId, (paymentMatch || receiptMatch)[1]);
                const invoice = invoiceHash
                    ? await getInvoiceForTelegramUser(user, invoiceHash)
                    : null;
                if (!invoice) {
                    await bot.sendMessage(chatId, 'I could not find that invoice under your linked merchant wallet.');
                    return;
                }

                if (paymentMatch) {
                    await sendPaymentTxBreakdown(bot, chatId, invoice);
                    return;
                }

                await sendReceiptHashBreakdown(bot, chatId, invoice);
                return;
            } catch (error) {
                console.error('Telegram invoice evidence callback failed:', error);
                await bot.sendMessage(chatId, 'I could not load that invoice evidence right now. Please try again in a moment.');
                return;
            }
        }

        try {
            if (data === 'CREATE_CANCEL') {
                clearState(chatId);
                await bot.answerCallbackQuery(query.id, { text: 'Flow cancelled.' });
                await bot.sendMessage(chatId, 'The current Telegram flow has been cancelled.');
                return;
            }

            if (data.startsWith('CREATE_TYPE_')) {
                if (!state || state.mode !== 'create') {
                    const user = await requireAuth(bot, syntheticMsg);
                    if (!user) return;
                    state = {
                        mode: 'create',
                        invoiceType: null,
                        currency: null,
                        amount: null,
                        title: '',
                        memo: '',
                        step: null,
                        user
                    };
                }

                state.invoiceType = data.replace('CREATE_TYPE_', '');
                state.currency = null;
                state.amount = null;
                state.title = '';
                state.memo = '';
                state.step = null;
                setState(chatId, state);
                await bot.answerCallbackQuery(query.id);
                await sendTokenPrompt(bot, chatId, state.invoiceType);
                return;
            }

            if (data.startsWith('CREATE_TOKEN_')) {
                const parsedToken = parseTokenCallback(data, state?.invoiceType || null);
                if (!parsedToken) {
                    await bot.answerCallbackQuery(query.id, { text: 'This invoice draft expired. Use /create again.' });
                    return;
                }

                if (!state || state.mode !== 'create') {
                    const user = await requireAuth(bot, syntheticMsg);
                    if (!user) return;
                    state = {
                        mode: 'create',
                        invoiceType: parsedToken.invoiceType,
                        currency: null,
                        amount: null,
                        title: '',
                        memo: '',
                        step: null,
                        user
                    };
                }

                state.invoiceType = parsedToken.invoiceType;
                state.currency = parsedToken.currency;
                state.title = '';
                state.memo = '';
                setState(chatId, state);
                await bot.answerCallbackQuery(query.id);

                if (state.invoiceType === 'donation') {
                    state.step = 'title';
                    setState(chatId, state);
                    await bot.sendMessage(chatId, 'Add an optional invoice title to share with the payer, or send `skip`.', {
                        parse_mode: 'Markdown'
                    });
                    return;
                }

                state.step = 'amount';
                setState(chatId, state);
                await bot.sendMessage(chatId, 'Enter the amount you want to charge, for example `12.5`.', {
                    parse_mode: 'Markdown'
                });
                return;
            }

            if (data === 'CREATE_CONFIRM') {
                if (!state || state.mode !== 'create' || !state.invoiceType || !state.currency) {
                    await bot.answerCallbackQuery(query.id, { text: 'This invoice draft expired. Use /create again.' });
                    return;
                }

                await bot.answerCallbackQuery(query.id, { text: 'Creating invoice...' });
                await bot.sendMessage(chatId, 'Submitting your invoice through the NullPay relayer and waiting for the on-chain invoice hash...');

                const result = await createTelegramInvoice(state.user, state);
                clearState(chatId);

                let text = `Invoice created.\n\n`;
                text += `Hash: \`${result.invoice.invoice_hash}\`\n`;
                text += `Type: ${formatInvoiceTypeLabel(result.invoice.invoice_type)}\n`;
                text += `Token: ${formatTokenLabel(result.invoice.token_type)}\n`;
                
                if (result.invoice.allowed_tokens && result.invoice.allowed_tokens.length > 0) {
                    text += `Allowed Tokens: ${result.invoice.allowed_tokens.join(', ')}\n`;
                } else if (result.invoice.token_type === 3) {
                    text += `Allowed Tokens: CREDITS, USDCX, USAD\n`;
                }
                if (result.draft.amount > 0) {
                    text += `Amount: ${result.draft.amount}\n`;
                }
                if (result.draft.title) {
                    text += `Title: ${result.draft.title}\n`;
                }
                if (result.draft.memo) {
                    text += `Memo: ${result.draft.memo}\n`;
                }
                text += `Creation tx: \`${result.txId}\``;

                await bot.sendMessage(chatId, text, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: buildInvoiceActionRows(result.invoice, {
                            title: 'Open Invoice',
                            chatId,
                            includeBrowserLink: true,
                            browserUrl: result.payTarget.url,
                            browserLabel: 'Share Pay Link'
                        })
                    }
                });
                return;
            }

            await bot.answerCallbackQuery(query.id).catch(() => {});
        } catch (error) {
            console.error('Telegram create flow failed:', error);
            await bot.answerCallbackQuery(query.id, {
                text: (error.message || 'Create flow failed.').slice(0, 180)
            }).catch(() => {});
            await bot.sendMessage(chatId, error.message || 'I could not complete the Telegram invoice flow right now.');
        }
    });
};
