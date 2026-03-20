export interface NullPayConfig {
    secretKey: string;
    baseURL?: string;
}
export interface NullPayInvoice {
    name: string;
    type: 'multipay' | 'donation';
    amount: number | null;
    currency: string;
    label?: string;
    hash: string;
    salt: string;
}
export interface NullPayJson {
    merchant: string;
    generated_at: string;
    invoices: NullPayInvoice[];
}
/**
 * Loads the nullpay.json config file from the given project root (defaults to process.cwd()).
 * Returns null if the file does not exist.
 */
export declare function loadNullPayConfig(projectRoot?: string): NullPayJson | null;
export interface CreateCheckoutSessionParams {
    amount?: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD' | 'ANY';
    type?: 'standard' | 'donation' | 'multipay';
    success_url?: string;
    cancel_url?: string;
    invoice_hash?: string;
    salt?: string;
    /** Shorthand: look up invoice by name from nullpay.json (recommended) */
    nullpay_invoice_name?: string;
    /** Shorthand: look up invoice by index from nullpay.json (fallback) */
    nullpay_invoice_index?: number;
}
export interface CheckoutSession {
    id: string;
    checkout_url: string;
    status: string;
    invoice_hash?: string;
    salt?: string;
}
export interface WebhookEvent {
    id: string;
    amount: number;
    token_type: string;
    status: 'SETTLED' | 'FAILED' | 'PROCESSING' | 'PENDING';
    tx_id: string | null;
    timestamp: string;
}
export declare class NullPay {
    private secretKey;
    private baseURL;
    constructor(config: NullPayConfig);
    /**
     * Helpers for reading and querying the local nullpay.json config.
     */
    invoices: {
        /**
         * Returns all invoices from nullpay.json, or throws if the file is missing.
         */
        getAll: () => NullPayInvoice[];
        /**
         * Returns an invoice by its array index.
         */
        getByIndex: (i: number) => NullPayInvoice;
        /**
         * Returns an invoice by its developer-defined name.
         */
        getByName: (name: string) => NullPayInvoice;
        /**
         * Returns all invoices matching a given type.
         */
        getByType: (type: "multipay" | "donation") => NullPayInvoice[];
    };
    checkout: {
        sessions: {
            create: (params: CreateCheckoutSessionParams) => Promise<CheckoutSession>;
            retrieve: (sessionId: string) => Promise<CheckoutSession>;
        };
    };
    webhooks: {
        /**
         * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
         */
        verifySignature: (payload: string, signature: string) => boolean;
        /**
         * Helper method to immediately verify and parse the webhook event.
         * Throws an error if the signature is invalid.
         */
        constructEvent: (payload: string, signature: string) => WebhookEvent;
    };
}
