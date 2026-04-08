import crypto from 'crypto';
import sodium from 'libsodium-wrappers';

export type CardKdfAlgorithm = 'argon2id' | 'pbkdf2-sha256';

export interface CardKdfParams {
    opslimit?: number;
    memlimit?: number;
    alg?: number;
    iterations?: number;
    hash?: 'SHA-256';
    version: number;
}

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function toBase64(buffer: Uint8Array | Buffer): string {
    return Buffer.from(buffer).toString('base64');
}

function fromBase64(value: string): Buffer {
    return Buffer.from(value, 'base64');
}

export function hashAddress(address: string): string {
    return crypto.createHash('sha256').update(address).digest('hex');
}

export async function encryptWithPassword(text: string, password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, derivedKey) => {
            if (error) reject(error);
            else resolve(derivedKey);
        });
    });

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${toBase64(salt)}:${toBase64(iv)}:${toBase64(Buffer.concat([ciphertext, tag]))}`;
}

export async function decryptWithPassword(payload: string, password: string): Promise<string> {
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

    const key = await new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, derivedKey) => {
            if (error) reject(error);
            else resolve(derivedKey);
        });
    });

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString('utf8');
    } catch {
        throw new Error('Incorrect password or corrupted data');
    }
}

function combineSecrets(pin: string, cardSecret: string): string {
    return `${pin}:${cardSecret}`;
}

async function deriveWrappingKey(
    algorithm: CardKdfAlgorithm,
    pin: string,
    cardSecret: string,
    salt: Buffer,
    params?: CardKdfParams
): Promise<Buffer> {
    await sodium.ready;

    if (algorithm === 'argon2id') {
        const opslimit = params?.opslimit ?? sodium.crypto_pwhash_OPSLIMIT_MODERATE;
        const memlimit = params?.memlimit ?? sodium.crypto_pwhash_MEMLIMIT_MODERATE;
        const alg = params?.alg ?? sodium.crypto_pwhash_ALG_ARGON2ID13;
        
        const combined = combineSecrets(pin, cardSecret);
        const keyBytes = sodium.crypto_pwhash(
            32,
            combined,
            salt,
            opslimit,
            memlimit,
            alg,
            'uint8array'
        );
        return Buffer.from(keyBytes);
    }

    const iterations = params?.iterations ?? 600000;
    const combined = combineSecrets(pin, cardSecret);
    return await new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(combined, salt, iterations, 32, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

export async function decryptCardPrivateKey(
    encryptedPrivateKey: string,
    pin: string,
    cardSecret: string,
    saltBase64: string,
    algorithm: CardKdfAlgorithm,
    params: CardKdfParams
): Promise<string> {
    const salt = fromBase64(saltBase64);
    const packed = fromBase64(encryptedPrivateKey);
    const iv = packed.subarray(0, 12);
    const ciphertext = packed.subarray(12);

    const key = await deriveWrappingKey(algorithm, pin, cardSecret, salt, params);

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        // Note: SubtleCrypto AES-GCM appends the 16-byte authentication tag at the end of the ciphertext.
        // Node's crypto library requires setting it explicitly.
        const actualCiphertext = ciphertext.subarray(0, ciphertext.length - 16);
        const tag = ciphertext.subarray(ciphertext.length - 16);
        
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(actualCiphertext), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        throw new Error('Incorrect PIN or card secret.');
    }
}
