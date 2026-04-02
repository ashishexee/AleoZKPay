const crypto = require('crypto');
const supabase = require('../config/supabase');

const CARD_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const LIMIT_CHANGE_MESSAGE_TYPE = 'nullpay_card_limit_change_v1';
const CARD_HINT_MAX_LENGTH = 32;

const TOKEN_COLUMNS = {
    CREDITS: {
        maxBalance: 'card_credits_max_balance',
        maxSingleSpend: 'card_credits_max_single_spend',
        maxDailySpend: 'card_credits_max_daily_spend',
        spentToday: 'card_credits_spent_today'
    },
    USDCX: {
        maxBalance: 'card_usdcx_max_balance',
        maxSingleSpend: 'card_usdcx_max_single_spend',
        maxDailySpend: 'card_usdcx_max_daily_spend',
        spentToday: 'card_usdcx_spent_today'
    },
    USAD: {
        maxBalance: 'card_usad_max_balance',
        maxSingleSpend: 'card_usad_max_single_spend',
        maxDailySpend: 'card_usad_max_daily_spend',
        spentToday: 'card_usad_spent_today'
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

function isCardSpendWindowExpired(startedAt) {
    if (!startedAt) return true;
    const startedAtMs = new Date(startedAt).getTime();
    if (!Number.isFinite(startedAtMs)) return true;
    return Date.now() - startedAtMs >= CARD_LIMIT_WINDOW_MS;
}

function getNormalizedSpent(row, column) {
    if (isCardSpendWindowExpired(row?.card_spend_window_started_at)) {
        return 0;
    }
    return Number(row?.[column] || 0);
}

function buildCardLimits(row) {
    return {
        CREDITS: {
            max_balance: Number(row?.card_credits_max_balance || 0),
            max_single_spend: Number(row?.card_credits_max_single_spend || 0),
            max_daily_spend: Number(row?.card_credits_max_daily_spend || 0),
            spent_today: getNormalizedSpent(row, 'card_credits_spent_today')
        },
        USDCX: {
            max_balance: Number(row?.card_usdcx_max_balance || 0),
            max_single_spend: Number(row?.card_usdcx_max_single_spend || 0),
            max_daily_spend: Number(row?.card_usdcx_max_daily_spend || 0),
            spent_today: getNormalizedSpent(row, 'card_usdcx_spent_today')
        },
        USAD: {
            max_balance: Number(row?.card_usad_max_balance || 0),
            max_single_spend: Number(row?.card_usad_max_single_spend || 0),
            max_daily_spend: Number(row?.card_usad_max_daily_spend || 0),
            spent_today: getNormalizedSpent(row, 'card_usad_spent_today')
        }
    };
}

function buildCardResponse(row) {
    if (!row || !row.card_address) {
        return null;
    }

    return {
        address_hash: row.address_hash,
        card_address: row.card_address,
        card_last4: row.card_last4 || null,
        encrypted_card_private_key: row.encrypted_card_private_key || null,
        card_kdf_salt: row.card_kdf_salt || null,
        card_kdf_algorithm: row.card_kdf_algorithm || null,
        card_kdf_params: row.card_kdf_params || null,
        card_status: row.card_status || 'ACTIVE',
        card_label: row.card_label || null,
        card_hint: row.card_hint || null,
        card_spend_window_started_at: isCardSpendWindowExpired(row.card_spend_window_started_at)
            ? null
            : row.card_spend_window_started_at,
        card_limits_updated_at: row.card_limits_updated_at || null,
        limits: buildCardLimits(row),
        spent_today: {
            CREDITS: getNormalizedSpent(row, 'card_credits_spent_today'),
            USDCX: getNormalizedSpent(row, 'card_usdcx_spent_today'),
            USAD: getNormalizedSpent(row, 'card_usad_spent_today')
        }
    };
}

function validateLimitShape(token, limits) {
    const columns = TOKEN_COLUMNS[token];
    if (!columns) throw new Error('Unsupported card token.');
    if (!limits || typeof limits !== 'object') {
        throw new Error('Card limit payload is missing.');
    }

    const next = {
        max_balance: toIntegerOrNull(limits.max_balance),
        max_single_spend: toIntegerOrNull(limits.max_single_spend),
        max_daily_spend: toIntegerOrNull(limits.max_daily_spend)
    };

    if (next.max_balance === null || next.max_single_spend === null || next.max_daily_spend === null) {
        throw new Error('All card limits are required.');
    }

    if (next.max_single_spend > next.max_balance) {
        throw new Error('Single-spend limit cannot exceed the token balance cap.');
    }

    return next;
}

function applyCardPayload(updates, body) {
    if (body.card_address !== undefined) updates.card_address = body.card_address;
    if (body.card_last4 !== undefined) updates.card_last4 = validateCardLast4(body.card_last4);
    if (body.encrypted_card_private_key !== undefined) updates.encrypted_card_private_key = body.encrypted_card_private_key;
    if (body.card_kdf_salt !== undefined) updates.card_kdf_salt = body.card_kdf_salt;
    if (body.card_kdf_algorithm !== undefined) updates.card_kdf_algorithm = body.card_kdf_algorithm;
    if (body.card_kdf_params !== undefined) updates.card_kdf_params = body.card_kdf_params;
    if (body.card_status !== undefined) updates.card_status = body.card_status;
    if (body.card_label !== undefined) updates.card_label = validateCardLabel(body.card_label);
    if (body.card_hint !== undefined) updates.card_hint = validateCardHint(body.card_hint);
    if (body.card_spend_window_started_at !== undefined) updates.card_spend_window_started_at = body.card_spend_window_started_at;

    const limits = body.limits || {};
    const spentToday = body.spent_today || {};

    Object.entries(TOKEN_COLUMNS).forEach(([token, columns]) => {
        const tokenLimits = limits[token];
        if (tokenLimits) {
            if (tokenLimits.max_balance !== undefined) updates[columns.maxBalance] = toIntegerOrNull(tokenLimits.max_balance);
            if (tokenLimits.max_single_spend !== undefined) updates[columns.maxSingleSpend] = toIntegerOrNull(tokenLimits.max_single_spend);
            if (tokenLimits.max_daily_spend !== undefined) updates[columns.maxDailySpend] = toIntegerOrNull(tokenLimits.max_daily_spend);
        }

        if (spentToday[token] !== undefined) {
            updates[columns.spentToday] = toIntegerOrNull(spentToday[token]) ?? 0;
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
        if (!data || !data.card_address) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        res.json(buildCardResponse(data));
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
        const isCreatingCard = !existingProfile?.card_address && req.body.card_address !== undefined;
        if (isCreatingCard) {
            validateCardLabel(req.body.card_label);
            validateCardLast4(req.body.card_last4);
            validateCardHint(req.body.card_hint);
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

        if (payload.card_address !== profile.card_address) {
            return res.status(400).json({ error: 'Card address mismatch.' });
        }

        const requestedAt = new Date(payload.timestamp).getTime();
        if (!Number.isFinite(requestedAt) || Math.abs(Date.now() - requestedAt) > 10 * 60 * 1000) {
            return res.status(400).json({ error: 'Card limit approval expired. Please sign again.' });
        }

        const currentLimits = buildCardLimits(profile)[payload.token];
        const previousLimits = validateLimitShape(payload.token, payload.previous_limits);
        if (
            previousLimits.max_balance !== currentLimits.max_balance ||
            previousLimits.max_single_spend !== currentLimits.max_single_spend ||
            previousLimits.max_daily_spend !== currentLimits.max_daily_spend
        ) {
            return res.status(409).json({ error: 'Card limits changed before this approval was submitted.' });
        }

        const nextLimits = validateLimitShape(payload.token, payload.next_limits);

        const sdk = await import('@provablehq/sdk');
        const encoder = new TextEncoder();
        const signatureBytes = Uint8Array.from(Buffer.from(signature_base64, 'base64'));
        const signature = sdk.Signature.fromBytesLe(signatureBytes);
        const address = sdk.Address.from_string(main_address);
        const isValid = address.verify(encoder.encode(message), signature);

        if (!isValid) {
            return res.status(401).json({ error: 'Main wallet signature verification failed.' });
        }

        const columns = TOKEN_COLUMNS[payload.token];
        const updates = {
            [columns.maxBalance]: nextLimits.max_balance,
            [columns.maxSingleSpend]: nextLimits.max_single_spend,
            [columns.maxDailySpend]: nextLimits.max_daily_spend,
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
    const { address_hash, token, amount_micro } = req.body;
    if (!address_hash || !token || amount_micro === undefined) {
        return res.status(400).json({ error: 'Missing card spend fields' });
    }

    try {
        const columns = TOKEN_COLUMNS[token];
        if (!columns) {
            return res.status(400).json({ error: 'Unsupported card token.' });
        }

        const profile = await getUserByAddressHash(address_hash);
        if (!profile || !profile.card_address) {
            return res.status(404).json({ error: 'Card wallet not found' });
        }

        const spendAmount = toIntegerOrNull(amount_micro);
        if (spendAmount === null || spendAmount <= 0) {
            return res.status(400).json({ error: 'Spend amount must be positive.' });
        }

        const windowExpired = isCardSpendWindowExpired(profile.card_spend_window_started_at);
        const nextStartedAt = windowExpired ? new Date().toISOString() : profile.card_spend_window_started_at;
        const spentNow = windowExpired ? 0 : Number(profile[columns.spentToday] || 0);
        const dailyLimit = Number(profile[columns.maxDailySpend] || 0);

        if (dailyLimit > 0 && spentNow + spendAmount > dailyLimit) {
            return res.status(409).json({ error: 'This card payment exceeds the current daily limit.' });
        }

        const updates = {
            card_spend_window_started_at: nextStartedAt,
            [columns.spentToday]: spentNow + spendAmount
        };

        const data = await saveUser(address_hash, updates);
        res.json(buildCardResponse(data));
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
    verifyCardLimitChange,
    recordCardSpend
};
