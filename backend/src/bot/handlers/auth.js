const supabase = require('../../config/supabase');

module.exports = (bot) => {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "Welcome to the *NullPay Bot*! 🚀\n\nTo get started, please link your Aleo Merchant Address using:\n\n`/link <your_aleo_address>`", { parse_mode: 'Markdown' });
    });

    bot.onText(/\/link (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const address = match[1].trim();
        
        if (!address.startsWith('aleo1') || address.length < 50) {
             return bot.sendMessage(chatId, "❌ Invalid Aleo address format.");
        }

        const telegram_id = msg.from.id;
        const username = msg.from.username || msg.from.first_name || '';

        const { error } = await supabase
            .from('telegram_users')
            .upsert({ 
                telegram_id, 
                aleo_address: address, 
                username 
            }, { onConflict: 'telegram_id' })
            .select();

        if (error) {
            console.error("Link error:", error);
            return bot.sendMessage(chatId, "❌ Failed to link address.");
        }

        bot.sendMessage(chatId, `✅ Successfully linked your address:\n\`${address}\`\n\nYou can now use /dashboard to view your stats or /create to make a new invoice.`, { parse_mode: 'Markdown' });
    });
};
