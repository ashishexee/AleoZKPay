import { fieldChunksToString, stringToFieldChunks } from './crypto';
import { fieldToString, stringToField } from './aleo-utils';

const GIFT_CARD_FIELD_CHUNK_SIZE = 15;
const GIFT_CARD_PRIVATE_KEY_CHUNKS = 8;

import { GiftCardRecordData } from '../types/card';

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

function readStructBodyFromString(source: string, key: string): string | null {
    const match = source.match(new RegExp(`${key}:\\s*\\{([\\s\\S]*?)\\}`));
    return match?.[1] || null;
}

function readFieldStructValuesFromString(source: string, key: string, count: number): string[] {
    const body = readStructBodyFromString(source, key);
    if (!body) {
        return [];
    }

    const chunks: string[] = [];
    for (let index = 1; index <= count; index += 1) {
        const value = readValueFromString(body, `part_${index}`);
        if (value) {
            chunks.push(value);
        }
    }
    return chunks;
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
    const giftPrivateKeyStructChunks = readFieldStructValuesFromString(data, 'gift_private_key', GIFT_CARD_PRIVATE_KEY_CHUNKS);
    const giftPrivateKeyFlatChunks = Array.from({ length: GIFT_CARD_PRIVATE_KEY_CHUNKS }, (_, index) => readValueFromString(data, `gift_private_key_${index + 1}`)).filter(Boolean) as string[];
    const resolvedGiftPrivateKeyChunks = giftPrivateKeyChunks.length > 0
        ? giftPrivateKeyChunks
        : giftPrivateKeyStructChunks.length > 0
            ? giftPrivateKeyStructChunks
            : giftPrivateKeyFlatChunks;
    if (!giftCardAddress || resolvedGiftPrivateKeyChunks.length === 0) {
        return null;
    }

    return {
        giftCardAddress,
        giftPrivateKey: fieldChunksToString(resolvedGiftPrivateKeyChunks),
        label: (() => {
            const labelField = readValueFromString(data, 'label');
            return labelField ? fieldToString(labelField) : '';
        })()
    };
}

export function buildCreateGiftCardRecordInputs(args: {
    giftCardAddress: string;
    giftPrivateKey: string;
    label?: string;
}): string[] {
    const giftPrivateKeyChunks = stringToFieldChunks(
        args.giftPrivateKey,
        GIFT_CARD_PRIVATE_KEY_CHUNKS,
        GIFT_CARD_FIELD_CHUNK_SIZE
    );
    const labelField = args.label ? stringToField(args.label) : '0field';

    return [
        args.giftCardAddress,
        buildLeoArray(giftPrivateKeyChunks),
        labelField
    ];
}

export function privateKeyToGiftCode(privateKey: string): string {
    const hex = Array.from(new TextEncoder().encode(privateKey))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return `gift-${hex}`;
}
