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
    secretKey: process.env.NULLPAY_SECRET_KEY || 'sk_test_bb8c865db17348c2f5659450d09a1632e1df4690c4015c68',
    baseURL: process.env.NULLPAY_BASE_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
    projectRoot: __dirname,
    configPath: path.join(__dirname, 'nullpay.json')
});

const PORT = 4000;
const configuredInvoices = nullpay.invoices.getAll();
const frontendUrl = process.env.FRONTEND_URL || 'https://testing-website-frontend.vercel.app/';

// In-memory store for webhook data (sessionId -> { status, txId, amount, tokenType, timestamp })
const orderStatusStore = new Map();

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
// Use express.raw specifically for this route to get untouched body for HMAC verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.body.toString(), signature);

        console.log(`\n✅ [Merchant Webhook] Verified Event Received: ${event.id}`);
        console.log(`   - Status: ${event.status}`);
        console.log(`   - Amount: ${event.amount} ${event.token_type}`);

        if (event.status === 'SETTLED') {
            // Store the settlement data in our in-memory store
            orderStatusStore.set(event.id, {
                status: 'SETTLED',
                txId: event.tx_id,
                amount: event.amount,
                tokenType: event.token_type,
                invoiceName: event.nullpay_invoice_name || event.invoice_name || null,
                timestamp: Date.now()
            });
            console.log(`   - 🛍️ Order SETTLED! TX ID: ${event.tx_id}`);
            console.log(`   - Invoice: ${event.nullpay_invoice_name || 'unknown'}`);
            console.log(`   - Stored in memory store. Total orders: ${orderStatusStore.size}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error(`❌ [Merchant Webhook] Security Error:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Order status endpoint (for frontend polling)
app.get('/api/order-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    console.log(`[Merchant] Checking order status for: ${sessionId}`);

    const stored = orderStatusStore.get(sessionId);
    if (stored) {
        console.log(`[Merchant] Found stored status:`, stored);
        return res.json({
            status: stored.status,
            txId: stored.txId,
            amount: stored.amount,
            tokenType: stored.tokenType,
            invoiceName: stored.invoiceName
        });
    }

    // Fallback: check with NullPay directly if not in our store yet
    nullpay.checkout.sessions.retrieve(sessionId)
        .then(session => {
            console.log(`[Merchant] NullPay session status: ${session.status}`);
            return res.json({
                status: session.status,
                txId: session.tx_id || null,
                amount: session.amount || null,
                tokenType: session.currency || null,
                invoiceName: session.nullpay_invoice_name || null
            });
        })
        .catch(err => {
            console.error(`[Merchant] Error checking session:`, err.message);
            res.status(500).json({ error: err.message });
        });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Merchant Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
