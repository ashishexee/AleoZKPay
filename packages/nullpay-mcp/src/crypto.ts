import crypto from 'crypto';

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
