const {
    createTelegramInvoice,
    getInvoiceForTelegramUser,
    listInvoicesForTelegramUser,
    resolvePayTarget,
    normalizePaymentTxIds
} = require('../../services/telegram.service');
const {
    buildInvoiceDetailsUrl,
    buildTransactionExplorerUrl
} = require('../../utils/telegram');
const {
    requireAuth,
    formatInvoiceTypeLabel,
    formatTokenLabel,
    shortHash
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

async function sendTypePrompt(bot, chatId) {
    await bot.sendMessage(chatId, '🧾 Choose the invoice type you want to create:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🧾 Standard', callback_data: 'CREATE_TYPE_standard' },
                    { text: '🔀 Multipay', callback_data: 'CREATE_TYPE_multipay' }
                ],
                [
                    { text: '💝 Donation', callback_data: 'CREATE_TYPE_donation' },
                    { text: '✖️ Cancel', callback_data: 'CREATE_CANCEL' }
                ]
            ]
        }
    });
}

async function sendTokenPrompt(bot, chatId, invoiceType) {
    const rows = [
        [
            { text: '🪙 CREDITS', callback_data: `CREATE_TOKEN_${invoiceType}_CREDITS` },
            { text: '💵 USDCX', callback_data: `CREATE_TOKEN_${invoiceType}_USDCX` }
        ],
        [
            { text: '🏦 USAD', callback_data: `CREATE_TOKEN_${invoiceType}_USAD` }
        ]
    ];

    if (invoiceType === 'donation') {
        rows[1].push({ text: '🌐 ANY', callback_data: `CREATE_TOKEN_${invoiceType}_ANY` });
    }

    rows.push([{ text: '✖️ Cancel', callback_data: 'CREATE_CANCEL' }]);

    await bot.sendMessage(chatId, '💳 Pick the token mode for this invoice:', {
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

    if (state.invoiceType !== 'donation') {
        lines.push(`Amount: ${state.amount}`);
    }

    lines.push(`Memo: ${state.memo || 'None'}`);

    return lines.join('\n');
}

async function sendConfirmPrompt(bot, chatId, state) {
    await bot.sendMessage(chatId, `Review your draft:\n\n${buildDraftSummary(state)}`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Create Invoice', callback_data: 'CREATE_CONFIRM' },
                    { text: '✖️ Cancel', callback_data: 'CREATE_CANCEL' }
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

    for (const invoice of invoices) {
        text += `Hash: \`${invoice.invoice_hash}\`\n`;
        text += `Status: ${invoice.status}\n`;
        text += `Token: ${formatTokenLabel(invoice.token_type)}\n`;
        text += `Type: ${formatInvoiceTypeLabel(invoice.invoice_type)}\n`;
        if (invoice.invoice_transaction_id) {
            text += `Creation tx: \`${invoice.invoice_transaction_id}\`\n`;
        }
        text += '\n';

        const row = [
            { text: `📄 ${shortHash(invoice.invoice_hash)}`, url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
        ];
        if (invoice.invoice_transaction_id) {
            row.push({ text: '🔗 Creation Tx', url: buildTransactionExplorerUrl(invoice.invoice_transaction_id) });
        }
        buttons.push(row);
    }

    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buttons
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
            memo: '',
            user
        });

        await sendTypePrompt(bot, msg.chat.id);
    });

    bot.onText(/^\/cancel(?:\s|$)/, async (msg) => {
        if (!getState(msg.chat.id)) {
            await bot.sendMessage(msg.chat.id, 'There is no active Telegram invoice flow to cancel.');
            return;
        }

        clearState(msg.chat.id);
        await bot.sendMessage(msg.chat.id, 'The current Telegram invoice flow has been cancelled.');
    });

    bot.onText(/^\/invoice(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const invoiceHash = match?.[1]?.trim();
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
            if (txIds.length) {
                text += `Payments: ${txIds.map((txId) => `\`${txId}\``).join(', ')}\n`;
            }

            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📄 Open Invoice', url: buildInvoiceDetailsUrl(invoice.invoice_hash) },
                            { text: payTarget.kind === 'invoice' ? '🌐 Open Browser View' : '💳 Open Pay Route', url: payTarget.url }
                        ],
                        ...(invoice.invoice_transaction_id
                            ? [[{ text: '🔗 Open Creation Tx', url: buildTransactionExplorerUrl(invoice.invoice_transaction_id) }]]
                            : [])
                    ]
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
        if (!state || state.mode !== 'create') {
            return;
        }

        if (!state.invoiceType || !state.currency) {
            return;
        }

        if (state.invoiceType !== 'donation' && state.amount === null) {
            const amount = Number(msg.text.trim());
            if (!Number.isFinite(amount) || amount <= 0) {
                await bot.sendMessage(msg.chat.id, 'Enter a positive amount like 12.5.');
                return;
            }

            state.amount = amount;
            setState(msg.chat.id, state);
            await bot.sendMessage(msg.chat.id, 'Add an optional memo for this invoice, or send `skip`.', {
                parse_mode: 'Markdown'
            });
            return;
        }

        state.memo = msg.text.trim().toLowerCase() === 'skip' ? '' : msg.text.trim().slice(0, 100);
        setState(msg.chat.id, state);
        await sendConfirmPrompt(bot, msg.chat.id, state);
    });

    bot.on('callback_query', async (query) => {
        const chatId = query.message?.chat?.id;
        if (!chatId) {
            await bot.answerCallbackQuery(query.id).catch(() => {});
            return;
        }

        let state = getState(chatId);
        const syntheticMsg = { chat: query.message.chat, from: query.from };

        if (query.data === 'LIST_INVOICES') {
            await bot.answerCallbackQuery(query.id);
            const user = await requireAuth(bot, syntheticMsg);
            if (!user) return;
            await handleRecentInvoices(bot, query.message, user);
            return;
        }

        try {
            if (query.data === 'CREATE_CANCEL') {
                clearState(chatId);
                await bot.answerCallbackQuery(query.id, { text: 'Invoice flow cancelled.' });
                await bot.sendMessage(chatId, 'The current Telegram invoice draft has been cancelled.');
                return;
            }

            if (query.data.startsWith('CREATE_TYPE_')) {
                if (!state || state.mode !== 'create') {
                    const user = await requireAuth(bot, syntheticMsg);
                    if (!user) return;
                    state = {
                        mode: 'create',
                        invoiceType: null,
                        currency: null,
                        amount: null,
                        memo: '',
                        user
                    };
                }

                state.invoiceType = query.data.replace('CREATE_TYPE_', '');
                state.currency = null;
                state.amount = null;
                state.memo = '';
                setState(chatId, state);
                await bot.answerCallbackQuery(query.id);
                await sendTokenPrompt(bot, chatId, state.invoiceType);
                return;
            }

            if (query.data.startsWith('CREATE_TOKEN_')) {
                const parsedToken = parseTokenCallback(query.data, state?.invoiceType || null);
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
                        memo: '',
                        user
                    };
                }

                state.invoiceType = parsedToken.invoiceType;
                state.currency = parsedToken.currency;
                setState(chatId, state);
                await bot.answerCallbackQuery(query.id);

                if (state.invoiceType === 'donation') {
                    await bot.sendMessage(chatId, 'Add an optional memo for this donation invoice, or send `skip`.', {
                        parse_mode: 'Markdown'
                    });
                    return;
                }

                await bot.sendMessage(chatId, 'Enter the amount you want to charge, for example `12.5`.', {
                    parse_mode: 'Markdown'
                });
                return;
            }

            if (query.data === 'CREATE_CONFIRM') {
                if (!state || state.mode !== 'create' || !state.invoiceType || !state.currency) {
                    await bot.answerCallbackQuery(query.id, { text: 'This invoice draft expired. Use /create again.' });
                    return;
                }

                await bot.answerCallbackQuery(query.id, { text: 'Creating invoice...' });
                await bot.sendMessage(chatId, '🧾 Submitting your invoice through the NullPay relayer and waiting for the on-chain invoice hash...');

                const result = await createTelegramInvoice(state.user, state);
                clearState(chatId);

                let text = `Invoice created.\n\n`;
                text += `Hash: \`${result.invoice.invoice_hash}\`\n`;
                text += `Type: ${formatInvoiceTypeLabel(result.invoice.invoice_type)}\n`;
                text += `Token: ${formatTokenLabel(result.invoice.token_type)}\n`;
                if (result.draft.amount > 0) {
                    text += `Amount: ${result.draft.amount}\n`;
                }
                if (result.draft.memo) {
                    text += `Memo: ${result.draft.memo}\n`;
                }
                text += `Creation tx: \`${result.txId}\``;

                await bot.sendMessage(chatId, text, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📄 Open Invoice', url: buildInvoiceDetailsUrl(result.invoice.invoice_hash) },
                                { text: '💳 Share Pay Link', url: result.payTarget.url }
                            ],
                            [
                                { text: '🔗 Open Creation Tx', url: buildTransactionExplorerUrl(result.txId) }
                            ]
                        ]
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
