export type PromptInvoiceType = 'standard' | 'multipay' | 'donation';

export interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoiceData {
    merchant: string;
    amount: number;
    salt: string;
    hash: string;
    link: string;
    title?: string;
    type?: number;
}

export interface CreateInvoiceState {
    amount: number | '';
    loading: boolean;
    invoiceData: InvoiceData | null;
    expiry: string;
    memo: string;
    status: string;
}

export interface Invoice {
    invoice_hash: string;
    merchant_address: string;
    merchant_address_hash?: string;
    designated_address?: string;
    is_burner?: boolean;
    for_sdk?: boolean;
    payer_address?: string;
    amount: number;
    memo?: string;
    status: 'PENDING' | 'SETTLED';
    block_height?: number;
    block_settled?: number;
    invoice_transaction_id?: string;
    payment_tx_ids?: string[];
    payment_timestamps?: Record<string, string>;
    payment_tx_id?: string;
    created_at?: string;
    updated_at?: string;
    salt?: string;
    invoice_type?: number;
    token_type?: number;
    invoice_items?: { name: string; quantity: number; unitPrice: number; total: number }[];
    allowed_tokens?: string[];
}

export interface InvoiceRecord {
    owner: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    salt: string;
    title: string;
    memo: string;
    walletType?: number;
}

export interface InvoicePdfData {
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    walletType: number;
    status: string;
    title?: string;
    memo?: string;
    creationTx?: string;
    paymentTxIds?: string[];
    items?: InvoiceItem[];
    donations?: { credits: number; usdcx: number; usad: number };
}
