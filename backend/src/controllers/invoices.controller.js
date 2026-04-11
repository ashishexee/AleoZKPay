const supabase = require('../config/supabase');
const crypto = require('crypto');
const { readMerchantStoredValue, sha256Hex } = require('../utils/crypto');
const { normalizePaymentTxIds } = require('../utils/invoices');

const normalizePaymentTimestamps = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).filter(([txId, timestamp]) => {
            return typeof txId === 'string'
                && txId.length > 0
                && typeof timestamp === 'string'
                && !Number.isNaN(Date.parse(timestamp));
        })
    );
};

const getInvoices = async (req, res) => {
    const { status, limit = 50, merchant_hash } = req.query;
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(limit);

    if (status) {
        query = query.eq('status', status);
    }
    if (merchant_hash) {
        query = query.eq('merchant_address_hash', merchant_hash);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};

const getInvoicesByMerchant = async (req, res) => {
    const { hash } = req.params;
    const { for_sdk } = req.query;

    let query = supabase
        .from('invoices')
        .select('*')
        .eq('merchant_address_hash', hash)
        .order('created_at', { ascending: false })
        .limit(5000);

    if (for_sdk === 'true') {
        query = query.eq('for_sdk', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};

const getRecentInvoices = async (req, res) => {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};

const getInvoiceByHash = async (req, res) => {
    const { hash } = req.params;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_hash', hash)
        .single();

    if (error) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    if (data.is_burner && data.designated_address) {
        data.merchant_address = data.designated_address;
    }

    res.json(data);
};

const createInvoice = async (req, res) => {
    const { invoice_hash, merchant_address, designated_address, merchant_address_hash, is_burner, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type, invoice_items, for_sdk, allowed_tokens } = req.body;

    if (!invoice_hash || !merchant_address) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                invoice_hash,
                merchant_address,
                merchant_address_hash: merchant_address_hash || (merchant_address ? sha256Hex(merchant_address) : null),
                designated_address: designated_address || merchant_address,
                is_burner: is_burner || false,
                status: status || 'PENDING',
                invoice_transaction_id,
                salt: salt || null,
                invoice_type: invoice_type !== undefined ? invoice_type : 0,
                token_type: token_type !== undefined ? token_type : 0,
                for_sdk: for_sdk === true,
                invoice_items: invoice_items || null,
                allowed_tokens: allowed_tokens || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);

    } catch (err) {
        console.error("Error creating invoice:", err);
        res.status(500).json({ error: err.message });
    }
};

const updateInvoice = async (req, res) => {
    const { hash } = req.params;
    const { status, payment_tx_ids, payer_address, block_settled, session_id } = req.body;

    try {
        const { data: current, error: fetchError } = await supabase
            .from('invoices')
            .select('payment_tx_ids, payment_timestamps, invoice_type, status, merchant_address') 
            .eq('invoice_hash', hash)
            .single();

        if (fetchError) throw fetchError;

        const updates = {
            updated_at: new Date().toISOString()
        };
        if (block_settled) updates.block_settled = block_settled;

        if (payment_tx_ids) {
            const currentIds = normalizePaymentTxIds(current.payment_tx_ids);
            const incomingIds = normalizePaymentTxIds(payment_tx_ids);
            updates.payment_tx_ids = Array.from(new Set([...currentIds, ...incomingIds]));

            const currentTimestamps = normalizePaymentTimestamps(current.payment_timestamps);
            const mergedTimestamps = { ...currentTimestamps };
            const recordedAt = new Date().toISOString();

            incomingIds.forEach((txId) => {
                if (!mergedTimestamps[txId]) {
                    mergedTimestamps[txId] = recordedAt;
                }
            });

            updates.payment_timestamps = mergedTimestamps;
        }

        if (status) updates.status = status;

        const { data, error } = await supabase
            .from('invoices')
            .update(updates)
            .eq('invoice_hash', hash)
            .select()
            .single();

        if (error) throw error;

        const incomingIds = normalizePaymentTxIds(payment_tx_ids);
        const currentIds = normalizePaymentTxIds(current.payment_tx_ids);
        const hasNewPayment = incomingIds.some(id => !currentIds.includes(id));
        console.log(`   - Has New Payment?`, hasNewPayment);

        if (status === 'SETTLED' || payment_tx_ids) {
            console.log(`📢 Backend detected SETTLED event for hash: ${hash}, Status: ${status}, Merchant: ${data.merchant_address}`);

            if (status === 'SETTLED') {
                try {
                    let intentIdToSync = session_id;

                    if (!intentIdToSync) {
                        const { data: intentInfo } = await supabase
                            .from('payment_intents')
                            .select('id')
                            .eq('invoice_hash', hash)
                            .maybeSingle();
                        if (intentInfo) intentIdToSync = intentInfo.id;
                    }

                    if (intentIdToSync) {
                        console.log(`🔗 Matching SDK Session found (${intentIdToSync}). Triggering direct sync & webhooks...`);

                        const { data: intent, error: updateError } = await supabase
                            .from('payment_intents')
                            .update({ status: 'SETTLED' })
                            .eq('id', intentIdToSync)
                            .select(`
                                *,
                                merchants:merchant_id (
                                    id,
                                    encrypted_webhook_url,
                                    encrypted_secret_key
                                )
                            `)
                            .single();

                        if (!updateError && intent) {
                            console.log(`✅ SDK Session ${intent.id} synced directly in DB.`);

                            if (intent.merchants && intent.merchants.encrypted_webhook_url) {
                                try {
                                    const secretKey = readMerchantStoredValue(intent.merchants.encrypted_secret_key);
                                    const webhookUrl = readMerchantStoredValue(intent.merchants.encrypted_webhook_url);

                                    const payload = {
                                        id: intent.id,
                                        amount: intent.amount,
                                        token_type: intent.token_type,
                                        status: intent.status,
                                        tx_id: incomingIds[0] || null,
                                        timestamp: new Date().toISOString()
                                    };

                                    const payloadString = JSON.stringify(payload);
                                    const signature = crypto
                                        .createHmac('sha256', secretKey)
                                        .update(payloadString)
                                        .digest('hex');

                                    fetch(webhookUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'x-nullpay-signature': signature
                                        },
                                        body: payloadString
                                    }).catch(err => {
                                        console.error(`[Webhook] Dispatch failed:`, err.message);
                                    });
                                } catch (err) {
                                    console.error("Webhook processing error:", err);
                                }
                            }
                        } else {
                            console.error("❌ Failed to update intent via Supabase auto-sync:", updateError);
                        }
                    }
                } catch (syncError) {
                    console.error("Failed to lookup intent for auto-sync:", syncError);
                }
            }
        }

        res.json(data);

    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: err.message });
    }
};

