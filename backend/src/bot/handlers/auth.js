const {
    TelegramServiceError,
    createLinkSession,
    getLinkedTelegramUser,
    unlinkTelegramUser
} = require('../../services/telegram.service');

async function sendLinkFlow(bot, msg, options = {}) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || null;
    const existingUser = await getLinkedTelegramUser(telegramId);

    if (existingUser?.aleo_address && !options.force) {
        await bot.sendMessage(
            chatId,
            `🔐 Your merchant wallet is already linked:\n\`${existingUser.aleo_address}\`\n\nYou can use /dashboard for a live summary, /create for a new invoice, or /unlink if you want to replace this wallet.`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 Open Dashboard', callback_data: 'OPEN_DASHBOARD' },
                            { text: '🔁 Relink Wallet', callback_data: 'LINK_FORCE' }
                        ]
                    ]
                }
            }
        );
        return;
    }

    const session = await createLinkSession({
        telegramId,
        chatId,
        username
    });

    await bot.sendMessage(
        chatId,
        '🔐 Open the secure NullPay browser flow below.\n\nYou will:\n1. Connect your Aleo wallet\n2. Create or unlock your NullPay password\n3. Sign one short one-time link message\n\nPayments and private wallet actions still stay browser-only for security.',
        {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🔐 Link Wallet Securely', url: session.link_url }
                ]]
            }
        }
    );
}

module.exports = (bot) => {
    bot.onText(/^\/start(?:\s|$)/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage(
            chatId,
            'NullPay Telegram Bot\n\nWhat I can help you with:\n• Securely link your merchant wallet once\n• Create standard, multipay, and donation invoices\n• Show a lightweight dashboard from your DB invoice history\n• Look up invoice hashes, status, and payment tx ids\n• Send real-time payment alerts in Telegram\n• Open the web app for wallet signing, gift cards, and private views\n\nSecurity boundary:\nPayments, gift cards, burner wallet actions, card wallet actions, and private record decryption always stay in the browser.\n\nQuick start:\nUse /link first, then /dashboard or /create.',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔐 Link Wallet', callback_data: 'LINK_START' },
                            { text: '📊 Dashboard', callback_data: 'OPEN_DASHBOARD' }
                        ],
                        [
                            { text: '🧾 Create Invoice', callback_data: 'START_CREATE' },
                            { text: '🌐 Open Web App', callback_data: 'OPEN_WEBAPP' }
                        ],
                        [
                            { text: '🔔 Alerts', callback_data: 'NOTIFICATIONS_MENU' },
                            { text: 'ℹ️ Commands', callback_data: 'SHOW_HELP' }
                        ]
                    ]
                }
            }
        );
    });

    bot.onText(/^\/link(?:\s|$)/, async (msg) => {
        try {
            await sendLinkFlow(bot, msg);
        } catch (error) {
            console.error('Telegram link flow failed:', error);
            await bot.sendMessage(msg.chat.id, 'I could not create a secure link session right now. Please try /link again in a moment.');
        }
    });

    bot.onText(/^\/unlink(?:\s|$)/, async (msg) => {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id;

        try {
            const existingUser = await getLinkedTelegramUser(telegramId);
            if (!existingUser?.aleo_address) {
                await bot.sendMessage(chatId, 'There is no linked wallet on this Telegram account yet. Use /link to verify one.');
                return;
            }

            await unlinkTelegramUser(telegramId);
            await bot.sendMessage(chatId, 'Your Telegram merchant link has been removed. Use /link whenever you want to connect a wallet again.');
        } catch (error) {
            console.error('Telegram unlink failed:', error);
            await bot.sendMessage(chatId, 'I could not unlink your wallet right now. Please try again in a moment.');
        }
    });

    bot.on('callback_query', async (query) => {
        if (!['LINK_START', 'LINK_FORCE', 'SHOW_HELP', 'START_CREATE'].includes(query.data)) {
            return;
        }

        try {
            await bot.answerCallbackQuery(query.id);

            if (query.data === 'SHOW_HELP') {
                await bot.sendMessage(
                    query.message.chat.id,
                    'Available commands:\n\n/link  Securely verify your merchant wallet\n/dashboard  View invoice totals and recent activity\n/create  Start a guided invoice wizard\n/invoice <hash>  View a single invoice\n/invoices  List recent invoices\n/pay <hash>  Open the browser payment route\n/notifications  Manage payment alerts\n/webapp  Open web app shortcuts\n/giftcards  Open the gift card area in the browser\n/unlink  Remove the linked wallet',
                );
                return;
            }

            if (query.data === 'START_CREATE') {
                await bot.sendMessage(
                    query.message.chat.id,
                    'Use /create to start the guided invoice wizard. I will walk you through type, token, amount, and memo.'
                );
                return;
            }

            await sendLinkFlow(bot, { chat: query.message.chat, from: query.from }, {
                force: query.data === 'LINK_FORCE'
            });
        } catch (error) {
            const message = error instanceof TelegramServiceError
                ? error.message
                : 'I could not create a secure link session right now.';
            await bot.sendMessage(query.message.chat.id, message);
        }
    });
};
