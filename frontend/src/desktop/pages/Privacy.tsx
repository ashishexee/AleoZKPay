import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../utils/animations';
import { GlassCard } from '../../components/ui/GlassCard';

const Privacy: React.FC = () => {
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

            <div className="w-full max-w-5xl mx-auto pt-12 px-6 relative z-10 pb-24">
                {/* HERO HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter leading-none text-white">
                        Privacy by <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent animate-pulse-glow">Design</span>
                    </h1>
                    <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-8">
                        NullPay leverages Zero-Knowledge Proofs (ZKP) to ensure your financial data remains confidential.
                        We don't just protect your privacy; we mathematically guarantee it.
                    </p>
                </motion.div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* CARD 1: THE HIDDEN LEDGER */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">01</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-neon-primary/20 flex items-center justify-center text-neon-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            </span>
                            The Hidden Ledger
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            <span className="text-neon-accent font-semibold">New in v5:</span> We verified the <code className="bg-white/10 px-1 rounded text-neon-primary">main.leo</code> smart contract to ensure Zero-Data leakage.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs text-gray-300">
                            <div className="flex justify-between mb-2 pb-2 border-b border-white/10">
                                <span className="text-gray-500 uppercase tracking-widest">Leo Struct Definition</span>
                                <span className="text-green-400">● Live Code</span>
                            </div>
                            <pre className="text-gray-400 overflow-x-auto">
                                {`struct InvoiceData {
    status: u8,      // 1 = Paid
    expiry: u32,     // Block Height
    type: u8,        // Standard/Donation
    // ❌ NO AMOUNT
    // ❌ NO PAYER
}`}
                            </pre>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            The public state strictly stores metadata. The "who" and "how much" are mathematically impossible to retrieve from the ledger.
                        </p>
                    </GlassCard>

                    {/* CARD 2: BLIND DATABASE */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">02</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </span>
                            Blind Database
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Our database is mathematically blind. We explicitly <strong>do not store</strong> the Amount or Memo fields.
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

                        <p className="mt-4 text-sm text-gray-500">
                            Even if our database were compromised, your financial data remains non-existent or encrypted with AES-256.
                        </p>
                    </GlassCard>

                    {/* CARD 3: THE PAYMENT SECRET */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">03</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            The Payment Secret
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Every transaction is protected by a client-generated <code className="text-pink-400">payment_secret</code>.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-sm space-y-3">
                            <p className="text-gray-400">
                                We use <span className="text-neon-primary font-mono">BHP256::commit_to_field</span> to bind this secret to the receipt.
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-gray-500">
                                <span className="text-pink-400">Input:</span> secret + salt
                                <span className="mx-2">→</span>
                                <span className="text-green-400">Output:</span> receipt_hash
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            The smart contract verifies the commitment without ever seeing the secret itself, enabling a truly trustless proof of payment.
                        </p>
                    </GlassCard>

                    {/* CARD 4: PRIVATE TRANSFERS */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">04</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </span>
                            Private Transfers
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            We utilize Aleo's <code className="text-neon-primary bg-neon-primary/10 px-1 rounded">transfer_private</code> function.
                        </p>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <span className="text-green-400 mt-1">✓</span>
                                <span>Payer identity is hidden from the public graph.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-400 mt-1">✓</span>
                                <span>Transaction value is encrypted on-chain.</span>
                            </li>
                        </ul>
                    </GlassCard>

                    {/* CARD 5: TAMPER-PROOF INTEGRITY */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">05</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            Tamper-Proof Integrity
                        </h2>
                        <p className="text-gray-400 mb-4 leading-relaxed">
                            <strong>No frauds, pure math.</strong> We employ <span className="text-neon-primary font-mono bg-neon-primary/10 px-1 rounded">BHP 256</span> hashing to cryptographically seal every invoice.
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            Can a merchant trick you by creating a fake invoice for a higher amount?
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>Record: BHP256(10, Salt)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span>Link: BHP256(100, Salt)</span>
                            </div>
                            <div className="font-mono text-xs text-red-400 pt-2 border-t border-white/10">
                                ❌ HASH MISMATCH → REVERT
                            </div>
                        </div>
                    </GlassCard>

                    {/* CARD 6: DUAL-RECORD SETTLEMENT */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">06</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </span>
                            Dual-Record Settlement
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <div className="text-blue-400 text-xs font-bold mb-1">CREATION</div>
                                <div className="text-white text-sm">Invoice Record</div>
                            </div>

                            <div className="flex justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>

                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <div className="text-neon-primary text-xs font-bold mb-2">SETTLEMENT</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
                                        <div className="text-[10px] text-gray-400">Payer</div>
                                        <div className="text-xs text-neon-accent">PayerReceipt</div>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
                                        <div className="text-[10px] text-gray-400">Merchant</div>
                                        <div className="text-xs text-neon-accent">MerchantReceipt</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                </div>
            </div>
        </motion.div>
    );
};

export default Privacy;
