const supabase = require('../config/supabase');
const {
    sha256Hex,
    decryptStoredValue,
    encryptStoredValue,
    encryptMerchantValue,
    readMerchantStoredValue
} = require('../utils/crypto');
const { submitRelayedInvoiceCreation } = require('../utils/provable');
const { verifyAleoMessageSignature } = require('../utils/aleo-signature');
const {
    normalizePaymentTxIds,
    deriveInvoiceAmount,
    tokenTypeToCode,
    invoiceTypeToLabel
} = require('../utils/invoices');
const {
    generateSecureToken,
    generateAleoFieldSalt,
    getLinkExpiryDate,
    buildTelegramLinkMessage,
    buildTelegramLinkUrl,
    invoiceTypeToNumber,
    tokenCodeToNumber,
    buildDirectInvoiceUrl,
    buildCheckoutUrl,
    buildInvoiceDetailsUrl
} = require('../utils/telegram');

class TelegramServiceError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'TelegramServiceError';
        this.status = status;
    }
}

const LEO_SINGLE_FIELD_MAX_BYTES = 31;

function assertAleoAddress(address) {
    if (!address || typeof address !== 'string' || !address.startsWith('aleo1')) {
        throw new TelegramServiceError('A valid Aleo address is required.', 400);
    }
}

function hashLookupValue(value) {
    return sha256Hex(String(value));
}

function normalizeSingleFieldString(value, label) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }

    if (Buffer.byteLength(normalized, 'utf8') > LEO_SINGLE_FIELD_MAX_BYTES) {
        throw new TelegramServiceError(`${label} must stay within ${LEO_SINGLE_FIELD_MAX_BYTES} UTF-8 bytes.`, 400);
    }

    return normalized;
}

function decryptTelegramValue(value, label) {
    if (!value) return null;
    try {
        return decryptStoredValue(value, { label });
    } catch {
        return null;
    }
}

function decryptTelegramNumber(ciphertext, fallback, label) {
    const rawValue = ciphertext
        ? decryptTelegramValue(ciphertext, label)
        : (fallback === undefined || fallback === null ? null : String(fallback));

    if (rawValue === null || rawValue === '') {
        return null;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
}

function encryptTelegramValue(value, label) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return encryptStoredValue(String(value), { label });
}

function decorateLinkSession(session, tokenOverride = null) {
    if (!session) return null;

    const telegramId = decryptTelegramNumber(session.telegram_id_ciphertext, session.telegram_id, 'Telegram link session id');
    const chatId = decryptTelegramNumber(session.chat_id_ciphertext, session.chat_id, 'Telegram link session chat id');
    const nonce = decryptTelegramValue(session.nonce_ciphertext, 'Telegram link session nonce') || session.nonce || null;
    const username = decryptTelegramValue(session.username_ciphertext, 'Telegram link session username') || session.username || null;
    const token = tokenOverride || session.token || null;
    const decorated = {
        id: session.id,
        token,
        telegram_id: telegramId,
        chat_id: chatId,
        username,
        nonce,
        expires_at: session.expires_at,
        consumed_at: session.consumed_at || null,
        created_at: session.created_at || null
    };

    return {
        ...decorated,
        is_expired: new Date(decorated.expires_at).getTime() <= Date.now(),
        is_consumed: Boolean(decorated.consumed_at),
        message: buildTelegramLinkMessage(decorated),
        link_url: buildTelegramLinkUrl(token)
    };
}

function getDecryptedTelegramAddress(value) {
    if (!value) return null;

    try {
        return readMerchantStoredValue(value);
    } catch {
        return null;
    }
}

