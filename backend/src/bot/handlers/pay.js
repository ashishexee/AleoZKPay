module.exports = (bot) => {
    bot.onText(/\/pay (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const hash = match[1].trim();
        
        const webLink = `https://app.nullpay.xyz/checkout/${hash}`;
        // Deep link for a mobile wallet/app integration (example)
        const mobileLink = `nullpay://checkout?hash=${hash}`;

        let text = `💳 *Pay Invoice*\n\n`;
        text += `Invoice Hash: \`${hash}\`\n\n`;
        text += `Choose your preferred payment method below:`;

        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🌐 Pay on Web', url: webLink }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, opts);
    });
};
