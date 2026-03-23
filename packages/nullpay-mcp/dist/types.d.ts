export type WalletPreference = 'main' | 'burner';
export type InvoiceType = 'standard' | 'multipay' | 'donation';
export type Currency = 'CREDITS' | 'USDCX' | 'USAD' | 'ANY';
export interface UserProfile {
    address_hash: string;
    main_address?: string | null;
    burner_address?: string | null;
    encrypted_burner_key?: string | null;
    profile_main_invoice_hash?: string | null;
    profile_burner_invoice_hash?: string | null;
    updated_at?: string;
}
export interface InvoiceRecord {
    invoice_hash: string;
    merchant_address?: string | null;
    designated_address?: string | null;
    merchant_address_hash?: string | null;
    is_burner?: boolean;
    payer_address?: string | null;
    amount?: number | null;
    amount_micro?: number | null;
    memo?: string | null;
    status: 'PENDING' | 'SETTLED';
    block_height?: number | null;
    block_settled?: number | null;
    invoice_transaction_id?: string | null;
    payment_tx_ids?: string[] | null;
    created_at?: string;
    updated_at?: string;
    salt?: string | null;
    invoice_type?: number | null;
    token_type?: number | null;
    invoice_items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }> | null;
    for_sdk?: boolean;
}
export interface SessionState {
    address: string;
    addressHash: string;
    password: string;
    activeWallet: WalletPreference;
    encryptedMainAddress: string;
    encryptedBurnerAddress?: string | null;
    encryptedBurnerKey?: string | null;
    mainPrivateKey?: string | null;
    hasMainPrivateKeyInEnv?: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface LoginArgs {
    address?: string;
    password?: string;
    main_private_key?: string;
    create_burner_wallet?: boolean;
    wallet_preference?: WalletPreference;
}
export interface CreateInvoiceArgs {
    amount: number;
    currency?: Currency;
    memo?: string;
    invoice_type?: InvoiceType;
    wallet?: WalletPreference;
    line_items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}
export interface PayInvoiceArgs {
    payment_link?: string;
    invoice_hash?: string;
    wallet?: WalletPreference;
    amount?: number;
    currency?: Exclude<Currency, 'ANY'>;
    session_id?: string;
}
export interface GetTransactionInfoArgs {
    invoice_hash?: string;
    wallet?: WalletPreference;
    limit?: number;
}
export interface InvoiceStatusData {
    status: number;
    tokenType: number;
    invoiceType: number;
}
export interface ParsedOwnedInvoiceRecord {
    owner: string;
    invoiceHash: string;
    amountMicro: number;
    tokenType: number;
    invoiceType: number;
    salt: string;
    memo: string;
    walletType: number;
    plaintext: string;
}
export interface ToolResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
}
