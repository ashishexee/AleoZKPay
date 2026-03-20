require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { NullPay } = require('../../packages/nullpay-node');

const app = express();
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY || 'sk_test_b26bc0d7dfdc4e5411a13a6b2fa6fc420c491e6a5bcb6d64', // Connected to DB!
    baseURL: 'http://localhost:3000/api'
})

const PORT = 4000;

app.post('/api/checkout/subscription', async (req, res) => {
    try {
        const { plan, currency, price } = req.body;
        console.log(`[Merchant] Subscription ${plan} for ${price} ${currency}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        
        const invoice_hash = '1115746144388697626639199193629687485898491210296849134687801972477586805400field';
        const salt = '337031781705903168303998209154958292665field';
        
        const session = await nullpay.checkout.sessions.create({
            amount: price,
            currency: currency,
            invoice_hash: invoice_hash,
            salt: salt,
            type: 'multipay',
            success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
            cancel_url: `${frontendUrl}?cancel=true`
        });
        res.json({ checkoutUrl: session.checkout_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/checkout/variable', async (req, res) => {
    try {
        const { currency, price, tokens } = req.body;
        console.log(`[Merchant] Variable tokens: ${tokens} for ${price} ${currency}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        
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

app.post('/api/checkout/donation', async (req, res) => {
    try {
        const { currency } = req.body;
        console.log(`[Merchant] Donation checkout`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        
        const selectedCurrency = currency || 'ANY';
        const donationProfiles = {
            'ANY': {
                invoice_hash: '7167194528543310640668211878990154455921306305510946765880923777746223215089field',
                salt: '131409810070759530479978900745021806493field'
            },
            'CREDITS': {
                invoice_hash: '2225746144388697626639199193629687485898491210296849134687801972477586805400field',
                salt: '447031781705903168303998209154958292665field'
            },
            'USDCX': {
                invoice_hash: '3335746144388697626639199193629687485898491210296849134687801972477586805400field',
                salt: '557031781705903168303998209154958292665field'
            },
            'USAD': {
                invoice_hash: '4445746144388697626639199193629687485898491210296849134687801972477586805400field',
                salt: '667031781705903168303998209154958292665field'
            }
        };

        const { invoice_hash, salt } = donationProfiles[selectedCurrency] || donationProfiles['ANY'];

        const session = await nullpay.checkout.sessions.create({
            type: 'donation',
            currency: selectedCurrency,
            invoice_hash: invoice_hash,
            salt: salt,
            success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=donation`,
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
