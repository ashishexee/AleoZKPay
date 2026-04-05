const {
    TelegramServiceError,
    createLinkSession,
    getLinkSession,
    completeLinkSession,
    unlinkTelegramUser
} = require('../services/telegram.service');
const { getBotInstance } = require('../bot');
const {
    buildTelegramBotAppUrl,
    buildTelegramBotWebUrl
} = require('../utils/telegram');

function handleTelegramError(res, error) {
    if (error instanceof TelegramServiceError) {
        return res.status(error.status || 500).json({ error: error.message });
    }

    console.error('Telegram controller error:', error);
    return res.status(500).json({ error: error.message || 'Telegram integration failed.' });
}

const createTelegramLinkSession = async (req, res) => {
    try {
        const { telegram_id, chat_id, username } = req.body || {};
        if (!telegram_id || !chat_id) {
            return res.status(400).json({ error: 'telegram_id and chat_id are required.' });
        }

        const session = await createLinkSession({
            telegramId: telegram_id,
            chatId: chat_id,
            username: username || null
        });

        res.status(201).json(session);
    } catch (error) {
        handleTelegramError(res, error);
    }
};

const getTelegramLinkSession = async (req, res) => {
    try {
        const session = await getLinkSession(req.params.token);
        if (!session) {
            return res.status(404).json({ error: 'Link session not found.' });
        }

        res.json(session);
    } catch (error) {
        handleTelegramError(res, error);
    }
};

const completeTelegramLinkSession = async (req, res) => {
    try {
        const { token, aleo_address, signature_base64, username } = req.body || {};
        if (!token || !aleo_address || !signature_base64) {
            return res.status(400).json({ error: 'token, aleo_address, and signature_base64 are required.' });
        }

        const user = await completeLinkSession({
            token,
            aleoAddress: aleo_address,
            signatureBase64: signature_base64,
            username: username || null
        });

        const bot = getBotInstance();
        if (bot && user?.chat_id) {
            try {
                await bot.sendMessage(
                    user.chat_id,
                    `✅ Your NullPay merchant wallet is now linked.\n\nWallet: \`${user.aleo_address}\`\n\nYou can continue right away with /dashboard for a summary or /create to issue a new invoice.`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '📊 Dashboard', callback_data: 'OPEN_DASHBOARD' },
                                    { text: '🧾 Create Invoice', callback_data: 'START_CREATE' }
                                ],
                                [
                                    { text: '🌐 Open Web App', callback_data: 'OPEN_WEBAPP' }
                                ]
                            ]
                        }
                    }
                );
            } catch (botError) {
                console.error('Telegram link success message failed:', botError);
            }
        }

        res.json({
            success: true,
            user,
            telegram_app_url: buildTelegramBotAppUrl('linked'),
            telegram_web_url: buildTelegramBotWebUrl('linked')
        });
    } catch (error) {
        handleTelegramError(res, error);
    }
};

const unlinkTelegramAccount = async (req, res) => {
    try {
        const { telegram_id } = req.body || {};
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id is required.' });
        }

        await unlinkTelegramUser(telegram_id);
        res.json({ success: true });
    } catch (error) {
        handleTelegramError(res, error);
    }
};

module.exports = {
    createTelegramLinkSession,
    getTelegramLinkSession,
    completeTelegramLinkSession,
    unlinkTelegramAccount
};
