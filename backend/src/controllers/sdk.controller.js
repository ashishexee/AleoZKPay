const supabase = require('../config/supabase');
const { submitRelayedInvoiceCreation } = require('../utils/provable');
const { readMerchantStoredValue } = require('../utils/crypto');

const validateOnboard = async (req, res) => {
    const merchant = req.merchant; // injected by auth.middleware
    const merchantAddress = readMerchantStoredValue(merchant.encrypted_aleo_address);
    const { merchant_address } = req.body;

    if (merchant_address && merchant_address !== merchantAddress) {
        return res.status(400).json({ error: 'Merchant address does not match the registered address for this API key.' });
    }

    res.json({
        valid: true,
        merchant_name: merchant.name,
        merchant_address: merchantAddress
    });
};

const createInvoiceRelayer = async (req, res) => {
    // Relayed invoice creation endpoint used by the CLI and Node SDK fallback flow.
    const merchant = req.merchant; 
    const { amount, currency, salt, title, memo, invoice_type } = req.body;
    
    if (!salt) return res.status(400).json({ error: 'Salt is required.' });

    const merchantPubKey = readMerchantStoredValue(merchant.encrypted_aleo_address);

    try {
        const { txId } = await submitRelayedInvoiceCreation({
            merchantPubKey,
            amount,
            currency,
            salt,
            title,
            memo,
            invoice_type
        });
        res.json({ success: true, tx_id: txId, salt: salt, merchant_address: merchantPubKey });
    } catch (err) {
        console.error('Relayer execution via DPS failed:', err);
        res.status(500).json({ error: err.message || 'Failed to dispatch relayer tx' });
    }
};

const createInvoiceMCP = async (req, res) => {
    // MCP-facing version of relayed invoice creation.
    const { merchant_address, amount, currency, salt, title, memo, invoice_type } = req.body;
    if (!merchant_address || !salt) {
        return res.status(400).json({ error: 'merchant_address and salt are required.' });
    }

    try {
        const { txId } = await submitRelayedInvoiceCreation({
            merchantPubKey: merchant_address,
            amount,
            currency,
            salt,
            title,
            memo,
            invoice_type
        });

        res.json({ success: true, tx_id: txId, salt });
    } catch (err) {
        console.error('MCP relayer execution failed:', err);
        res.status(500).json({ error: err.message || 'Failed to dispatch MCP relayer tx' });
    }
};

module.exports = {
    validateOnboard,
    createInvoiceRelayer,
    createInvoiceMCP
};
