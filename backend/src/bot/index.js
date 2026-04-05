const TelegramBot = require('node-telegram-bot-api');

// Handlers
const authHandler = require('./handlers/auth');
const dashboardHandler = require('./handlers/dashboard');
const invoiceHandler = require('./handlers/invoice');
const payHandler = require('./handlers/pay');
const giftcardsHandler = require('./handlers/giftcards');
const notificationsHandler = require('./handlers/notifications');
const webappHandler = require('./handlers/webapp');
const fallbackHandler = require('./handlers/fallback');
const { startInvoiceNotificationWorker } = require('./notification-worker');

let botInstance = null;

const initBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn('⚠️ TELEGRAM_BOT_TOKEN not provided, skipping Telegram Bot initialization.');
        return null;
    }

    try {
        console.log('🤖 Initializing Telegram Bot...');
        
        // Use polling for ease of development/deployment in non-serverless environments
        const bot = new TelegramBot(token, { polling: true });

        // Initialize commands
        bot.setMyCommands([
            { command: '/start', description: 'Start the bot' },
            { command: '/link', description: 'Link your merchant wallet securely' },
            { command: '/unlink', description: 'Remove the linked wallet' },
            { command: '/dashboard', description: 'View your merchant dashboard and stats' },
            { command: '/create', description: 'Create a new invoice' },
            { command: '/invoice', description: 'Look up an invoice by hash' },
            { command: '/invoices', description: 'List recent invoices' },
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

        botInstance = bot;
        console.log('✅ Telegram Bot initialized successfully');
        return bot;
    } catch (err) {
        console.error('❌ Failed to initialize Telegram Bot:', err);
    }
};

const getBotInstance = () => botInstance;

module.exports = {
    initBot,
    getBotInstance
};