const deleteInvoice = async (req, res) => {
    const { hash } = req.params;
    const { merchant_address_hash, deletion_transaction_id } = req.body || {};

    if (!merchant_address_hash) {
        return res.status(400).json({ error: 'Missing merchant_address_hash' });
    }

    try {
        const { data: current, error: fetchError } = await supabase
            .from('invoices')
            .select('invoice_hash, merchant_address_hash, status, payment_tx_ids')
            .eq('invoice_hash', hash)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (current.merchant_address_hash !== merchant_address_hash) {
            return res.status(403).json({ error: 'Invoice does not belong to this merchant.' });
        }

        const paymentTxIds = normalizePaymentTxIds(current.payment_tx_ids);
        if (current.status === 'SETTLED' || paymentTxIds.length > 0) {
            return res.status(409).json({ error: 'Invoices with recorded payments cannot be deleted.' });
        }

        const { error: deleteError } = await supabase
            .from('invoices')
            .delete()
            .eq('invoice_hash', hash);

        if (deleteError) throw deleteError;

        res.json({
            success: true,
            invoice_hash: hash,
            deletion_transaction_id: deletion_transaction_id || null
        });
    } catch (err) {
        console.error('Error deleting invoice:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getInvoices,
    getInvoicesByMerchant,
    getRecentInvoices,
    getInvoiceByHash,
    createInvoice,
    updateInvoice,
    deleteInvoice
};
