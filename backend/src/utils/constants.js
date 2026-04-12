const FRONTEND_URL = String(process.env.FRONTEND_URL || 'https://nullpay.app').replace(/\/+$/, '');
const BACKEND_URL = String(process.env.BACKEND_URL || '').replace(/\/+$/, '');
const TELEGRAM_WEBHOOK_SECRET = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

module.exports = {
    FRONTEND_URL,
    BACKEND_URL,
    TELEGRAM_WEBHOOK_SECRET
};
