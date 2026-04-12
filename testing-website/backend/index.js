require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { NullPay } = require('@nullpay/node');

const app = express();
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY || 'sk_test_5009580add92a440acb1207ffbe329a80b968c857951f12c', // Connected to DB!
    baseURL: process.env.NULLPAY_BASE_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
    projectRoot: __dirname,
    configPath: path.join(__dirname, 'nullpay.json')
})

const PORT = 4000;
const configuredInvoices = nullpay.invoices.getAll();
const frontendUrl = process.env.FRONTEND_URL || 'https://testing-website-frontend.vercel.app/';

const buildSuccessType = (invoice) => {
    if (invoice.type === 'donation') return 'donation';
    if (invoice.type === 'multipay') return 'subscription';
    return 'invoice';
};

for (const invoice of configuredInvoices) {
    app.post(`/api/${invoice.name}`, async (req, res) => {
        try {
            console.log(`[Merchant] Fixed checkout using invoice "${invoice.name}"`);

            const session = await nullpay.checkout.sessions.create({
                nullpay_invoice_name: invoice.name,
                success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=${buildSuccessType(invoice)}`,
                cancel_url: `${frontendUrl}?cancel=true`
            });

            res.json({ checkoutUrl: session.checkout_url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });
}

app.post('/api/checkout/variable', async (req, res) => {
    try {
        const { currency, price, tokens } = req.body;
        console.log(`[Merchant] Variable tokens: ${tokens} for ${price} ${currency}`);
        
        const session = await nullpay.checkout.sessions.create({
            amount: price,
            currency: currency,
            success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=variable&tokens=${tokens}`,
            cancel_url: `${frontendUrl}?cancel=true`
        });
        res.json({ checkoutUrl: session.checkout_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/verify-session', async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
        
        console.log(`[Merchant] Verifying session: ${session_id}`);
        const session = await nullpay.checkout.sessions.retrieve(session_id);
        
        if (session.status === 'SETTLED') {
            res.json({ success: true, isPremium: true });
        } else {
            res.json({ success: false, isPremium: false, status: session.status });
        }
    } catch (error) {
        console.error('[Merchant] Verify Session Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Webhook Route: Receive fulfillment notifications from NullPay
app.post('/api/webhook', (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.rawBody, signature);

        console.log(`\n✅ [Merchant Webhook] Verified Event Received: ${event.id}`);
        console.log(`   - Status: ${event.status}`);
        console.log(`   - Amount: ${event.amount} ${event.token_type}`);

        if (event.status === 'SETTLED') {
            console.log(`   - 🛍️ FULFILLING ORDER! TX ID: ${event.tx_id}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error(`❌ [Merchant Webhook] Security Error:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Merchant Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
