const crypto = require('crypto');
const { FRONTEND_URL } = require('./constants');

const TELEGRAM_LINK_ACTION = 'nullpay_telegram_link_v1';
const TELEGRAM_LINK_PURPOSE = 'Link your wallet to the NullPay Telegram Bot';
const TELEGRAM_LINK_TTL_MS = Number(process.env.TELEGRAM_LINK_TTL_MS || 15 * 60 * 1000);
const TELEGRAM_BOT_USERNAME = String(process.env.TELEGRAM_BOT_USERNAME || 'nullpay_private_bot').replace(/^@+/, '').trim();

function generateSecureToken(size = 24) {
    return crypto.randomBytes(size).toString('base64url');
}

function generateAleoFieldSalt() {
    const randomBuffer = crypto.randomBytes(16);
    let randomBigInt = 0n;
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return `${randomBigInt}field`;
}

function getLinkExpiryDate(now = Date.now()) {
    return new Date(now + TELEGRAM_LINK_TTL_MS);
}

function buildTelegramLinkMessage(session) {
    return JSON.stringify({
        action: TELEGRAM_LINK_ACTION,
        purpose: TELEGRAM_LINK_PURPOSE,
        domain: FRONTEND_URL,
        telegram_id: Number(session.telegram_id),
        token: session.token,
        nonce: session.nonce,
        expires_at: session.expires_at
    });
}

function buildTelegramLinkUrl(token) {
    const url = new URL('/telegram/link', `${FRONTEND_URL}/`);
    url.searchParams.set('token', token);
    return url.toString();
}

function buildTelegramBotWebUrl(startParam = '') {
    if (!TELEGRAM_BOT_USERNAME) {
        return null;
    }

    const url = new URL(`https://t.me/${TELEGRAM_BOT_USERNAME}`);
    if (startParam) {
        url.searchParams.set('start', startParam);
    }

    return url.toString();
}

function buildTelegramBotAppUrl(startParam = '') {
    if (!TELEGRAM_BOT_USERNAME) {
        return null;
    }

    const params = new URLSearchParams({ domain: TELEGRAM_BOT_USERNAME });
    if (startParam) {
        params.set('start', startParam);
    }

    return `tg://resolve?${params.toString()}`;
}

function invoiceTypeToNumber(invoiceType) {
    if (invoiceType === 'multipay') return 1;
    if (invoiceType === 'donation') return 2;
    return 0;
}

function tokenCodeToNumber(currency) {
    if (currency === 'USDCX') return 1;
    if (currency === 'USAD') return 2;
    if (currency === 'ANY') return 3;
    return 0;
}

function buildDirectInvoiceUrl({
    merchant,
    amount,
    salt,
    memo,
    invoiceType,
    currency,
    invoiceHash
}) {
    const url = new URL('/pay', `${FRONTEND_URL}/`);

    url.searchParams.set('merchant', merchant);
    url.searchParams.set('amount', String(amount ?? 0));
    url.searchParams.set('salt', salt);
    url.searchParams.set('hash', invoiceHash);

    if (memo) {
        url.searchParams.set('memo', memo);
    }
    if (invoiceType === 'multipay') {
        url.searchParams.set('type', 'multipay');
    } else if (invoiceType === 'donation') {
        url.searchParams.set('type', 'donation');
    }
    if (currency === 'USDCX') {
        url.searchParams.set('token', 'usdcx');
    } else if (currency === 'USAD') {
        url.searchParams.set('token', 'usad');
    } else if (currency === 'ANY') {
        url.searchParams.set('token', 'any');
    }

    return url.toString();
}

function buildCheckoutUrl(sessionId) {
    return new URL(`/checkout/${sessionId}`, `${FRONTEND_URL}/`).toString();
}

function buildInvoiceDetailsUrl(invoiceHash) {
    return new URL(`/invoice/${invoiceHash}`, `${FRONTEND_URL}/`).toString();
}

function buildTransactionExplorerUrl(txId) {
    return `https://testnet.explorer.provable.com/transaction/${txId}`;
}

function buildWebappLinks(invoiceHash) {
    const links = [
        { text: '👤 Profile', url: new URL('/profile', `${FRONTEND_URL}/`).toString() },
        { text: '🧾 Create Invoice', url: new URL('/create', `${FRONTEND_URL}/`).toString() },
        { text: '🛠️ Developer Portal', url: new URL('/developer', `${FRONTEND_URL}/`).toString() },
        { text: '🎁 Gift Cards', url: new URL('/giftcards', `${FRONTEND_URL}/`).toString() }
    ];

    if (invoiceHash) {
        links.push({ text: '📄 Invoice Details', url: buildInvoiceDetailsUrl(invoiceHash) });
    }

    return links;
}

function shortHash(hash) {
    if (!hash) return '';
    if (hash.length <= 14) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

module.exports = {
    TELEGRAM_LINK_ACTION,
    TELEGRAM_LINK_PURPOSE,
    TELEGRAM_LINK_TTL_MS,
    generateSecureToken,
    generateAleoFieldSalt,
    getLinkExpiryDate,
    buildTelegramLinkMessage,
    buildTelegramLinkUrl,
    buildTelegramBotWebUrl,
    buildTelegramBotAppUrl,
    invoiceTypeToNumber,
    tokenCodeToNumber,
    buildDirectInvoiceUrl,
    buildCheckoutUrl,
    buildInvoiceDetailsUrl,
    buildTransactionExplorerUrl,
    buildWebappLinks,
    shortHash
};
