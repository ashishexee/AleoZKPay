const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const aiRoutes = require('./src/routes/ai.routes');
const checkoutRoutes = require('./src/routes/checkout.routes');
const invoicesRoutes = require('./src/routes/invoices.routes');
const { getInvoiceByHash } = require('./src/controllers/invoices.controller');
const merchantsRoutes = require('./src/routes/merchants.routes');
const usersRoutes = require('./src/routes/users.routes');
const supportRoutes = require('./src/routes/support.routes');
const sdkRoutes = require('./src/routes/sdk.routes');
const mcpRoutes = require('./src/routes/mcp.routes');
const scannerRoutes = require('./src/routes/scanner.routes');
const proxyRoutes = require('./src/routes/proxy.routes');
const dpsRoutes = require('./src/routes/dps.routes');
const telegramRoutes = require('./src/routes/telegram.routes');
const oracleRoutes = require('./src/routes/oracle.routes');

const app = express();
const port = process.env.PORT || 3000;
const configuredOrigins = [
    'https://nullpay.app',
    'http://localhost:5173',
    'https://testing-website-frontend.vercel.app',
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
];
const allowedOrigins = Array.from(new Set(configuredOrigins.filter(Boolean)));

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// Root
app.get('/', (req, res) => {
    res.send('AleoZKPay Backend is running');
});

// API Routes
app.use('/api', aiRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/invoices', invoicesRoutes);
app.get('/api/invoice/:hash', getInvoiceByHash);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/sdk', sdkRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/scanner/:network', scannerRoutes.scannerRouter);
app.use('/api/proxy/provable', proxyRoutes);
app.use('/api/dps', dpsRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/oracle', oracleRoutes);

console.log('Backend initialized. (Relayer daemon removed, relayer is now on-demand)');
console.log('Environment FRONTEND_URL is:', process.env.FRONTEND_URL);

// Initialize Telegram Bot
const { initBot } = require('./src/bot');
if (String(process.env.TELEGRAM_BOT_ENABLED || '').toLowerCase() === 'true') {
    initBot().catch((error) => {
        console.error('Telegram bot startup failed:', error);
    });
} else {
    console.log('Telegram bot startup skipped. Set TELEGRAM_BOT_ENABLED=true to enable Telegram bot webhooks.');
}

// START SERVER (Exported for tests)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}
module.exports = app;
