import { fieldChunksToString, stringToFieldChunks } from './crypto';

const GIFT_CARD_FIELD_CHUNK_SIZE = 15;
const GIFT_CARD_PRIVATE_KEY_CHUNKS = 8;

export interface GiftCardRecordData {
    giftCardAddress: string;
    giftPrivateKey: string;
}

function normalizeLeoScalarString(value: unknown): string {
    return String(value ?? '')
        .trim()
        .replace(/['"]/g, '')
        .replace(/\.(private|public)\s*$/i, '');
}

function readValueFromString(source: string, key: string): string | null {
    const match = source.match(new RegExp(`${key}:\\s*([^,}\\n]+)`));
    if (!match?.[1]) {
        return null;
    }
    return normalizeLeoScalarString(match[1]);
}

function readFieldArrayFromString(source: string, key: string): string[] {
    const match = source.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
    if (!match?.[1]) {
        return [];
    }

    return match[1]
        .split(',')
        .map((value) => normalizeLeoScalarString(value))
        .filter(Boolean);
}

function buildLeoArray(values: string[]): string {
    return `[${values.join(', ')}]`;
}

export function parseGiftCardRecord(record: { plaintext?: string | null }): GiftCardRecordData | null {
    const data = record.plaintext || '';
    if (!data.includes('gift_card_address') || !data.includes('gift_private_key')) {
        return null;
    }

    const giftCardAddress = readValueFromString(data, 'gift_card_address');
    const giftPrivateKeyChunks = readFieldArrayFromString(data, 'gift_private_key');
    if (!giftCardAddress || giftPrivateKeyChunks.length === 0) {
        return null;
    }

    return {
        giftCardAddress,
        giftPrivateKey: fieldChunksToString(giftPrivateKeyChunks)
    };
}

export function buildCreateGiftCardRecordInputs(args: {
    giftCardAddress: string;
    giftPrivateKey: string;
}): string[] {
    const giftPrivateKeyChunks = stringToFieldChunks(
        args.giftPrivateKey,
        GIFT_CARD_PRIVATE_KEY_CHUNKS,
        GIFT_CARD_FIELD_CHUNK_SIZE
    );

    return [
        args.giftCardAddress,
        buildLeoArray(giftPrivateKeyChunks)
    ];
}

export function privateKeyToGiftCode(privateKey: string): string {
    const hex = Array.from(new TextEncoder().encode(privateKey))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return `gift-${hex}`;
}
