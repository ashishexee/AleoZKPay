export type CardKdfAlgorithm = 'argon2id' | 'pbkdf2-sha256';
export interface CardKdfParams {
    opslimit?: number;
    memlimit?: number;
    alg?: number;
    iterations?: number;
    hash?: 'SHA-256';
    version: number;
}
export declare function hashAddress(address: string): string;
export declare function encryptWithPassword(text: string, password: string): Promise<string>;
export declare function decryptWithPassword(payload: string, password: string): Promise<string>;
export declare function decryptCardPrivateKey(encryptedPrivateKey: string, pin: string, cardSecret: string, saltBase64: string, algorithm: CardKdfAlgorithm, params: CardKdfParams): Promise<string>;
