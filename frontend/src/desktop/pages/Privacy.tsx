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

                    {/* CARD 1: ZK INVOICES */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-shadow duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">01</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-neon-primary/20 flex items-center justify-center text-neon-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                            Zero-Knowledge Invoices
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Unlike traditional blockchains where invoice details are public, NullPay hashes invoice parameters on-chain.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs text-gray-300">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500">Parameters</span>
                                <span className="text-neon-primary">On-Chain Hash</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                    <span className="bg-white/10 px-2 py-1 rounded">Merchant Addr</span>
                                    <span>+</span>
                                    <span className="bg-white/10 px-2 py-1 rounded">Amount</span>
                                    <span>+</span>
                                    <span className="bg-white/10 px-2 py-1 rounded">Salt</span>
                                    <span>→</span>
                                    <span className="text-neon-accent truncate">3849...291x</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            The network validates the invoice exists without revealing the amount or recipient to the public ledger.
                        </p>
                    </GlassCard>

                    {/* CARD 2: PRIVATE PAYMENTS */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-shadow duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">02</span>
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
                            We utilize Aleo's <code className="text-neon-primary bg-neon-primary/10 px-1 rounded">transfer_private</code> function. This ensures that the flow of funds is obfuscated.
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
                            <li className="flex items-start gap-3">
                                <span className="text-green-400 mt-1">✓</span>
                                <span>Only the merchant (with their view key) can see the incoming payment details.</span>
                            </li>
                        </ul>
                    </GlassCard>

                    {/* CARD 3: ENCRYPTED METADATA */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-shadow duration-500 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">03</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            End-to-End Encrypted Metadata
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <p className="text-gray-400 mb-4 leading-relaxed">
                                    Off-chain data such as merchant addresses, memos, and transaction history references are stored with strong encryption.
                                </p>
                                <p className="text-gray-400 mb-4 leading-relaxed">
                                    When you view your <strong>Profile</strong>, the application requests a signature from your wallet to decrypt this data locally in your browser.
                                </p>
                                <div className="inline-block bg-neon-primary/10 border border-neon-primary/20 rounded-full px-4 py-1 text-xs text-neon-primary">
                                    AES-256 Encryption Standard
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-xl p-6 border border-white/5 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Database View</div>
                                    <div className="font-mono text-red-400 text-sm break-all bg-red-900/10 p-2 rounded mb-4">
                                        U2FsdGVkX19+X5x7...
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Your View (Unlocked)</div>
                                    <div className="font-mono text-green-400 text-sm bg-green-900/10 p-2 rounded">
                                        aleo1...xyz
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* CARD 4: ANTI-FRAUD VERIFICATION */}
                    <GlassCard className="p-8 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-shadow duration-500 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">04</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            Tamper-Proof Integrity
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Can a merchant trick you?</h3>
                                <p className="text-gray-400 mb-4 leading-relaxed">
                                    <strong>Scenario:</strong> A merchant creates an invoice for <span className="text-white">10 Credits</span>, but sends you a manipulated link asking for <span className="text-red-400">100 Credits</span>.
                                </p>
                                <p className="text-gray-400 mb-4 leading-relaxed">
                                    <strong>Outcome:</strong> The transaction will <span className="text-red-400 font-bold">ALWAYS FAIL</span>.
                                </p>
                                <p className="text-sm text-gray-500 italic">
                                    "No frauds, pure math."
                                </p>
                            </div>
                            <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span>On-Chain Record:</span>
                                    <span className="font-mono text-xs text-gray-500">Hash(10, Salt)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span>Tampered Link:</span>
                                    <span className="font-mono text-xs text-gray-500">Hash(100, Salt)</span>
                                </div>
                                <div className="border-t border-white/10 pt-3">
                                    <div className="font-mono text-sm text-red-400 text-center bg-red-900/10 py-2 rounded border border-red-500/20">
                                        ❌ HASH MISMATCH → REVERT
                                    </div>
                                    <p className="text-xs text-center text-gray-500 mt-2">
                                        The smart contract mathematically verifies inputs. If the amount doesn't match the original, the proof is invalid.
                                    </p>
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
