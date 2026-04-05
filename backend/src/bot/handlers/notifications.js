const {
    setNotificationsEnabled
} = require('../../services/telegram.service');
const { requireAuth } = require('../utils');

module.exports = (bot) => {
    bot.onText(/^\/notifications(?:\s+(on|off))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const user = await requireAuth(bot, msg);
        if (!user) return;

        const explicitMode = match?.[1]?.toLowerCase() || null;
        if (!explicitMode) {
            await bot.sendMessage(chatId, `🔔 Payment alerts are currently ${user.notifications_enabled === false ? 'off' : 'on'}.`, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Turn On', callback_data: 'NOTIFICATIONS_ON' },
                        { text: '🔕 Turn Off', callback_data: 'NOTIFICATIONS_OFF' }
                    ]]
                }
            });
            return;
        }

        await setNotificationsEnabled(msg.from.id, explicitMode === 'on');
        await bot.sendMessage(chatId, `🔔 Payment alerts are now ${explicitMode}.`);
    });

    bot.on('callback_query', async (query) => {
        if (!['NOTIFICATIONS_MENU', 'NOTIFICATIONS_ON', 'NOTIFICATIONS_OFF'].includes(query.data)) {
            return;
        }

        const syntheticMsg = { chat: query.message.chat, from: query.from };
        const user = await requireAuth(bot, syntheticMsg);
        if (!user) return;

        if (query.data === 'NOTIFICATIONS_MENU') {
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(query.message.chat.id, `🔔 Payment alerts are currently ${user.notifications_enabled === false ? 'off' : 'on'}.`, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Turn On', callback_data: 'NOTIFICATIONS_ON' },
                        { text: '🔕 Turn Off', callback_data: 'NOTIFICATIONS_OFF' }
                    ]]
                }
            });
            return;
        }

        const enabled = query.data === 'NOTIFICATIONS_ON';
        await setNotificationsEnabled(query.from.id, enabled);
        await bot.answerCallbackQuery(query.id, { text: enabled ? 'Alerts enabled.' : 'Alerts disabled.' });
        await bot.sendMessage(query.message.chat.id, `🔔 Payment alerts are now ${enabled ? 'on' : 'off'}.`);
    });
};
