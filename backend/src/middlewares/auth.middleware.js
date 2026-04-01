const supabase = require('../config/supabase');
const { sha256Hex } = require('../utils/crypto');

const requireMerchantAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    const secretKey = authHeader.split(' ')[1];
    const secretKeyHash = sha256Hex(secretKey);

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('secret_key_hash', secretKeyHash)
        .single();

    if (merchantError || !merchant) {
        return res.status(401).json({ error: 'Invalid API key.' });
    }

    req.merchant = merchant;
    next();
};

module.exports = requireMerchantAuth;
