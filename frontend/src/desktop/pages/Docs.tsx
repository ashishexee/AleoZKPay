import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../../utils/animations';

const Docs = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const containerVariants = staggerContainer;
    const itemVariants = fadeInUp;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'contracts', label: 'Smart Contract' },
        { id: 'frontend', label: 'Frontend Logic' },
        { id: 'backend', label: 'Backend API' },
        { id: 'architecture', label: 'Architecture' },
    ];

    const CodeBlock = ({ title, code, language = 'typescript' }: { title: string; code: string; language?: string }) => (
        <div className="mt-6 mb-8 group">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-t-lg border-b-0">
                <span className="font-mono text-xs text-neon-accent font-bold uppercase tracking-wider">{title}</span>
                <span className="text-[10px] text-gray-500">{language.toUpperCase()}</span>
            </div>
            <pre className="p-4 bg-black/80 backdrop-blur-sm border border-white/10 rounded-b-lg overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-neon-primary/30 transition-colors max-h-[600px] overflow-y-auto custom-scrollbar">
                <code>{code}</code>
            </pre>
        </div>
    );

    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>
            <motion.div
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="w-full max-w-7xl mx-auto pt-12 pb-20 px-6 relative z-10"
            >
                <motion.div variants={itemVariants} className="text-center mb-12 border-b border-white/10 pb-10 flex flex-col items-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white">
                        Technical <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Documentation</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-3xl leading-relaxed">
                        Complete technical specification of the NullPay zero-knowledge payment protocol.
                    </p>
                </motion.div>

                {/* TABS */}
                <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4 mb-12 sticky top-24 z-50 bg-black/50 backdrop-blur-xl p-4 rounded-full border border-white/5 max-w-5xl mx-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </motion.div>

                {/* CONTENT AREA */}
                <div className="min-h-[600px]">

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-12"
                        >
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold text-white mb-6">What is NullPay?</h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    NullPay is a privacy-first payment protocol built on Aleo. It enables merchants to create invoices
                                    and receive payments without revealing sensitive transaction details on-chain.
                                </p>

                                <h3 className="text-xl font-bold text-neon-primary mb-4">Key Features</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Zero-Knowledge Invoices</h4>
                                        <p className="text-sm text-gray-400">
                                            Invoice details (merchant, amount) are hashed on-chain. Only the hash is public.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Private Payments</h4>
                                        <p className="text-sm text-gray-400">
                                            Payments use Aleo's <code className="text-neon-primary">transfer_private</code> to hide payer identity.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Standard + Multi Pay</h4>
                                        <p className="text-sm text-gray-400">
                                            Support for single-payment invoices and multi-contributor campaigns.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Encrypted Metadata</h4>
                                        <p className="text-sm text-gray-400">
                                            Off-chain data is encrypted with AES-256 and stored securely in Supabase.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold text-white mb-6">How It Works</h2>
                                <div className="space-y-8">
                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-white mb-2">1. Invoice Creation (Merchant)</h3>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Merchant enters <strong>Amount</strong> and <strong>Invoice Type</strong> (Standard or Multi Pay).</li>
                                            <li>Client generates random <code>Salt</code> (128-bit).</li>
                                            <li>Client computes <code>Hash = BHP256(Merchant) + BHP256(Amount) + BHP256(Salt)</code>.</li>
                                            <li>Transaction <code>create_invoice(merchant, amount, salt, 0u32, type)</code> is sent to chain.</li>
                                            <li>On-chain mapping stores <code>Salt → Hash</code> and <code>Hash → InvoiceData</code>.</li>
                                        </ol>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-white mb-2">2. Payment (Payer)</h3>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Payer receives link with <code>merchant, amount, salt</code>.</li>
                                            <li>Client verifies hash on-chain using the salt.</li>
                                            <li>Client finds a private record with sufficient balance.</li>
                                            <li>Client generates a unique <code>payment_secret</code> for receipt tracking.</li>
                                            <li>Transaction <code>pay_invoice(record, merchant, amount, salt, payment_secret, message)</code> is executed.</li>
                                            <li>Payment is completed via <code>transfer_private</code>, keeping payer anonymous.</li>
                                            <li><strong>Standard Invoice:</strong> Invoice is marked as settled (status = 1) and closed.</li>
                                            <li><strong>Multi Pay Invoice:</strong> Payment receipt is stored in <code>payment_receipts</code> mapping. Invoice remains open for more payments.</li>
                                        </ol>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-white mb-2">3. Settlement (Merchant - Multi Pay Only)</h3>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Merchant calls <code>settle_invoice(salt, amount)</code> to close a multi-pay campaign.</li>
                                            <li>Contract verifies merchant identity by recomputing hash with <code>self.caller</code>.</li>
                                            <li>Invoice status is updated to settled (status = 1), preventing future payments.</li>
                                        </ol>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* SMART CONTRACT */}
                    {activeTab === 'contracts' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-4">Smart Contract Specification</h2>
                                <p className="text-gray-400 mb-6">
                                    The contract is deployed as <strong className="text-neon-primary">zk_pay_proofs_privacy_v7.aleo</strong>.
                                    It supports both Standard (single-payment) and Multi Pay (multi-payment) invoices.
                                </p>
                                <div className="mb-6 p-4 bg-black/40 rounded-xl border border-neon-primary/20">
                                    <p className="text-sm text-gray-400 mb-2">View on Aleo Testnet Explorer:</p>
                                    <a
                                        href="https://testnet.explorer.provable.com/program/zk_pay_proofs_privacy_v7.aleo"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-neon-primary hover:text-white transition-colors font-mono text-sm underline"
                                    >
                                        https://testnet.explorer.provable.com/program/zk_pay_proofs_privacy_v7.aleo
                                    </a>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-4">Data Structures</h3>
                                <CodeBlock
                                    title="Contract Storage"
                                    language="leo"
                                    code={`struct InvoiceData {
    expiry_height: u32,
    status: u8,        // 0 = Open, 1 = Settled/Paid
    invoice_type: u8   // 0 = Standard, 1 = Multi Pay
}

// Invoice Storage
mapping invoices: field => InvoiceData;
mapping salt_to_invoice: field => field;

// Payment Receipts for Multi Pay Verification
// Key: Hash(payment_secret, invoice_salt)
// Value: amount_paid
mapping payment_receipts: field => u64;`}
                                />

                                <h3 className="text-xl font-bold text-white mb-4 mt-8">Transitions</h3>

                                <h4 className="text-lg font-semibold text-neon-accent mb-2">1. create_invoice</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Creates a new invoice (Standard or Multi Pay). The merchant address and amount are hashed to preserve privacy.
                                </p>
                                <CodeBlock
                                    title="create_invoice"
                                    language="leo"
                                    code={`async transition create_invoice(
    private merchant: address,
    private amount: u64,
    private salt: field,
    public expiry_hours: u32,
    public invoice_type: u8  // 0 = Standard, 1 = Multi Pay
) -> (public field, Future) {
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;

    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);

    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

    return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type));
}

async function finalize_create_invoice(
    invoice_hash: field,
    expiry_hours: u32,
    salt: field,
    invoice_type: u8
) {
    // Calculate expiry block height
    let blocks_to_add: u32 = expiry_hours * 360u32;
    let expiry_height: u32 = expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

    let invoice_data: InvoiceData = InvoiceData {
        expiry_height: expiry_height,
        status: 0u8,              // Open
        invoice_type: invoice_type // Standard or Multi Pay
    };

    invoices.set(invoice_hash, invoice_data);
    salt_to_invoice.set(salt, invoice_hash);
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">2. pay_invoice</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Pays an invoice. For Standard invoices, this closes the invoice. For Multi Pay, the invoice remains open for additional payments.
                                    Uses a <code className="text-neon-primary">payment_secret</code> to create unique payment receipts.
                                </p>
                                <CodeBlock
                                    title="pay_invoice"
                                    language="leo"
                                    code={`async transition pay_invoice(
    pay_record: credits.aleo/credits,
    merchant: address,
    amount: u64,
    salt: field,
    private payment_secret: field,  // Unique per payment for receipt tracking
    public message: field            // Can be invoice_hash for public tracking
) -> (credits.aleo/credits, credits.aleo/credits, Future) {
    // Execute private transfer
    let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
        credits.aleo/transfer_private(pay_record, merchant, amount);
    
    // Recompute invoice hash
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;
    
    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);
    
    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
    
    // Create payment receipt key
    let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
    let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

    return (r1, r2, finalize_pay_invoice(invoice_hash, salt, receipt_key, amount));
}

async function finalize_pay_invoice(
    computed_hash: field, 
    salt: field,
    receipt_key: field,
    amount: u64
) {
    // Verify invoice exists
    let stored_hash: field = salt_to_invoice.get(salt);
    assert_eq(computed_hash, stored_hash);  // CRITICAL: Hash must match

    let invoice_data: InvoiceData = invoices.get(stored_hash);

    // Check expiry
    if invoice_data.expiry_height != 0u32 {
        assert(block.height <= invoice_data.expiry_height);
    }

    // Standard Invoice (Type 0): Close after first payment
    if (invoice_data.invoice_type == 0u8) {
        assert_eq(invoice_data.status, 0u8);  // Must be open
        
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,  // Mark as settled
            invoice_type: invoice_data.invoice_type
        };
        invoices.set(stored_hash, updated_data);
    }

    // Multi Pay Invoice (Type 1): Stay open, store receipt
    // Prevent duplicate payments with same secret
    let exists: bool = payment_receipts.contains(receipt_key);
    assert(!exists);

    payment_receipts.set(receipt_key, amount);
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">3. settle_invoice</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Allows the merchant to manually close a multi-pay campaign. Only the merchant (verified via hash reconstruction) can call this.
                                </p>
                                <CodeBlock
                                    title="settle_invoice"
                                    language="leo"
                                    code={`async transition settle_invoice(
    public salt: field,
    private amount: u64
) -> (Future) {
    // Verify merchant ownership by recomputing hash
    let merchant_field: field = self.caller as field;
    let amount_field: field = amount as field;
    
    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);
    
    let calculated_hash: field = merchant_hash + amount_hash + salt_hash;
    
    return finalize_settle_invoice(calculated_hash, salt);
}

async function finalize_settle_invoice(
    calculated_hash: field,
    salt: field
) {
    // Verify invoice exists
    let stored_hash: field = salt_to_invoice.get(salt);
    assert_eq(calculated_hash, stored_hash);  // Only merchant can settle
    
    // Mark as settled
    let invoice_data: InvoiceData = invoices.get(stored_hash);
    let updated_data: InvoiceData = InvoiceData {
        expiry_height: invoice_data.expiry_height,
        status: 1u8,  // Closed
        invoice_type: invoice_data.invoice_type
    };
    
    invoices.set(stored_hash, updated_data);
}`}
                                />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* FRONTEND */}
                    {activeTab === 'frontend' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Frontend Architecture</h2>

                                <h3 className="text-xl font-bold text-neon-accent mb-4">Hook: useCreateInvoice</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Manages the invoice creation flow for merchants.
                                </p>
                                <CodeBlock
                                    title="useCreateInvoice.ts (Core Logic)"
                                    code={`const handleCreate = async () => {
    const merchant = publicKey;
    const salt = generateSalt();
    const typeInput = invoiceType === 'standard' ? '0u8' : '1u8';
    const amountMicro = Math.round(Number(amount) * 1_000_000);

    const inputs = [
        publicKey,
        \`\${amountMicro}u64\`,
        salt,
        '0u32',  // expiry disabled
        typeInput
    ];

    const transaction: TransactionOptions = {
        program: PROGRAM_ID,  // zk_pay_proofs_privacy_v7.aleo
        function: 'create_invoice',
        inputs: inputs,
        fee: 100_000,
        privateFee: false
    };

    const result = await executeTransaction(transaction);
    // Poll for invoice hash from on-chain mapping
};`}
                                />

                                <h3 className="text-xl font-bold text-neon-accent mb-4 mt-8">Hook: usePayment</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Manages the payment flow for payers. Handles record selection and private transfers.
                                </p>
                                <CodeBlock
                                    title="usePayment.ts (Record Selection)"
                                    code={`// Find a single record to cover the payment
const payRecord = recordsAny.find(r => {
    const val = getMicrocredits(r.data);
    const isSpendable = !!(r.plaintext || r.nonce);
    return !r.spent && isSpendable && val > amountMicro;
});

if (!payRecord) {
    // Trigger 'transfer_public_to_private' conversion flow
    setStep('CONVERT');
}`}
                                />

                                <h3 className="text-xl font-bold text-neon-accent mb-4 mt-8">Utility: generateSalt</h3>
                                <CodeBlock
                                    title="aleo-utils.ts"
                                    code={`export const generateSalt = (): string => {
    const randomBuffer = new Uint8Array(16);
    crypto.getRandomValues(randomBuffer);
    let randomBigInt = BigInt(0);
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return \`\${randomBigInt}field\`;
};`}
                                />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* BACKEND */}
                    {activeTab === 'backend' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Backend Infrastructure</h2>
                                <p className="text-gray-400 mb-6">
                                    The backend is a Node.js/Express API that indexes on-chain invoices and stores metadata in Supabase.
                                </p>

                                <h3 className="text-xl font-bold text-white mb-4">Key Components</h3>
                                <ul className="list-disc pl-5 text-sm text-gray-400 space-y-2 mb-8">
                                    <li><strong>Supabase Database:</strong> Stores encrypted invoice metadata</li>
                                    <li><strong>AES-256 Encryption:</strong> Merchant and payer addresses are encrypted at rest</li>
                                    <li><strong>REST API:</strong> Provides endpoints for fetching invoices and updating statuses</li>
                                </ul>

                                <h3 className="text-xl font-bold text-white mb-4">Encryption System</h3>
                                <CodeBlock
                                    title="encryption.js"
                                    code={`const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY;

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}`}
                                />

                                <h3 className="text-xl font-bold text-white mb-4 mt-8">API Endpoints</h3>
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="text-neon-primary">GET /api/invoices</code>
                                        <p className="text-sm text-gray-400 mt-2">Fetch all invoices (decrypted)</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="text-neon-primary">GET /api/invoice/:hash</code>
                                        <p className="text-sm text-gray-400 mt-2">Fetch a single invoice by hash</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="text-neon-primary">GET /api/invoices/merchant/:address</code>
                                        <p className="text-sm text-gray-400 mt-2">Fetch all invoices for a merchant (decrypted and filtered)</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="text-neon-primary">POST /api/invoices</code>
                                        <p className="text-sm text-gray-400 mt-2">Create a new invoice entry</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="text-neon-primary">PATCH /api/invoices/:hash</code>
                                        <p className="text-sm text-gray-400 mt-2">Update invoice status (e.g., mark as SETTLED)</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                    {activeTab === 'architecture' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">System Architecture</h2>

                                <div className="space-y-12">
                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">Layer 1: Frontend (React + WASM)</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            The client is responsible for:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                            <li>Generating salts using <code>crypto.getRandomValues()</code></li>
                                            <li>Interfacing with the Aleo Wallet Adapter</li>
                                            <li>Computing invoice hashes client-side</li>
                                            <li>Submitting transactions to the Aleo network</li>
                                        </ul>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">Layer 2: Smart Contract (Leo)</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            The on-chain protocol enforces:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                            <li>Hash integrity verification</li>
                                            <li>Invoice status management (Pending → Settled)</li>
                                            <li>Private transfers via <code>credits.aleo</code></li>
                                        </ul>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">Layer 3: Indexer + Database (Node.js + Supabase)</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            The backend provides:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                            <li>Fast invoice lookups (no need to query blockchain repeatedly)</li>
                                            <li>Encrypted storage for merchant/payer addresses</li>
                                            <li>Transaction history aggregation</li>
                                        </ul>
                                        <p className="text-sm text-gray-500 italic mt-4">
                                            Note: Even if the database is compromised, merchant/payer addresses remain encrypted.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Security Model</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">128-bit Salt</h4>
                                        <p className="text-sm text-gray-400">
                                            Provides 2^128 computational security. Brute-forcing is thermodynamically impossible.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">BHP256 Hash</h4>
                                        <p className="text-sm text-gray-400">
                                            Collision-resistant hash function optimized for SNARK circuits.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">AES-256 Encryption</h4>
                                        <p className="text-sm text-gray-400">
                                            Off-chain merchant addresses encrypted at rest. Decryption requires backend secret key.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Double-Spend Protection</h4>
                                        <p className="text-sm text-gray-400">
                                            Aleo's native consensus prevents record reuse via serial number tracking.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Docs;
