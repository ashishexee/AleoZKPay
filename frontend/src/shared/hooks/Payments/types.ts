export type PaymentStep = 'CONNECT' | 'VERIFY' | 'CONVERT' | 'PAY' | 'SUCCESS' | 'ALREADY_PAID';

export interface InvoiceState {
    merchant: string;
    amount: number;
    salt: string;
    hash: string;
    memo: string;
    tokenType: number;
    invoiceType: number;
    sessionId?: string;
}
