const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { encrypt, decrypt } = require('./encryption');

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
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
                try { decrypted.designated_address = decrypt(inv.designated_address); } catch(e) { /* keep as-is */ }
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
            try { decrypted.designated_address = decrypt(inv.designated_address); } catch(e) { /* keep as-is */ }
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
        try { data.designated_address = decrypt(data.designated_address); } catch(e) { /* keep as-is */ }
    }

    res.json(data);
});

// POST /api/invoices
// Create new invoice
app.post('/api/invoices', async (req, res) => {
    const { invoice_hash, merchant_address, designated_address, is_burner, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type } = req.body;

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
            .select('payment_tx_ids, invoice_type, status')
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

        res.json(data);

    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------
// USER PROFILE ROUTES
// ------------------

// POST /api/users/profile
// Create or update a merchant's profile (specifically for Burner Wallet)
app.post('/api/users/profile', async (req, res) => {
    const { main_address, burner_address, encrypted_burner_key } = req.body;

    if (!main_address) {
        return res.status(400).json({ error: 'Missing main_address' });
    }

    try {
        const encryptedMain = encrypt(main_address);
        const encryptedBurner = burner_address ? encrypt(burner_address) : null;
        const encryptedKey = encrypted_burner_key ? encrypt(encrypted_burner_key) : null;
        
        const { data, error } = await supabase
            .from('users')
            .upsert({
                main_address: encryptedMain,
                burner_address: encryptedBurner,
                encrypted_burner_key: encryptedKey,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        
        // Return decrypted values in the response
        data.main_address = main_address;
        data.burner_address = burner_address || null;
        data.encrypted_burner_key = encrypted_burner_key || null;
        res.json(data);

    } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/profile/:address
// Fetch a merchant's profile
app.get('/api/users/profile/:address', async (req, res) => {
    const { address } = req.params;

    try {
        // Because main addresses are deterministically encrypted (or randomized depending on implementation),
        // filtering requires fetching and decrypting if it's randomized. 
        // Assuming your `encrypt(main_address)` produces a constant value for the same input (deterministic IV or hashing based), we can match.
        // If not deterministic, we must fetch all and filter in memory like the invoices route.
        // Let's use the memory filter approach to be safe and consistent with your invoices logic.

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
            try { userProfile.burner_address = decrypt(userProfile.burner_address); } catch(e) { userProfile.burner_address = null; }
        }
        if (userProfile.encrypted_burner_key) {
            try { userProfile.encrypted_burner_key = decrypt(userProfile.encrypted_burner_key); } catch(e) { userProfile.encrypted_burner_key = null; }
        }
        res.json(userProfile);

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
