const encoder = new TextEncoder();

const AES_GCM_SALT_BYTES = 16;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;

export const LEO_FIELD_MAX_BYTES = 31;
export const LEO_SAFE_FIELD_CHUNK_BYTES = 15;

export const LEO_MEMO_MAX_BYTES = LEO_FIELD_MAX_BYTES;
export const LEO_INVOICE_TITLE_MAX_BYTES = LEO_FIELD_MAX_BYTES;
export const LEO_PAYMENT_NOTE_MAX_BYTES = LEO_FIELD_MAX_BYTES;
export const GIFT_CARD_RECORD_LABEL_MAX_BYTES = LEO_FIELD_MAX_BYTES;
export const LEO_PASSWORD_BACKUP_MAX_BYTES = LEO_SAFE_FIELD_CHUNK_BYTES;

function toBase64Length(byteLength: number) {
    if (byteLength <= 0) {
        return 0;
    }
    return Math.ceil(byteLength / 3) * 4;
}

export function getUtf8ByteLength(value: string) {
    return encoder.encode(value).length;
}

export function isWithinUtf8ByteLimit(value: string, maxBytes: number) {
    return getUtf8ByteLength(value) <= maxBytes;
}

export function estimateEncryptedPayloadLength(plaintextBytes: number) {
    return (
        toBase64Length(AES_GCM_SALT_BYTES) +
        1 +
        toBase64Length(AES_GCM_IV_BYTES) +
        1 +
        toBase64Length(plaintextBytes + AES_GCM_TAG_BYTES)
    );
}

export function getMaxEncryptedPlaintextBytes(chunkCount: number, chunkSize: number = LEO_SAFE_FIELD_CHUNK_BYTES) {
    const maxStoredChars = chunkCount * chunkSize;
    let maxBytes = 0;

    for (let bytes = 0; bytes <= 1024; bytes += 1) {
        if (estimateEncryptedPayloadLength(bytes) <= maxStoredChars) {
            maxBytes = bytes;
            continue;
        }
        break;
    }

    return maxBytes;
}

export const CARD_LABEL_MAX_BYTES = getMaxEncryptedPlaintextBytes(10);
export const CARD_HINT_MAX_BYTES = getMaxEncryptedPlaintextBytes(8);

export function describeUtf8Limit(maxBytes: number) {
    return `${maxBytes} bytes max`;
}
