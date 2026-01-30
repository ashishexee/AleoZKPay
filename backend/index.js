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
        merchant_address: decrypt(inv.merchant_address),
        payer_address: decrypt(inv.payer_address)
    }));

    // Apply merchant filter in memory if requested (since encryption is randomized)
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
        .limit(100);

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    // Decrypt and Filter
    const merchantInvoices = data
        .map(inv => ({
            ...inv,
            merchant_address: decrypt(inv.merchant_address),
            payer_address: decrypt(inv.payer_address)
        }))
        .filter(inv => inv.merchant_address === address);

    res.json(merchantInvoices);
});

// GET /api/invoices/recent
// Public explorer data
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

    const decryptedData = data.map(inv => ({
        ...inv,
        merchant_address: decrypt(inv.merchant_address),
        payer_address: decrypt(inv.payer_address)
    }));

    res.json(decryptedData);
});


// GET /api/invoice/:hash
// Fetch a single invoice by hash
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
    data.payer_address = decrypt(data.payer_address);

    res.json(data);
});

// POST /api/invoices
// Create new invoice
app.post('/api/invoices', async (req, res) => {
    const { invoice_hash, merchant_address, amount, memo, status, invoice_transaction_id, salt, invoice_type } = req.body;

    if (!invoice_hash || !merchant_address || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const encryptedMerchant = encrypt(merchant_address);

        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                invoice_hash,
                merchant_address: encryptedMerchant,
                amount,
                memo,
                status: status || 'PENDING',
                invoice_transaction_id,  // Invoice creation TX
                salt: salt || null,  // Store salt for payment link generation
                invoice_type: invoice_type !== undefined ? invoice_type : 0,  // 0 = Standard, 1 = Fundraising
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Return decrypted
        data.merchant_address = merchant_address;
        res.json(data);

    } catch (err) {
        console.error("Error creating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/invoices/:hash
// Update invoice status (e.g. after payment)
app.patch('/api/invoices/:hash', async (req, res) => {
    const { hash } = req.params;
    const { status, payment_tx_ids, payer_address, block_settled } = req.body;

    try {
        // First, fetch the current invoice to get existing array
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
        if (payer_address) {
            updates.payer_address = encrypt(payer_address);
        }

        // Handle Block Settled
        if (block_settled) updates.block_settled = block_settled;

        // Handle Payment TX ID (Append to array)
        if (payment_tx_id) {
            const currentIds = current.payment_tx_ids || [];
            // Avoid duplicates
            if (!currentIds.includes(payment_tx_id)) {
                updates.payment_tx_ids = [...currentIds, payment_tx_id];
            }
        }

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
            data.payer_address = decrypt(data.payer_address);
        }

        res.json(data);

    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
