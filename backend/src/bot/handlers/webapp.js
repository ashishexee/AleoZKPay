const { buildWebappLinks } = require('../../utils/telegram');

function buildKeyboard(invoiceHash) {
    const links = buildWebappLinks(invoiceHash);
    const rows = [
        [
            { text: links[0].text, url: links[0].url },
            { text: links[1].text, url: links[1].url }
        ],
        [
            { text: links[2].text, url: links[2].url },
            { text: links[3].text, url: links[3].url }
        ]
    ];

    if (invoiceHash && links[4]) {
        rows.push([{ text: 'Invoice Details', url: links[4].url }]);
    }

    return rows;
}

module.exports = (bot) => {
    bot.onText(/^\/webapp(?:\s+(.+))?$/i, async (msg, match) => {
        const invoiceHash = match?.[1]?.trim() || '';

        await bot.sendMessage(
            msg.chat.id,
            '🌐 Some NullPay actions stay in the browser by design so wallet decryption and transaction signing never leave your device. Use these quick links to jump back into the web app.',
            {
                reply_markup: {
                    inline_keyboard: buildKeyboard(invoiceHash)
                }
            }
        );
    });

    bot.on('callback_query', async (query) => {
        if (query.data !== 'OPEN_WEBAPP') {
            return;
        }

        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(
            query.message.chat.id,
            '🌐 Open the browser app for private wallet actions, profile views, gift cards, and developer tools.',
            {
                reply_markup: {
                    inline_keyboard: buildKeyboard()
                }
            }
        );
    });
};
