module.exports = (bot) => {
    bot.onText(/^\/(?!start\b|link\b|unlink\b|dashboard\b|create\b|cancel\b|invoice\b|invoices\b|verify\b|pay\b|giftcards\b|webapp\b|notifications\b).+/i, async (msg) => {
        await bot.sendMessage(
            msg.chat.id,
            'I can help with these commands:\n\n/link  Verify your merchant wallet\n/dashboard  View your invoice summary\n/create  Start the invoice wizard\n/invoice <hash>  View a single invoice\n/invoices  List recent invoices\n/verify  Start the receipt verification flow\n/pay <hash>  Open the browser payment route\n/notifications  Manage alerts\n/webapp  Open browser shortcuts\n/giftcards  Open gift cards in the browser\n\nSecurity boundary:\nWallet signing, gift card redemption, burner wallet actions, and private record decryption always stay in the browser.'
        );
    });
};
