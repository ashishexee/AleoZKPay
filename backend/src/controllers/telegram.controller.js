const {
    TelegramServiceError,
    createLinkSession,
    getLinkSession,
    completeLinkSession,
    getLinkedTelegramUsersByAddressHash,
    unlinkTelegramUser
} = require('../services/telegram.service');
const { getBotInstance } = require('../bot');
const {
    buildTelegramBotAppUrl,
    buildTelegramBotWebUrl
} = require('../utils/telegram');
const { TELEGRAM_WEBHOOK_SECRET } = require('../utils/constants');

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
        const { token, aleo_address, signature_base64, username, aleo_address_client_ciphertext } = req.body || {};
        if (!token || !aleo_address || !signature_base64) {
            return res.status(400).json({ error: 'token, aleo_address, and signature_base64 are required.' });
        }

        const user = await completeLinkSession({
            token,
            aleoAddress: aleo_address,
            signatureBase64: signature_base64,
            username: username || null,
            aleoAddressClientCiphertext: aleo_address_client_ciphertext || null
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

const getLinkedTelegramAccounts = async (req, res) => {
    try {
        const { addressHash } = req.params;
        if (!addressHash) {
            return res.status(400).json({ error: 'addressHash is required.' });
        }

        const users = await getLinkedTelegramUsersByAddressHash(addressHash);
        res.json(users.map((user) => ({
            id: user.id,
            username: user.username || null,
            telegram_id: user.telegram_id ? String(user.telegram_id).slice(0, 2) + '***' : null,
            chat_id: user.chat_id ? String(user.chat_id).slice(0, 2) + '***' : null,
            notifications_enabled: user.notifications_enabled,
            linked_at: user.linked_at
        })));
    } catch (error) {
        handleTelegramError(res, error);
    }
};

const handleTelegramWebhook = async (req, res) => {
    try {
        if (TELEGRAM_WEBHOOK_SECRET) {
            const headerSecret = String(req.get('x-telegram-bot-api-secret-token') || '').trim();
            const paramSecret = String(req.params.secret || '').trim();
            if (headerSecret !== TELEGRAM_WEBHOOK_SECRET || paramSecret !== TELEGRAM_WEBHOOK_SECRET) {
                return res.status(403).json({ error: 'Invalid Telegram webhook secret.' });
            }
        }

        const bot = getBotInstance();
        if (!bot) {
            return res.status(503).json({ error: 'Telegram bot is not initialized.' });
        }

        await bot.processUpdate(req.body);
        return res.sendStatus(200);
    } catch (error) {
        console.error('Telegram webhook processing failed:', error);
        return res.sendStatus(200);
    }
};

module.exports = {
    createTelegramLinkSession,
    getTelegramLinkSession,
    completeTelegramLinkSession,
    getLinkedTelegramAccounts,
    unlinkTelegramAccount,
    handleTelegramWebhook
};
