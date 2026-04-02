const crypto = require('crypto');

/**
 * Decrypts a merchant's stored value (like an Aleo address) using AES-256-GCM.
 * Expected format: "iv:authTag:encryptedData" (hex encoded).
 */
function readMerchantStoredValue(value) {
    // 1. Check if empty or already a plaintext Aleo address
    if (!value || typeof value !== 'string') return value;
    if (value.startsWith('aleo1')) return value;

    try {
        // 2. Split the stored encrypted string (assuming standard format: iv:authTag:encryptedData)
        const parts = value.split(':');
        if (parts.length !== 3) {
            // If it's not in the 3-part format, it's likely not encrypted via this scheme.
            return value; 
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = Buffer.from(parts[2], 'hex');
        
        // 3. Decrypt using AES-256-GCM and the environment's master key
        // Note: process.env.ENCRYPTION_KEY must be exactly 32 bytes (256 bits).
        const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8'); 
        
        if (key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 bytes long.');
        }

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption failed for merchant value:', error);
        // We throw to prevent the system from using an encrypted string as a plaintext address.
        throw new Error('Failed to parse and decrypt merchant metadata. Check ENCRYPTION_KEY.');
    }
}

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Encrypts a merchant's value (like an Aleo address) using AES-256-GCM.
 * Output format: "iv:authTag:encryptedData" (hex encoded).
 */
function encryptMerchantValue(value) {
    if (!value) return null;

    try {
        const iv = crypto.randomBytes(12); // Standard GCM IV length
        const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8');

        if (key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 bytes long.');
        }

        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        // Return format: "iv:authTag:encryptedData"
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt sensitive merchant metadata.');
    }
}

module.exports = {
    readMerchantStoredValue,
    encryptMerchantValue,
    sha256Hex
};
