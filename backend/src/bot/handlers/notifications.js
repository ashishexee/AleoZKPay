const {
    setNotificationsEnabled,
    getNotifyOnSettled,
    setNotifyOnSettled
} = require('../../services/telegram.service');
const { requireAuth } = require('../utils');

module.exports = (bot) => {
    bot.onText(/^\/notifications(?:\s+(on|off))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const user = await requireAuth(bot, msg);
        if (!user) return;

        const explicitMode = match?.[1]?.toLowerCase() || null;
        if (!explicitMode) {
            const settledPref = await getNotifyOnSettled(user.aleo_address_hash).catch(() => false);
            await bot.sendMessage(chatId, buildNotificationsMenuText(user, settledPref), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: user.notifications_enabled === false ? '🔕 Alerts Off' : '✅ Alerts On', callback_data: 'NOTIFICATIONS_TOGGLE' }
                        ],
                        [
                            { text: settledPref ? '🏁 Settled On' : '🏁 Settled Off', callback_data: 'NOTIFICATIONS_SETTLED_TOGGLE' }
                        ]
                    ]
                }
            });
            return;
        }

        await setNotificationsEnabled(msg.from.id, explicitMode === 'on');
        await bot.sendMessage(chatId, `🔔 Payment alerts are now ${explicitMode}.`);
    });

    bot.on('callback_query', async (query) => {
        const validActions = ['NOTIFICATIONS_MENU', 'NOTIFICATIONS_ON', 'NOTIFICATIONS_OFF', 'NOTIFICATIONS_TOGGLE', 'NOTIFICATIONS_SETTLED_TOGGLE', 'NOTIFICATIONS_SETTLED_ON', 'NOTIFICATIONS_SETTLED_OFF'];
        if (!validActions.includes(query.data)) {
            return;
        }

        const syntheticMsg = { chat: query.message.chat, from: query.from };
        const user = await requireAuth(bot, syntheticMsg);
        if (!user) return;

        if (query.data === 'NOTIFICATIONS_MENU') {
            const settledPref = await getNotifyOnSettled(user.aleo_address_hash).catch(() => false);
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(query.message.chat.id, buildNotificationsMenuText(user, settledPref), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: user.notifications_enabled === false ? '🔕 Alerts Off' : '✅ Alerts On', callback_data: 'NOTIFICATIONS_TOGGLE' }
                        ],
                        [
                            { text: settledPref ? '🏁 Settled On' : '🏁 Settled Off', callback_data: 'NOTIFICATIONS_SETTLED_TOGGLE' }
                        ]
                    ]
                }
            });
            return;
        }

        if (query.data === 'NOTIFICATIONS_ON' || query.data === 'NOTIFICATIONS_OFF') {
            const enabled = query.data === 'NOTIFICATIONS_ON';
            await setNotificationsEnabled(query.from.id, enabled);
            const settledPref = await getNotifyOnSettled(user.aleo_address_hash).catch(() => false);
            await bot.answerCallbackQuery(query.id, { text: enabled ? 'Alerts enabled.' : 'Alerts disabled.' });
            await bot.sendMessage(query.message.chat.id, buildNotificationsMenuText(user, settledPref), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: enabled ? '✅ Alerts On' : '🔕 Alerts Off', callback_data: 'NOTIFICATIONS_TOGGLE' }
                        ],
                        [
                            { text: settledPref ? '🏁 Settled On' : '🏁 Settled Off', callback_data: 'NOTIFICATIONS_SETTLED_TOGGLE' }
                        ]
                    ]
                }
            });
            return;
        }

        if (query.data === 'NOTIFICATIONS_TOGGLE') {
            const newEnabled = user.notifications_enabled === false;
            await setNotificationsEnabled(query.from.id, newEnabled);
            const settledPref = await getNotifyOnSettled(user.aleo_address_hash).catch(() => false);
            await bot.answerCallbackQuery(query.id, { text: newEnabled ? 'Alerts enabled.' : 'Alerts disabled.' });
            await bot.sendMessage(query.message.chat.id, buildNotificationsMenuText({ ...user, notifications_enabled: newEnabled }, settledPref), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: newEnabled ? '✅ Alerts On' : '🔕 Alerts Off', callback_data: 'NOTIFICATIONS_TOGGLE' }
                        ],
                        [
                            { text: settledPref ? '🏁 Settled On' : '🏁 Settled Off', callback_data: 'NOTIFICATIONS_SETTLED_TOGGLE' }
                        ]
                    ]
                }
            });
            return;
        }

        if (query.data === 'NOTIFICATIONS_SETTLED_TOGGLE' || query.data === 'NOTIFICATIONS_SETTLED_ON' || query.data === 'NOTIFICATIONS_SETTLED_OFF') {
            const currentPref = await getNotifyOnSettled(user.aleo_address_hash).catch(() => false);
            const newPref = query.data === 'NOTIFICATIONS_SETTLED_TOGGLE' ? !currentPref : query.data === 'NOTIFICATIONS_SETTLED_ON';
            await setNotifyOnSettled(user.aleo_address_hash, newPref);
            const refreshedUser = { ...user, notifications_enabled: user.notifications_enabled };
            await bot.answerCallbackQuery(query.id, { text: newPref ? 'Settled alerts enabled.' : 'Settled alerts disabled.' });
            await bot.sendMessage(query.message.chat.id, buildNotificationsMenuText(refreshedUser, newPref), {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: refreshedUser.notifications_enabled === false ? '🔕 Alerts Off' : '✅ Alerts On', callback_data: 'NOTIFICATIONS_TOGGLE' }
                        ],
                        [
                            { text: newPref ? '🏁 Settled On' : '🏁 Settled Off', callback_data: 'NOTIFICATIONS_SETTLED_TOGGLE' }
                        ]
                    ]
                }
            });
            return;
        }
    });
};

function buildNotificationsMenuText(user, settledPref) {
    const alertsStatus = user.notifications_enabled === false ? 'off' : 'on';
    const settledStatus = settledPref ? 'on' : 'off';
    return `🔔 Notification Settings\n\nPayment Alerts: ${alertsStatus}\nSettled Alerts: ${settledStatus}\n\nTap a button to toggle.`;
}
