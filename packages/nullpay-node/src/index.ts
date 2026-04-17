import fetch from 'node-fetch';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface NullPayConfig {
    secretKey: string;
    baseURL?: string;
    projectRoot?: string;
    configPath?: string;
}

// ── nullpay.json types ─────────────────────────────────────────────────────

export interface NullPayInvoice {
    name: string;
    type: 'multipay' | 'donation';
    amount: number | null;
    currency: string;
    title?: string;
    label?: string;
    hash: string;
    salt: string;
}

export interface NullPayJson {
    merchant: string;
    generated_at: string;
    invoices: NullPayInvoice[];
}


export function loadNullPayConfig(projectRoot?: string, configPath?: string): NullPayJson | null {
    const filePath = configPath || path.join(projectRoot || process.cwd(), 'nullpay.json');
    if (!fs.existsSync(filePath)) return null;
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as NullPayJson;
    } catch {
        throw new Error(`Failed to parse nullpay.json at ${filePath}. Ensure it is valid JSON.`);
    }
}

// ── Existing SDK types ─────────────────────────────────────────────────────

export interface CreateCheckoutSessionParams {
    amount?: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD' | 'ANY';
    type?: 'standard' | 'donation' | 'multipay';
    title?: string;
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

export class NullPay {
    private secretKey: string;
    private baseURL: string;
    private projectRoot?: string;
    private configPath?: string;

    constructor(config: NullPayConfig) {
        if (!config.secretKey) {
            throw new Error("NullPay API Key is required.");
        }
        this.secretKey = config.secretKey;
        this.baseURL = config.baseURL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
        this.projectRoot = config.projectRoot;
        this.configPath = config.configPath;
    }

    /**
     * Helpers for reading and querying the local nullpay.json config.
     */
    public invoices = {
        /**
         * Returns all invoices from nullpay.json, or throws if the file is missing.
         */
        getAll: (): NullPayInvoice[] => {
            const config = loadNullPayConfig(this.projectRoot, this.configPath);
            if (!config) {
                const resolvedPath = this.configPath || path.join(this.projectRoot || process.cwd(), 'nullpay.json');
                throw new Error(`nullpay.json not found at ${resolvedPath}. Run "nullpay sdk onboard" first or pass projectRoot/configPath to the SDK.`);
            }
            return config.invoices;
        },
        /**
         * Returns an invoice by its array index.
         */
        getByIndex: (i: number): NullPayInvoice => {
            const all = this.invoices.getAll();
            if (i < 0 || i >= all.length) {
                throw new Error(`Invoice index ${i} is out of range. nullpay.json has ${all.length} invoice(s).`);
            }
            return all[i];
        },
        /**
         * Returns an invoice by its developer-defined name.
         */
        getByName: (name: string): NullPayInvoice => {
            const all = this.invoices.getAll();
            const found = all.find(inv => inv.name === name);
            if (!found) {
                const available = all.map(inv => `"${inv.name}"`).join(', ');
                throw new Error(`Invoice "${name}" not found in nullpay.json. Available: ${available}`);
            }
            return found;
        },
        /**
         * Returns all invoices matching a given type.
         */
        getByType: (type: 'multipay' | 'donation'): NullPayInvoice[] => {
            return this.invoices.getAll().filter(inv => inv.type === type);
        }
    };

