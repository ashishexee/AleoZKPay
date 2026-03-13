require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { NullPay } = require('@nullpay/node');

const app = express();
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY || 'sk_test_4cfbf9520fea6230929e20c7f41fc5ec32d1a54b3d2b2d90', // Connected to DB!
    baseURL: 'http://localhost:3000/v1'
});

const PORT = 4000;

app.post('/api/create-checkout', async (req, res) => {
    try {
        const { item, price } = req.body;
        console.log(`[Merchant] Creating checkout for ${item} at ${price}`);
        const session = await nullpay.checkout.sessions.create({
            amount: price,
            invoice_hash: '947784221320317855223851146427035324574742326751465596223330701216638110914field', // Example Multi-Pay Hash
            salt: '175790449236021826210524364451519030111field',
            success_url: `http://localhost:5174/success`,
            cancel_url: `http://localhost:5174/cart`
        });
        res.json({ checkoutUrl: session.checkout_url });
    } catch (error) {
        console.error('[Merchant] Checkout Error:', error.message);
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

app.listen(PORT, () => {
    console.log(`Merchant Backend running on http://localhost:${PORT}`);
    console.log(`-> Waiting for checkout requests...`);
});
