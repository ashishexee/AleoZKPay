"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPayMcpService = void 0;
const aleo_1 = require("./aleo");
const crypto_1 = require("./crypto");
const esm_1 = require("./esm");
function normalizeCurrency(value) {
    const normalized = (value || 'CREDITS').toUpperCase();
    if (normalized === 'USDCX' || normalized === 'USAD' || normalized === 'ANY') {
        return normalized;
    }
    return 'CREDITS';
}
function normalizePaymentCurrency(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value.toUpperCase();
    if (normalized === 'USDCX' || normalized === 'USAD') {
        return normalized;
    }
    return 'CREDITS';
}
function normalizeInvoiceType(value) {
    if (value === 'multipay' || value === 'donation')
        return value;
    return 'standard';
}
function tokenTypeLabel(tokenType) {
    if (tokenType === 1)
        return 'USDCX';
    if (tokenType === 2)
        return 'USAD';
    if (tokenType === 3)
        return 'ANY';
    return 'CREDITS';
}
function invoiceTypeLabel(invoiceType) {
    if (invoiceType === 1)
        return 'multipay';
    if (invoiceType === 2)
        return 'donation';
    return 'standard';
}
function currencyToTokenType(currency) {
    if (currency === 'USDCX')
        return 1;
    if (currency === 'USAD')
        return 2;
    if (currency === 'ANY')
        return 3;
    return 0;
}
function linkTokenToCurrency(token) {
    if (!token) {
        return undefined;
    }
    const normalized = token.trim().toLowerCase();
    if (normalized === 'usdcx')
        return 'USDCX';
    if (normalized === 'usad')
        return 'USAD';
    if (normalized === 'any')
        return 'ANY';
    return 'CREDITS';
}
function linkTypeToInvoiceType(type) {
    if (type === 'multipay' || type === 'donation') {
        return type;
    }
    return 'standard';
}
function parseAmount(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function shouldMarkInvoiceSettled(invoiceType) {
    return invoiceType !== 1 && invoiceType !== 2;
}
function formatInvoiceSummary(invoice) {
    const paymentIds = Array.isArray(invoice.payment_tx_ids) && invoice.payment_tx_ids.length > 0
        ? invoice.payment_tx_ids.join(', ')
        : 'none';
    const amount = invoice.amount ?? 0;
    return [
        `invoice=${invoice.invoice_hash}`,
        `status=${invoice.status}`,
        `amount=${amount}`,
        `token=${tokenTypeLabel(invoice.token_type)}`,
        `type=${invoiceTypeLabel(invoice.invoice_type)}`,
        `created=${invoice.created_at || 'unknown'}`,
        `invoice_tx=${invoice.invoice_transaction_id || 'none'}`,
        `payment_txs=${paymentIds}`
    ].join(' | ');
}
function getAmountSource(invoice) {
    if (typeof invoice.amount_micro === 'number') {
        return 'record';
    }
    if (typeof invoice.amount === 'number' && invoice.amount > 0) {
        return 'database';
    }
    return 'missing';
}
function buildAmountLookupHint(invoice, hasInvoiceLookupKey) {
    const amountSource = getAmountSource(invoice);
    if (amountSource === 'record') {
        return ' | amount_source=record';
    }
    if (amountSource === 'database') {
        return ' | amount_source=database';
    }
    if (hasInvoiceLookupKey) {
        return ' | amount_source=missing | record_lookup=not_found_or_unreadable_for_selected_wallet';
    }
    return ' | amount_source=db_only (amount could not be loaded because private key is not provided)';
}
function readEnvTrimmed(name) {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}
function getMainWalletEnv() {
    return {
        address: readEnvTrimmed('NULLPAY_MAIN_ADDRESS'),
        password: readEnvTrimmed('NULLPAY_MAIN_PASSWORD'),
        privateKey: readEnvTrimmed('NULLPAY_MAIN_PRIVATE_KEY') || readEnvTrimmed('NULLPAY_MAIN_PVT_KEY')
    };
}
class NullPayMcpService {
    constructor(backend, sessions, publicBaseUrl) {
        this.backend = backend;
        this.sessions = sessions;
        this.publicBaseUrl = publicBaseUrl;
    }
    listTools() {
        return [
            {
                name: 'login',
                description: 'Login to NullPay, validate password, create burner wallet, recover a backed-up password or burner wallet from on-chain records, or switch active wallet. If NULLPAY_MAIN_ADDRESS and NULLPAY_MAIN_PASSWORD are configured, call this tool with empty arguments and do not ask the user to share secrets in chat. The MCP server can also read NULLPAY_MAIN_PRIVATE_KEY from env without exposing it to the model.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        address: { type: 'string', description: 'User main Aleo address. Optional. If NULLPAY_MAIN_ADDRESS is set in env, use that and do not ask the user for it.' },
                        password: { type: 'string', description: 'User NullPay password. Optional. If NULLPAY_MAIN_PASSWORD is set in env, use that and do not ask the user for it.' },
                        main_private_key: { type: 'string', description: 'Optional direct main wallet private key. Prefer NULLPAY_MAIN_PRIVATE_KEY in env so the model never sees it.' },
                        create_burner_wallet: { type: 'boolean', description: 'Generate and store a burner wallet when missing.' },
                        wallet_preference: { type: 'string', enum: ['main', 'burner'], description: 'Select active wallet for later tool calls.' }
                    }
                }
            },
            {
                name: 'create_invoice',
                description: 'Create a NullPay invoice using the active main or burner wallet address.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        amount: { type: 'number' },
                        currency: { type: 'string', enum: ['CREDITS', 'USDCX', 'USAD', 'ANY'] },
                        memo: { type: 'string' },
                        invoice_type: { type: 'string', enum: ['standard', 'multipay', 'donation'] },
                        wallet: { type: 'string', enum: ['main', 'burner'] },
                        line_items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unitPrice: { type: 'number' },
                                    total: { type: 'number' }
                                },
                                required: ['name', 'quantity', 'unitPrice', 'total']
                            }
                        }
                    },
                    required: ['amount']
                }
            },
            {
                name: 'pay_invoice',
                description: 'Pay a NullPay payment link or invoice from the selected wallet. Prefer providing the full payment link so the MCP can use the merchant address, amount, salt, token, and session id exactly like the original checkout flow.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        payment_link: { type: 'string', description: 'Full NullPay payment link, for example https://nullpay.app/pay?...' },
                        invoice_hash: { type: 'string', description: 'Optional invoice hash if you do not provide the full payment link.' },
                        wallet: { type: 'string', enum: ['main', 'burner'] },
                        amount: { type: 'number', description: 'Optional override. If payment_link is present, its amount is used by default.' },
                        currency: { type: 'string', enum: ['CREDITS', 'USDCX', 'USAD'], description: 'Optional override. Required only when the link/invoice allows ANY token.' },
                        session_id: { type: 'string', description: 'Optional hosted-checkout session id if it is not already present in the link.' }
                    }
                }
            },
            {
                name: 'get_transaction_info',
                description: 'Get one invoice by hash or list recent transactions for the active wallet. When available, use the main-wallet private key to enrich invoice amounts from private records.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        invoice_hash: { type: 'string' },
                        wallet: { type: 'string', enum: ['main', 'burner'] },
                        limit: { type: 'number' }
                    }
                }
            },
            {
                name: 'sweep_funds',
                description: 'Transfer funds from the active private wallet to a specified Aleo destination address without revealing your private key.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        amount: { type: 'number', description: 'Amount to sweep/transfer' },
                        destination: { type: 'string', description: 'Aleo destination address' },
                        currency: { type: 'string', enum: ['CREDITS', 'USDCX', 'USAD'] },
                        wallet: { type: 'string', enum: ['main', 'burner'] }
                    },
                    required: ['amount', 'destination']
                }
            },
            {
                name: 'pay_with_giftcard',
                description: 'Redeem or pay an invoice using a NullPay Gift Card code without needing a wallet private key. Provides gasless ZK Proof execution via the NullPay backend relayer.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        gift_code: { type: 'string', description: 'The gift card code starting with gift-' },
                        payment_link: { type: 'string', description: 'Full NullPay payment link (optional if invoice_hash is provided)' },
                        invoice_hash: { type: 'string', description: 'Invoice hash (optional if payment_link is provided)' },
                        amount: { type: 'number' },
                        currency: { type: 'string', enum: ['CREDITS', 'USDCX', 'USAD'] },
                        session_id: { type: 'string' }
                    },
                    required: ['gift_code']
                }
            },
            {
                name: 'pay_with_card',
                description: 'Pay an invoice using your NullPay Card without sharing the main wallet private key. Needs the 16-digit card number, PIN, and Card Secret.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        card_number: { type: 'string' },
                        pin: { type: 'string' },
                        card_secret: { type: 'string' },
                        payment_link: { type: 'string' },
                        invoice_hash: { type: 'string' },
                        amount: { type: 'number' },
                        currency: { type: 'string', enum: ['CREDITS', 'USDCX', 'USAD'] },
                        session_id: { type: 'string' }
                    },
                    required: ['card_number', 'pin', 'card_secret']
                }
            },
            {
                name: 'get_analytics',
                description: 'Get comprehensive spending analytics and timeline metrics from your recent transactions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        wallet: { type: 'string', enum: ['main', 'burner'] },
                        days: { type: 'number', description: 'Number of past days to include in the analytics' }
                    }
                }
            },
            {
                name: 'check_burner_balance',
                description: 'Check the available private record balances (CREDITS, USDCX, USAD) in the burner wallet. Useful to check before sweeping funds.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];
    }
    async callTool(name, args) {
        try {
            if (name === 'login')
                return await this.login(args);
            if (name === 'create_invoice')
                return await this.createInvoice(args);
            if (name === 'pay_invoice')
                return await this.payInvoice(args);
            if (name === 'get_transaction_info')
                return await this.getTransactionInfo(args);
            if (name === 'sweep_funds')
                return await this.sweepFunds(args);
            if (name === 'pay_with_giftcard')
                return await this.payWithGiftcard(args);
            if (name === 'pay_with_card')
                return await this.payWithCard(args);
            if (name === 'get_analytics')
                return await this.getAnalytics(args);
            if (name === 'check_burner_balance')
                return await this.checkBurnerBalance();
            throw new Error(`Unknown tool: ${name}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: 'text', text: message }],
                isError: true,
            };
        }
    }
    async login(args) {
        const envMain = getMainWalletEnv();
        const address = (args.address || envMain.address || '').trim();
        let password = args.password || envMain.password || '';
        const mainPrivateKey = args.main_private_key || envMain.privateKey || null;
        if (!address) {
            throw new Error('Address is required. You can pass it directly or set NULLPAY_MAIN_ADDRESS in env.');
        }
        const addressHash = (0, crypto_1.hashAddress)(address);
        const existingProfile = await this.backend.getUserProfile(addressHash);
        let encryptedMainAddress = existingProfile?.main_address || null;
        let recoveredBackupSource = null;
        let recoveredBurnerAddress = null;
        let recoveredEncryptedBurnerKey = null;
        let usedRecoveredPassword = false;
        let restoredBurnerFromChain = false;
        let chainBackupLoaded = false;
        const loadChainBackup = async () => {
            if (chainBackupLoaded || !mainPrivateKey) {
                return null;
            }
            chainBackupLoaded = true;
            const recovered = await (0, aleo_1.recoverOnChainWalletBackup)(mainPrivateKey, address);
            if (!recovered) {
                return null;
            }
            recoveredBackupSource = recovered.source;
            recoveredBurnerAddress = recovered.burnerAddress || null;
            recoveredEncryptedBurnerKey = recovered.encryptedBurnerKey || null;
            return recovered;
        };
        const attemptRecovery = async () => {
            const recovered = await loadChainBackup();
            if (!recovered?.password) {
                return false;
            }
            password = recovered.password;
            usedRecoveredPassword = true;
            return true;
        };
        if (encryptedMainAddress) {
            if (!password) {
                const recovered = await attemptRecovery();
                if (!recovered) {
                    throw new Error('Password is required for this NullPay account. Set NULLPAY_MAIN_PASSWORD, pass password directly, or provide NULLPAY_MAIN_PRIVATE_KEY so the MCP can recover a backed-up password from on-chain records.');
                }
            }
            let decrypted;
            try {
                decrypted = await (0, crypto_1.decryptWithPassword)(encryptedMainAddress, password);
            }
            catch {
                const recovered = await attemptRecovery();
                if (!recovered) {
                    throw new Error('Password is incorrect for this NullPay account, and no recoverable on-chain password backup was found for the provided main private key.');
                }
                decrypted = await (0, crypto_1.decryptWithPassword)(encryptedMainAddress, password);
            }
            if (decrypted !== address) {
                const recovered = await attemptRecovery();
                if (!recovered) {
                    throw new Error('Password is incorrect for this NullPay account.');
                }
                const recoveredAddress = await (0, crypto_1.decryptWithPassword)(encryptedMainAddress, password);
                if (recoveredAddress !== address) {
                    throw new Error('Recovered password does not match the provided address.');
                }
            }
        }
        else {
            if (!password) {
                const recovered = await attemptRecovery();
                if (!recovered) {
                    throw new Error('Password is required to create a new NullPay account unless the MCP can recover it from on-chain backup records using NULLPAY_MAIN_PRIVATE_KEY.');
                }
            }
            encryptedMainAddress = await (0, crypto_1.encryptWithPassword)(address, password);
        }
        if (!encryptedMainAddress) {
            throw new Error('Main wallet address encryption failed.');
        }
        let encryptedBurnerAddress = existingProfile?.burner_address || null;
        let encryptedBurnerKey = existingProfile?.encrypted_burner_key || null;
        let burnerAddress = null;
        if (encryptedBurnerAddress) {
            try {
                burnerAddress = await (0, crypto_1.decryptWithPassword)(encryptedBurnerAddress, password);
            }
            catch {
                burnerAddress = null;
            }
        }
        if (!encryptedBurnerKey || !burnerAddress || !encryptedBurnerAddress) {
            await loadChainBackup();
        }
        if ((!encryptedBurnerAddress || !encryptedBurnerKey || !burnerAddress) && recoveredBurnerAddress && recoveredEncryptedBurnerKey) {
            burnerAddress = recoveredBurnerAddress;
            encryptedBurnerAddress = await (0, crypto_1.encryptWithPassword)(recoveredBurnerAddress, password);
            encryptedBurnerKey = recoveredEncryptedBurnerKey;
            restoredBurnerFromChain = true;
        }
        if (args.create_burner_wallet && !encryptedBurnerKey) {
            const { PrivateKey } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
            const burnerPrivateKey = new PrivateKey();
            const nextBurnerAddress = burnerPrivateKey.to_address().to_string();
            burnerAddress = nextBurnerAddress;
            encryptedBurnerAddress = await (0, crypto_1.encryptWithPassword)(nextBurnerAddress, password);
            encryptedBurnerKey = await (0, crypto_1.encryptWithPassword)(burnerPrivateKey.to_string(), password);
        }
        const persistedBurnerAddress = args.create_burner_wallet ? encryptedBurnerAddress : (existingProfile?.burner_address || null);
        const persistedBurnerKey = args.create_burner_wallet ? encryptedBurnerKey : (existingProfile?.encrypted_burner_key || null);
        await this.backend.upsertUserProfile({
            address_hash: addressHash,
            main_address: encryptedMainAddress,
            burner_address: persistedBurnerAddress,
            encrypted_burner_key: persistedBurnerKey,
        });
        const preferredWallet = (args.wallet_preference || (mainPrivateKey ? 'main' : (encryptedBurnerKey ? 'burner' : 'main')));
        if (preferredWallet === 'burner' && !encryptedBurnerKey) {
            throw new Error('Burner wallet is not available yet. Create one first or switch to main.');
        }
        const now = new Date().toISOString();
        this.sessions.set({
            address,
            addressHash,
            password,
            activeWallet: preferredWallet,
            encryptedMainAddress,
            encryptedBurnerAddress,
            encryptedBurnerKey,
            mainPrivateKey,
            hasMainPrivateKeyInEnv: Boolean(envMain.privateKey),
            createdAt: now,
            updatedAt: now,
        });
        const usedEnvCredentials = Boolean(envMain.address && envMain.password && !args.address && !args.password);
        const lines = [
            usedEnvCredentials ? 'Used main-wallet address and password from MCP env.' : 'Logged in as ' + address + '.',
            encryptedBurnerKey
                ? 'Active wallet: ' + preferredWallet + '. Burner wallet is available' + (burnerAddress ? ' at ' + burnerAddress : '') + '.'
                : 'Active wallet: main. No burner wallet is stored yet.',
        ];
        if (usedRecoveredPassword) {
            lines.push('Recovered your NullPay password from on-chain backup records using the main wallet private key (' + (recoveredBackupSource === 'full_burner' ? 'full burner backup' : 'password backup') + ').');
        }
        if (restoredBurnerFromChain) {
            lines.push('Recovered your backed-up burner wallet from on-chain records for this session only. It was not written back to the backend profile.');
        }
        if (mainPrivateKey) {
            lines.push('Main wallet private key is available for record-backed amount lookup and main-wallet payments. Active wallet is set to main by default, and you can switch to burner anytime by logging in again with wallet_preference set to burner. Invoice lookup will prefer the main wallet records even when you pay from burner.');
        }
        else {
            lines.push('Set NULLPAY_MAIN_PRIVATE_KEY in the MCP server env to let NullPay fetch invoice amounts from your main-wallet records and pay from your main wallet without exposing the key to the model.');
        }
        if (!encryptedBurnerKey) {
            lines.push('Recommended next step: create a burner wallet for private automated payments.');
        }
        return {
            content: [{ type: 'text', text: lines.join(' ') }],
            structuredContent: {
                address,
                active_wallet: preferredWallet,
                has_burner_wallet: Boolean(encryptedBurnerKey),
                burner_address: burnerAddress,
                has_main_private_key: Boolean(mainPrivateKey),
                main_private_key_from_env: Boolean(envMain.privateKey),
                used_env_credentials: usedEnvCredentials,
                used_recovered_password: usedRecoveredPassword,
                recovery_source: recoveredBackupSource,
                restored_burner_from_chain: restoredBurnerFromChain,
            },
        };
    }
    async createInvoice(args) {
        const wallet = this.resolveWallet(args.wallet);
        const currency = normalizeCurrency(args.currency);
        const invoiceType = normalizeInvoiceType(args.invoice_type);
        if (invoiceType !== 'donation' && (!args.amount || args.amount <= 0)) {
            throw new Error('Amount must be greater than zero for standard or multipay invoices.');
        }
        const merchantAddress = await this.resolveWalletAddress(wallet);
        const salt = (0, aleo_1.generateSalt)();
        const relayResponse = await this.backend.relayCreateInvoice({
            merchant_address: merchantAddress,
            amount: invoiceType === 'donation' ? 0 : Number(args.amount),
            currency,
            salt,
            memo: args.memo,
            invoice_type: (0, aleo_1.invoiceTypeToNumber)(invoiceType),
        });
        const invoiceHash = await (0, aleo_1.waitForInvoiceHash)(salt);
        await this.backend.createInvoiceRow((0, aleo_1.createInvoiceDbRecord)({
            invoiceHash,
            merchantAddress,
            amount: invoiceType === 'donation' ? 0 : Number(args.amount),
            memo: args.memo,
            invoiceType,
            currency,
            salt,
            invoiceTxId: relayResponse.tx_id,
            wallet,
            lineItems: args.line_items,
            merchantAddressHash: (0, crypto_1.hashAddress)(merchantAddress),
        }));
        const paymentLink = (0, aleo_1.buildPaymentLink)(this.publicBaseUrl, {
            merchant: merchantAddress,
            amount: invoiceType === 'donation' ? 0 : Number(args.amount),
            salt,
            memo: args.memo,
            invoiceType,
            currency,
            invoiceHash,
        });
        return {
            content: [{
                type: 'text',
                text: `Invoice created with hash ${invoiceHash}. Active wallet ${wallet} was used. Payment link: ${paymentLink}`
            }],
            structuredContent: {
                invoice_hash: invoiceHash,
                invoice_transaction_id: relayResponse.tx_id,
                wallet,
                merchant_address: merchantAddress,
                payment_link: paymentLink,
                currency,
                invoice_type: invoiceType,
            }
        };
    }
    async payInvoice(args) {
        const wallet = this.resolveWallet(args.wallet);
        const walletPrivateKey = await this.resolveWalletPrivateKey(wallet);
        const resolved = await this.resolvePayInvoiceContext(args, wallet);
        const { invoice, sessionId, source } = resolved;
        const { authorization } = await (0, aleo_1.createSponsoredPaymentAuthorization)({
            walletPrivateKey,
            invoice,
            amount: args.amount,
            currency: normalizePaymentCurrency(args.currency),
        });
        const sponsored = await this.backend.sponsorExecution({
            execution_authorization_string: authorization,
            programName: 'zk_pay_proofs_privacy_v28.aleo',
        });
        const txId = sponsored.transaction?.id;
        if (!txId) {
            throw new Error('Sponsored payment did not return a transaction id.');
        }
        const invoiceUpdate = {
            payment_tx_ids: [txId],
            ...(sessionId ? { session_id: sessionId } : {}),
        };
        if (shouldMarkInvoiceSettled(invoice.invoice_type)) {
            invoiceUpdate.status = 'SETTLED';
        }
        await this.backend.updateInvoice(invoice.invoice_hash, invoiceUpdate);
        if (sessionId) {
            await this.backend.updateCheckoutSession(sessionId, {
                status: 'SETTLED',
                tx_id: txId,
            });
        }
        const invoiceStatusNote = shouldMarkInvoiceSettled(invoice.invoice_type)
            ? 'Invoice status updated to SETTLED.'
            : 'Payment recorded on the invoice while keeping the invoice open for additional multipay/donation activity.';
        return {
            content: [{
                type: 'text',
                text: `Invoice ${invoice.invoice_hash} was paid from ${wallet} wallet using ${invoice.amount ?? args.amount ?? 0} ${tokenTypeLabel(invoice.token_type)} to ${invoice.designated_address || invoice.merchant_address}. ${invoiceStatusNote}`
            }],
            structuredContent: {
                invoice_hash: invoice.invoice_hash,
                payment_tx_id: txId,
                wallet,
                amount: invoice.amount ?? args.amount ?? null,
                token: tokenTypeLabel(invoice.token_type),
                amount_source: getAmountSource(invoice),
                payment_source: source,
                session_id: sessionId || null,
                invoice_status_updated_to: shouldMarkInvoiceSettled(invoice.invoice_type) ? 'SETTLED' : 'PENDING',
            }
        };
    }
    async getTransactionInfo(args) {
        const wallet = this.resolveWallet(args.wallet);
        const walletAddress = await this.resolveWalletAddress(wallet);
        const walletPrivateKey = await this.resolveWalletPrivateKeyOptional(wallet);
        const invoiceLookupPrivateKey = await this.resolveInvoiceLookupPrivateKey(wallet);
        if (args.invoice_hash) {
            const invoice = await this.getEnrichedInvoice(args.invoice_hash, invoiceLookupPrivateKey);
            const onChain = await (0, aleo_1.getInvoiceStatusData)(args.invoice_hash);
            const onChainStatus = onChain ? ` | on_chain_status=${onChain.status} | on_chain_token=${tokenTypeLabel(onChain.tokenType)} | on_chain_type=${invoiceTypeLabel(onChain.invoiceType)}` : '';
            const amountHint = buildAmountLookupHint(invoice, Boolean(invoiceLookupPrivateKey));
            const missingAmountNote = getAmountSource(invoice) === 'missing'
                ? (!invoiceLookupPrivateKey ? ' | note=Amount could not be loaded because private key is not provided.' : ' | note=invoice_amount_not_recovered_automatically; multipay invoices may still have a fixed amount; missing amount here indicates lookup failure, not a donation-style free amount')
                : '';
            return {
                content: [{
                    type: 'text',
                    text: `Transaction details: ${formatInvoiceSummary(invoice)}${onChainStatus}${amountHint}${missingAmountNote}`
                }],
                structuredContent: {
                    invoice,
                    on_chain: onChain,
                    amount_source: getAmountSource(invoice),
                    has_wallet_private_key: Boolean(walletPrivateKey),
                    has_invoice_lookup_key: Boolean(invoiceLookupPrivateKey),
                }
            };
        }
        const invoices = await this.backend.getMerchantInvoices((0, crypto_1.hashAddress)(walletAddress));
        const limit = Math.max(1, Math.min(Number(args.limit || 10), 50));
        const recentBase = invoices.slice(0, limit);
        const recent = await Promise.all(recentBase.map((invoice) => this.enrichInvoiceIfPossible(invoice, invoiceLookupPrivateKey)));
        const summaries = recent.map((invoice, index) => `${index + 1}. ${formatInvoiceSummary(invoice)}${buildAmountLookupHint(invoice, Boolean(invoiceLookupPrivateKey))}`);
        const summaryText = recent.length > 0
            ? `Last ${recent.length} transactions for ${wallet} wallet ${walletAddress}:\n${summaries.join('\n')}`
            : `No transactions found for ${wallet} wallet ${walletAddress}.`;
        return {
            content: [{
                type: 'text',
                text: summaryText
            }],
            structuredContent: {
                wallet,
                wallet_address: walletAddress,
                invoices: recent,
                has_wallet_private_key: Boolean(walletPrivateKey),
                has_invoice_lookup_key: Boolean(invoiceLookupPrivateKey),
            }
        };
    }
    resolveWallet(wallet) {
        const session = this.sessions.require();
        const target = wallet || session.activeWallet;
        if (target === 'burner' && !session.encryptedBurnerKey) {
            throw new Error('Burner wallet is not available. Create one first or use main wallet.');
        }
        if (target !== session.activeWallet) {
            this.sessions.updateWallet(target);
        }
        return target;
    }
    async resolveWalletAddress(wallet) {
        const session = this.sessions.require();
        if (wallet === 'burner') {
            if (!session.encryptedBurnerAddress) {
                throw new Error('Burner wallet address is not stored.');
            }
            return await (0, crypto_1.decryptWithPassword)(session.encryptedBurnerAddress, session.password);
        }
        return session.address;
    }
    async resolveWalletPrivateKey(wallet) {
        const key = await this.resolveWalletPrivateKeyOptional(wallet);
        if (!key) {
            if (wallet === 'main') {
                throw new Error('Main wallet private key is not available. Set NULLPAY_MAIN_PRIVATE_KEY in env or log in with main_private_key so NullPay can fetch amounts from records and pay from your main wallet.');
            }
            throw new Error('Burner wallet private key is not available. Create a burner wallet first.');
        }
        return key;
    }
    async resolveWalletPrivateKeyOptional(wallet) {
        const session = this.sessions.require();
        if (wallet === 'main') {
            return session.mainPrivateKey || null;
        }
        if (!session.encryptedBurnerKey) {
            return null;
        }
        return await (0, crypto_1.decryptWithPassword)(session.encryptedBurnerKey, session.password);
    }
    async resolveInvoiceLookupPrivateKey(wallet) {
        const session = this.sessions.require();
        if (session.mainPrivateKey) {
            return session.mainPrivateKey;
        }
        const targetWallet = wallet || session.activeWallet;
        return await this.resolveWalletPrivateKeyOptional(targetWallet);
    }
    async resolvePayInvoiceContext(args, wallet) {
        const paymentLink = args.payment_link?.trim();
        const explicitCurrency = normalizePaymentCurrency(args.currency);
        if (paymentLink) {
            const parsedUrl = new URL(paymentLink);
            const saltFromLink = parsedUrl.searchParams.get('salt') || undefined;
            let invoiceHash = (args.invoice_hash || parsedUrl.searchParams.get('hash') || '').trim();
            if (!invoiceHash && saltFromLink) {
                try {
                    invoiceHash = await (0, aleo_1.waitForInvoiceHash)(saltFromLink, 5, 1000);
                }
                catch {
                    invoiceHash = '';
                }
            }
            if (!invoiceHash) {
                throw new Error('Payment link is missing invoice hash and the MCP could not resolve it from salt.');
            }
            let dbInvoice = null;
            try {
                dbInvoice = await this.backend.getInvoice(invoiceHash);
            }
            catch {
                dbInvoice = null;
            }
            const linkAmount = parseAmount(parsedUrl.searchParams.get('amount'));
            const linkCurrency = linkTokenToCurrency(parsedUrl.searchParams.get('token'));
            const linkInvoiceType = linkTypeToInvoiceType(parsedUrl.searchParams.get('type'));
            const effectiveCurrency = explicitCurrency || (linkCurrency && linkCurrency !== 'ANY' ? linkCurrency : undefined);
            const effectiveInvoiceType = dbInvoice?.invoice_type ?? (0, aleo_1.invoiceTypeToNumber)(linkInvoiceType);
            const amount = args.amount ?? linkAmount ?? dbInvoice?.amount ?? undefined;
            const merchantAddress = parsedUrl.searchParams.get('merchant') || dbInvoice?.designated_address || dbInvoice?.merchant_address || undefined;
            const salt = saltFromLink || dbInvoice?.salt || undefined;
            const sessionId = args.session_id || parsedUrl.searchParams.get('session_id') || undefined;
            const tokenType = dbInvoice?.token_type ?? (effectiveCurrency ? currencyToTokenType(effectiveCurrency) : currencyToTokenType(linkCurrency || 'CREDITS'));
            if (!merchantAddress || !merchantAddress.startsWith('aleo')) {
                throw new Error('Payment link is missing a valid merchant address.');
            }
            if (!salt) {
                throw new Error('Payment link is missing the invoice salt.');
            }
            if ((linkCurrency === 'ANY' || dbInvoice?.token_type === 3) && !explicitCurrency) {
                throw new Error('This payment link accepts ANY token. Specify currency as CREDITS, USDCX, or USAD when calling pay_invoice.');
            }
            if (typeof amount !== 'number' || amount <= 0) {
                throw new Error('Payment link does not contain a usable amount. Pass amount explicitly if needed.');
            }
            const invoice = {
                invoice_hash: invoiceHash,
                merchant_address: merchantAddress,
                designated_address: merchantAddress,
                merchant_address_hash: dbInvoice?.merchant_address_hash || null,
                is_burner: dbInvoice?.is_burner,
                amount,
                amount_micro: Math.round(amount * 1000000),
                memo: dbInvoice?.memo || parsedUrl.searchParams.get('memo') || null,
                status: dbInvoice?.status || 'PENDING',
                invoice_transaction_id: dbInvoice?.invoice_transaction_id || null,
                payment_tx_ids: dbInvoice?.payment_tx_ids || null,
                created_at: dbInvoice?.created_at,
                updated_at: dbInvoice?.updated_at,
                salt,
                invoice_type: effectiveInvoiceType,
                token_type: tokenType,
                invoice_items: dbInvoice?.invoice_items || null,
                for_sdk: dbInvoice?.for_sdk,
            };
            return { invoice, sessionId, source: 'payment_link' };
        }
        if (!args.invoice_hash) {
            throw new Error('Provide either payment_link or invoice_hash to pay an invoice.');
        }
        const invoiceLookupPrivateKey = await this.resolveInvoiceLookupPrivateKey(wallet);
        const invoice = await this.getEnrichedInvoice(args.invoice_hash, invoiceLookupPrivateKey);
        if (getAmountSource(invoice) === 'missing' && args.amount === undefined) {
            throw new Error('Invoice amount could not be recovered automatically. Paste the full payment link instead so NullPay can use the merchant address, amount, and salt directly, or provide amount explicitly.');
        }
        return {
            invoice: {
                ...invoice,
                amount: args.amount ?? invoice.amount,
                token_type: invoice.token_type ?? (explicitCurrency ? currencyToTokenType(explicitCurrency) : invoice.token_type),
            },
            sessionId: args.session_id,
            source: 'invoice_hash',
        };
    }
    async enrichInvoiceIfPossible(invoice, walletPrivateKey) {
        try {
            return await (0, aleo_1.enrichInvoiceWithRecordAmount)(invoice, walletPrivateKey);
        }
        catch {
            return invoice;
        }
    }
    async getEnrichedInvoice(invoiceHash, walletPrivateKey) {
        const invoice = await this.backend.getInvoice(invoiceHash);
        return await this.enrichInvoiceIfPossible(invoice, walletPrivateKey);
    }
    async checkBurnerBalance() {
        let walletPrivateKey;
        try {
            walletPrivateKey = await this.resolveWalletPrivateKey('burner');
        }
        catch (e) {
            throw new Error('Burner wallet private key not found. Make sure burner wallet is created and unlocked.');
        }
        const session = await (0, aleo_1.getScannerSession)(walletPrivateKey);
        const balances = await (0, aleo_1.getWalletBalances)(session);
        return {
            content: [{
                type: 'text',
                text: `Your burner wallet balance is:\n- ${balances.credits} CREDITS\n- ${balances.usdcx} USDCX\n- ${balances.usad} USAD\n`
            }],
            structuredContent: balances
        };
    }
    async sweepFunds(args) {
        const wallet = this.resolveWallet(args.wallet);
        const walletPrivateKey = await this.resolveWalletPrivateKey(wallet);
        const amountMicro = BigInt(Math.round(args.amount * 1000000));
        const currency = normalizePaymentCurrency(args.currency) || 'CREDITS';
        const { authorization, programName } = await (0, aleo_1.createSweepAuthorization)({
            walletPrivateKey,
            amountMicro,
            currency,
            destination: args.destination
        });
        const sponsored = await this.backend.sponsorExecution({
            execution_authorization_string: authorization,
            programName,
        });
        const txId = sponsored.transaction?.id;
        if (!txId) {
            throw new Error('Sponsored sweep did not return a transaction id.');
        }
        return {
            content: [{
                type: 'text',
                text: `Successfully swept ${args.amount} ${currency} to ${args.destination}. Transaction ID: ${txId}`
            }],
            structuredContent: {
                transaction_id: txId,
                amount: args.amount,
                currency,
                destination: args.destination,
                wallet
            }
        };
    }
    async payWithGiftcard(args) {
        const hex = args.gift_code.replace('gift-', '');
        const pkStr = new TextDecoder().decode(new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))));
        const resolved = await this.resolvePayInvoiceContext(args, 'main');
        const { invoice, sessionId } = resolved;
        const { authorization } = await (0, aleo_1.createSponsoredPaymentAuthorization)({
            walletPrivateKey: pkStr,
            invoice,
            amount: args.amount,
            currency: normalizePaymentCurrency(args.currency),
        });
        const sponsored = await this.backend.sponsorExecution({
            execution_authorization_string: authorization,
            programName: 'zk_pay_proofs_privacy_v28.aleo',
        });
        const txId = sponsored.transaction?.id;
        if (!txId) {
            throw new Error('Giftcard payment did not return a transaction id.');
        }
        const invoiceUpdate = {
            payment_tx_ids: [txId],
            ...(sessionId ? { session_id: sessionId } : {}),
        };
        if (shouldMarkInvoiceSettled(invoice.invoice_type)) {
            invoiceUpdate.status = 'SETTLED';
        }
        await this.backend.updateInvoice(invoice.invoice_hash, invoiceUpdate);
        if (sessionId) {
            await this.backend.updateCheckoutSession(sessionId, { status: 'SETTLED', tx_id: txId });
        }
        return {
            content: [{
                type: 'text',
                text: `Giftcard payment successful! Paid invoice ${invoice.invoice_hash}. TxID: ${txId}`
            }],
            structuredContent: {
                invoice_hash: invoice.invoice_hash,
                payment_tx_id: txId,
                session_id: sessionId || null
            }
        };
    }
    async payWithCard(args) {
        const normalizedCardNumber = args.card_number.replace(/\D/g, '');
        const cardNumberHash = (0, crypto_1.hashAddress)(normalizedCardNumber);
        const cardProfile = await this.backend.lookupCardWallet(cardNumberHash);
        if (!cardProfile) {
            throw new Error('NullPay card not found relative to this card number.');
        }
        if (cardProfile.card_status !== 'ACTIVE') {
            throw new Error('This NullPay card is not active.');
        }
        if (!cardProfile.encrypted_card_private_key || !cardProfile.card_kdf_salt) {
            throw new Error('Card missing encryption material.');
        }
        const pkStr = await (0, crypto_1.decryptCardPrivateKey)(cardProfile.encrypted_card_private_key, args.pin, args.card_secret, cardProfile.card_kdf_salt, cardProfile.card_kdf_algorithm, cardProfile.card_kdf_params);
        const resolved = await this.resolvePayInvoiceContext(args, 'main');
        const { invoice, sessionId } = resolved;
        const { authorization } = await (0, aleo_1.createSponsoredPaymentAuthorization)({
            walletPrivateKey: pkStr,
            invoice,
            amount: args.amount,
            currency: normalizePaymentCurrency(args.currency),
        });
        const sponsored = await this.backend.sponsorExecution({
            execution_authorization_string: authorization,
            programName: 'zk_pay_proofs_privacy_v28.aleo',
        });
        const txId = sponsored.transaction?.id;
        if (!txId) {
            throw new Error('Card payment did not return a transaction id.');
        }
        const invoiceUpdate = {
            payment_tx_ids: [txId],
            ...(sessionId ? { session_id: sessionId } : {}),
        };
        if (shouldMarkInvoiceSettled(invoice.invoice_type)) {
            invoiceUpdate.status = 'SETTLED';
        }
        await this.backend.updateInvoice(invoice.invoice_hash, invoiceUpdate);
        if (sessionId) {
            await this.backend.updateCheckoutSession(sessionId, { status: 'SETTLED', tx_id: txId });
        }
        return {
            content: [{
                type: 'text',
                text: `Card payment successful! Paid invoice ${invoice.invoice_hash}. TxID: ${txId}`
            }],
            structuredContent: {
                invoice_hash: invoice.invoice_hash,
                payment_tx_id: txId,
                session_id: sessionId || null
            }
        };
    }
    async getAnalytics(args) {
        const wallet = this.resolveWallet(args.wallet);
        const walletAddress = await this.resolveWalletAddress(wallet);
        const walletPrivateKey = await this.resolveWalletPrivateKeyOptional(wallet);
        let invoices = [];
        try {
            const rawInvoices = await this.backend.getMerchantInvoices((0, crypto_1.hashAddress)(walletAddress));
            if (walletPrivateKey) {
                invoices = await Promise.all(rawInvoices.map(inv => this.enrichInvoiceIfPossible(inv, walletPrivateKey)));
            }
            else {
                invoices = rawInvoices;
            }
        }
        catch {
            invoices = [];
        }
        const now = Date.now();
        const cutoff = args.days ? now - args.days * 24 * 60 * 60 * 1000 : 0;
        let totalVolume = 0;
        let totalTransactions = 0;
        const tokens = {};
        const dailyTrend = {};
        const monthlyTrend = {};
        invoices.forEach(inv => {
            const createdAt = inv.created_at ? new Date(inv.created_at).getTime() : 0;
            if (createdAt >= cutoff) {
                totalTransactions++;
                const amount = inv.amount || 0;
                totalVolume += amount;
                const tokenLabel = tokenTypeLabel(inv.token_type);
                tokens[tokenLabel] = (tokens[tokenLabel] || 0) + amount;
                if (inv.created_at) {
                    const dateObj = new Date(inv.created_at);
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                    dailyTrend[dateStr] = (dailyTrend[dateStr] || 0) + amount;
                    monthlyTrend[monthStr] = (monthlyTrend[monthStr] || 0) + amount;
                }
            }
        });
        const lines = [
            `Analytics for ${wallet} wallet (${walletAddress}) over ${args.days ? `last ${args.days} days` : 'all time'}:`,
            `- Total Transactions: ${totalTransactions}`,
            `- Total Volume Activity: ${totalVolume}`
        ];
        for (const [token, amount] of Object.entries(tokens)) {
            lines.push(`  * ${token}: ${amount}`);
        }
        if (!walletPrivateKey) {
            lines.push(`\nNote: Exact amounts could not be loaded because private key is not provided.`);
        }
        return {
            content: [{ type: 'text', text: lines.join('\n') }],
            structuredContent: {
                total_transactions: totalTransactions,
                total_volume: totalVolume,
                breakdown_by_token: tokens,
                daily_trend: dailyTrend,
                monthly_trend: monthlyTrend
            }
        };
    }
}
exports.NullPayMcpService = NullPayMcpService;