    public checkout = {
        sessions: {
            create: async (params: CreateCheckoutSessionParams): Promise<CheckoutSession> => {

                // ── Resolve from nullpay.json if shorthand is used ──────────
                let resolvedParams = { ...params };

                if (params.nullpay_invoice_name !== undefined || params.nullpay_invoice_index !== undefined) {
                    let inv: NullPayInvoice;
                    if (params.nullpay_invoice_name !== undefined) {
                        inv = this.invoices.getByName(params.nullpay_invoice_name);
                    } else {
                        inv = this.invoices.getByIndex(params.nullpay_invoice_index as number);
                    }

                    // Merge: nullpay.json values fill in the blanks; explicit params override
                    resolvedParams = {
                        ...resolvedParams,
                        invoice_hash: resolvedParams.invoice_hash,
                        salt: resolvedParams.salt || inv.salt,
                        type: resolvedParams.type || inv.type,
                        amount: resolvedParams.amount !== undefined ? resolvedParams.amount : (inv.amount ?? undefined),
                        currency: resolvedParams.currency || (inv.currency as CreateCheckoutSessionParams['currency']),
                        title: resolvedParams.title || inv.title,
                    };

                    // Clean up shorthand keys — don't send them to backend
                    delete resolvedParams.nullpay_invoice_name;
                    delete resolvedParams.nullpay_invoice_index;
                }

                const isDonation = resolvedParams.type === 'donation';

                if (!isDonation && (resolvedParams.amount === undefined || resolvedParams.amount <= 0)) {
                    throw new Error("Amount is required and must be greater than 0 for standard invoices.");
                }

                let finalInvoiceHash = resolvedParams.invoice_hash;
                let finalSalt = resolvedParams.salt;

                // Automatic Pre-Generation using NullPay Relayer via DPS
                if (!finalInvoiceHash || !finalSalt) {
                    const randomBuffer = crypto.randomBytes(16);
                    let randomBigInt = BigInt(0);
                    for (const byte of randomBuffer) {
                        randomBigInt = (randomBigInt << BigInt(8)) + BigInt(byte);
                    }
                    finalSalt = `${randomBigInt.toString()}field`;

                    let invoiceTypeNum = 0;
                    if (resolvedParams.type === 'donation') invoiceTypeNum = 2;
                    else if (resolvedParams.type === 'multipay') invoiceTypeNum = 1;

                    const relayerRes = await fetch(`${this.baseURL}/dps/relayer/create-invoice`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.secretKey}`
                        },
                        body: JSON.stringify({
                            amount: isDonation ? 0 : resolvedParams.amount,
                            currency: resolvedParams.currency || 'CREDITS',
                            salt: finalSalt,
                            title: resolvedParams.title || '',
                            invoice_type: invoiceTypeNum
                        })
                    });

                    if (!relayerRes.ok) {
                        const errorData = await relayerRes.json().catch(() => ({})) as { error?: string };
                        throw new Error(`NullPay Relayer Pre-gen Error: ${relayerRes.status} - ${errorData.error || relayerRes.statusText}`);
                    }

                    const relayerData = await relayerRes.json() as { merchant_address: string; tx_id?: string };
                    const merchantAddress = relayerData.merchant_address;
                    const creationTxId = relayerData.tx_id;

                    let hashStr: string | null = null;
                    let retries = 0;
                    const MAX_RETRIES = 60;

                    while (!hashStr && retries < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        try {
                            const mapRes = await fetch(`https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v29.aleo/mapping/salt_to_invoice/${finalSalt}`);
                            if (mapRes.ok) {
                                const textVal = await mapRes.json();
                                if (textVal) hashStr = textVal.toString().replace(/(['"'])/g, '');
                            }
                        } catch (_) {
                            // transient, ignore
                        }
                        retries++;
                    }

                    if (!hashStr) {
                        throw new Error("Timed out waiting for Aleo network blockchain confirmation. Invoice was sent, but hash was not resolved.");
                    }

                    finalInvoiceHash = hashStr;

                    // 📢 Sync with Dashboard
                    try {
                        await fetch(`${this.baseURL}/invoices`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.secretKey}`
                            },
                            body: JSON.stringify({
                                invoice_hash: finalInvoiceHash,
                                merchant_address: merchantAddress,
                                currency: resolvedParams.currency || 'CREDITS',
                                salt: finalSalt,
                                invoice_transaction_id: creationTxId || null,
                                invoice_type: invoiceTypeNum,
                                for_sdk: true,
                                status: 'PENDING'
                            })
                        });
                    } catch (syncErr) {
                        console.error("NullPay Dashboard Sync Warning (Non-fatal):", syncErr);
                    }
                }

                const sessionPayload = {
                    ...resolvedParams,
                    amount: isDonation ? 0 : resolvedParams.amount,
                    invoice_hash: finalInvoiceHash,
                    salt: finalSalt
                };

                const response = await fetch(`${this.baseURL}/checkout/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.secretKey}`
                    },
                    body: JSON.stringify(sessionPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({})) as { error?: string };
                    throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                }

                return await response.json() as CheckoutSession;
            },

            retrieve: async (sessionId: string): Promise<CheckoutSession> => {
                const response = await fetch(`${this.baseURL}/checkout/sessions/${sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({})) as { error?: string };
                    throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                }

                return await response.json() as CheckoutSession;
            }
        }
    };

    public webhooks = {
        /**
         * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
         */
        verifySignature: (payload: string, signature: string): boolean => {
            if (!payload || !signature) return false;
            try {
                const expectedSignature = crypto
                    .createHmac('sha256', this.secretKey)
                    .update(payload)
                    .digest('hex');
                if (expectedSignature.length !== signature.length) return false;
                return crypto.timingSafeEqual(
                    Buffer.from(signature, 'utf8'),
                    Buffer.from(expectedSignature, 'utf8')
                );
            } catch (err) {
                console.error("NullPay Signature Verification Error:", err);
                return false;
            }
        },

        /**
         * Helper method to immediately verify and parse the webhook event.
         * Throws an error if the signature is invalid.
         */
        constructEvent: (payload: string, signature: string): WebhookEvent => {
            if (!this.webhooks.verifySignature(payload, signature)) {
                throw new Error("Invalid NullPay Webhook Signature. This request might be spoofed.");
            }
            return JSON.parse(payload) as WebhookEvent;
        }
    };
}
