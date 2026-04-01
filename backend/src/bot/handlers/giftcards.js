module.exports = (bot) => {
    bot.onText(/\/giftcards/, async (msg) => {
        const chatId = msg.chat.id;
        
        let text = `🎁 *NullPay Gift Cards*\n\n`;
        text += `Gift cards in NullPay are generated securely on-chain. Since they are protected by zero-knowledge proofs, they cannot be created or decrypted automatically by this bot without your private key. \n\n`;
        text += `Please use the official Web App to generate and redeem Gift Cards with your local wallet!`;

        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✨ Launch Gift Cards Webapp', url: 'https://app.nullpay.xyz/gift-cards' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, opts);
    });
};
