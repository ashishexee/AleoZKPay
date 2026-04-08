import type { CardKdfAlgorithm, CardKdfParams } from './card-crypto';
import { fieldChunksToString, stringToFieldChunks } from './crypto';
import type { CardTokenCode, CardWalletProfile } from '../services/api';
import { lookupCardWalletByNumberHash } from '../services/api';
import { PROGRAM_ID } from './aleo-utils';

export const CARD_PROFILE_VERSION = 1;
export const CARD_STATUS_ACTIVE = 'ACTIVE';
export const CARD_STATUS_FROZEN = 'FROZEN';
export const CARD_STATUS_ACTIVE_CODE = 0;
export const CARD_STATUS_FROZEN_CODE = 1;
export const CARD_KDF_PBKDF2_CODE = 0;
export const CARD_KDF_ARGON2ID_CODE = 1;
export const CARD_KDF_HASH_SHA256_CODE = 1;
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
    cardAddress: string;
    cardStatus: string;
    profileVersion: number;
    encryptedCardPrivateKey: string;
    cardKdfSalt: string;
    cardKdfAlgorithm: CardKdfAlgorithm;
    cardKdfParams: CardKdfParams;
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

function readFieldChunkFromObject(source: Record<string, unknown>, prefix: string, count: number): string[] {
    const chunks: string[] = [];
    for (let index = 1; index <= count; index += 1) {
        const raw = readValueFromObject(source, `${prefix}_${index}`, `${prefix}${index}`);
        if (raw !== undefined && raw !== null) {
            chunks.push(normalizeLeoScalarString(raw));
        }
    }
    return chunks;
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

function normalizeCardStatus(codeOrStatus: unknown): string {
    if (typeof codeOrStatus === 'string' && !/^\d/.test(codeOrStatus)) {
        return codeOrStatus.toUpperCase() === CARD_STATUS_FROZEN ? CARD_STATUS_FROZEN : CARD_STATUS_ACTIVE;
    }
    return parseIntegerValue(codeOrStatus) === CARD_STATUS_FROZEN_CODE ? CARD_STATUS_FROZEN : CARD_STATUS_ACTIVE;
}

function normalizeCardKdfAlgorithm(codeOrName: unknown): CardKdfAlgorithm {
    if (typeof codeOrName === 'string' && !/^\d/.test(codeOrName)) {
        return codeOrName === 'argon2id' ? 'argon2id' : 'pbkdf2-sha256';
    }
    return parseIntegerValue(codeOrName) === CARD_KDF_ARGON2ID_CODE ? 'argon2id' : 'pbkdf2-sha256';
}

function buildEmptyLimits(): Record<CardTokenCode, { max_balance: number }> {
    return {
        CREDITS: { max_balance: 0 },
        USDCX: { max_balance: 0 },
        USAD: { max_balance: 0 }
    };
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

export function cardKdfAlgorithmToCode(algorithm: CardKdfAlgorithm): number {
    return algorithm === 'argon2id' ? CARD_KDF_ARGON2ID_CODE : CARD_KDF_PBKDF2_CODE;
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
            : readFieldChunkFromString(data, 'encrypted_card_number', CARD_CHAIN_CHUNKS.encryptedCardNumber)
    );
    const encryptedCardAddress = fieldChunksToString(
        readFieldArrayFromString(data, 'encrypted_card_address').length > 0
            ? readFieldArrayFromString(data, 'encrypted_card_address')
            : readFieldChunkFromString(data, 'encrypted_card_address', CARD_CHAIN_CHUNKS.encryptedCardAddress)
    );
    const encryptedLabelChunks = readFieldArrayFromString(data, 'encrypted_label');
    const encryptedHintChunks = readFieldArrayFromString(data, 'encrypted_hint');

    return {
        cardNumberHashField,
        profileVersion: parseIntegerValue(readValueFromString(data, 'profile_version')),
        encryptedCardNumber,
        encryptedCardAddress,
        encryptedLabel: fieldChunksToString(
            encryptedLabelChunks.length > 0
                ? encryptedLabelChunks
                : readFieldChunkFromString(data, 'encrypted_label', CARD_CHAIN_CHUNKS.encryptedLabel)
        ) || null,
        encryptedHint: fieldChunksToString(
            encryptedHintChunks.length > 0
                ? encryptedHintChunks
                : readFieldChunkFromString(data, 'encrypted_hint', CARD_CHAIN_CHUNKS.encryptedHint)
        ) || null
    };
}

export async function fetchOnChainCardLookup(cardNumberHashField: string): Promise<OnChainCardLookupData | null> {
    try {
        const url = `https://api.provable.com/v2/testnet/program/${PROGRAM_ID}/mapping/card_lookup/${encodeURIComponent(cardNumberHashField)}`;
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

        const readChunks = (prefix: string, count: number) => {
            if (objectPayload) {
                return readFieldChunkFromObject(objectPayload, prefix, count);
            }
            return stringPayload ? readFieldChunkFromString(stringPayload, prefix, count) : [];
        };

        const mainOwner = String(readScalar('main_owner', 'mainOwner') || '');
        const cardAddress = String(readScalar('card_address', 'cardAddress') || '');
        if (!mainOwner || !cardAddress) {
            return null;
        }

        return {
            mainOwner,
            cardAddress,
            cardStatus: normalizeCardStatus(readScalar('card_status', 'cardStatus')),
            profileVersion: parseIntegerValue(readScalar('profile_version', 'profileVersion')),
            encryptedCardPrivateKey: fieldChunksToString(
                readChunks('encrypted_card_private_key', CARD_CHAIN_CHUNKS.encryptedPrivateKey)
            ),
            cardKdfSalt: fieldChunksToString(
                readChunks('card_kdf_salt', CARD_CHAIN_CHUNKS.kdfSalt)
            ),
            cardKdfAlgorithm: normalizeCardKdfAlgorithm(
                readScalar('card_kdf_algorithm', 'cardKdfAlgorithm')
            ),
            cardKdfParams: {
                iterations: parseIntegerValue(readScalar('card_kdf_iterations', 'cardKdfIterations')) || undefined,
                opslimit: parseIntegerValue(readScalar('card_kdf_opslimit', 'cardKdfOpslimit')) || undefined,
                memlimit: parseIntegerValue(readScalar('card_kdf_memlimit', 'cardKdfMemlimit')) || undefined,
                alg: parseIntegerValue(readScalar('card_kdf_alg', 'cardKdfAlg')) || undefined,
                hash: parseIntegerValue(readScalar('card_kdf_hash', 'cardKdfHash')) === CARD_KDF_HASH_SHA256_CODE ? 'SHA-256' : undefined,
                version: parseIntegerValue(readScalar('card_kdf_version', 'cardKdfVersion')) || 1
            }
        };
    } catch (error) {
        console.warn('Failed to fetch on-chain card lookup', error);
        return null;
    }
}

export async function resolveCardLookupByHashHex(cardNumberHashHex: string): Promise<CardWalletProfile | null> {
    const lookup = await fetchOnChainCardLookup(sha256HexToField(cardNumberHashHex));
    if (lookup) {
        return {
            address_hash: '',
            main_owner: lookup.mainOwner,
            mainOwner: lookup.mainOwner,
            card_address: lookup.cardAddress,
            encrypted_card_private_key: lookup.encryptedCardPrivateKey,
            card_kdf_salt: lookup.cardKdfSalt,
            card_kdf_algorithm: lookup.cardKdfAlgorithm,
            card_kdf_params: lookup.cardKdfParams as unknown as Record<string, unknown>,
            card_status: lookup.cardStatus,
            limits: buildEmptyLimits()
        };
    }

    return lookupCardWalletByNumberHash(cardNumberHashHex);
}

export function buildCreateCardRecordInputs(args: {
    cardAddress: string;
    cardNumberHashField: string;
    encryptedCardPrivateKey: string;
    cardKdfSalt: string;
    cardKdfAlgorithm: CardKdfAlgorithm;
    cardKdfParams: CardKdfParams;
    encryptedCardNumber: string;
    encryptedCardAddress: string;
    encryptedLabel: string | null;
    encryptedHint: string | null;
    profileVersion?: number;
}): string[] {
    const version = args.profileVersion ?? CARD_PROFILE_VERSION;
    const encryptedPrivateKeyChunks = toSizedFieldChunks(args.encryptedCardPrivateKey, CARD_CHAIN_CHUNKS.encryptedPrivateKey);
    const kdfSaltChunks = toSizedFieldChunks(args.cardKdfSalt, CARD_CHAIN_CHUNKS.kdfSalt);
    const encryptedCardNumberChunks = toSizedFieldChunks(args.encryptedCardNumber, CARD_CHAIN_CHUNKS.encryptedCardNumber);
    const encryptedCardAddressChunks = toSizedFieldChunks(args.encryptedCardAddress, CARD_CHAIN_CHUNKS.encryptedCardAddress);
    const encryptedLabelChunks = toSizedFieldChunks(args.encryptedLabel, CARD_CHAIN_CHUNKS.encryptedLabel);
    const encryptedHintChunks = toSizedFieldChunks(args.encryptedHint, CARD_CHAIN_CHUNKS.encryptedHint);

    return [
        args.cardAddress,
        args.cardNumberHashField,
        `${version}u8`,
        `${cardKdfAlgorithmToCode(args.cardKdfAlgorithm)}u8`,
        `${Number(args.cardKdfParams.iterations || 0)}u32`,
        `${Number(args.cardKdfParams.opslimit || 0)}u64`,
        `${Number(args.cardKdfParams.memlimit || 0)}u64`,
        `${Number(args.cardKdfParams.alg || 0)}u8`,
        `${args.cardKdfParams.hash === 'SHA-256' ? CARD_KDF_HASH_SHA256_CODE : 0}u8`,
        `${Number(args.cardKdfParams.version || 1)}u8`,
        buildLeoArray(encryptedPrivateKeyChunks),
        buildLeoArray(kdfSaltChunks),
        buildLeoArray(encryptedCardNumberChunks),
        buildLeoArray(encryptedCardAddressChunks),
        buildLeoArray(encryptedLabelChunks),
        buildLeoArray(encryptedHintChunks)
    ];
}

export function buildCardStatusInputs(cardNumberHashField: string, nextStatus: string): string[] {
    return [cardNumberHashField, `${cardStatusToCode(nextStatus)}u8`];
}
