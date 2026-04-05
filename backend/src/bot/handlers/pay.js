const {
    getInvoiceForTelegramUser,
    resolvePayTarget
} = require('../../services/telegram.service');
const { requireAuth } = require('../utils');

module.exports = (bot) => {
    bot.onText(/^\/pay(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const invoiceHash = match?.[1]?.trim();
        const user = await requireAuth(bot, msg);
        if (!user) return;

        if (!invoiceHash) {
            await bot.sendMessage(chatId, 'Use /pay <hash> and I will open the secure browser payment route for that invoice.');
            return;
        }

        try {
            const invoice = await getInvoiceForTelegramUser(user, invoiceHash);
            if (!invoice) {
                await bot.sendMessage(chatId, 'I could not find that invoice under your linked merchant wallet.');
                return;
            }

            const payTarget = await resolvePayTarget(invoice, user);
            const copy = payTarget.kind === 'checkout'
                ? 'Payments stay browser-only for security. This invoice has a hosted checkout session ready.'
                : payTarget.kind === 'direct'
                    ? 'Payments stay browser-only for security. This opens the standard NullPay browser payment route.'
                    : 'Payments stay browser-only for security. NullPay does not keep full payer parameters in the database for many invoices, so I cannot rebuild a safe direct pay URL for this one from Telegram. I am opening the browser invoice details page instead.';

            await bot.sendMessage(chatId, `${copy}\n\nInvoice: \`${invoice.invoice_hash}\``, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: payTarget.kind === 'invoice' ? '📄 Open Invoice Details' : '🌐 Open in Browser', url: payTarget.url }
                    ]]
                }
            });
        } catch (error) {
            console.error('Telegram pay redirect failed:', error);
            await bot.sendMessage(chatId, 'I could not open that pay route right now. Please try again in a moment.');
        }
    });
};
