import { Currency, InvoiceRecord, InvoiceStatusData, InvoiceType, ParsedOwnedInvoiceRecord } from './types';
export declare const PROGRAM_ID = "zk_pay_proofs_privacy_v23.aleo";
export declare function generateSalt(): string;
export declare function normalizeInvoiceHash(hash: string): string;
export declare function getInvoiceHashFromMapping(salt: string): Promise<string | null>;
export declare function waitForInvoiceHash(salt: string, attempts?: number, delayMs?: number): Promise<string>;
export declare function getInvoiceStatusData(hash: string): Promise<InvoiceStatusData | null>;
export declare function invoiceTypeToNumber(invoiceType: InvoiceType): number;
export declare function buildPaymentLink(baseUrl: string, args: {
    merchant: string;
    amount: number;
    salt: string;
    memo?: string;
    invoiceType: InvoiceType;
    currency: Currency;
    invoiceHash: string;
}): string;
export declare function createInvoiceDbRecord(args: {
    invoiceHash: string;
    merchantAddress: string;
    amount: number;
    memo?: string;
    invoiceType: InvoiceType;
    currency: Currency;
    salt: string;
    invoiceTxId: string;
    wallet: 'main' | 'burner';
    lineItems?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    merchantAddressHash: string;
}): {
    invoice_hash: string;
    merchant_address: string;
    designated_address: string;
    merchant_address_hash: string;
    is_burner: boolean;
    amount: number;
    memo: string;
    status: "PENDING";
    invoice_transaction_id: string;
    salt: string;
    invoice_type: number;
    token_type: number;
    invoice_items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[] | null;
    for_sdk: boolean;
};
export interface ParsedBurnerBackupRecord {
    owner: string;
    burnerAddress: string;
    passwordPart: string;
    pkParts: string[];
    plaintext: string;
}
export interface RecoveredOnChainWalletBackup {
    password: string;
    burnerAddress?: string;
    encryptedBurnerKey?: string;
    source: 'password_only' | 'full_burner';
}
export declare function parseOwnedInvoiceRecord(plaintext: string): ParsedOwnedInvoiceRecord | null;
export declare function parseBurnerBackupRecord(plaintext: string): ParsedBurnerBackupRecord | null;
export declare function fetchOwnedInvoiceRecords(privateKey: string): Promise<ParsedOwnedInvoiceRecord[]>;
export declare function fetchOwnedBurnerBackupRecords(privateKey: string): Promise<ParsedBurnerBackupRecord[]>;
export declare function recoverOnChainWalletBackup(privateKey: string, ownerAddress: string): Promise<RecoveredOnChainWalletBackup | null>;
export declare function fetchOwnedInvoiceRecordByHash(privateKey: string, invoiceHash: string): Promise<ParsedOwnedInvoiceRecord | null>;
export declare function enrichInvoiceWithRecordAmount(invoice: InvoiceRecord, privateKey?: string | null): Promise<InvoiceRecord>;
export declare function createSponsoredPaymentAuthorization(args: {
    walletPrivateKey: string;
    invoice: InvoiceRecord;
    amount?: number;
    currency?: Exclude<Currency, 'ANY'>;
}): Promise<{
    authorization: string;
}>;
