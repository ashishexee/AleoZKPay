"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPay = void 0;
exports.loadNullPayConfig = loadNullPayConfig;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function loadNullPayConfig(projectRoot, configPath) {
    const filePath = configPath || path.join(projectRoot || process.cwd(), 'nullpay.json');
    if (!fs.existsSync(filePath))
        return null;
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (_a) {
        throw new Error(`Failed to parse nullpay.json at ${filePath}. Ensure it is valid JSON.`);
    }
}
class NullPay {
    constructor(config) {
        /**
         * Helpers for reading and querying the local nullpay.json config.
         */
        this.invoices = {
            /**
             * Returns all invoices from nullpay.json, or throws if the file is missing.
             */
            getAll: () => {
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
            getByIndex: (i) => {
                const all = this.invoices.getAll();
                if (i < 0 || i >= all.length) {
                    throw new Error(`Invoice index ${i} is out of range. nullpay.json has ${all.length} invoice(s).`);
                }
                return all[i];
            },
            /**
             * Returns an invoice by its developer-defined name.
             */
            getByName: (name) => {
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
            getByType: (type) => {
                return this.invoices.getAll().filter(inv => inv.type === type);
            }
        };
        this.checkout = {
            sessions: {
                create: async (params) => {
                    var _a;
                    // ── Resolve from nullpay.json if shorthand is used ──────────
                    let resolvedParams = { ...params };
                    if (params.nullpay_invoice_name !== undefined || params.nullpay_invoice_index !== undefined) {
                        let inv;
                        if (params.nullpay_invoice_name !== undefined) {
                            inv = this.invoices.getByName(params.nullpay_invoice_name);
                        }
                        else {
                            inv = this.invoices.getByIndex(params.nullpay_invoice_index);
                        }
                        // Merge: nullpay.json values fill in the blanks; explicit params override
                        resolvedParams = {
                            ...resolvedParams,
                            invoice_hash: resolvedParams.invoice_hash || inv.hash,
                            salt: resolvedParams.salt || inv.salt,
                            type: resolvedParams.type || inv.type,
                            amount: resolvedParams.amount !== undefined ? resolvedParams.amount : ((_a = inv.amount) !== null && _a !== void 0 ? _a : undefined),
                            currency: resolvedParams.currency || inv.currency,
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
                        const randomBuffer = crypto_1.default.randomBytes(16);
                        let randomBigInt = BigInt(0);
                        for (const byte of randomBuffer) {
                            randomBigInt = (randomBigInt << BigInt(8)) + BigInt(byte);
                        }
                        finalSalt = `${randomBigInt.toString()}field`;
                        let invoiceTypeNum = 0;
                        if (resolvedParams.type === 'donation')
                            invoiceTypeNum = 2;
                        else if (resolvedParams.type === 'multipay')
                            invoiceTypeNum = 1;
                        const relayerRes = await (0, node_fetch_1.default)(`${this.baseURL}/dps/relayer/create-invoice`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.secretKey}`
                            },
                            body: JSON.stringify({
                                amount: isDonation ? 0 : resolvedParams.amount,
                                currency: resolvedParams.currency || 'CREDITS',
                                salt: finalSalt,
                                invoice_type: invoiceTypeNum
                            })
                        });
                        if (!relayerRes.ok) {
                            const errorData = await relayerRes.json().catch(() => ({}));
                            throw new Error(`NullPay Relayer Pre-gen Error: ${relayerRes.status} - ${errorData.error || relayerRes.statusText}`);
                        }
                        let hashStr = null;
                        let retries = 0;
                        const MAX_RETRIES = 60;
                        while (!hashStr && retries < MAX_RETRIES) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            try {
                                const mapRes = await (0, node_fetch_1.default)(`https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v22.aleo/mapping/salt_to_invoice/${finalSalt}`);
                                if (mapRes.ok) {
                                    const textVal = await mapRes.json();
                                    if (textVal)
                                        hashStr = textVal.toString().replace(/(['"'])/g, '');
                                }
                            }
                            catch (_) {
                                // transient, ignore
                            }
                            retries++;
                        }
                        if (!hashStr) {
                            throw new Error("Timed out waiting for Aleo network blockchain confirmation. Invoice was sent, but hash was not resolved.");
                        }
                        finalInvoiceHash = hashStr;
                    }
                    const sessionPayload = {
                        ...resolvedParams,
                        amount: isDonation ? 0 : resolvedParams.amount,
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
             */
            verifySignature: (payload, signature) => {
                if (!payload || !signature)
                    return false;
                try {
                    const expectedSignature = crypto_1.default
                        .createHmac('sha256', this.secretKey)
                        .update(payload)
                        .digest('hex');
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
        this.baseURL = config.baseURL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
        this.projectRoot = config.projectRoot;
        this.configPath = config.configPath;
    }
}
exports.NullPay = NullPay;