function decorateTelegramUser(user) {
    if (!user) return null;

    return {
        id: user.id,
        telegram_id: decryptTelegramNumber(user.telegram_id_ciphertext, user.telegram_id, 'Telegram user id'),
        username: decryptTelegramValue(user.username_ciphertext, 'Telegram username') || user.username || null,
        chat_id: decryptTelegramNumber(user.chat_id_ciphertext, user.chat_id, 'Telegram chat id'),
        aleo_address: getDecryptedTelegramAddress(user.aleo_address),
        aleo_address_hash: user.aleo_address_hash || null,
        notifications_enabled: Boolean(user.notifications_enabled),
        linked_at: user.linked_at || null,
        updated_at: user.updated_at || null
    };
}

async function getNullPayProfile(addressHash) {
    const { data, error } = await supabase
        .from('users')
        .select('address_hash, main_address')
        .eq('address_hash', addressHash)
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return data || null;
}

async function getLinkedTelegramUser(telegramId) {
    const telegramIdHash = hashLookupValue(telegramId);
    const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id_hash', telegramIdHash)
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return decorateTelegramUser(data);
}

async function createLinkSession({ telegramId, chatId, username }) {
    const token = generateSecureToken(24);
    const nonce = generateSecureToken(12);
    const session = {
        token_hash: hashLookupValue(token),
        telegram_id_hash: hashLookupValue(telegramId),
        telegram_id_ciphertext: encryptTelegramValue(telegramId, 'Telegram link session id'),
        chat_id_hash: hashLookupValue(chatId),
        chat_id_ciphertext: encryptTelegramValue(chatId, 'Telegram link session chat id'),
        username_ciphertext: encryptTelegramValue(username, 'Telegram link session username'),
        nonce_ciphertext: encryptTelegramValue(nonce, 'Telegram link session nonce'),
        expires_at: getLinkExpiryDate().toISOString(),
        consumed_at: null
    };

    const { data, error } = await supabase
        .from('telegram_link_sessions')
        .insert(session)
        .select()
        .single();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    if (username) {
        await supabase
            .from('telegram_users')
            .upsert({
                telegram_id_hash: hashLookupValue(telegramId),
                telegram_id_ciphertext: encryptTelegramValue(telegramId, 'Telegram user id'),
                username_ciphertext: encryptTelegramValue(username, 'Telegram username'),
                chat_id_hash: hashLookupValue(chatId),
                chat_id_ciphertext: encryptTelegramValue(chatId, 'Telegram chat id'),
                updated_at: new Date().toISOString()
            }, { onConflict: 'telegram_id_hash' });
    }

    return decorateLinkSession(data, token);
}

