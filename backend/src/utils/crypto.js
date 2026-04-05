const crypto = require('crypto');

function getEncryptionKeyBuffer() {
    const rawKey = String(process.env.ENCRYPTION_KEY || '').trim();

    if (!rawKey) {
        throw new Error('ENCRYPTION_KEY is not configured.');
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        return Buffer.from(rawKey, 'hex');
    }

    const utf8Key = Buffer.from(rawKey, 'utf8');
    if (utf8Key.length === 32) {
        return utf8Key;
    }

    throw new Error('ENCRYPTION_KEY must be either 32 raw bytes or 64 hex characters.');
}

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

function isEncryptedValue(value) {
    return typeof value === 'string' && /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value);
}

function decryptStoredValue(value, options = {}) {
    if (!value || typeof value !== 'string') return value;
    if (!isEncryptedValue(value)) return value;

    const { label = 'stored value' } = options;

    try {
        const parts = value.split(':');
        if (parts.length !== 3) {
            return value;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = Buffer.from(parts[2], 'hex');
        const key = getEncryptionKeyBuffer();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, null, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error(`Decryption failed for ${label}:`, error);
        throw new Error(`Failed to parse and decrypt ${label}. Check ENCRYPTION_KEY.`);
    }
}

function encryptStoredValue(value, options = {}) {
    if (!value) return null;

    try {
        const iv = crypto.randomBytes(12);
        const key = getEncryptionKeyBuffer();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(String(value), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        const { label = 'stored value' } = options;
        console.error(`Encryption failed for ${label}:`, error);
        throw new Error(`Failed to encrypt sensitive ${label}.`);
    }
}

function readMerchantStoredValue(value) {
    if (!value || typeof value !== 'string') return value;
    if (value.startsWith('aleo1')) return value;
    return decryptStoredValue(value, { label: 'merchant metadata' });
}

function encryptMerchantValue(value) {
    return encryptStoredValue(value, { label: 'merchant metadata' });
}

module.exports = {
    decryptStoredValue,
    encryptStoredValue,
    isEncryptedValue,
    readMerchantStoredValue,
    encryptMerchantValue,
    sha256Hex
};
