const {
    encryptStoredValue,
    decryptStoredValue,
    isEncryptedValue,
    sha256Hex
} = require('../src/utils/crypto');

describe('backend crypto helpers', () => {
    it('encrypts and decrypts stored values', () => {
        const plaintext = 'sensitive-telegram-value';
        const encrypted = encryptStoredValue(plaintext, { label: 'test value' });

        expect(encrypted).not.toBe(plaintext);
        expect(isEncryptedValue(encrypted)).toBe(true);
        expect(decryptStoredValue(encrypted, { label: 'test value' })).toBe(plaintext);
    });

    it('passes plaintext through when no ciphertext format is present', () => {
        expect(decryptStoredValue('plain-value', { label: 'plain value' })).toBe('plain-value');
        expect(isEncryptedValue('plain-value')).toBe(false);
    });

    it('creates stable sha256 hashes', () => {
        expect(sha256Hex('123')).toHaveLength(64);
        expect(sha256Hex('123')).toBe(sha256Hex('123'));
        expect(sha256Hex('123')).not.toBe(sha256Hex('456'));
    });
});
