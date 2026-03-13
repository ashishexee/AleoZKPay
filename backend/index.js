const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { encrypt, decrypt } = require('./encryption');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL = 'https://www.nullpay.app';

app.use(cors({
    origin: ['https://nullpay.app', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);


app.get('/', (req, res) => {
    res.send('AleoZKPay Backend is running');
});

app.get('/api/invoices', async (req, res) => {
    const { status, limit = 50, merchant } = req.query;
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(limit);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    const decryptedData = data.map(inv => ({
        ...inv,
        merchant_address: decrypt(inv.merchant_address)
    }));
    let finalData = decryptedData;
    if (merchant) {
        finalData = finalData.filter(inv => inv.merchant_address === merchant);
    }

    res.json(finalData);
});

app.get('/api/invoices/merchant/:address', async (req, res) => {
    const { address } = req.params;

    // Fetch recent invoices (limit 100 for now to prevent overload)
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    // Decrypt and Filter
    const merchantInvoices = data
        .map(inv => {
            const decrypted = {
                ...inv,
                merchant_address: decrypt(inv.merchant_address)
            };
            if (inv.designated_address) {
                try { decrypted.designated_address = decrypt(inv.designated_address); } catch (e) { /* keep as-is */ }
            }
            return decrypted;
        })
        .filter(inv => inv.merchant_address === address);

    res.json(merchantInvoices);
});

app.get('/api/invoices/recent', async (req, res) => {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const decryptedData = data.map(inv => {
        const decrypted = {
            ...inv,
            merchant_address: decrypt(inv.merchant_address)
        };
        if (inv.designated_address) {
            try { decrypted.designated_address = decrypt(inv.designated_address); } catch (e) { /* keep as-is */ }
        }
        return decrypted;
    });

    res.json(decryptedData);
});

app.get('/api/invoice/:hash', async (req, res) => {
    const { hash } = req.params;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_hash', hash)
        .single();

    if (error) {
        // console.error('Error fetching invoice:', error);
        return res.status(404).json({ error: 'Invoice not found' });
    }

    // Decrypt
    data.merchant_address = decrypt(data.merchant_address);
    if (data.designated_address) {
        try { 
            data.designated_address = decrypt(data.designated_address); 
            
            // Critical Fix for Burner Wallet Shared Links
            // The payer needs to see and pay the Burner (Designated) Address, NOT the Main Address!
            if (data.is_burner) {
                data.merchant_address = data.designated_address;
            }
        } catch(e) { /* keep as-is */ }
    }

    res.json(data);
});


app.post('/api/merchants/register', async (req, res) => {
    const { name, aleo_address, webhook_url } = req.body;

    if (!name || !aleo_address) {
        return res.status(400).json({ error: 'Missing required fields: name, aleo_address' });
    }

    try {
        const encryptedAddress = encrypt(aleo_address);
        // Generate a random secure API secretly starting with the prefix
        const secretKey = 'sk_test_' + crypto.randomBytes(24).toString('hex');
        
        // Salted hash for O(1) lookup without decrypting every row
        const secretKeyHash = crypto.createHash('sha256').update(secretKey).digest('hex');
        const encryptedSecretKey = encrypt(secretKey);
        const encryptedWebhookUrl = webhook_url ? encrypt(webhook_url) : null;

        const { data: merchant, error } = await supabase
            .from('merchants')
            .insert([{
                name: name,
                encrypted_aleo_address: encryptedAddress,
                encrypted_secret_key: encryptedSecretKey, // Renamed for clarity
                secret_key_hash: secretKeyHash,
                encrypted_webhook_url: encryptedWebhookUrl
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: merchant.id,
            name: merchant.name,
            secret_key: secretKey, // Only returned ONCE during creation!
            webhook_url: webhook_url || null
        });
    } catch (err) {
        console.error("Error registering merchant:", err);
        res.status(500).json({ error: 'Internal server error while registering merchant.' });
    }
});

app.post('/api/checkout/sessions', async (req, res) => {
    // 1. Authenticate the Merchant using Bearer token (secret_key)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <secret_key>' });
    }
    const secretKey = authHeader.split(' ')[1];
    const secretKeyHash = crypto.createHash('sha256').update(secretKey).digest('hex');

    // Fetch merchant from DB
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('secret_key_hash', secretKeyHash)
        .single();

    if (merchantError || !merchant) {
        return res.status(401).json({ error: 'Invalid API key.' });
    }

    // 2. Validate Request Body
    const { amount, currency, success_url, cancel_url, invoice_hash, salt: providedSalt } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
    }

    // Map string currency to our token system
    const validCurrencies = ['CREDITS', 'USDCX', 'USAD'];
    const uppercaseCurrency = currency ? currency.toUpperCase() : 'CREDITS';
    if (!validCurrencies.includes(uppercaseCurrency)) {
        return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
    }

    // 3. Use provided parameters for Multi-Pay or generate temp ones for Relayer
    let finalSalt = providedSalt;
    let finalInvoiceHash = invoice_hash;
    let initialStatus = 'PROCESSING'; // Default to Relayer flow
    let finalCurrency = uppercaseCurrency;

    if (invoice_hash && providedSalt) {
        initialStatus = 'OPEN'; // Merchant already provided the ZK parameters
        console.log(`[Checkout] Using pre-generated Multi-Pay hash: ${invoice_hash}`);
        
        // If currency wasn't explicitly provided, fetch it from the invoice
        if (!currency) {
            const { data: invoice } = await supabase
                .from('invoices')
                .select('token_type')
                .eq('invoice_hash', invoice_hash)
                .single();
            
            if (invoice) {
                finalCurrency = invoice.token_type === 1 ? 'USDCX' : invoice.token_type === 2 ? 'USAD' : 'CREDITS';
                console.log(`[Checkout] Derived currency from invoice: ${finalCurrency}`);
            }
        }
    } else {
        // Fallback to generating temp ones for the slow Relayer flow (legacy)
        const randomBuffer = crypto.randomBytes(16);
        let randomBigInt = 0n;
        for (const byte of randomBuffer) {
            randomBigInt = (randomBigInt << 8n) + BigInt(byte);
        }
        finalSalt = `${randomBigInt}field`;
        finalInvoiceHash = crypto.randomInt(100000000, 999999999).toString() + "field";
    }

    try {
        // Encypt urls
        const encryptedSuccess = success_url ? encrypt(success_url) : null;
        const encryptedCancel = cancel_url ? encrypt(cancel_url) : null;

        // 4. Create the Payment Intent in Supabase
        const { data: intent, error: intentError } = await supabase
            .from('payment_intents')
            .insert([{
                merchant_id: merchant.id,
                amount: amount,
                token_type: finalCurrency,
                salt: finalSalt,
                invoice_hash: finalInvoiceHash,
                status: initialStatus,
                success_url: encryptedSuccess,
                cancel_url: encryptedCancel
            }])
            .select()
            .single();

        if (intentError) throw intentError;

        const checkoutUrl = `${FRONTEND_URL}/checkout/${intent.id}`;

        res.status(200).json({
            id: intent.id,
            checkout_url: checkoutUrl,
            status: intent.status,
            invoice_hash: finalInvoiceHash,
            salt: finalSalt
        });

    } catch (err) {
        console.error("Error creating checkout session:", err);
        res.status(500).json({ error: 'Internal server error while creating checkout session.' });
    }
});

/**
 * Retrieves a Checkout Session for the frontend Checkout Page.
 */
app.get('/api/checkout/sessions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: intent, error } = await supabase
            .from('payment_intents')
            .select(`
                *,
                merchants:merchant_id (
                    name,
                    encrypted_aleo_address
                )
            `)
            .eq('id', id)
            .single();

        if (error || !intent) {
            return res.status(404).json({ error: 'Checkout session not found.' });
        }

        // Decrypt merchant address for the frontend
        if (intent.merchants && intent.merchants.encrypted_aleo_address) {
            intent.merchants.aleo_address = decrypt(intent.merchants.encrypted_aleo_address);
        }

        // Return safe data for the frontend (do NOT return secret_key or webhook URLs)
        const sessionData = {
            id: intent.id,
            amount: intent.amount,
            token_type: intent.token_type,
            status: intent.status,
            invoice_hash: intent.invoice_hash,
            salt: intent.salt,
            success_url: intent.success_url ? decrypt(intent.success_url) : null,
            cancel_url: intent.cancel_url ? decrypt(intent.cancel_url) : null,
            merchant_name: intent.merchants ? intent.merchants.name : 'Unknown Merchant',
            merchant_address: decrypt(intent.merchants.encrypted_aleo_address)
        };

        res.json(sessionData);

    } catch (err) {
        console.error("Error fetching checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * Updates a Checkout Session status (e.g. to SETTLED) after frontend transaction success.
 * In a fully decentralized production app, this would be done trustlessly by an Indexer parsing blocks.
 * For MVP/SDK flow, the frontend wallet calls this after confirmation.
 */
app.patch('/api/checkout/sessions/:id', async (req, res) => {
    const { id } = req.params;
    const { status, tx_id } = req.body;

    try {
        if (status !== 'SETTLED' && status !== 'FAILED') {
            return res.status(400).json({ error: 'Invalid status update.' });
        }

        // 1. Update the Payment Intent
        const { data: intent, error: updateError } = await supabase
            .from('payment_intents')
            .update({ status })
            .eq('id', id)
            .select(`
                *,
                merchants:merchant_id (
                    id,
                    encrypted_webhook_url,
                    encrypted_secret_key
                )
            `)
            .single();

        if (updateError || !intent) {
            return res.status(404).json({ error: 'Checkout session not found.' });
        }

        // 2. Dispatch Webhook if SETTLED and webhook_url exists
        if (status === 'SETTLED' && intent.merchants && intent.merchants.encrypted_webhook_url) {
            const secretKey = decrypt(intent.merchants.encrypted_secret_key);
            const webhookUrl = decrypt(intent.merchants.encrypted_webhook_url);

            const payload = {
                id: intent.id,
                amount: intent.amount,
                token_type: intent.token_type,
                status: intent.status,
                tx_id: tx_id || null,
                timestamp: new Date().toISOString()
            };

            const payloadString = JSON.stringify(payload);
            const signature = crypto
                .createHmac('sha256', secretKey)
                .update(payloadString)
                .digest('hex');

            console.log(`[Webhook] Dispatching to ${webhookUrl} for session ${intent.id}`);

            // Dispatch async (fire and forget)
            fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-nullpay-signature': signature
                },
                body: payloadString
            }).then(resp => {
                console.log(`[Webhook] Response status: ${resp.status}`);
            }).catch(err => {
                console.error(`[Webhook] Dispatch failed:`, err.message);
            });
        }

        res.json({ success: true, status: intent.status });

    } catch (err) {
        console.error("Error updating checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});
// ==========================================


app.post('/api/invoices', async (req, res) => {
    const { invoice_hash, merchant_address, designated_address, is_burner, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type, invoice_items } = req.body;

    if (!invoice_hash || !merchant_address) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const encryptedMerchant = encrypt(merchant_address);
        const encryptedDesignated = designated_address ? encrypt(designated_address) : encryptedMerchant;

        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                invoice_hash,
                merchant_address: encryptedMerchant,
                designated_address: encryptedDesignated,
                is_burner: is_burner || false,
                status: status || 'PENDING',
                invoice_transaction_id,  // Invoice creation TX
                salt: salt || null,  // Store salt for payment link generation
                invoice_type: invoice_type !== undefined ? invoice_type : 0,  // 0 = Standard, 1 = Fundraising
                token_type: token_type !== undefined ? token_type : 0,  // 0 = Credits, 1 = USDCx
                invoice_items: invoice_items || null,  // Line items for standard invoices
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        data.merchant_address = merchant_address;
        res.json(data);

    } catch (err) {
        console.error("Error creating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/invoices/:hash', async (req, res) => {
    const { hash } = req.params;
    const { status, payment_tx_ids, payer_address, block_settled } = req.body;

    try {
        const { data: current, error: fetchError } = await supabase
            .from('invoices')
            .select('payment_tx_ids, invoice_type, status, merchant_address') // Select merchant_address for decryption
            .eq('invoice_hash', hash)
            .single();

        if (fetchError) throw fetchError;

        const updates = {
            updated_at: new Date().toISOString()
        };

        if (payment_tx_ids) updates.payment_tx_ids = payment_tx_ids;
        if (block_settled) updates.block_settled = block_settled;
        // payer_address handling removed

        if (payment_tx_ids) {
            const currentIds = current.payment_tx_ids || [];
            if (!currentIds.includes(payment_tx_ids)) {
                updates.payment_tx_ids = [...currentIds, payment_tx_ids];
            }
        }

        if (status) updates.status = status;

        const { data, error } = await supabase
            .from('invoices')
            .update(updates)
            .eq('invoice_hash', hash)
            .select()
            .single();

        if (error) throw error;

        // Decrypt for response
        if (data) {
            data.merchant_address = decrypt(data.merchant_address);
            // payer_address removed
        }
        
        const hasNewPayment = payment_tx_ids && (!current.payment_tx_ids || !current.payment_tx_ids.includes(payment_tx_ids));
        console.log(`   - Has New Payment?`, hasNewPayment);

        // LOGIC FIX: If there is a payment ID in the request, it IS a new payment event.
        if (status === 'SETTLED' || payment_tx_ids) {
            console.log(`📢 Emitting payment_received for hash: ${hash}, Status: ${status}, Merchant: ${data.merchant_address}`);
            io.emit('payment_received', {
                invoiceHash: hash,
                status: data.status,
                merchantAddress: data.merchant_address,
                amount: data.amount,
                invoiceType: data.invoice_type,
                tokenType: data.token_type
            });
        }

        res.json(data);

    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/profile', async (req, res) => {
    const { main_address, burner_address, encrypted_burner_key, profile_main_invoice_hash, profile_burner_invoice_hash } = req.body;

    if (!main_address) {
        return res.status(400).json({ error: 'Missing main_address' });
    }

    try {
        // Find existing user first to get their exact encrypted main_address
        const { data: allUsers, error: fetchError } = await supabase.from('users').select('*');
        if (fetchError) throw fetchError;

        let existingUser = allUsers.find(u => {
            try { return decrypt(u.main_address) === main_address; } catch (e) { return false; }
        });

        const encryptedMain = existingUser ? existingUser.main_address : encrypt(main_address);
        const encryptedBurner = burner_address ? encrypt(burner_address) : null;
        const encryptedKey = encrypted_burner_key ? encrypt(encrypted_burner_key) : null;
        
        const updates = {
            main_address: encryptedMain,
            updated_at: new Date().toISOString()
        };

        if (burner_address !== undefined) updates.burner_address = encryptedBurner;
        if (encrypted_burner_key !== undefined) updates.encrypted_burner_key = encryptedKey;
        if (profile_main_invoice_hash !== undefined) updates.profile_main_invoice_hash = profile_main_invoice_hash;
        if (profile_burner_invoice_hash !== undefined) updates.profile_burner_invoice_hash = profile_burner_invoice_hash;

        let data, error;
        
        if (existingUser) {
            const response = await supabase
                .from('users')
                .update(updates)
                .eq('main_address', existingUser.main_address)
                .select()
                .single();
            data = response.data;
            error = response.error;
        } else {
            const response = await supabase
                .from('users')
                .insert(updates)
                .select()
                .single();
            data = response.data;
            error = response.error;
        }

        if (error) throw error;

        // Return decrypted values in the response
        data.main_address = main_address;
        if (burner_address) data.burner_address = burner_address;
        if (encrypted_burner_key) data.encrypted_burner_key = encrypted_burner_key;
        
        res.json(data);

    } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/profile/:address', async (req, res) => {
    const { address } = req.params;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const userProfile = data.find(u => {
            try {
                return decrypt(u.main_address) === address;
            } catch (e) {
                return false;
            }
        });

        if (!userProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Decrypt all sensitive fields before returning
        userProfile.main_address = address;
        if (userProfile.burner_address) {
            try { userProfile.burner_address = decrypt(userProfile.burner_address); } catch (e) { userProfile.burner_address = null; }
        }
        if (userProfile.encrypted_burner_key) {
            try { userProfile.encrypted_burner_key = decrypt(userProfile.encrypted_burner_key); } catch (e) { userProfile.encrypted_burner_key = null; }
        }
        res.json(userProfile);

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: err.message });
    }
});


console.log('Backend initialized. (Relayer daemon removed, relayer is now on-demand)');

// START SERVER
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
