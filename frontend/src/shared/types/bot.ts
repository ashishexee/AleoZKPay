export type NullBotToolName =
    | 'connect_wallet'
    | 'create_invoice'
    | 'pay_invoice'
    | 'get_transaction_info'
    | 'get_analytics'
    | 'check_burner_balance'
    | 'sweep_funds';

export type NullBotCreateInvoiceArgs = {
    amount?: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD' | 'ANY';
    title?: string;
    invoice_type?: 'standard' | 'multipay' | 'donation';
    wallet?: 'main' | 'burner';
    memo?: string;
};

export type NullBotPayInvoiceArgs = {
    payment_link?: string;
    invoice_hash?: string;
    wallet?: 'main' | 'burner';
    amount?: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD';
};

export type NullBotSweepFundsArgs = {
    amount?: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD';
    wallet?: 'main' | 'burner';
    destination?: string;
};

export type NullBotToolCall =
    | {
        name: 'connect_wallet';
        args: Record<string, never>;
        missingArgs?: string[];
    }
    | {
        name: 'create_invoice';
        args: NullBotCreateInvoiceArgs;
        missingArgs?: string[];
    }
    | {
        name: 'pay_invoice';
        args: NullBotPayInvoiceArgs;
        missingArgs?: string[];
    }
    | {
        name: 'get_transaction_info';
        args: {
            invoice_hash?: string;
            wallet?: 'main' | 'burner';
            limit?: number;
        };
        missingArgs?: string[];
    }
    | {
        name: 'get_analytics';
        args: {
            wallet?: 'main' | 'burner';
            days?: number;
        };
        missingArgs?: string[];
    }
    | {
        name: 'check_burner_balance';
        args: Record<string, never>;
        missingArgs?: string[];
    }
    | {
        name: 'sweep_funds';
        args: NullBotSweepFundsArgs;
        missingArgs?: string[];
    };

export type NullBotPendingToolCall = {
    name: NullBotToolName;
    args: Record<string, unknown>;
    missingArgs: string[];
    metadata?: Record<string, unknown>;
};

export interface NullBotChatResponse {
    reply: string;
    toolCall?: NullBotToolCall;
}

export interface TransactionStatusUpdate {
    transactionId: string;
    status: string;
    invoiceHash?: string;
}

export interface InvoicePaidUpdate {
    invoiceHash: string;
    paymentTxId: string;
    amount: number;
    tokenType: number;
}