async function getLinkSession(token) {
    const tokenHash = hashLookupValue(token);
    const { data, error } = await supabase
        .from('telegram_link_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return decorateLinkSession(data, token);
}

async function requireActiveLinkSession(token) {
    const session = await getLinkSession(token);

    if (!session) {
        throw new TelegramServiceError('Link session not found.', 404);
    }
    if (session.is_consumed) {
        throw new TelegramServiceError('This link session has already been used.', 409);
    }
    if (session.is_expired) {
        throw new TelegramServiceError('This link session has expired. Please create a new one from Telegram.', 410);
    }

    return session;
}

async function completeLinkSession({ token, aleoAddress, signatureBase64, username, aleoAddressClientCiphertext }) {
    assertAleoAddress(aleoAddress);
    if (!signatureBase64) {
        throw new TelegramServiceError('A wallet signature is required.', 400);
    }

    const session = await requireActiveLinkSession(token);
    const addressHash = sha256Hex(aleoAddress);
    const profile = await getNullPayProfile(addressHash);

    if (!profile?.main_address) {
        throw new TelegramServiceError(
            'Complete the NullPay browser unlock flow first. Connect your wallet, then create or unlock your NullPay password before linking Telegram.',
            409
        );
    }

    const isValid = await verifyAleoMessageSignature({
        address: aleoAddress,
        message: session.message,
        signatureBase64
    });

    if (!isValid) {
        throw new TelegramServiceError('Wallet signature verification failed.', 401);
    }

    const now = new Date().toISOString();
    const payload = {
        telegram_id_hash: hashLookupValue(session.telegram_id),
        telegram_id_ciphertext: encryptTelegramValue(session.telegram_id, 'Telegram user id'),
        username_ciphertext: encryptTelegramValue(username || session.username || null, 'Telegram username'),
        chat_id_hash: hashLookupValue(session.chat_id),
        chat_id_ciphertext: encryptTelegramValue(session.chat_id, 'Telegram chat id'),
        aleo_address: encryptMerchantValue(aleoAddress),
        aleo_address_client_ciphertext: encryptTelegramValue(aleoAddressClientCiphertext, 'Telegram client wallet snapshot'),
        aleo_address_hash: addressHash,
        notifications_enabled: true,
        linked_at: now,
        updated_at: now
    };

    const { data: user, error: userError } = await supabase
        .from('telegram_users')
        .upsert(payload, { onConflict: 'telegram_id_hash' })
        .select()
        .single();

    if (userError) {
        throw new TelegramServiceError(userError.message);
    }

    const { error: consumeError } = await supabase
        .from('telegram_link_sessions')
        .update({ consumed_at: now })
        .eq('token_hash', hashLookupValue(token));

    if (consumeError) {
        throw new TelegramServiceError(consumeError.message);
    }

    return decorateTelegramUser(user);
}

async function unlinkTelegramUser(telegramId) {
    const telegramIdHash = hashLookupValue(telegramId);
    const { data, error } = await supabase
        .from('telegram_users')
        .delete()
        .eq('telegram_id_hash', telegramIdHash)
        .select();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return Array.isArray(data) ? data[0] || null : data || null;
}

async function setNotificationsEnabled(telegramId, enabled) {
    const telegramIdHash = hashLookupValue(telegramId);
    const { data, error } = await supabase
        .from('telegram_users')
        .update({
            notifications_enabled: Boolean(enabled),
            updated_at: new Date().toISOString()
        })
        .eq('telegram_id_hash', telegramIdHash)
        .select()
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return decorateTelegramUser(data);
}

async function listInvoicesForTelegramUser(user, limit = 5, page = 1) {
    const safeLimit = Math.max(Number(limit) || 5, 1);
    const safePage = Math.max(Number(page) || 1, 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('merchant_address_hash', user.aleo_address_hash)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return data || [];
}

async function getDashboardForTelegramUser(user, options = {}) {
    const pageSize = Math.max(Number(options.pageSize) || 5, 1);
    const requestedPage = Math.max(Number(options.page) || 1, 1);
    const [
        { count: totalCount, error: totalError },
        { count: settledCount, error: settledError }
    ] = await Promise.all([
        supabase
            .from('invoices')
            .select('invoice_hash', { count: 'exact', head: true })
            .eq('merchant_address_hash', user.aleo_address_hash),
        supabase
            .from('invoices')
            .select('invoice_hash', { count: 'exact', head: true })
            .eq('merchant_address_hash', user.aleo_address_hash)
            .eq('status', 'SETTLED')
    ]);

    if (totalError) {
        throw new TelegramServiceError(totalError.message);
    }
    if (settledError) {
        throw new TelegramServiceError(settledError.message);
    }

    const total = Number(totalCount || 0);
    const settled = Number(settledCount || 0);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const recentInvoices = await listInvoicesForTelegramUser(user, pageSize, currentPage);

    return {
        total_invoices: total,
        settled_count: settled,
        pending_count: Math.max(total - settled, 0),
        recent_invoices: recentInvoices,
        page_size: pageSize,
        current_page: currentPage,
        total_pages: totalPages
    };
}

async function getInvoiceForTelegramUser(user, invoiceHash) {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_hash', invoiceHash)
        .eq('merchant_address_hash', user.aleo_address_hash)
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return data || null;
}

async function getInvoiceByIdForTelegramUser(user, invoiceId) {
    const parsedId = Number(invoiceId);
    if (!Number.isFinite(parsedId)) {
        return null;
    }

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', parsedId)
        .eq('merchant_address_hash', user.aleo_address_hash)
        .maybeSingle();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return data || null;
}

async function resolvePayTarget(invoice, user) {
    return resolvePayTargetWithOverrides(invoice, user);
}

async function resolvePayTargetWithOverrides(invoice, user, overrides = {}) {
    const { data: session, error: sessionError } = await supabase
        .from('payment_intents')
        .select('id, created_at')
        .eq('invoice_hash', invoice.invoice_hash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sessionError) {
        throw new TelegramServiceError(sessionError.message);
    }

    if (session?.id) {
        return {
            kind: 'checkout',
            url: buildCheckoutUrl(session.id),
            session_id: session.id
        };
    }

    const merchant = invoice.designated_address?.startsWith('aleo1')
        ? invoice.designated_address
        : invoice.merchant_address?.startsWith('aleo1')
            ? invoice.merchant_address
            : (invoice.merchant_address_hash === user?.aleo_address_hash ? user.aleo_address : null);

    if (!merchant || !invoice.salt) {
        return {
            kind: 'invoice',
            url: buildInvoiceDetailsUrl(invoice.invoice_hash)
        };
    }

    const amount = overrides.amount ?? deriveInvoiceAmount(invoice);
    if (amount === null && invoice.invoice_type !== 2) {
        return {
            kind: 'invoice',
            url: buildInvoiceDetailsUrl(invoice.invoice_hash)
        };
    }

    return {
        kind: 'direct',
        url: buildDirectInvoiceUrl({
            merchant,
            amount: amount ?? 0,
            salt: invoice.salt,
            title: overrides.title || '',
            memo: overrides.memo || '',
            invoiceType: overrides.invoiceType || invoiceTypeToLabel(invoice.invoice_type),
            currency: overrides.currency || tokenTypeToCode(invoice.token_type),
            invoiceHash: invoice.invoice_hash
        })
    };
}

async function waitForInvoiceHash(salt, attempts = 60, delayMs = 2000) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const response = await fetch(`https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v29.aleo/mapping/salt_to_invoice/${salt}`);
        if (response.ok) {
            const value = await response.json();
            const invoiceHash = value ? String(value).replace(/['"]/g, '') : '';
            if (invoiceHash) {
                return invoiceHash;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new TelegramServiceError('Timed out while waiting for the relayed invoice to resolve on-chain.', 504);
}

function validateTelegramInvoiceDraft(draft) {
    const invoiceType = draft.invoiceType || 'standard';
    const currency = String(draft.currency || 'CREDITS').toUpperCase();
    const title = normalizeSingleFieldString(draft.title, 'Invoice title');
    const memo = normalizeSingleFieldString(draft.memo, 'Invoice memo');
    const amount = draft.amount === undefined || draft.amount === null || draft.amount === ''
        ? null
        : Number(draft.amount);

    if (!['standard', 'multipay', 'donation'].includes(invoiceType)) {
        throw new TelegramServiceError('Unsupported invoice type.', 400);
    }

    if (!['CREDITS', 'USDCX', 'USAD', 'ANY'].includes(currency)) {
        throw new TelegramServiceError('Unsupported token selection.', 400);
    }

    if (currency === 'ANY' && invoiceType !== 'donation') {
        throw new TelegramServiceError('ANY token mode is only available for donation invoices.', 400);
    }

    if (invoiceType !== 'donation' && (!Number.isFinite(amount) || amount <= 0)) {
        throw new TelegramServiceError('A positive amount is required for this invoice type.', 400);
    }

    return {
        invoiceType,
        currency,
        title,
        memo,
        amount: invoiceType === 'donation' ? 0 : Number(amount)
    };
}

async function createTelegramInvoice(user, draft) {
    const normalizedDraft = validateTelegramInvoiceDraft(draft);
    const salt = generateAleoFieldSalt();
    const invoiceTypeNumber = invoiceTypeToNumber(normalizedDraft.invoiceType);
    const profile = await getNullPayProfile(user.aleo_address_hash);

    if (!profile?.main_address) {
        throw new TelegramServiceError(
            'Your linked wallet is missing the encrypted NullPay profile required for Telegram invoice creation. Re-link after unlocking the web app.',
            409
        );
    }

    const { txId } = await submitRelayedInvoiceCreation({
        merchantPubKey: user.aleo_address,
        amount: normalizedDraft.amount,
        currency: normalizedDraft.currency,
        salt,
        title: normalizedDraft.title,
        memo: normalizedDraft.memo,
        invoice_type: invoiceTypeNumber
    });

    const invoiceHash = await waitForInvoiceHash(salt);
    const now = new Date().toISOString();

    const payload = {
        invoice_hash: invoiceHash,
        merchant_address: profile.main_address,
        merchant_address_hash: user.aleo_address_hash,
        designated_address: profile.main_address,
        is_burner: false,
        status: 'PENDING',
        invoice_transaction_id: txId,
        salt,
        invoice_type: invoiceTypeNumber,
        token_type: tokenCodeToNumber(normalizedDraft.currency),
        for_sdk: false,
        created_at: now,
        updated_at: now
    };

    const { data: invoice, error } = await supabase
        .from('invoices')
        .upsert(payload)
        .select()
        .single();

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    const payTarget = await resolvePayTargetWithOverrides(invoice, user, {
        amount: normalizedDraft.amount,
        title: normalizedDraft.title,
        memo: normalizedDraft.memo,
        invoiceType: normalizedDraft.invoiceType,
        currency: normalizedDraft.currency
    });

    return {
        invoice,
        payTarget,
        txId,
        draft: normalizedDraft
    };
}

async function getNotificationRecipients(merchantAddressHash) {
    const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('aleo_address_hash', merchantAddressHash)
        .eq('notifications_enabled', true);

    if (error) {
        throw new TelegramServiceError(error.message);
    }

    return (data || []).map((recipient) => decorateTelegramUser(recipient)).filter(Boolean);
}

async function recordNotificationDelivery({ telegramId, chatId, invoiceHash, eventType, paymentTxId }) {
    const dedupeKey = [telegramId, invoiceHash, eventType, paymentTxId || 'none'].join(':');
    const { error } = await supabase
        .from('telegram_notification_deliveries')
        .insert({
            dedupe_key_hash: hashLookupValue(dedupeKey),
            telegram_id_hash: hashLookupValue(telegramId),
            telegram_id_ciphertext: encryptTelegramValue(telegramId, 'Telegram delivery id'),
            chat_id_hash: hashLookupValue(chatId),
            chat_id_ciphertext: encryptTelegramValue(chatId, 'Telegram delivery chat id'),
            invoice_hash_hash: hashLookupValue(invoiceHash),
            invoice_hash_ciphertext: encryptTelegramValue(invoiceHash, 'Telegram delivery invoice hash'),
            event_type_ciphertext: encryptTelegramValue(eventType, 'Telegram delivery event type'),
            payment_tx_id_ciphertext: encryptTelegramValue(paymentTxId || null, 'Telegram delivery payment tx id'),
            delivered_at: new Date().toISOString()
        });

    if (!error) {
        return true;
    }

    if (error.code === '23505') {
        return false;
    }

    throw new TelegramServiceError(error.message);
}

module.exports = {
    TelegramServiceError,
    createLinkSession,
    getLinkSession,
    completeLinkSession,
    getLinkedTelegramUser,
    unlinkTelegramUser,
    setNotificationsEnabled,
    listInvoicesForTelegramUser,
    getDashboardForTelegramUser,
    getInvoiceForTelegramUser,
    getInvoiceByIdForTelegramUser,
    resolvePayTarget,
    createTelegramInvoice,
    getNotificationRecipients,
    recordNotificationDelivery,
    normalizePaymentTxIds,
    deriveInvoiceAmount
};
