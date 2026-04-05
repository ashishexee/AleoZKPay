const crypto = require('crypto');
const supabase = require('../config/supabase');
const { encryptMerchantValue, readMerchantStoredValue } = require('../utils/crypto');
const { parseAleoSignature } = require('../utils/aleo-signature');

const LIMIT_CHANGE_MESSAGE_TYPE = 'nullpay_card_limit_change_v1';
const CARD_HINT_MAX_LENGTH = 32;
const CARD_NUMBER_LENGTH = 16;

const TOKEN_COLUMNS = {
    CREDITS: {
        maxBalance: 'card_credits_max_balance'
    },
    USDCX: {
        maxBalance: 'card_usdcx_max_balance'
    },
    USAD: {
        maxBalance: 'card_usad_max_balance'
    }
};

function sha256Hex(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function toIntegerOrNull(value) {
    if (value === undefined || value === null || value === '') return null;
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
        throw new Error('Card limits must be non-negative numbers.');
    }
    return Math.round(next);
}

function normalizeOptionalText(value) {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed || null;
}

function validateCardLabel(value) {
    const normalized = normalizeOptionalText(value);
    if (!normalized) {
        throw new Error('Card label is required.');
    }
    if (normalized.length > 60) {
        throw new Error('Card label must be 60 characters or fewer.');
    }
    return normalized;
}

function validateCardLast4(value) {
    const normalized = normalizeOptionalText(value);
    if (!normalized || !/^\d{4}$/.test(normalized)) {
        throw new Error('Card last4 must be exactly 4 digits.');
    }
    return normalized;
}

function validateCardHint(value) {
    const normalized = normalizeOptionalText(value);
    if (!normalized) {
        return null;
    }
    if (normalized.length > CARD_HINT_MAX_LENGTH) {
        throw new Error(`Card hint must be ${CARD_HINT_MAX_LENGTH} characters or fewer.`);
    }
    return normalized;
}

function normalizeCardNumber(value) {
    const normalized = String(value || '').replace(/\D/g, '');
    if (normalized.length !== CARD_NUMBER_LENGTH) {
        throw new Error(`Card number must be exactly ${CARD_NUMBER_LENGTH} digits.`);
    }
    return normalized;
}

function validateCardNumberHash(value) {
    const normalized = normalizeOptionalText(value);
    if (!normalized || !/^[a-f0-9]{64}$/i.test(normalized)) {
        throw new Error('Card number hash is invalid.');
    }
    return normalized.toLowerCase();
}

function buildCardLimits(row) {
    return {
        CREDITS: {
            max_balance: Number(row?.card_credits_max_balance || 0)
        },
        USDCX: {
            max_balance: Number(row?.card_usdcx_max_balance || 0)
        },
        USAD: {
            max_balance: Number(row?.card_usad_max_balance || 0)
        }
    };
}

function hasStoredCardWallet(row) {
    return Boolean(
        row && (
            row.card_address ||
            row.card_number_hash ||
            row.encrypted_card_number ||
            row.encrypted_card_private_key
        )
    );
}

function buildCardResponse(row) {
    if (!hasStoredCardWallet(row)) {
        return null;
    }

    const clientEncryptedCardAddress = row.card_address
        ? readMerchantStoredValue(row.card_address)
        : null;
    const clientEncryptedCardNumber = row.encrypted_card_number
        ? readMerchantStoredValue(row.encrypted_card_number)
        : null;

    return {
        address_hash: row.address_hash,
        card_address: clientEncryptedCardAddress || '',
        encrypted_card_address: clientEncryptedCardAddress,
        encrypted_card_number: clientEncryptedCardNumber,
        card_number_hash: row.card_number_hash || null,
        card_last4: row.card_last4 || null,
        encrypted_card_private_key: row.encrypted_card_private_key || null,
        card_kdf_salt: row.card_kdf_salt || null,
        card_kdf_algorithm: row.card_kdf_algorithm || null,
        card_kdf_params: row.card_kdf_params || null,
        card_status: row.card_status || 'ACTIVE',
        card_label: row.card_label || null,
        card_hint: row.card_hint || null,
        card_limits_updated_at: row.card_limits_updated_at || null,
        limits: buildCardLimits(row)
    };
}

function validateLimitShape(token, limits) {
    const columns = TOKEN_COLUMNS[token];
    if (!columns) throw new Error('Unsupported card token.');
    if (!limits || typeof limits !== 'object') {
        throw new Error('Card limit payload is missing.');
    }

    const next = {
        max_balance: toIntegerOrNull(limits.max_balance)
    };

    if (next.max_balance === null) {
        throw new Error('Card balance cap is required.');
    }

    return next;
}

