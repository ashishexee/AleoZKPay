export async function encryptWithPassword(text: string, password: string): Promise<string> {
    const enc = new TextEncoder();

    // Generate secure random salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Derive key using PBKDF2
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as any,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Encrypt the text
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(text)
    );

    // Convert everything to Base64 for storage
    const saltBase64 = bufferToBase64(salt);
    const ivBase64 = bufferToBase64(iv);
    const cipherBase64 = bufferToBase64(new Uint8Array(ciphertextBuffer));

    return `${saltBase64}:${ivBase64}:${cipherBase64}`;
}

export async function decryptWithPassword(encryptedPayload: string, password: string): Promise<string> {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
    }

    const [saltBase64, ivBase64, cipherBase64] = parts;

    const salt = base64ToBuffer(saltBase64);
    const iv = base64ToBuffer(ivBase64);
    const ciphertext = base64ToBuffer(cipherBase64);

    const enc = new TextEncoder();

    // Derive the same key using the provided password and stored salt
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as any,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Decrypt the ciphertext
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as any },
            key,
            ciphertext as any
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (e) {
        throw new Error('Incorrect password or corrupted data');
    }
}

// Helpers
function bufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function hashAddress(address: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(address); 
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Aleo string-to-field utilities
// A single Aleo field can safely hold about 31 UTF-8 bytes (253 bits).
// We conservatively split long strings into 15-byte chunks to stay well within field capacity.
export function stringToFieldChunks(str: string, numChunks: number, chunkSize: number = 15): string[] {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const maxBytes = numChunks * chunkSize;

    if (bytes.length > maxBytes) {
        throw new Error(`Value exceeds on-chain storage capacity (${bytes.length}/${maxBytes} bytes).`);
    }

    const chunks: string[] = [];
    for (let i = 0; i < numChunks; i++) {
        const slice = bytes.slice(i * chunkSize, (i + 1) * chunkSize);
        if (slice.length === 0) {
            chunks.push('0field');
            continue;
        }

        let hexStr = '';
        for (let j = 0; j < slice.length; j++) {
            let hex = slice[j].toString(16);
            if (hex.length === 1) hex = '0' + hex;
            hexStr += hex;
        }

        const bigIntVal = BigInt('0x' + hexStr);
        chunks.push(bigIntVal.toString() + 'field');
    }
    return chunks;
}

// Reverse the process: convert Aleo field value back to ASCII string
export function fieldChunksToString(chunks: string[]): string {
    const decodedBytes: number[] = [];
    for (const chunk of chunks) {
        if (!chunk || chunk === '0field' || chunk === '0') continue;

        let numStr = chunk.replace('field', '').replace('u128', '').replace('u64', '');
        let bigIntVal;
        try {
            bigIntVal = BigInt(numStr);
        } catch (e) {
            continue;
        }

        let hexStr = bigIntVal.toString(16);
        // Ensure even length for character pairs
        if (hexStr.length % 2 !== 0) {
            hexStr = '0' + hexStr;
        }

        for (let i = 0; i < hexStr.length; i += 2) {
            decodedBytes.push(parseInt(hexStr.substring(i, i + 2), 16));
        }
    }
    return new TextDecoder().decode(new Uint8Array(decodedBytes));
}
