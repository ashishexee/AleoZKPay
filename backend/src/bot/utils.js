const crypto = require('crypto');
const { getLinkedTelegramUser } = require('../services/telegram.service');
const { buildWebappLinks } = require('../utils/telegram');

const invoiceCallbackRegistry = new Map();

async function requireAuth(bot, msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const user = await getLinkedTelegramUser(telegramId);

    if (!user || !user.aleo_address_hash) {
        await bot.sendMessage(
            chatId,
            'Link your NullPay merchant wallet first so I can look up your invoices securely.',
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: 'Link Wallet', callback_data: 'LINK_START' },
                        { text: 'Open Web App', url: buildWebappLinks()[0].url }
                    ]]
                }
            }
        );
        return null;
    }

    return user;
}

function formatTokenLabel(tokenType) {
    if (tokenType === 1) return 'USDCX';
    if (tokenType === 2) return 'USAD';
    if (tokenType === 3) return 'ANY';
    return 'CREDITS';
}

function formatInvoiceTypeLabel(invoiceType) {
    if (invoiceType === 1) return 'Multipay';
    if (invoiceType === 2) return 'Donation';
    return 'Standard';
}

function shortHash(hash) {
    if (!hash) return '';
    if (hash.length <= 14) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function registerInvoiceCallback(chatId, invoiceHash) {
    if (!chatId || !invoiceHash) return null;

    const chatKey = String(chatId);
    const token = crypto.randomBytes(4).toString('hex');
    const existing = invoiceCallbackRegistry.get(chatKey) || new Map();
    existing.set(token, invoiceHash);

    while (existing.size > 200) {
        const oldestKey = existing.keys().next().value;
        existing.delete(oldestKey);
    }

    invoiceCallbackRegistry.set(chatKey, existing);
    return token;
}

function resolveInvoiceCallback(chatId, token) {
    if (!chatId || !token) return null;
    return invoiceCallbackRegistry.get(String(chatId))?.get(token) || null;
}

module.exports = {
    requireAuth,
    formatTokenLabel,
    formatInvoiceTypeLabel,
    shortHash,
    registerInvoiceCallback,
    resolveInvoiceCallback
};
