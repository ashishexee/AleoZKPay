const TelegramBot = require('node-telegram-bot-api');

// Handlers
const authHandler = require('./handlers/auth');
const dashboardHandler = require('./handlers/dashboard');
const invoiceHandler = require('./handlers/invoice');
const payHandler = require('./handlers/pay');
const giftcardsHandler = require('./handlers/giftcards');

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
            { command: '/link', description: 'Link your Aleo Merchant Address' },
            { command: '/dashboard', description: 'View your merchant dashboard and stats' },
            { command: '/create', description: 'Create a new invoice' },
            { command: '/invoice', description: 'Look up an invoice by hash' },
            { command: '/pay', description: 'Get a payment link for an invoice' },
            { command: '/giftcards', description: 'Interact with NullPay Gift Cards' }
        ]);

        authHandler(bot);
        dashboardHandler(bot);
        invoiceHandler(bot);
        payHandler(bot);
        giftcardsHandler(bot);

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
