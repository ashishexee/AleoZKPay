const express = require('express');
const cors = require('cors');
const path = require('path');


require('dotenv').config({ path: path.join(__dirname, '.env') });

const aiRoutes = require('./src/routes/ai.routes');
const checkoutRoutes = require('./src/routes/checkout.routes');
const invoicesRoutes = require('./src/routes/invoices.routes');
const merchantsRoutes = require('./src/routes/merchants.routes');
const usersRoutes = require('./src/routes/users.routes');
const sdkRoutes = require('./src/routes/sdk.routes');
const mcpRoutes = require('./src/routes/mcp.routes');
const scannerRoutes = require('./src/routes/scanner.routes');
const proxyRoutes = require('./src/routes/proxy.routes');
const dpsRoutes = require('./src/routes/dps.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: ['https://nullpay.app', 'http://localhost:5173', 'https://testing-website-frontend.vercel.app'],
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
app.use('/api/merchants', merchantsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sdk', sdkRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/scanner', scannerRoutes.scannerRouter);
app.use('/api/proxy/provable', proxyRoutes);
app.use('/api/dps', dpsRoutes);

console.log('Backend initialized. (Relayer daemon removed, relayer is now on-demand)');

// Initialize Telegram Bot
const { initBot } = require('./src/bot');
initBot();

// START SERVER (Exported for tests)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}
module.exports = app;