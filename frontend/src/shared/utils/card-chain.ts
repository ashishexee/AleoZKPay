import { fieldChunksToString, stringToFieldChunks } from './crypto';
import type { CardWalletProfile } from '../services/api';
import { lookupCardWalletByNumberHash } from '../services/api';
import { WALLET_PROGRAM_ID } from './aleo-utils';

export const CARD_PROFILE_VERSION = 1;
export const CARD_STATUS_ACTIVE = 'ACTIVE';
export const CARD_STATUS_FROZEN = 'FROZEN';
export const CARD_STATUS_ACTIVE_CODE = 0;
export const CARD_STATUS_FROZEN_CODE = 1;
export const CARD_FIELD_CHUNK_SIZE = 15;

export const CARD_CHAIN_CHUNKS = {
    encryptedPrivateKey: 8,
    kdfSalt: 3,
    encryptedCardNumber: 6,
    encryptedCardAddress: 10,
    encryptedLabel: 10,
    encryptedHint: 8
} as const;

export interface CardProfileRecordData {
    cardNumberHashField: string;
    profileVersion: number;
    encryptedCardNumber: string;
    encryptedCardAddress: string;
    encryptedLabel: string | null;
    encryptedHint: string | null;
}

export interface OnChainCardLookupData {
    mainOwner: string;
    cardStatus: string;
    profileVersion: number;
}

function parseIntegerValue(value: unknown): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.replace(/['"]/g, '').replace(/u(8|16|32|64|128)/g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function readValueFromObject(source: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
        if (key in source) {
            return source[key];
        }
    }
    return undefined;
}

