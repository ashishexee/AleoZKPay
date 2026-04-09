import { CardWalletProfile, InvoiceRecord, UserProfile } from './types';
export declare class NullPayBackendClient {
    private readonly baseUrl;
    constructor(baseUrl: string);
    private buildUrl;
    private request;
    getUserProfile(addressHash: string): Promise<UserProfile | null>;
    upsertUserProfile(body: {
        address_hash: string;
        main_address?: string;
        burner_address?: string | null;
        encrypted_burner_key?: string | null;
    }): Promise<UserProfile>;
    createInvoiceRow(body: Partial<InvoiceRecord>): Promise<InvoiceRecord>;
    updateInvoice(hash: string, body: Partial<InvoiceRecord> & {
        session_id?: string;
    }): Promise<InvoiceRecord>;
    updateCheckoutSession(id: string, body: {
        status: 'SETTLED' | 'FAILED';
        tx_id?: string;
    }): Promise<Record<string, unknown>>;
    getInvoice(hash: string): Promise<InvoiceRecord>;
    getMerchantInvoices(merchantHash: string): Promise<InvoiceRecord[]>;
    relayCreateInvoice(body: {
        merchant_address: string;
        amount: number;
        currency: string;
        salt: string;
        memo?: string;
        invoice_type?: number;
    }): Promise<{
        success: boolean;
        tx_id: string;
        salt: string;
    }>;
    sponsorExecution(body: {
        execution_authorization_string: string;
        programName: string;
    }): Promise<{
        transaction?: {
            id?: string;
        };
    }>;
    lookupCardWallet(cardNumberHash: string): Promise<CardWalletProfile | null>;
}
