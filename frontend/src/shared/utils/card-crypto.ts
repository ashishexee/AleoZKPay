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

export interface EncryptedCardPayload {
    encryptedPrivateKey: string;
    saltBase64: string;
    kdfAlgorithm: CardKdfAlgorithm;
    kdfParams: CardKdfParams;
}

const DERIVED_KEY_BYTES = 32;
const AES_ALGO = 'AES-GCM';
const PAYLOAD_VERSION = 1;
const FALLBACK_SALT_BYTES = 16;
const PBKDF2_ITERATIONS = 600_000;

function combineSecrets(pin: string, cardSecret: string): string {
    return `${pin}:${cardSecret}`;
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function deriveWrappingKey(
    algorithm: CardKdfAlgorithm,
    pin: string,
    cardSecret: string,
    salt: Uint8Array,
    params?: CardKdfParams
): Promise<CryptoKey> {
    await sodium.ready;

    if (algorithm === 'argon2id') {
        if (!canUseArgon2id()) {
            throw new Error('Argon2id support is unavailable in this build. Recreate the card after upgrading the sodium package.');
        }

        const effectiveParams: CardKdfParams = params || {
            opslimit: Number(sodium.crypto_pwhash_OPSLIMIT_MODERATE),
            memlimit: Number(sodium.crypto_pwhash_MEMLIMIT_MODERATE),
            alg: Number(sodium.crypto_pwhash_ALG_ARGON2ID13),
            version: PAYLOAD_VERSION
        };
        const combined = combineSecrets(pin, cardSecret);
        const keyBytes = sodium.crypto_pwhash(
            DERIVED_KEY_BYTES,
            combined,
            salt,
            finiteOrFallback(effectiveParams.opslimit, Number(sodium.crypto_pwhash_OPSLIMIT_MODERATE)),
            finiteOrFallback(effectiveParams.memlimit, Number(sodium.crypto_pwhash_MEMLIMIT_MODERATE)),
            finiteOrFallback(effectiveParams.alg, Number(sodium.crypto_pwhash_ALG_ARGON2ID13)),
            'uint8array'
        ) as Uint8Array;

        try {
            return await window.crypto.subtle.importKey(
                'raw',
                keyBytes as unknown as BufferSource,
                { name: AES_ALGO, length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        } finally {
            sodium.memzero(keyBytes);
        }
    }

    const effectiveParams: CardKdfParams = params || {
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
        version: PAYLOAD_VERSION
    };
    const encoded = new TextEncoder().encode(combineSecrets(pin, cardSecret));

    try {
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            encoded as unknown as BufferSource,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as unknown as BufferSource,
                iterations: finiteOrFallback(effectiveParams.iterations, PBKDF2_ITERATIONS),
                hash: effectiveParams.hash || 'SHA-256'
            },
            baseKey,
            { name: AES_ALGO, length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    } finally {
        encoded.fill(0);
    }
}

function canUseArgon2id(): boolean {
    return (
        typeof sodium.crypto_pwhash === 'function' &&
        Number.isFinite(Number(sodium.crypto_pwhash_SALTBYTES)) &&
        Number.isFinite(Number(sodium.crypto_pwhash_OPSLIMIT_MODERATE)) &&
        Number.isFinite(Number(sodium.crypto_pwhash_MEMLIMIT_MODERATE)) &&
        Number.isFinite(Number(sodium.crypto_pwhash_ALG_ARGON2ID13))
    );
}

function createSalt(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length));
}

function finiteOrFallback(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}

export async function encryptCardPrivateKey(
    privateKey: string,
    pin: string,
    cardSecret: string
): Promise<EncryptedCardPayload> {
    await sodium.ready;

    const useArgon2id = canUseArgon2id();
    const kdfAlgorithm: CardKdfAlgorithm = useArgon2id ? 'argon2id' : 'pbkdf2-sha256';
    const saltLength = useArgon2id
        ? Number(sodium.crypto_pwhash_SALTBYTES)
        : FALLBACK_SALT_BYTES;
    const salt = createSalt(saltLength);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const kdfParams: CardKdfParams = useArgon2id
        ? {
            opslimit: Number(sodium.crypto_pwhash_OPSLIMIT_MODERATE),
            memlimit: Number(sodium.crypto_pwhash_MEMLIMIT_MODERATE),
            alg: Number(sodium.crypto_pwhash_ALG_ARGON2ID13),
            version: PAYLOAD_VERSION
        }
        : {
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
            version: PAYLOAD_VERSION
        };

    const key = await deriveWrappingKey(kdfAlgorithm, pin, cardSecret, salt, kdfParams);
    const encoded = new TextEncoder().encode(privateKey);
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: AES_ALGO, iv: iv as unknown as BufferSource },
        key,
        encoded as unknown as BufferSource
    );

    const packed = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), iv.length);

    sodium.memzero(encoded);

    return {
        encryptedPrivateKey: toBase64(packed),
        saltBase64: toBase64(salt),
        kdfAlgorithm,
        kdfParams
    };
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
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);

    const key = await deriveWrappingKey(algorithm, pin, cardSecret, salt, params);

    try {
        const decrypted = await window.crypto.subtle.decrypt(
            { name: AES_ALGO, iv: iv as unknown as BufferSource },
            key,
            ciphertext as unknown as BufferSource
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        throw new Error('Incorrect PIN or card secret.');
    }
}