function applyCardPayload(updates, body) {
    if (body.main_address !== undefined) updates.main_address = body.main_address;
    if (body.card_address !== undefined) updates.card_address = body.card_address ? encryptMerchantValue(body.card_address) : null;
    if (body.encrypted_card_number !== undefined) {
        updates.encrypted_card_number = body.encrypted_card_number
            ? encryptMerchantValue(body.encrypted_card_number)
            : null;
    }
    if (body.card_number_hash !== undefined) updates.card_number_hash = validateCardNumberHash(body.card_number_hash);
    if (body.card_last4 !== undefined) updates.card_last4 = validateCardLast4(body.card_last4);
    if (body.encrypted_card_private_key !== undefined) updates.encrypted_card_private_key = body.encrypted_card_private_key;
    if (body.card_kdf_salt !== undefined) updates.card_kdf_salt = body.card_kdf_salt;
    if (body.card_kdf_algorithm !== undefined) updates.card_kdf_algorithm = body.card_kdf_algorithm;
    if (body.card_kdf_params !== undefined) updates.card_kdf_params = body.card_kdf_params;
    if (body.card_status !== undefined) updates.card_status = body.card_status;
    if (body.card_label !== undefined) updates.card_label = validateCardLabel(body.card_label);
    if (body.card_hint !== undefined) updates.card_hint = validateCardHint(body.card_hint);

    const limits = body.limits || {};

    Object.entries(TOKEN_COLUMNS).forEach(([token, columns]) => {
        const tokenLimits = limits[token];
        if (tokenLimits) {
            if (tokenLimits.max_balance !== undefined) updates[columns.maxBalance] = toIntegerOrNull(tokenLimits.max_balance);
        }
    });
}

async function getUserByAddressHash(addressHash) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('address_hash', addressHash)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    return data;
}

async function getUserByCardNumberHash(cardNumberHash) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('card_number_hash', cardNumberHash)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    return data;
}

async function saveUser(addressHash, updates) {
    const existingUser = await getUserByAddressHash(addressHash);
    const payload = {
        address_hash: addressHash,
        updated_at: new Date().toISOString(),
        ...updates
    };

    if (existingUser) {
        const { data, error } = await supabase
            .from('users')
            .update(payload)
            .eq('address_hash', addressHash)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase
        .from('users')
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

const updateProfile = async (req, res) => {
    const {
        address_hash,
        main_address,
        burner_address,
        encrypted_burner_key,
        profile_main_invoice_hash,
        profile_burner_invoice_hash
    } = req.body;

    if (!address_hash) {
        return res.status(400).json({ error: 'Missing address_hash' });
    }

    try {
        const updates = {};
        if (main_address !== undefined) updates.main_address = main_address;
        if (burner_address !== undefined) updates.burner_address = burner_address;
        if (encrypted_burner_key !== undefined) updates.encrypted_burner_key = encrypted_burner_key;
        if (profile_main_invoice_hash !== undefined) updates.profile_main_invoice_hash = profile_main_invoice_hash;
        if (profile_burner_invoice_hash !== undefined) updates.profile_burner_invoice_hash = profile_burner_invoice_hash;

        const data = await saveUser(address_hash, updates);
        res.json(data);
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ error: err.message });
    }
};

const getProfile = async (req, res) => {
    const { address } = req.params;

    try {
        const data = await getUserByAddressHash(address);
        if (!data) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(data);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: err.message });
    }
};

const clearBurner = async (req, res) => {
    const { address_hash } = req.body;
    if (!address_hash) return res.status(400).json({ error: 'Missing address_hash' });

    try {
        const data = await saveUser(address_hash, {
            burner_address: null,
            encrypted_burner_key: null
        });
        res.json(data);
    } catch (err) {
        console.error('Error clearing burner data:', err);
        res.status(500).json({ error: err.message });
    }
};

const getCardWallet = async (req, res) => {
    const { address } = req.params;

    try {
        const data = await getUserByAddressHash(address);
        const cardResponse = buildCardResponse(data);
        if (!cardResponse) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        res.json(cardResponse);
    } catch (err) {
        console.error('Error fetching card wallet:', err);
        res.status(500).json({ error: err.message });
    }
};

