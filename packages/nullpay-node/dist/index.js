"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPay = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
class NullPay {
    constructor(config) {
        this.checkout = {
            sessions: {
                create: async (params) => {
                    const isDonation = params.type === 'donation';
                    if (!isDonation && (params.amount === undefined || params.amount <= 0)) {
                        throw new Error("Amount is required and must be greater than 0 for standard invoices.");
                    }
                    let finalInvoiceHash = params.invoice_hash;
                    let finalSalt = params.salt;
                    // Automatic Pre-Generation using NullPay Relayer via DPS
                    if (!finalInvoiceHash || !finalSalt) {
                        // Generate securely random salt natively in Node.js
                        const randomBuffer = crypto_1.default.randomBytes(16);
                        let randomBigInt = BigInt(0);
                        for (const byte of randomBuffer) {
                            randomBigInt = (randomBigInt << BigInt(8)) + BigInt(byte);
                        }
                        finalSalt = `${randomBigInt.toString()}field`;
                        let invoiceTypeNum = 0; // 0=Standard
                        if (params.type === 'donation')
                            invoiceTypeNum = 2;
                        else if (params.type === 'multipay')
                            invoiceTypeNum = 1;
                        // Call NullPay Relayer Endpoint
                        const relayerRes = await (0, node_fetch_1.default)(`${this.baseURL}/dps/relayer/create-invoice`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.secretKey}`
                            },
                            body: JSON.stringify({
                                amount: isDonation ? 0 : params.amount,
                                currency: params.currency || 'CREDITS',
                                salt: finalSalt,
                                invoice_type: invoiceTypeNum
                            })
                        });
                        if (!relayerRes.ok) {
                            const errorData = await relayerRes.json().catch(() => ({}));
                            throw new Error(`NullPay Relayer Pre-gen Error: ${relayerRes.status} - ${errorData.error || relayerRes.statusText}`);
                        }
                        // Poll ZK Program Mapping for the resultant Hash
                        let hashStr = null;
                        let retries = 0;
                        const MAX_RETRIES = 60; // 2 minutes polling (DPS/Aleo testnet confirmation)
                        while (!hashStr && retries < MAX_RETRIES) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            try {
                                const mapRes = await (0, node_fetch_1.default)(`https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v20.aleo/mapping/salt_to_invoice/${finalSalt}`);
                                if (mapRes.ok) {
                                    const textVal = await mapRes.json();
                                    if (textVal)
                                        hashStr = textVal.toString().replace(/(['"])/g, '');
                                }
                            }
                            catch (e) {
                                // Transient API error, ignore and retry
                            }
                            retries++;
                        }
                        if (!hashStr) {
                            throw new Error("Timed out waiting for Aleo network blockchain confirmation. Invoice was sent, but hash was not resolved.");
                        }
                        finalInvoiceHash = hashStr;
                    }
                    // Inject discovered parameters
                    const sessionPayload = {
                        ...params,
                        amount: isDonation ? 0 : params.amount,
                        invoice_hash: finalInvoiceHash,
                        salt: finalSalt
                    };
                    const response = await (0, node_fetch_1.default)(`${this.baseURL}/checkout/sessions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.secretKey}`
                        },
                        body: JSON.stringify(sessionPayload)
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                    }
                    return await response.json();
                },
                retrieve: async (sessionId) => {
                    const response = await (0, node_fetch_1.default)(`${this.baseURL}/checkout/sessions/${sessionId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${this.secretKey}`
                        }
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                    }
                    return await response.json();
                }
            }
        };
        this.webhooks = {
            /**
             * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
             * @param payload The raw stringified JSON body of the webhook request.
             * @param signature The hex signature from the `x-nullpay-signature` header.
             * @returns true if the signature is valid and securely originates from NullPay.
             */
            verifySignature: (payload, signature) => {
                if (!payload || !signature)
                    return false;
                try {
                    const expectedSignature = crypto_1.default
                        .createHmac('sha256', this.secretKey)
                        .update(payload)
                        .digest('hex');
                    // Constant-time string comparison to prevent timing attacks
                    if (expectedSignature.length !== signature.length)
                        return false;
                    return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'));
                }
                catch (err) {
                    console.error("NullPay Signature Verification Error:", err);
                    return false;
                }
            },
            /**
             * Helper method to immediately verify and parse the webhook event.
             * Throws an error if the signature is invalid.
             */
            constructEvent: (payload, signature) => {
                if (!this.webhooks.verifySignature(payload, signature)) {
                    throw new Error("Invalid NullPay Webhook Signature. This request might be spoofed.");
                }
                return JSON.parse(payload);
            }
        };
        if (!config.secretKey) {
            throw new Error("NullPay API Key is required.");
        }
        this.secretKey = config.secretKey;
        this.baseURL = config.baseURL || 'https://null-pay-rs8i.vercel.app/api'; // Usually pointed to backend
    }
}
exports.NullPay = NullPay;
