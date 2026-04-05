const { buildWebappLinks } = require('../../utils/telegram');

module.exports = (bot) => {
    bot.onText(/^\/giftcards(?:\s|$)/, async (msg) => {
        const chatId = msg.chat.id;
        const giftCardsUrl = buildWebappLinks()[3].url;

        await bot.sendMessage(
            chatId,
            '🎁 Gift cards stay in the browser because redemption and balance access depend on wallet-side decryption and secret handling. Open the NullPay web app to create, redeem, or pay with them securely.',
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🎁 Open Gift Cards', url: giftCardsUrl }
                    ]]
                }
            }
        );
    });
};
