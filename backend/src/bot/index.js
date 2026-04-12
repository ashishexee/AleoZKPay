const TelegramBot = require('node-telegram-bot-api');
const authHandler = require('./handlers/auth');
const dashboardHandler = require('./handlers/dashboard');
const invoiceHandler = require('./handlers/invoice');
const payHandler = require('./handlers/pay');
const giftcardsHandler = require('./handlers/giftcards');
const notificationsHandler = require('./handlers/notifications');
const webappHandler = require('./handlers/webapp');
const fallbackHandler = require('./handlers/fallback');
const { startInvoiceNotificationWorker } = require('./notification-worker');
const { BACKEND_URL, TELEGRAM_WEBHOOK_SECRET } = require('../utils/constants');

let botInstance = null;

function buildWebhookUrl() {
    if (!BACKEND_URL) {
        throw new Error('BACKEND_URL is required for Telegram webhook mode.');
    }

    const webhookPath = TELEGRAM_WEBHOOK_SECRET
        ? `/api/telegram/webhook/${encodeURIComponent(TELEGRAM_WEBHOOK_SECRET)}`
        : '/api/telegram/webhook';

    return `${BACKEND_URL}${webhookPath}`;
}

const initBot = async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn('⚠️ TELEGRAM_BOT_TOKEN not provided, skipping Telegram Bot initialization.');
        return null;
    }

    if (botInstance) {
        return botInstance;
    }

    try {
        console.log('🤖 Initializing Telegram Bot...');

        const bot = new TelegramBot(token);

        // Initialize commands
        await bot.setMyCommands([
            { command: '/start', description: 'Start the bot' },
            { command: '/link', description: 'Link your merchant wallet securely' },
            { command: '/unlink', description: 'Remove the linked wallet' },
            { command: '/dashboard', description: 'View your merchant dashboard and stats' },
            { command: '/create', description: 'Create a new invoice' },
            { command: '/invoice', description: 'Look up an invoice by hash' },
            { command: '/invoices', description: 'List recent invoices' },
            { command: '/verify', description: 'Check a receipt hash against an invoice flow' },
            { command: '/pay', description: 'Get a payment link for an invoice' },
            { command: '/giftcards', description: 'Open gift cards in the browser' },
            { command: '/webapp', description: 'Open NullPay browser shortcuts' },
            { command: '/notifications', description: 'Manage payment alerts' }
        ]);

        authHandler(bot);
        dashboardHandler(bot);
        invoiceHandler(bot);
        payHandler(bot);
        giftcardsHandler(bot);
        notificationsHandler(bot);
        webappHandler(bot);
        fallbackHandler(bot);
        startInvoiceNotificationWorker(bot);

        const webhookUrl = buildWebhookUrl();
        await bot.setWebHook(webhookUrl, TELEGRAM_WEBHOOK_SECRET
            ? { secret_token: TELEGRAM_WEBHOOK_SECRET }
            : undefined);

        botInstance = bot;
        console.log(`✅ Telegram Bot initialized successfully in webhook mode: ${webhookUrl}`);
        return bot;
    } catch (err) {
        console.error('❌ Failed to initialize Telegram Bot:', err);
        return null;
    }
};

const getBotInstance = () => botInstance;

module.exports = {
    initBot,
    getBotInstance
};
