export type PaymentStep = 'CONNECT' | 'VERIFY' | 'CONVERT' | 'PAY' | 'SUCCESS' | 'ALREADY_PAID';

export interface InvoiceState {
    merchant: string;
    amount: number;
    salt: string;
    hash: string;
    memo: string;
    tokenType: number;
    allowedTokens?: ('CREDITS' | 'USDCX' | 'USAD')[];
    invoiceType: number;
    items?: { name: string; quantity: number; unitPrice: number; total: number }[];
    sessionId?: string;
}
