const supabase = require('../config/supabase');
const crypto = require('crypto');
const { readMerchantStoredValue, sha256Hex } = require('../utils/crypto');
const { FRONTEND_URL } = require('../utils/constants');

const createSession = async (req, res) => {
    const merchant = req.merchant;
    const { amount, currency, success_url, cancel_url, invoice_hash, salt: providedSalt, invoice_type, type } = req.body;
    
    let finalInvoiceType = invoice_type !== undefined ? invoice_type : 0;
    if (invoice_type === undefined && type) {
        if (type === 'multipay') finalInvoiceType = 1;
        else if (type === 'donation') finalInvoiceType = 2;
        else finalInvoiceType = 0;
    }

    if (finalInvoiceType !== 2 && (!amount || typeof amount !== 'number' || amount <= 0)) {
        return res.status(400).json({ error: 'Invalid amount. Must be a positive number for standard invoices.' });
    }

    const validCurrencies = ['CREDITS', 'USDCX', 'USAD', 'ANY'];
    const uppercaseCurrency = currency ? currency.toUpperCase() : 'CREDITS';
    if (!validCurrencies.includes(uppercaseCurrency)) {
        return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
    }
    if (uppercaseCurrency === 'ANY' && finalInvoiceType !== 2) {
        return res.status(400).json({ error: 'ANY token mode is only supported for donation invoices.' });
    }

    let finalSalt = providedSalt;
    let finalInvoiceHash = invoice_hash;
    let initialStatus = 'PROCESSING'; 
    let finalCurrency = uppercaseCurrency;

    if (invoice_hash && providedSalt) {
        initialStatus = 'OPEN';
        // const typeName = finalInvoiceType === 1 ? 'Multi-Pay' : (finalInvoiceType === 2 ? 'Donation' : 'Standard');
        
        if (!currency) {
            const { data: invoice } = await supabase
                .from('invoices')
                .select('token_type')
                .eq('invoice_hash', invoice_hash)
                .single();

            if (invoice) {
                finalCurrency = invoice.token_type === 3
                    ? 'ANY'
                    : invoice.token_type === 1
                        ? 'USDCX'
                        : invoice.token_type === 2
                            ? 'USAD'
                            : 'CREDITS';
            }
        }
    } else {
        const randomBuffer = crypto.randomBytes(16);
        let randomBigInt = 0n;
        for (const byte of randomBuffer) {
            randomBigInt = (randomBigInt << 8n) + BigInt(byte);
        }
        finalSalt = `${randomBigInt}field`;
        finalInvoiceHash = crypto.randomInt(100000000, 999999999).toString() + "field";
    }

    try {
        const { data: intent, error: intentError } = await supabase
            .from('payment_intents')
            .insert([{
                merchant_id: merchant.id,
                amount: amount || 0,
                token_type: finalCurrency,
                invoice_type: finalInvoiceType,
                salt: finalSalt,
                invoice_hash: finalInvoiceHash,
                status: initialStatus,
                success_url: success_url || null,
                cancel_url: cancel_url || null
            }])
            .select()
            .single();

        if (intentError) throw intentError;

        const tokenTypeNum = finalCurrency === 'ANY' ? 3 : (finalCurrency === 'USDCX' ? 1 : (finalCurrency === 'USAD' ? 2 : 0));
        const merchantAddress = readMerchantStoredValue(merchant.encrypted_aleo_address);
        const merchantAddressHash = merchantAddress ? sha256Hex(merchantAddress) : null;
        
        const { error: invTableError } = await supabase.from('invoices').upsert({
            invoice_hash: finalInvoiceHash,
            merchant_address: merchantAddress,
            merchant_address_hash: merchantAddressHash,
            designated_address: merchantAddress,
            is_burner: false,
            token_type: tokenTypeNum,
            invoice_type: finalInvoiceType,
            salt: finalSalt,
            status: 'PENDING',
            for_sdk: true,
            invoice_items: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (invTableError) {
            console.error("[Checkout] Failed to insert invoice to dashboard:", invTableError);
        }

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
};

const getSession = async (req, res) => {
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

        if (intent.merchants && intent.merchants.encrypted_aleo_address) {
            intent.merchants.aleo_address = intent.merchants.encrypted_aleo_address;
        }

        let allowedTokens = null;
        if (intent.invoice_hash) {
            const { data: invoice } = await supabase
                .from('invoices')
                .select('allowed_tokens')
                .eq('invoice_hash', intent.invoice_hash)
                .single();
            allowedTokens = invoice?.allowed_tokens || null;
        }

        const sessionData = {
            id: intent.id,
            amount: intent.amount,
            token_type: intent.token_type,
            status: intent.status,
            invoice_hash: intent.invoice_hash,
            salt: intent.salt,
            invoice_type: intent.invoice_type,
            success_url: intent.success_url || null,
            cancel_url: intent.cancel_url || null,
            merchant_name: intent.merchants ? intent.merchants.name : 'Unknown Merchant',
            merchant_address: intent.merchants ? intent.merchants.encrypted_aleo_address : null,
            allowed_tokens: allowedTokens
        };

        res.json(sessionData);

    } catch (err) {
        console.error("Error fetching checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const updateSession = async (req, res) => {
    const { id } = req.params;
    const { status, tx_id } = req.body;

    try {
        if (status !== 'SETTLED' && status !== 'FAILED') {
            return res.status(400).json({ error: 'Invalid status update.' });
        }

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

        if (status === 'SETTLED' && intent.merchants && intent.merchants.encrypted_webhook_url) {
            const secretKey = intent.merchants.encrypted_secret_key;
            const webhookUrl = intent.merchants.encrypted_webhook_url;

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
        }

        res.json({ success: true, status: intent.status });

    } catch (err) {
        console.error("Error updating checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    createSession,
    getSession,
    updateSession
};
