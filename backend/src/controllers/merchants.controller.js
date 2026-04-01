const supabase = require('../config/supabase');
const { sha256Hex } = require('../utils/crypto');
const crypto = require('crypto');

const registerMerchant = async (req, res) => {
    const { name, aleo_address, webhook_url } = req.body;

    if (!name || !aleo_address) {
        return res.status(400).json({ error: 'Missing required fields: name, aleo_address' });
    }

    try {
        const secretKey = 'sk_test_' + crypto.randomBytes(24).toString('hex');
        const secretKeyHash = sha256Hex(secretKey);

        const { data: merchant, error } = await supabase
            .from('merchants')
            .insert([{
                name: name,
                encrypted_aleo_address: aleo_address,
                encrypted_secret_key: secretKey,
                secret_key_hash: secretKeyHash,
                encrypted_webhook_url: webhook_url || null
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: merchant.id,
            name: merchant.name,
            secret_key: secretKey, // Only returned ONCE
            webhook_url: webhook_url || null
        });
    } catch (err) {
        console.error("Error registering merchant:", err);
        res.status(500).json({ error: 'Internal server error while registering merchant.' });
    }
};

module.exports = {
    registerMerchant
};
