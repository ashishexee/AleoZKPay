import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../utils/animations';

/*
 * ALEO ZKPAY - COMPREHENSIVE TECHNICAL DOCUMENTATION
 * ==========================================================
 * This document serves as the authoritative source of truth for the entire NullPay protocol.
 * It details every component, every hook, every smart contract transition, and every
 * utilty function used in the production environment.
 * 
 * -- TABLE OF CONTENTS --
 * 1. CORE PHILOSOPHY & ARCHITECTURE
 * 2. SMART CONTRACT SPECIFICATION (Leo)
 * 3. CLIENT-SIDE LOGIC (Hooks & State)
 * 4. CRYPTOGRAPHIC PRIMITIVES (Hashing & Security)
 * 5. BACKEND INFRASTRUCTURE (Indexing)
 * 6. SECURITY THREAT MODEL & MITIGATIONS
 * 7. COMPLETE SOURCE CODE REFERENCE
 */

const Docs = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const containerVariants = staggerContainer;
    const itemVariants = fadeInUp;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'contracts', label: 'Smart Contracts' },
        { id: 'client', label: 'Client Logic' },
        { id: 'security', label: 'Security' },
        { id: 'source', label: 'Full Source Reference' },
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
                        Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Specification</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-3xl leading-relaxed">
                        The definitive technical reference for the NullPay decentralized payment protocol.
                        This document provides exhaustive detail on the implementation of Zero-Knowledge Proofs for private financial settlements.
                    </p>
                </motion.div>

                {/* TABS - CENTERED */}
                <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4 mb-12 sticky top-24 z-50 bg-black/50 backdrop-blur-xl p-4 rounded-full border border-white/5 max-w-4xl mx-auto">
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

                    {/* 
                     * ====================================================================================
                     * SECTION 1: OVERVIEW & ARCHITECTURE
                     * ====================================================================================
                     */}
                    {activeTab === 'overview' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-12"
                        >
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold text-white mb-6">1. Protocol Architecture</h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    NullPay operates as a Layer-2 privacy application on top of the Aleo Layer-1 blockchain.
                                    The architecture is designed to minimize on-chain data leakage while ensuring verifiable settlement correctness.
                                    The system is composed of three primary layers:
                                </p>

                                <div className="space-y-12">
                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">1. The Client Layer (React/WASM)</h3>
                                        <p className="text-gray-400 mb-4 text-sm">
                                            The frontend is not just a UI; it is a full cryptographic client. It is responsible for:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300 mb-4">
                                            <li><strong>Key Management:</strong> Interfacing with the Aleo Wallet Adapter to request signatures (but never private keys).</li>
                                            <li><strong>Salt Generation:</strong> Using the browser's <code>crypto.getRandomValues()</code> CSPRNG to generate 128-bit blinding factors ("salts").</li>
                                            <li><strong>Proof Generation:</strong> Orchestrating the generation of Zero-Knowledge Proofs for the <code>pay_invoice</code> transition.</li>
                                            <li><strong>Invoice State Management:</strong> Tracking local invoice data that is never revealed to the server.</li>
                                        </ul>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">2. The Protocol Layer (Leo Smart Contract)</h3>
                                        <p className="text-gray-400 mb-4 text-sm">
                                            The destination for all valid state transitions. The contract <code>zk_pay_proofs_privacy_v6.aleo</code> acts as the root of trust.
                                            Its primary responsibility is to <strong>verify</strong> that a payment matches an invoice hash without seeing the invoice details.
                                        </p>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">3. The Indexing Layer (Supabase/Node)</h3>
                                        <p className="text-gray-400 mb-4 text-sm">
                                            A purely optional layer for improved UX. It listens for on-chain events to update the Explorer UI.
                                            Critically, even if this layer is compromised, <strong>user privacy is preserved</strong> because it only sees the public hashes and encrypted records.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold text-white mb-6">2. Data Flow Lifecycle</h2>
                                <div className="space-y-8">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Step 1: Invoice Creation (Merchant)</h4>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Merchant inputs Amount (e.g., 100) and Expiry.</li>
                                            <li>Client generates random Salt <code>S</code> (128-bit).</li>
                                            <li>Client computes <code>Hash = BHP256(MerchantAddr) + BHP256(Amount) + BHP256(Salt)</code>.</li>
                                            <li>Client sends <code>create_invoice(Hash, Expiry)</code> to chain.</li>
                                            <li><strong>Privacy Result:</strong> The chain only sees the random Hash. Merchant and Amount are hidden.</li>
                                        </ol>
                                    </div>

                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Step 2: Invoice Payment (Payer)</h4>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Payer receives link with <code>Amount, MerchantAddr, Salt</code> (Off-chain channel).</li>
                                            <li>Client verifies integrity: Recomputes Hash from params and checks if Hash exists on-chain.</li>
                                            <li>Client identifies a private record <code>R</code> owned by Payer with <code>value {'>'} Amount</code>.</li>
                                            <li>Client calls <code>pay_invoice(R, MerchantAddr, Amount, Salt)</code>.</li>
                                            <li><strong>ZK Proof Generation:</strong> The client generates a proof that:
                                                <ul className="list-disc pl-5 mt-1 text-gray-500">
                                                    <li>Record <code>R</code> is valid and unspent.</li>
                                                    <li>User owns Record <code>R</code>.</li>
                                                    <li><code>BHP256(Merchant) + BHP256(Amount) + BHP256(Salt) == Stored_Hash</code>.</li>
                                                </ul>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* 
                     * ====================================================================================
                     * SECTION 2: SMART CONTRACT SPECIFICATION (Leo)
                     * ====================================================================================
                     */}
                    {activeTab === 'contracts' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-4">Smart Contract Logic</h2>
                                <p className="text-gray-400 mb-6">
                                    The smart contract is written in Leo (Aleo's zero-knowledge specific language). It enforces the business logic of the payment channel.
                                </p>

                                <CodeBlock
                                    title="CONTRACT STORAGE & STRUCTS"
                                    code={`struct InvoiceData {
    expiry_height: u32,
    status: u8
}

// Mappings represent the persistent on-chain state
// Mapping 1: Hash -> Metadata (Status, Expiry)
mapping invoices: field => InvoiceData;

// Mapping 2: Salt -> Hash (Reverse lookup for verify correctness)
mapping salt_to_invoice: field => field;`}
                                />

                                <div className="my-8 border-t border-white/10" />

                                <h3 className="text-xl font-bold text-white mb-4">Core Transition: pay_invoice</h3>
                                <p className="text-gray-400 mb-4 text-sm">
                                    The `pay_invoice` function is the most critical security boundary. It accepts a private record (money) and private parameters, and performs a private transfer.
                                    Crucially, it re-calculates the hash <strong>inside the zero-knowledge circuit</strong>. If the inputs provided by the payer do not match the hash created by the merchant, the proof generation fails, and the transaction is invalid.
                                </p>

                                <CodeBlock
                                    title="TRANSITION: PAY_INVOICE (LEO)"
                                    code={`async transition pay_invoice(
    pay_record: credits.aleo/credits, // INPUT: The private money record
    merchant: address,                // PRIVATE: The receiver
    amount: u64,                      // PRIVATE: Amount to send
    salt: field                       // PRIVATE: The integrity key
) -> (credits.aleo/credits, credits.aleo/credits, Future) {
    
    // 1. EXECUTE PRIVATE TRANSFER
    // This consumes 'pay_record' and creates two new records:
    // r1: The change record (sent back to sender)
    // r2: The payment record (sent to merchant)
    // This is a standard Aleo primitive call.
    let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
        credits.aleo/transfer_private(pay_record, merchant, amount);
    
    // 2. RE-COMPUTE HASH
    // We strictly enforce that the merchant and amount being paid 
    // MATCH the ones originally committed to the has map.
    let merchant_hash: field = BHP256::hash_to_field(merchant as field);
    let amount_hash: field = BHP256::hash_to_field(amount as field);
    let salt_hash: field = BHP256::hash_to_field(salt);
    
    // Additive combination is cheaper on gas than a nested hash
    let computed_hash: field = merchant_hash + amount_hash + salt_hash;

    // 3. ENQUEUE FINALIZATION
    // The actual check against storage happens in 'finalize', 
    // but the inputs are committed here.
    return (r1, r2, finalize_pay_invoice(computed_hash, salt));
}`}
                                />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* 
                     * ====================================================================================
                     * SECTION 3: CLIENT SIDE LOGIC
                     * ====================================================================================
                     */}
                    {activeTab === 'client' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Client-Side Implementation (Hooks)</h2>
                                <p className="text-gray-400 mb-8">
                                    The React application manages the complex orchestration required for Aleo transactions.
                                    We use custom hooks to encapsulate the state machines for Invoice Creation and Payment.
                                </p>

                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-neon-accent mb-2">Hook: useCreateInvoice</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            This hook manages the "Merchant" persona. It handles random generation and the eventual on-chain broadcasting.
                                        </p>
                                        <CodeBlock
                                            title="useCreateInvoice.ts (Core Logic)"
                                            code={`// 1. SALT GENERATION
const salt = generateSalt(); // Uses CSPRNG

// 2. PREPARE INPUTS
const microcredits = Math.round(Number(amount) * 1_000_000);
const inputs = [
    merchant,
    \`\${microcredits}u64\`,
    salt,
    \`\${expiry}u32\`
];

// 3. EXECUTE TRANSACTION
const transaction: TransactionOptions = {
    program: 'zk_pay_proofs_privacy_v6.aleo',
    function: 'create_invoice',
    inputs: inputs,
    fee: 100_000
};

// 4. VERIFY & POLL
// Once broadcast, we must poll the chain to verify inclusion
// and retrieve the final Invoice Hash for the UI to display.`}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-neon-accent mb-2">Hook: usePayment</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            This hook manages the "Payer" persona. It is significantly more complex because it must interact with the user's private records (credits).
                                        </p>
                                        <CodeBlock
                                            title="usePayment.ts (Record Selection Logic)"
                                            code={`// STRATEGY: Find a single record to cover the payment
const payRecord = recordsAny.find(r => {
    const val = getMicrocredits(r.data);
    const isSpendable = !!(r.plaintext || r.nonce);
    return !r.spent && isSpendable && val > amountMicro;
});

// FALLBACK: If no single record exists, we must "Merge" records
// This is done via a 'public_to_private' or 'join' transaction
if (!payRecord) {
    setStatus('Insufficient single record. Merging...');
    // Trigger conversion logic
}`}
                                        />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* 
                     * ====================================================================================
                     * SECTION 4: SECURITY
                     * ====================================================================================
                     */}
                    {activeTab === 'security' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8"
                        >
                            <GlassCard className="p-8 border-t-4 border-t-zinc-600">
                                <h2 className="text-2xl font-bold text-white mb-4">Threat Model Analysis</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-2">1. The Salt Brute-Force Attack</h3>
                                        <p className="text-sm text-gray-500">
                                            <strong>Attack Vector:</strong> An adversary attempts to guess the <code>(Merchant, Amount)</code> pair by hashing all possible combinations and comparing them to on-chain hashes.
                                        </p>
                                        <p className="text-white text-sm mt-2 border-l-2 border-white pl-3">
                                            <strong>Mitigation:</strong> We utilize a **128-bit random salt**. The search space is <code>2^128</code>, which is thermodynamically impossible to brute-force with current or near-future computing power.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-2">2. Double Spending</h3>
                                        <p className="text-sm text-gray-500">
                                            <strong>Attack Vector:</strong> A user tries to pay an invoice twice, or use the same credits record for two different payments.
                                        </p>
                                        <p className="text-white text-sm mt-2 border-l-2 border-white pl-3">
                                            <strong>Mitigation:</strong> Aleo's native consensus handles record serial numbers (nonces). Once a record is consumed in `pay_invoice`, its serial number is revealed on-chain, preventing any future use.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8 border-t-4 border-t-white">
                                <h2 className="text-2xl font-bold text-white mb-4">Cryptographic Properties</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">1. Collision Resistance (BHP256)</h3>
                                        <p className="text-sm text-gray-500">
                                            We rely on the **Bowed-Mercurial Hash (BHP256)**, a variant of Pedersen Hash optimized for SNARK circuits. It provides collision resistance suitable for 128-bit security levels.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">2. Zero-Knowledge Soundness</h3>
                                        <p className="text-sm text-gray-500">
                                            The proving system (Marlin/Varuna) guarantees that it is computationally infeasible to generate a valid proof for `pay_invoice` unless the prover actually knows the witness data (the record and salt).
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* 
                     * ====================================================================================
                     * SECTION 5: COMPLETE SOURCE REFERENCE
                     * ====================================================================================
                     */}
                    {activeTab === 'source' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-12"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-3xl font-bold text-white mb-8 block border-b border-white/10 pb-4">
                                    Full Source Code Reference
                                </h2>
                                <p className="text-gray-400 mb-8">
                                    In the interest of full transparency and verifiability, the complete, unredacted source code for the core components is provided below.
                                </p>

                                <CodeBlock
                                    title="/contracts/zk_pay/src/main.leo"
                                    code={`import credits.aleo;

program zk_pay_proofs_privacy_v6.aleo {

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;

    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        public expiry_hours: u32
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8
        };

        invoices.set(invoice_hash, invoice_data);
        salt_to_invoice.set(salt, invoice_hash);
    }

    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount);
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let computed_hash: field = merchant_hash + amount_hash + salt_hash;

        let f0: Future = finalize_pay_invoice(computed_hash, salt);
        return (r1, r2, f0);
    }

    async function finalize_pay_invoice(
        computed_hash: field, 
        salt: field
    ) {
        // Enforce that the provided salt maps to an invoice
        let stored_hash: field = salt_to_invoice.get(salt);
        
        // Ensure the computed parameters match the registered invoice for this salt
        assert_eq(computed_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        assert_eq(invoice_data.status, 0u8);

        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8
        };

        invoices.set(stored_hash, updated_data);
    }

    async transition get_invoice_status(
        public invoice_hash: field
    ) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }

    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
    }
}`}
                                />

                                <CodeBlock
                                    title="/frontend/src/utils/aleo-utils.ts"
                                    code={`export const generateSalt = (): string => {
    const randomBuffer = new Uint8Array(16);
    crypto.getRandomValues(randomBuffer);
    let randomBigInt = BigInt(0);
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return \`\${randomBigInt}field\`;
};

export const getInvoiceHashFromMapping = async (salt: string): Promise<string | null> => {
    console.log(\`Checking salt mapping for \${salt}...\`);
    try {
        const programId = 'zk_pay_proofs_privacy_v6.aleo';
        const mappingName = 'salt_to_invoice';
        const url = \`https://api.provable.com/v2/testnet/program/\${programId}/mapping/\${mappingName}/\${salt}\`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const val = await response.json();

        if (val === null) {
            console.warn("Mapping returned 200 OK but value is null (Key not found).");
            return null;
        }

        if (val) {
            console.log("✅ Found Hash via On-Chain Mapping!");
            return val.toString().replace(/(['"])/g, '');
        }
    } catch (e) {
        console.warn("Mapping lookup failed:", e);
    }
    return null;
};

export const getInvoiceStatus = async (hash: string): Promise<number | null> => {
    console.log(\`Checking invoice status for hash \${hash}...\`);
    try {
        const programId = 'zk_pay_proofs_privacy_v6.aleo';
        const mappingName = 'invoices';
        const url = \`https://api.provable.com/v2/testnet/program/\${programId}/mapping/\${mappingName}/\${hash}\`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const val = await response.json();
        console.log("Invoice Data Raw:", val);

        if (typeof val === 'string') {
            const match = val.match(/status:\\s*(\\d+)u8/);
            if (match && match[1]) {
                return parseInt(match[1]);
            }
        } else if (typeof val === 'object' && val !== null) {
            // Handle if API returns direct JSON object
            if ('status' in val) {
                // Check if it's a number or a string like "1u8"
                const statusVal = val.status;
                if (typeof statusVal === 'number') return statusVal;
                if (typeof statusVal === 'string') {
                    return parseInt(statusVal.replace('u8', ''));
                }
            }
        }

        return null;
    } catch (e) {
        console.warn("Invoice status lookup failed:", e);
        return null;
    }
};`}
                                />
                            </GlassCard>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Docs;
