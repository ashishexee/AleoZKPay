"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashAddress = hashAddress;
exports.encryptWithPassword = encryptWithPassword;
exports.decryptWithPassword = decryptWithPassword;
const crypto_1 = __importDefault(require("crypto"));
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