function normalizeLeoScalarString(value: unknown): string {
    return String(value ?? '')
        .trim()
        .replace(/['"]/g, '')
        .replace(/\.(private|public)\s*$/i, '');
}

function readValueFromString(source: string, ...keys: string[]): string | null {
    for (const key of keys) {
        const match = source.match(new RegExp(`${key}:\\s*([^,}\\n]+)`));
        if (match?.[1]) {
            return normalizeLeoScalarString(match[1]);
        }
    }
    return null;
}

function readFieldChunkFromString(source: string, prefix: string, count: number): string[] {
    const chunks: string[] = [];
    for (let index = 1; index <= count; index += 1) {
        const value = readValueFromString(source, `${prefix}_${index}`);
        if (value) {
            chunks.push(value);
        }
    }
    return chunks;
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

function normalizeCardStatus(codeOrStatus: unknown): string {
    if (typeof codeOrStatus === 'string' && !/^\d/.test(codeOrStatus)) {
        return codeOrStatus.toUpperCase() === CARD_STATUS_FROZEN ? CARD_STATUS_FROZEN : CARD_STATUS_ACTIVE;
    }
    return parseIntegerValue(codeOrStatus) === CARD_STATUS_FROZEN_CODE ? CARD_STATUS_FROZEN : CARD_STATUS_ACTIVE;
}

function buildLeoArray(values: string[]): string {
    return `[${values.join(', ')}]`;
}

export function sha256HexToField(hashHex: string): string {
    const normalized = hashHex.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) {
        throw new Error('Card number hash is invalid.');
    }
    return `${BigInt(`0x${normalized}`).toString()}field`;
}

export function cardStatusToCode(status: string): number {
    return status === CARD_STATUS_FROZEN ? CARD_STATUS_FROZEN_CODE : CARD_STATUS_ACTIVE_CODE;
}

export function toSizedFieldChunks(value: string | null | undefined, count: number): string[] {
    return stringToFieldChunks(value || '', count, CARD_FIELD_CHUNK_SIZE);
}

export function parseCardProfileRecord(record: { plaintext?: string | null }): CardProfileRecordData | null {
    const data = record.plaintext || '';
    if (!data.includes('card_number_hash')) {
        return null;
    }

    const cardNumberHashField = readValueFromString(data, 'card_number_hash');
    if (!cardNumberHashField) {
        return null;
    }

    const encryptedCardNumber = fieldChunksToString(
        readFieldArrayFromString(data, 'encrypted_card_number').length > 0
            ? readFieldArrayFromString(data, 'encrypted_card_number')
            : readFieldStructValuesFromString(data, 'encrypted_card_number', CARD_CHAIN_CHUNKS.encryptedCardNumber).length > 0
                ? readFieldStructValuesFromString(data, 'encrypted_card_number', CARD_CHAIN_CHUNKS.encryptedCardNumber)
            : readFieldChunkFromString(data, 'encrypted_card_number', CARD_CHAIN_CHUNKS.encryptedCardNumber)
    );
    const encryptedCardAddress = fieldChunksToString(
        readFieldArrayFromString(data, 'encrypted_card_address').length > 0
            ? readFieldArrayFromString(data, 'encrypted_card_address')
            : readFieldStructValuesFromString(data, 'encrypted_card_address', CARD_CHAIN_CHUNKS.encryptedCardAddress).length > 0
                ? readFieldStructValuesFromString(data, 'encrypted_card_address', CARD_CHAIN_CHUNKS.encryptedCardAddress)
            : readFieldChunkFromString(data, 'encrypted_card_address', CARD_CHAIN_CHUNKS.encryptedCardAddress)
    );
    const encryptedLabelChunks = readFieldArrayFromString(data, 'encrypted_label');
    const encryptedHintChunks = readFieldArrayFromString(data, 'encrypted_hint');
    const encryptedLabelStructChunks = readFieldStructValuesFromString(data, 'encrypted_label', CARD_CHAIN_CHUNKS.encryptedLabel);
    const encryptedHintStructChunks = readFieldStructValuesFromString(data, 'encrypted_hint', CARD_CHAIN_CHUNKS.encryptedHint);

    return {
        cardNumberHashField,
        profileVersion: parseIntegerValue(readValueFromString(data, 'profile_version')),
        encryptedCardNumber,
        encryptedCardAddress,
        encryptedLabel: fieldChunksToString(
            encryptedLabelChunks.length > 0
                ? encryptedLabelChunks
                : encryptedLabelStructChunks.length > 0
                    ? encryptedLabelStructChunks
                : readFieldChunkFromString(data, 'encrypted_label', CARD_CHAIN_CHUNKS.encryptedLabel)
        ) || null,
        encryptedHint: fieldChunksToString(
            encryptedHintChunks.length > 0
                ? encryptedHintChunks
                : encryptedHintStructChunks.length > 0
                    ? encryptedHintStructChunks
                : readFieldChunkFromString(data, 'encrypted_hint', CARD_CHAIN_CHUNKS.encryptedHint)
        ) || null
    };
}

export async function fetchOnChainCardLookup(cardNumberHashField: string): Promise<OnChainCardLookupData | null> {
    try {
        const url = `https://api.provable.com/v2/testnet/program/${WALLET_PROGRAM_ID}/mapping/card_lookup/${encodeURIComponent(cardNumberHashField)}`;
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        if (!payload) {
            return null;
        }

        const objectPayload = typeof payload === 'object' ? payload as Record<string, unknown> : null;
        const stringPayload = typeof payload === 'string' ? payload : null;

        const readScalar = (...keys: string[]) => {
            if (objectPayload) {
                return readValueFromObject(objectPayload, ...keys);
            }
            return stringPayload ? readValueFromString(stringPayload, ...keys) : null;
        };

        const mainOwner = String(readScalar('main_owner', 'mainOwner') || '');
        if (!mainOwner) {
            return null;
        }

        return {
            mainOwner,
            cardStatus: normalizeCardStatus(readScalar('card_status', 'cardStatus')),
            profileVersion: parseIntegerValue(readScalar('profile_version', 'profileVersion'))
        };
    } catch (error) {
        console.warn('Failed to fetch on-chain card lookup', error);
        return null;
    }
}

export async function resolveCardLookupByHashHex(cardNumberHashHex: string): Promise<CardWalletProfile | null> {
    return lookupCardWalletByNumberHash(cardNumberHashHex);
}

export function buildCreateCardRecordInputs(args: {
    cardNumberHashField: string;
    encryptedCardNumber: string;
    encryptedCardAddress: string;
    encryptedLabel: string | null;
    encryptedHint: string | null;
    profileVersion?: number;
}): string[] {
    const version = args.profileVersion ?? CARD_PROFILE_VERSION;
    const encryptedCardNumberChunks = toSizedFieldChunks(args.encryptedCardNumber, CARD_CHAIN_CHUNKS.encryptedCardNumber);
    const encryptedCardAddressChunks = toSizedFieldChunks(args.encryptedCardAddress, CARD_CHAIN_CHUNKS.encryptedCardAddress);
    const encryptedLabelChunks = toSizedFieldChunks(args.encryptedLabel, CARD_CHAIN_CHUNKS.encryptedLabel);
    const encryptedHintChunks = toSizedFieldChunks(args.encryptedHint, CARD_CHAIN_CHUNKS.encryptedHint);
    return [
        args.cardNumberHashField,
        `${version}u8`,
        buildLeoArray(encryptedCardNumberChunks),
        buildLeoArray(encryptedCardAddressChunks),
        buildLeoArray(encryptedLabelChunks),
        buildLeoArray(encryptedHintChunks)
    ];
}

export function buildCardStatusInputs(cardNumberHashField: string, nextStatus: string): string[] {
    return [cardNumberHashField, `${cardStatusToCode(nextStatus)}u8`];
}
