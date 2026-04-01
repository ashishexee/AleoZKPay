const supabase = require('../config/supabase');

const requireAuth = async (bot, msg) => {
    const chatId = msg.chat.id;
    const telegram_id = msg.from.id;

    const { data: user, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();
    
    if (error || !user) {
        bot.sendMessage(chatId, "⚠️ You need to link your Aleo Address first. Use /link <your_aleo_address>");
        return null;
    }
    return user;
};

module.exports = { requireAuth };
