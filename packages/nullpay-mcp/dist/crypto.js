"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashAddress = hashAddress;
exports.encryptWithPassword = encryptWithPassword;
exports.decryptWithPassword = decryptWithPassword;
exports.decryptCardPrivateKey = decryptCardPrivateKey;
const crypto_1 = __importDefault(require("crypto"));
const libsodium_wrappers_1 = __importDefault(require("libsodium-wrappers"));
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
function toBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
}
function fromBase64(value) {
    return Buffer.from(value, 'base64');
}
function hashAddress(address) {
    return crypto_1.default.createHash('sha256').update(address).digest('hex');
}
async function encryptWithPassword(text, password) {
    const salt = crypto_1.default.randomBytes(16);
    const iv = crypto_1.default.randomBytes(12);
    const key = await new Promise((resolve, reject) => {
        crypto_1.default.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, derivedKey) => {
            if (error)
                reject(error);
            else
                resolve(derivedKey);
        });
    });
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${toBase64(salt)}:${toBase64(iv)}:${toBase64(Buffer.concat([ciphertext, tag]))}`;
}
async function decryptWithPassword(payload, password) {
    const parts = payload.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
    }
    const [saltPart, ivPart, cipherPart] = parts;
    const salt = fromBase64(saltPart);
    const iv = fromBase64(ivPart);
    const cipherWithTag = fromBase64(cipherPart);
    const ciphertext = cipherWithTag.subarray(0, cipherWithTag.length - 16);
    const tag = cipherWithTag.subarray(cipherWithTag.length - 16);
    const key = await new Promise((resolve, reject) => {
        crypto_1.default.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, derivedKey) => {
            if (error)
                reject(error);
            else
                resolve(derivedKey);
        });
    });
    try {
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString('utf8');
    }
    catch {
        throw new Error('Incorrect password or corrupted data');
    }
}
function combineSecrets(pin, cardSecret) {
    return `${pin}:${cardSecret}`;
}
async function deriveWrappingKey(algorithm, pin, cardSecret, salt, params) {
    await libsodium_wrappers_1.default.ready;
    if (algorithm === 'argon2id') {
        const opslimit = params?.opslimit ?? libsodium_wrappers_1.default.crypto_pwhash_OPSLIMIT_MODERATE;
        const memlimit = params?.memlimit ?? libsodium_wrappers_1.default.crypto_pwhash_MEMLIMIT_MODERATE;
        const alg = params?.alg ?? libsodium_wrappers_1.default.crypto_pwhash_ALG_ARGON2ID13;
        const combined = combineSecrets(pin, cardSecret);
        const keyBytes = libsodium_wrappers_1.default.crypto_pwhash(32, combined, salt, opslimit, memlimit, alg, 'uint8array');
        return Buffer.from(keyBytes);
    }
    const iterations = params?.iterations ?? 600000;
    const combined = combineSecrets(pin, cardSecret);
    return await new Promise((resolve, reject) => {
        crypto_1.default.pbkdf2(combined, salt, iterations, 32, 'sha256', (err, derivedKey) => {
            if (err)
                reject(err);
            else
                resolve(derivedKey);
        });
    });
}
async function decryptCardPrivateKey(encryptedPrivateKey, pin, cardSecret, saltBase64, algorithm, params) {
    const salt = fromBase64(saltBase64);
    const packed = fromBase64(encryptedPrivateKey);
    const iv = packed.subarray(0, 12);
    const ciphertext = packed.subarray(12);
    const key = await deriveWrappingKey(algorithm, pin, cardSecret, salt, params);
    try {
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
        // Note: SubtleCrypto AES-GCM appends the 16-byte authentication tag at the end of the ciphertext.
        // Node's crypto library requires setting it explicitly.
        const actualCiphertext = ciphertext.subarray(0, ciphertext.length - 16);
        const tag = ciphertext.subarray(ciphertext.length - 16);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(actualCiphertext), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch {
        throw new Error('Incorrect PIN or card secret.');
    }
}
