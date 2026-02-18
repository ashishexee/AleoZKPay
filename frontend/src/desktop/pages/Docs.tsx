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
        { id: 'privacy', label: 'Privacy System' },
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
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Technical <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Documentation</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-3xl leading-relaxed">
                        Complete technical specification of the NullPay zero-knowledge payment protocol.
                    </p>
                </motion.div>

                {/* TABS */}
                <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4 mb-12 sticky top-24 z-50 bg-black/50 backdrop-blur-xl p-4 rounded-full border border-white/5 max-w-6xl mx-auto">
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
                                    and receive payments without revealing sensitive transaction details on-chain. NullPay supports both <strong className="text-white">Aleo Credits</strong> and <strong className="text-blue-400">USDCx</strong> (a private stablecoin on Aleo).
                                </p>

                                <h3 className="text-xl font-bold text-neon-primary mb-4">Key Features</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Zero-Knowledge Invoices</h4>
                                        <p className="text-sm text-gray-400">
                                            Invoice details (merchant, amount) are hashed on-chain using <span className="text-neon-primary">BHP256</span>. Only the hash is public.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Private Payments</h4>
                                        <p className="text-sm text-gray-400">
                                            Payments use Aleo's <code className="text-neon-primary">credits.aleo/transfer_private</code> and <code className="text-neon-primary">test_usdcx_stablecoin.aleo/transfer_private</code> to hide payer identity.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">USDCx Integration</h4>
                                        <p className="text-sm text-gray-400">
                                            Full support for <span className="text-blue-400">USDCx</span> (token_type: 1u8), a private USD stablecoin on Aleo with atomic swap execution.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Dual-Record System</h4>
                                        <p className="text-sm text-gray-400">
                                            Payments generate encrypted PayerReceipt and MerchantReceipt records instead of public mappings.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-white font-bold mb-2">Multiple Invoice Types</h4>
                                        <p className="text-sm text-gray-400">
                                            Support for Standard (single-payment), Multi Pay (multi-contributor), and Donation (open-ended amount) invoices.
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
                                            <li>Merchant enters <strong className="text-white">Amount</strong>, <strong className="text-purple-300">Token Type</strong> (Credits or USDCx), and <strong className="text-blue-300">Invoice Type</strong> (Standard, Multi Pay, or Donation).</li>
                                            <li>Client generates random <code className="text-pink-400">Salt</code> (128-bit).</li>
                                            <li>Client computes <code>Hash = <span className="text-neon-primary">BHP256</span>(Merchant) + <span className="text-neon-primary">BHP256</span>(Amount) + <span className="text-neon-primary">BHP256</span>(Salt)</code>.</li>
                                            <li>Transaction <code className="text-neon-primary">create_invoice</code> or <code className="text-neon-primary">create_invoice_usdcx</code> is sent to chain.</li>
                                            <li>On-chain mapping stores <code className="text-purple-400">Salt → Hash</code> and <code className="text-purple-400">Hash → InvoiceData</code>.</li>
                                            <li>For Donation invoices (type 2), amount is set to 0 on-chain, allowing payers to send any amount.</li>
                                        </ol>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-white mb-2">2. Payment (Payer)</h3>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Payer receives link with <code className="text-gray-300">merchant, amount, salt, token_type</code>.</li>
                                            <li>Client verifies hash on-chain using the salt.</li>
                                            <li>Client finds a private record with sufficient balance (Credits or USDCx based on token_type).</li>
                                            <li>Client generates a unique <code className="text-pink-400">payment_secret</code> for receipt tracking.</li>
                                            <li>Transaction <code className="text-neon-primary">pay_invoice</code> or <code className="text-neon-primary">pay_invoice_usdcx</code> is executed.</li>
                                            <li>Payment is completed via <code className="text-blue-400">transfer_private</code>, keeping payer anonymous. Two receipts are generated atomically: <code className="text-green-400">PayerReceipt</code> and <code className="text-blue-400">MerchantReceipt</code>.</li>
                                            <li><strong>Standard Invoice:</strong> Invoice is marked as settled (status = 1) and closed.</li>
                                            <li><strong>Multi Pay Invoice:</strong> Invoice remains open for more payments.</li>
                                            <li><strong>Donation Invoice:</strong> Payer can specify custom amount via <code>pay_donation</code> or <code>pay_donation_usdcx</code>.</li>
                                        </ol>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-white mb-2">3. Settlement (Merchant - Multi Pay Only)</h3>
                                        <ol className="list-decimal pl-5 text-sm text-gray-400 space-y-2">
                                            <li>Merchant calls <code className="text-orange-400">settle_invoice(salt, amount)</code> to close a multi-pay campaign.</li>
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
                                    The contract is deployed as <strong className="text-neon-primary">zk_pay_proofs_privacy_v11.aleo</strong>.
                                    It supports Standard (single-payment), Multi Pay (multi

                                    -payment), and Donation (open-ended amount) invoices for both Aleo Credits and USDCx.
                                </p>

                                <h3 className="text-xl font-bold text-white mb-4 mt-8">Imports</h3>
                                <CodeBlock
                                    title="External Program Dependencies"
                                    language="leo"
                                    code={`import credits.aleo;
import test_usdcx_stablecoin.aleo;`}
                                />

                                <h3 className="text-xl font-bold text-white mb-4">Data Structures</h3>
                                <CodeBlock
                                    title="InvoiceData Struct"
                                    language="leo"
                                    code={`struct InvoiceData {
    expiry_height: u32,
    status: u8,        // 0 = Open, 1 = Settled/Paid
    invoice_type: u8,  // 0 = Standard, 1 = Multi Pay, 2 = Donation
    token_type: u8     // 0 = Credits, 1 = USDCx
}`}
                                />

                                <CodeBlock
                                    title="PayerReceipt (Record)"
                                    language="leo"
                                    code={`record PayerReceipt {
    owner: address,       // The Payer (encrypted)
    merchant: address,    // The Merchant
    receipt_hash: field,  // Unique Payment ID (Hash of secret + salt)
    invoice_hash: field,  // Link to specific invoice
    amount: u64,          // Amount Paid (encrypted)
    token_type: u8,       // 0 = Credits, 1 = USDCx
    timestamp: u64,       // Approximate block time or 0
}`}
                                />

                                <CodeBlock
                                    title="MerchantReceipt (Record)"
                                    language="leo"
                                    code={`record MerchantReceipt {
    owner: address,       // The Merchant (encrypted)
    receipt_hash: field,  // Unique Payment ID (Matches Payer's receipt_hash)
    invoice_hash: field,  // Link to specific invoice
    amount: u64,          // Amount Received (encrypted)
    token_type: u8,       // 0 = Credits, 1 = USDCx
}`}
                                />

                                <CodeBlock
                                    title="Invoice (Record)"
                                    language="leo"
                                    code={`record Invoice {
    owner: address,       // Merchant
    invoice_hash: field,
    amount: u64,          // Amount (0 for Donation type)
    token_type: u8,       // 0 = Credits, 1 = USDCx
    invoice_type: u8,     // 0 = Standard, 1 = Multi Pay, 2 = Donation
    salt: field,          // For checking against hash
}`}
                                />

                                <CodeBlock
                                    title="Contract Storage Mappings"
                                    language="leo"
                                    code={`mapping invoices: field => InvoiceData;
mapping salt_to_invoice: field => field;`}
                                />

                                <h3 className="text-xl font-bold text-white mb-4 mt-8">Transitions</h3>

                                <h4 className="text-lg font-semibold text-neon-accent mb-2">1. create_invoice (Credits)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Creates a new invoice for Aleo Credits. The merchant address and amount are hashed to preserve privacy.
                                </p>
                                <CodeBlock
                                    title="create_invoice"
                                    language="leo"
                                    code={`async transition create_invoice(
    private merchant: address,
    private amount: u64,
    private salt: field,
    public expiry_hours: u32,
    public invoice_type: u8  // 0 = Standard, 1 = Multi Pay, 2 = Donation
) -> (Invoice, public field, Future) {
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;

    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);

    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

    let invoice_record: Invoice = Invoice {
        owner: merchant,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8,  // Credits
        invoice_type: invoice_type,
        salt: salt
    };

    return (invoice_record, invoice_hash, finalize_create_invoice(
        invoice_hash, expiry_hours, salt, invoice_type, 0u8
    ));
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">2. create_invoice_usdcx (USDCx)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Creates a new invoice for USDCx. Token type is set to 1u8.
                                </p>
                                <CodeBlock
                                    title="create_invoice_usdcx"
                                    language="leo"
                                    code={`async transition create_invoice_usdcx(
    private merchant: address,
    private amount: u128,
    private salt: field,
    public expiry_hours: u32,
    public invoice_type: u8
) -> (Invoice, public field, Future) {
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;

    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);

    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

    let amount_u64: u64 = amount as u64;

    let invoice_record: Invoice = Invoice {
        owner: merchant,
        invoice_hash: invoice_hash,
        amount: amount_u64,
        token_type: 1u8,  // USDCx
        invoice_type: invoice_type,
        salt: salt
    };

    return (invoice_record, invoice_hash, finalize_create_invoice(
        invoice_hash, expiry_hours, salt, invoice_type, 1u8
    ));
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">3. pay_invoice (Credits)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Pays an invoice using Aleo Credits. Generates dual receipts atomically.
                                </p>
                                <CodeBlock
                                    title="pay_invoice"
                                    language="leo"
                                    code={`async transition pay_invoice(
    pay_record: credits.aleo/credits,
    merchant: address,
    amount: u64,
    salt: field,
    private payment_secret: field,
    public message: field
) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
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
    
    // Create payment receipt key using BHP256 commitment
    let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
    let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

    let payer_receipt: PayerReceipt = PayerReceipt {
        owner: self.caller,
        merchant: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8,
        timestamp: 0u64
    };

    let merchant_receipt: MerchantReceipt = MerchantReceipt {
        owner: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8
    };

    return (r1, r2, payer_receipt, merchant_receipt, finalize_pay_invoice(
        invoice_hash, salt, amount as u128, 0u8
    ));
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">4. pay_invoice_usdcx (USDCx)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Pays an invoice using USDCx. Includes compliance record and Merkle proofs.
                                </p>
                                <CodeBlock
                                    title="pay_invoice_usdcx"
                                    language="leo"
                                    code={`async transition pay_invoice_usdcx(
    pay_record: test_usdcx_stablecoin.aleo/Token,
    merchant: address,
    amount: u128,
    salt: field,
    private payment_secret: field,
    public message: field,
    private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
) -> (...) {
    // Execute USDCx private transfer
    let (compliance_record, transfer_output_1, transfer_output_2, transfer_future) = 
        test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

    // Recompute invoice hash
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;
    
    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);
    
    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
    
    let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
    let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);
    
    let payer_receipt: PayerReceipt = PayerReceipt {
        owner: self.caller,
        merchant: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount as u64,
        token_type: 1u8,
        timestamp: 0u64
    };

    let merchant_receipt: MerchantReceipt = MerchantReceipt {
        owner: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount as u64,
        token_type: 1u8
    };

    return (transfer_output_1, transfer_output_2, compliance_record, 
            payer_receipt, merchant_receipt, finalize_pay_invoice_usdcx(...));
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">5. pay_donation (Credits)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Pays a donation invoice with a custom amount. Invoice type 2 allows 0-amount invoices.
                                </p>
                                <CodeBlock
                                    title="pay_donation"
                                    language="leo"
                                    code={`async transition pay_donation(
    pay_record: credits.aleo/credits,
    merchant: address,
    amount_to_donate: u64,
    salt: field,
    private payment_secret: field,
    public message: field
) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
    let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
        credits.aleo/transfer_private(pay_record, merchant, amount_to_donate);
    
    let merchant_field: field = merchant as field;
    
    // For donation, the invoice was created with amount 0
    let amount_field: field = 0u64 as field;
    
    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);
    
    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
    
    let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
    let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

    let payer_receipt: PayerReceipt = PayerReceipt {
        owner: self.caller,
        merchant: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount_to_donate, // Actual donated amount
        token_type: 0u8,
        timestamp: 0u64
    };

    let merchant_receipt: MerchantReceipt = MerchantReceipt {
        owner: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount_to_donate, // Actual donated amount
        token_type: 0u8
    };

    return (r1, r2, payer_receipt, merchant_receipt, finalize_pay_donation(...));
}`}
                                />

                                <h4 className="text-lg font-semibold text-neon-accent mb-2 mt-8">6. settle_invoice</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Allows the merchant to manually close a multi-pay campaign or donation. Only the merchant can call this.
                                </p>
                                <CodeBlock
                                    title="settle_invoice"
                                    language="leo"
                                    code={`async transition settle_invoice(
    public salt: field,
    private amount: u64
) -> (Future) {
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
    let stored_hash: field = salt_to_invoice.get(salt);
    assert_eq(calculated_hash, stored_hash);
    
    let invoice_data: InvoiceData = invoices.get(stored_hash);
    let updated_data: InvoiceData = InvoiceData {
        expiry_height: invoice_data.expiry_height,
        status: 1u8,  // Closed
        invoice_type: invoice_data.invoice_type,
        token_type: invoice_data.token_type
    };
    
    invoices.set(stored_hash, updated_data);
}`}
                                />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* PRIVACY SYSTEM */}
                    {activeTab === 'privacy' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Privacy Architecture</h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    NullPay implements a multi-layered privacy system combining zero-knowledge proofs, cryptographic commitments, and encrypted records.
                                </p>

                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-neon-primary mb-4">1. Dual-Record Privacy System</h3>
                                        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                            Instead of using public mappings, NullPay generates encrypted records that only the owner can decrypt.
                                        </p>
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-bold text-white mb-2">PayerReceipt</h4>
                                            <ul className="text-xs text-gray-400 space-y-1">
                                                <li>• <strong className="text-purple-400">owner:</strong> Payer address (encrypted on-chain)</li>
                                                <li>• <strong className="text-blue-400">merchant:</strong> Merchant address</li>
                                                <li>• <strong className="text-neon-primary">receipt_hash:</strong> BHP256::commit_to_field(payment_secret, salt)</li>
                                                <li>• <strong className="text-orange-400">invoice_hash:</strong> Links to original invoice</li>
                                                <li>• <strong className="text-green-400">amount:</strong> Payment amount (encrypted)</li>
                                                <li>• <strong className="text-gray-300">token_type:</strong> 0 = Credits, 1 = USDCx</li>
                                            </ul>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 mt-4">
                                            <h4 className="text-sm font-bold text-white mb-2">MerchantReceipt</h4>
                                            <ul className="text-xs text-gray-400 space-y-1">
                                                <li>• <strong className="text-purple-400">owner:</strong> Merchant address (encrypted on-chain)</li>
                                                <li>• <strong className="text-neon-primary">receipt_hash:</strong> Matches payer's receipt_hash</li>
                                                <li>• <strong className="text-orange-400">invoice_hash:</strong> Links to original invoice</li>
                                                <li>• <strong className="text-green-400">amount:</strong> Payment amount (encrypted)</li>
                                                <li>• <strong className="text-gray-300">token_type:</strong> 0 = Credits, 1 = USDCx</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-neon-primary mb-4">2. BHP256 Cryptographic Commitments</h3>
                                        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                            The payment secret is never revealed on-chain. Instead, we use BHP256::commit_to_field to create a binding commitment.
                                        </p>
                                        <CodeBlock
                                            title="Receipt Hash Generation"
                                            language="leo"
                                            code={`let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

// This creates a cryptographic commitment that:
// 1. Binds the payment_secret to the salt
// 2. Is verifiable without revealing the secret
// 3. Prevents tampering or forgery`}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-neon-primary mb-4">3. Invoice Hash Integrity</h3>
                                        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                            Invoice hashes are computed using BHP256 to ensure tamper-proof integrity.
                                        </p>
                                        <CodeBlock
                                            title="Invoice Hash Computation"
                                            language="leo"
                                            code={`let merchant_hash: field = BHP256::hash_to_field(merchant as field);
let amount_hash: field = BHP256::hash_to_field(amount as field);
let salt_hash: field = BHP256::hash_to_field(salt);

let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

// Verification: Payer recomputes hash and compares with on-chain value
// If hashes match, invoice is authentic and unmodified`}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-neon-primary mb-4">4. Private Transfers</h3>
                                        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                            All payments use private transfer functions that consume input records and create encrypted output records.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <h4 className="text-sm font-bold text-white mb-2">credits.aleo/transfer_private</h4>
                                                <p className="text-xs text-gray-400">
                                                    Burns the input record, transfers the specified amount to the merchant, and creates change record back to the payer. All record fields are encrypted.
                                                </p>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <h4 className="text-sm font-bold text-white mb-2">test_usdcx_stablecoin.aleo/transfer_private</h4>
                                                <p className="text-xs text-gray-400">
                                                    Same as Credits transfer but for USDCx tokens. Includes additional compliance records and Merkle proof verification.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-neon-primary mb-4">5. Off-Chain Encryption</h3>
                                        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                            The backend database uses AES-256 encryption for merchant addresses. Amount and memo fields are NOT stored.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                                <div className="text-red-400 text-xs uppercase tracking-widest mb-1">Removed</div>
                                                <div className="font-mono text-sm text-gray-400 line-through">Amount</div>
                                                <div className="font-mono text-sm text-gray-400 line-through">Memo</div>
                                            </div>
                                            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                                <div className="text-green-400 text-xs uppercase tracking-widest mb-1">Encrypted</div>
                                                <div className="font-mono text-sm text-white">Merchant Addr</div>
                                                <div className="font-mono text-xs text-green-300 mt-1 truncate">U2FsdGVkX19...</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                    Manages the invoice creation flow for merchants. Supports both <span className="text-white">Credits</span> and <span className="text-blue-400">USDCx</span>.
                                </p>
                                <CodeBlock
                                    title="useCreateInvoice.ts (Core Logic)"
                                    code={`const handleCreate = async () => {
    const merchant = publicKey;
    const salt = generateSalt();
    const typeInput = invoiceType === 'standard' ? '0u8' : 
                      invoiceType === 'multi' ? '1u8' : '2u8'; // Donation
    
    let inputs: string[];
    let functionName: string;
    
    if (tokenType === 'credits') {
        const amountMicro = Math.round(Number(amount) * 1_000_000);
        inputs = [publicKey, \`\${amountMicro}u64\`, salt, '0u32', typeInput];
        functionName = 'create_invoice';
    } else { // USDCx
        const amountMicroUSDC = Math.round(Number(amount) * 1_000_000);
        inputs = [publicKey, \`\${amountMicroUSDC}u128\`, salt, '0u32', typeInput];
        functionName = 'create_invoice_usdcx';
    }

    const transaction: TransactionOptions = {
        program: PROGRAM_ID,  // zk_pay_proofs_privacy_v11.aleo
        function: functionName,
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
                                    Manages the payment flow for payers. Handles record selection and private transfers for both <span className="text-white">Credits</span> and <span className="text-blue-400">USDCx</span>.
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
}

// For Donation invoices, payer can specify custom amount
const finalAmount = invoiceType === 'donation' ? customAmount : invoice.amount;`}
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

                                <h3 className="text-xl font-bold text-neon-accent mb-4 mt-8">Mobile Architecture</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    The mobile app is a lightweight version optimized for fast loading and essential features.
                                </p>
                                <CodeBlock
                                    title="App.tsx (Responsive Entry Point)"
                                    code={`const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

function App() {
    const isMobile = useIsMobile();
    return (
        <Router>
            <Suspense fallback={<LoadingScreen />}>
                {isMobile ? <MobileApp /> : <DesktopApp />}
            </Suspense>
        </Router>
    );
}`}
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
                                    <li><strong className="text-blue-400">Supabase Database:</strong> Stores encrypted invoice metadata</li>
                                    <li><strong className="text-neon-primary">AES-256 Encryption:</strong> Merchant and payer addresses are encrypted at rest</li>
                                    <li><strong className="text-purple-400">REST API:</strong> Provides endpoints for fetching invoices and updating statuses</li>
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
                                            <li>Generating salts using <code className="text-pink-400">crypto.getRandomValues()</code></li>
                                            <li>Interfacing with the <span className="text-purple-400">Aleo Wallet Adapter</span></li>
                                            <li>Computing invoice hashes <span className="text-neon-primary">client-side</span></li>
                                            <li>Submitting transactions to the <span className="text-blue-300">Aleo network</span></li>
                                            <li>Responsive design: <span className="text-white">Desktop</span> (full features) vs <span className="text-white">Mobile</span> (lightweight)</li>
                                        </ul>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">Layer 2: Smart Contract (Leo)</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            The on-chain protocol enforces:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                            <li><span className="text-neon-primary">Hash integrity</span> verification</li>
                                            <li>Invoice status management (<span className="text-yellow-400">Pending</span> → <span className="text-green-400">Settled</span>)</li>
                                            <li>Private transfers via <code className="text-blue-400">credits.aleo</code> and <code className="text-blue-400">test_usdcx_stablecoin.aleo</code></li>
                                            <li><span className="text-purple-400">Dual-record</span> generation (<span className="text-green-400">PayerReceipt</span> + <span className="text-blue-400">MerchantReceipt</span>)</li>
                                            <li>Support for <span className="text-white">3 invoice types</span>: Standard, Multi Pay, Donation</li>
                                            <li>Support for <span className="text-white">2 token types</span>: Credits, USDCx</li>
                                        </ul>
                                    </div>

                                    <div className="relative pl-8 border-l-2 border-neon-primary/30">
                                        <div className="absolute -left-[11px] top-0  w-5 h-5 rounded-full bg-neon-primary border-4 border-black" />
                                        <h3 className="text-xl font-bold text-neon-primary mb-2">Layer 3: Indexer + Database (Node.js + Supabase)</h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            The backend provides:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                            <li><span className="text-green-400">Fast invoice lookups</span> (no need to query blockchain repeatedly)</li>
                                            <li><span className="text-neon-primary">Encrypted storage</span> for merchant/payer addresses</li>
                                            <li><span className="text-purple-400">Transaction history</span> aggregation</li>
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
                                            Provides <span className="text-neon-primary">2^128</span> computational security. Brute-forcing is <span className="text-red-400">thermodynamically impossible</span>.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">BHP256 Hash</h4>
                                        <p className="text-sm text-gray-400">
                                            <span className="text-neon-primary">Collision-resistant</span> hash function optimized for <span className="text-purple-400">SNARK circuits</span>.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">AES-256 Encryption</h4>
                                        <p className="text-sm text-gray-400">
                                            Off-chain merchant addresses <span className="text-green-400">encrypted at rest</span>. Decryption requires backend secret key.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Double-Spend Protection</h4>
                                        <p className="text-sm text-gray-400">
                                            Aleo's native consensus prevents <span className="text-red-400">record reuse</span> via <span className="text-neon-primary">serial number tracking</span>.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Atomic Execution</h4>
                                        <p className="text-sm text-gray-400">
                                            Transfer and receipt generation happen in a single <span className="text-neon-primary">atomic step</span>. Either <span className="text-green-400">both succeed</span> or transaction <span className="text-red-400">reverts</span>.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h4 className="text-neon-accent font-bold mb-2">Encrypted Records</h4>
                                        <p className="text-sm text-gray-400">
                                            All sensitive fields in records are <span className="text-green-400">encrypted</span> under the recipient's <span className="text-purple-400">view key</span>. Public cannot see amounts or owners.
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
