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

export interface CardProfileRecordData {
    cardNumberHashField: string;
    profileVersion: number;
    encryptedCardNumber: string;
    encryptedCardAddress: string;
    encryptedLabel: string | null;
    encryptedHint: string | null;
}

export interface GiftCardRecordData {
    giftCardAddress: string;
    giftPrivateKey: string;
    label: string;
}