const upsertCardWallet = async (req, res) => {
    const { address_hash } = req.body;
    if (!address_hash) {
        return res.status(400).json({ error: 'Missing address_hash' });
    }

    try {
        const existingProfile = await getUserByAddressHash(address_hash);
        const isCreatingCard = !hasStoredCardWallet(existingProfile) && req.body.card_address !== undefined;
        if (isCreatingCard) {
            if (!req.body.main_address && !existingProfile?.main_address) {
                return res.status(400).json({ error: 'Main wallet address is required when creating a card.' });
            }
            validateCardLabel(req.body.card_label);
            validateCardNumberHash(req.body.card_number_hash);
            validateCardLast4(req.body.card_last4);
            validateCardHint(req.body.card_hint);
            if (!req.body.encrypted_card_number) {
                return res.status(400).json({ error: 'Encrypted card number is required.' });
            }
        }

        const updates = {};
        applyCardPayload(updates, req.body);
        const data = await saveUser(address_hash, updates);
        res.json(buildCardResponse(data));
    } catch (err) {
        console.error('Error saving card wallet:', err);
        res.status(500).json({ error: err.message });
    }
};

const lookupCardWallet = async (req, res) => {
    const { card_number_hash } = req.body || {};
    if (!card_number_hash) {
        return res.status(400).json({ error: 'Missing card_number_hash' });
    }

    try {
        const normalizedHash = validateCardNumberHash(card_number_hash);
        const data = await getUserByCardNumberHash(normalizedHash);
        const cardResponse = buildCardResponse(data);
        if (!cardResponse) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        res.json(cardResponse);
    } catch (err) {
        console.error('Error looking up card wallet:', err);
        res.status(500).json({ error: err.message });
    }
};

const verifyCardLimitChange = async (req, res) => {
    const { address_hash, main_address, message, signature_base64 } = req.body;

    if (!address_hash || !main_address || !message || !signature_base64) {
        return res.status(400).json({ error: 'Missing card limit change fields' });
    }

    try {
        if (sha256Hex(main_address) !== address_hash) {
            return res.status(400).json({ error: 'Main wallet address does not match address hash.' });
        }

        const profile = await getUserByAddressHash(address_hash);
        if (!profile || !profile.card_address) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        const payload = JSON.parse(message);
        if (payload?.action !== LIMIT_CHANGE_MESSAGE_TYPE) {
            return res.status(400).json({ error: 'Invalid card limit change action.' });
        }

        if (!payload.token || !TOKEN_COLUMNS[payload.token]) {
            return res.status(400).json({ error: 'Unsupported card token.' });
        }

        const payloadCardHash = payload.card_number_hash ? validateCardNumberHash(payload.card_number_hash) : null;
        if (profile.card_number_hash && payloadCardHash) {
            if (payloadCardHash !== profile.card_number_hash) {
                return res.status(400).json({ error: 'Card address mismatch.' });
            }
        } else {
            const storedCardAddress = profile.card_address ? readMerchantStoredValue(profile.card_address) : '';
            if (payload.card_address !== storedCardAddress) {
                return res.status(400).json({ error: 'Card address mismatch.' });
            }
        }

        const requestedAt = new Date(payload.timestamp).getTime();
        if (!Number.isFinite(requestedAt) || Math.abs(Date.now() - requestedAt) > 10 * 60 * 1000) {
            return res.status(400).json({ error: 'Card limit approval expired. Please sign again.' });
        }

        const currentLimits = buildCardLimits(profile)[payload.token];
        const previousLimits = validateLimitShape(payload.token, payload.previous_limits);
        if (previousLimits.max_balance !== currentLimits.max_balance) {
            return res.status(409).json({ error: 'Card limits changed before this approval was submitted.' });
        }

        const nextLimits = validateLimitShape(payload.token, payload.next_limits);

        const sdk = await import('@provablehq/sdk');
        const encoder = new TextEncoder();
        const signature = parseAleoSignature(sdk, signature_base64);
        const address = sdk.Address.from_string(main_address);
        const isValid = address.verify(encoder.encode(message), signature);

        if (!isValid) {
            return res.status(401).json({ error: 'Main wallet signature verification failed.' });
        }

        const columns = TOKEN_COLUMNS[payload.token];
        const updates = {
            [columns.maxBalance]: nextLimits.max_balance,
            card_limits_updated_at: new Date().toISOString()
        };

        const data = await saveUser(address_hash, updates);
        res.json(buildCardResponse(data));
    } catch (err) {
        console.error('Error verifying card limit change:', err);
        res.status(500).json({ error: err.message });
    }
};

const recordCardSpend = async (req, res) => {
    const { address_hash } = req.body;
    if (!address_hash) return res.status(400).json({ error: 'Missing card spend fields' });

    try {
        const profile = await getUserByAddressHash(address_hash);
        const cardResponse = buildCardResponse(profile);
        if (!cardResponse) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        res.json(cardResponse);
    } catch (err) {
        console.error('Error recording card spend:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    updateProfile,
    getProfile,
    clearBurner,
    getCardWallet,
    upsertCardWallet,
    lookupCardWallet,
    verifyCardLimitChange,
    recordCardSpend
};
