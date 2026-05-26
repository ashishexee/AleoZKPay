import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/core/animations';
import { GlassCard } from '../../../shared/components/ui/GlassCard';

const Privacy: React.FC = () => {
    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
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

            <div className="w-full pt-32 relative z-10 pb-24 container-custom">
                {/* HERO HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Privacy by <span className="text-gradient-gold drop-shadow-gold">Design</span>
                    </h1>
                    <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-8">
                        NullPay leverages Zero-Knowledge Proofs (ZKP) to ensure your financial data remains confidential.
                        We don't just protect your privacy; we mathematically guarantee it.
                    </p>
                </motion.div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* CARD 1: THE HIDDEN LEDGER */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">01</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    The Hidden Ledger
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    The Hidden Ledger
                                </span>
                            </span>
                        </h2>
                        <p className="text-gray-400 mb-5 leading-relaxed">
                            In early versions of NullPay, every payment was anchored by a <strong>public on-chain mapping</strong>. That design worked, but it had a fundamental privacy flaw: anyone scanning the blockchain could observe the link between a payment secret and the settled amount.
                        </p>

                        {/* Before / After comparison */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            {/* BEFORE */}
                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden relative group/legacy">
                                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover/legacy:opacity-100 transition-opacity duration-500"></div>
                                <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/30 border border-red-500/50"></div>
                                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">legacy.aleo</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 text-[9px] font-bold tracking-widest uppercase">Removed</span>
                                </div>
                                <div className="p-4 relative z-10">
                                    <div className="font-mono text-xs text-gray-400 space-y-1 mb-4 opacity-75">
                                        <div><span className="text-red-400">mapping</span> payment_records:</div>
                                        <div className="pl-4">field <span className="text-gray-600">{'=> '}</span> u64</div>
                                        <div className="text-gray-600 pl-4 mt-2">// Anyone could scan and link</div>
                                        <div className="text-gray-600 pl-4">// your payment secrets.</div>
                                    </div>
                                    <ul className="space-y-2 text-[10px] text-gray-400">
                                        <li className="flex items-center gap-2">
                                            <span className="text-red-400 shrink-0">✗</span> Amount visible on block explorer
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-red-400 shrink-0">✗</span> Payment volume correlatable
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* AFTER */}
                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden relative group/v27 shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                                <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover/v27:opacity-100 transition-opacity duration-500"></div>
                                <div className="px-4 py-3 bg-white/5 border-b border-orange-500/20 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500/50 border border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"></div>
                                        <span className="text-[10px] text-orange-200 font-mono tracking-wider">v27_private.aleo</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-md border border-orange-500/30 text-[9px] font-bold tracking-widest uppercase animate-pulse-glow">Live Standard</span>
                                </div>
                                <div className="p-4 relative z-10">
                                    <div className="font-mono text-xs text-gray-300 space-y-1 mb-4">
                                        <div><span className="text-orange-400">record</span> PayerReceipt {'{'}</div>
                                        <div className="pl-4"><span className="text-green-400">owner</span>: address,</div>
                                        <div className="pl-4"><span className="text-blue-400">receipt_hash</span>: field,</div>
                                        <div className="pl-4"><span className="text-gray-500">amount</span>: u64,</div>
                                        <div>{'}'}</div>
                                    </div>
                                    <ul className="space-y-2 text-[10px] text-gray-300">
                                        <li className="flex items-center gap-2">
                                            <svg className="w-3 h-3 text-green-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Encrypted entirely on-chain
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <svg className="w-3 h-3 text-green-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            View-key bound decryption only
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* How view-key encryption works */}
                        <div className="mt-2 mb-4 relative p-5 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/5 overflow-hidden group">
                            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <div className="text-[10px] uppercase tracking-widest text-orange-400/80 font-bold mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                How On-Chain Record Encryption Works
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                <div className="flex flex-col gap-2">
                                    <div className="text-white text-sm font-semibold flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono">1</span>
                                        Transitions
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-relaxed"><code className="text-orange-300/80 bg-orange-500/10 px-1 rounded font-mono">pay_invoice</code> outputs a <code className="text-orange-300/80 bg-orange-500/10 px-1 rounded font-mono">PayerReceipt</code> natively encrypted via Aleo's record model.</p>
                                </div>
                                <div className="flex flex-col gap-2 relative">
                                    <div className="hidden md:block absolute top-2 -left-4 w-px h-10 bg-white/10"></div>
                                    <div className="text-white text-sm font-semibold flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono">2</span>
                                        Validation
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">The network stores the ciphertext. Validators prove validity via ZK without decrypting anything.</p>
                                </div>
                                <div className="flex flex-col gap-2 relative">
                                    <div className="hidden md:block absolute top-2 -left-4 w-px h-10 bg-white/10"></div>
                                    <div className="text-white text-sm font-semibold flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center text-[10px] text-orange-400 font-mono">3</span>
                                        Decryption
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">Only the assigned <code className="text-orange-300/80 bg-orange-500/10 px-1 rounded font-mono">owner</code> view-key can decrypt the payload and read the internal state.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 leading-relaxed">
                            The removal of the public mapping is not a minor refactor — it is the foundational privacy guarantee that makes NullPay different. Without a public mapping, there is no enumerable on-chain data structure that reveals who paid whom, or how much.
                        </p>
                    </GlassCard>

                    {/* CARD 2: BLIND DATABASE */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">02</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    Blind Database
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    Blind Database
                                </span>
                            </span>
                        </h2>
                        <p className="text-gray-400 mb-5 leading-relaxed">
                            Our database is designed from the ground up to know as little as possible about you. We deliberately <strong>do not store any field that could compromise your financial privacy.</strong>
                        </p>

                        {/* What we never store */}
                        <div className="mb-6 bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/10 rounded-2xl p-5 relative overflow-hidden group">
                           <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:bg-red-500/10 transition-colors duration-500"></div>
                            <div className="text-red-400 text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2 relative z-10">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                Never Stored in Database
                            </div>
                            
                            <div className="flex flex-wrap gap-2 relative z-10">
                                {[
                                    { label: 'Amount', detail: 'On-chain only' },
                                    { label: 'Memo', detail: 'Encrypted payload' },
                                    { label: 'Title', detail: 'Private record' },
                                    { label: 'Payer Note', detail: 'Receipt seal' },
                                    { label: 'Merchant Note', detail: 'Receipt seal' },
                                    { label: 'Payment Secret', detail: 'Browser only' }
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 hover:border-red-500/30 transition-colors">
                                        <svg className="w-3 h-3 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-gray-300 text-xs font-mono line-through decoration-red-500/50">{item.label}</span>
                                        <span className="text-gray-600 text-[9px] uppercase tracking-wider pl-2 border-l border-white/10 hidden sm:block">{item.detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* What we do store, encrypted */}
                        <div className="mb-4 bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/10 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:bg-orange-500/10 transition-colors duration-500"></div>
                            <div className="text-orange-400 text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2 relative z-10">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                Only AES-256 Encrypted Metadata
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 relative z-10">
                                {[
                                    { label: 'Merchant Addr', algo: 'SHA-256' },
                                    { label: 'Invoice Hash', algo: 'BHP-256' },
                                    { label: 'Status', algo: 'Enum' },
                                    { label: 'Token Type', algo: 'Enum' }
                                ].map((item) => (
                                    <div key={item.label} className="group/item flex items-center justify-between bg-black/40 border border-white/5 rounded-lg px-3 py-2 hover:border-orange-500/30 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-3 h-3 text-orange-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span className="text-gray-300 text-xs font-mono">{item.label}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded group-hover/item:text-orange-400/80 transition-colors">{item.algo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                <span className="text-neon-primary font-semibold">Our commitment:</span> We do not store anything that would hamper the privacy of our users. Every sensitive field — the amount you paid, the note you wrote, the memo on the invoice — lives solely inside encrypted on-chain records that only the rightful owner can decrypt. Even a full database breach reveals nothing of financial consequence.
                            </p>
                        </div>
                    </GlassCard>

                    {/* CARD 3: DUAL-RECORD SETTLEMENT — FULL WIDTH */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">03</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    Dual-Record Settlement
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    Dual-Record Settlement
                                </span>
                            </span>
                        </h2>

                        <p className="text-gray-400 mb-8 leading-relaxed max-w-3xl">
                            <span className="text-neon-primary font-semibold">Atomic Execution:</span> The <code className="bg-white/10 px-1 rounded text-blue-300">pay_invoice</code> transition guarantees that either <strong>both</strong> parties receive their receipts, or the transaction fails entirely. It is mathematically impossible for a payer to pay without getting a receipt.
                        </p>

                        <div className="relative grid grid-cols-1 md:grid-cols-11 gap-4 items-center">

                            {/* STEP 1: INPUT */}
                            <div className="md:col-span-3 flex flex-col gap-2">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center group-hover:border-blue-500/30 transition-colors">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Input</div>
                                    <div className="text-sm font-semibold text-white">Invoice Record</div>
                                    <div className="text-[10px] text-gray-500 mt-1">Merchant's Request</div>
                                </div>
                            </div>

                            {/* ARROW */}
                            <div className="md:col-span-1 flex justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>

                            {/* STEP 2: PROCESS */}
                            <div className="md:col-span-3 relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-20 animate-pulse-slow"></div>
                                <div className="bg-black/60 p-4 rounded-xl border border-blue-500/30 text-center relative z-10 backdrop-blur-sm">
                                    <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Smart Contract</div>
                                    <div className="text-sm font-bold text-white">pay_invoice</div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-mono">Generates 2 Records</div>
                                </div>
                            </div>

                            {/* ARROW SPLIT */}
                            <div className="md:col-span-1 flex justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>

                            {/* STEP 3: DUAL OUTPUT */}
                            <div className="md:col-span-3 flex flex-col gap-3">
                                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-green-400 font-bold">PayerReceipt</div>
                                        <div className="text-[10px] text-gray-500">Proof of Payment</div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                </div>
                                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-blue-400 font-bold">MerchantReceipt</div>
                                        <div className="text-[10px] text-gray-500">Proof of Revenue</div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Cryptographic Link</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Both receipts share an identical <code className="text-neon-primary bg-white/5 px-1 rounded">receipt_hash</code>, allowing off-chain verification without revealing data on-chain.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Asset Agnostic</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        The settlement logic creates standardized receipts for both <span className="text-white">Aleo Credits</span> and <span className="text-white">USDCx</span>, preserving the same privacy guarantees.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Encrypted Metadata</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Off-chain details are protected by <span className="text-neon-primary bg-white/5 px-1 rounded">AES-256</span> encryption, ensuring even the database remains blind.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </GlassCard>

                    {/* CARD 4: PAYER NOTE — PRIVATE BY CONTRACT */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">04</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-green-500/20 flex items-center justify-center text-white/70 group-hover:text-green-400 transition-all duration-500 border border-white/5 group-hover:border-green-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                                    Payer Note — Private by Contract
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    Payer Note — Private by Contract
                                </span>
                            </span>
                        </h2>
                        <p className="text-gray-400 mb-4 leading-relaxed text-sm">
                            When a payer attaches a personal note to a transaction, that note is encoded as a <code className="text-green-400 bg-white/5 px-1 rounded">field</code> value and stored inside the <code className="text-green-400 bg-white/5 px-1 rounded">PayerReceipt</code> record — a record owned exclusively by the payer.
                        </p>

                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs space-y-3 mb-4">
                            <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-gray-500 uppercase tracking-widest">Contract: zk_pay_proofs_privacy_v29.aleo</span>
                            </div>
                            <div className="space-y-1 text-gray-400">
                                <div><span className="text-purple-400">record</span> PayerReceipt {'{'}</div>
                                <div className="pl-4"><span className="text-green-400">owner</span>: address,    <span className="text-gray-600">// The Payer (only they can read)</span></div>
                                <div className="pl-4"><span className="text-blue-400">merchant</span>: address,  <span className="text-gray-600">// Merchant address</span></div>
                                <div className="pl-4"><span className="text-yellow-400">payer_note</span>: field, <span className="text-gray-600 font-sans text-[10px]">// ← Payer-only. Max ~31 chars. DB never sees this.</span></div>
                                <div className="pl-4"><span className="text-gray-500">receipt_hash</span>: field,</div>
                                <div className="pl-4"><span className="text-gray-500">amount</span>: u64,</div>
                                <div>{'}'}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                <div className="text-green-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Payer Only</div>
                                <div className="text-xs text-gray-300">payer_note is sealed inside PayerReceipt. The merchant can never read it — not even the database.</div>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                <div className="text-blue-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Merchant Only</div>
                                <div className="text-xs text-gray-300">merchant_note is sealed inside MerchantReceipt. The payer cannot read the merchant's note either.</div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            The contract enforces a strict separation: each party's note is placed in a separate record they own. Neither note is ever written to a public mapping or our database — it exists solely in the encrypted on-chain record.
                        </p>
                    </GlassCard>

                    {/* CARD 5: THE PAYMENT SECRET */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">05</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    The Payment Secret
                                </span>
                                The Payment Secret
                            </span>
                        </h2>
                        <p className="text-gray-400 mb-5 leading-relaxed">
                            Every transaction is anchored by a <code className="text-pink-400">payment_secret</code> — a random field value generated <strong className="text-white">entirely in your browser</strong>, never transmitted to our servers, and never stored anywhere.
                        </p>

                        {/* Commit pipeline */}
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs space-y-3 mb-4">
                            <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-gray-500 uppercase tracking-widest text-[10px]">Commitment Pipeline — runs inside your wallet</span>
                                <span className="text-pink-400 text-[10px]">● Client-side only</span>
                            </div>
                            <div className="space-y-2 text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="text-pink-400 shrink-0">1.</span>
                                    <span><span className="text-pink-300">payment_secret</span> = <span className="text-gray-300">Field::rand()</span> <span className="text-gray-600">// random 253-bit value</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-pink-400 shrink-0">2.</span>
                                    <span><span className="text-blue-300">salt_scalar</span> = <span className="text-gray-300">BHP256::hash_to_scalar(salt)</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-pink-400 shrink-0">3.</span>
                                    <span><span className="text-green-300">receipt_hash</span> = <span className="text-gray-300">BHP256::commit_to_field(payment_secret, salt_scalar)</span></span>
                                </div>
                                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                    <span className="text-yellow-400 shrink-0">→</span>
                                    <span className="text-yellow-300">Only receipt_hash is passed to the contract. The secret stays private.</span>
                                </div>
                            </div>
                        </div>

                        {/* Why this matters */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-start gap-3 bg-white/3 rounded-lg p-3 border border-white/5">
                                <div className="shrink-0 mt-0.5 w-4 h-4 text-pink-400">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-white text-xs font-bold mb-0.5">Zero-Knowledge Commitment</div>
                                    <p className="text-gray-500 text-[11px] leading-relaxed">BHP256 commit is a hiding commitment — knowing receipt_hash reveals nothing about payment_secret. The secret cannot be reverse-engineered from on-chain data.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/3 rounded-lg p-3 border border-white/5">
                                <div className="shrink-0 mt-0.5 w-4 h-4 text-blue-400">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-white text-xs font-bold mb-0.5">Server Never Sees It</div>
                                    <p className="text-gray-500 text-[11px] leading-relaxed">Our backend only records the invoice_hash and status. The payment_secret is generated locally after the user confirms checkout — we have no way to intercept it.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/3 rounded-lg p-3 border border-white/5">
                                <div className="shrink-0 mt-0.5 w-4 h-4 text-green-400">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-white text-xs font-bold mb-0.5">On-Chain Verifiability</div>
                                    <p className="text-gray-500 text-[11px] leading-relaxed">Anyone with the payment_secret can prove payment by re-deriving receipt_hash and matching it against the on-chain PayerReceipt record — without trusting NullPay at all.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 leading-relaxed">
                            The smart contract verifies the commitment without ever seeing the secret itself — making payment verification trustless, non-custodial, and mathematically guaranteed.
                        </p>
                    </GlassCard>

                    {/* CARD 6: PRIVATE TRANSFERS */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">06</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    Private Transfers
                                </span>
                                Private Transfers
                            </span>
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Leo Program Call</span>
                                    <span className="text-[10px] text-gray-500 font-mono">credits.aleo</span>
                                </div>
                                <code className="block font-mono text-xs text-gray-300 bg-white/5 p-2 rounded border border-white/5">
                                    transfer_private(input_record, merchant, amount)
                                </code>
                            </div>

                            <ul className="space-y-3 text-sm text-gray-400">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 min-w-[16px]">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong className="text-white">Record Consumption (Burning):</strong>
                                        <p className="text-xs text-gray-500 mt-0.5">The payer's input record is physically consumed on-chain. It ceases to exist, preventing double-spending.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 min-w-[16px]">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong className="text-white">Encrypted Outputs:</strong>
                                        <p className="text-xs text-gray-500 mt-0.5">Two new records are minted (Payment + Change). The <code className="text-purple-400">amount</code> and <code className="text-purple-400">owner</code> fields are fully encrypted under the recipient's view key.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </GlassCard>

                    {/* CARD 7: TAMPER-PROOF INTEGRITY */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">07</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-orange-500/20 flex items-center justify-center text-white/70 group-hover:text-orange-400 transition-all duration-500 border border-white/5 group-hover:border-orange-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                    Tamper-Proof Integrity
                                </span>
                                Tamper-Proof Integrity
                            </span>
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

                    {/* CARD 8: BURNER WALLET — IDENTITY SEPARATION — FULL WIDTH */}
                    <GlassCard className="p-10 flex flex-col relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">08</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-purple-500/20 flex items-center justify-center text-white/70 group-hover:text-purple-400 transition-all duration-500 border border-white/5 group-hover:border-purple-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                                    Burner Wallet — Identity Separation
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    Burner Wallet — Identity Separation
                                </span>
                            </span>
                        </h2>

                        <p className="text-gray-400 mb-8 leading-relaxed max-w-3xl">
                            Your main wallet is your identity. The <span className="text-purple-400 font-semibold">Burner Wallet</span> is your privacy shield — a secondary, ephemeral Aleo address that completely severs the link between payer and receiver. Merchants never see your real address, and payouts can be swept to any destination at any time.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-black/40 rounded-xl p-5 border border-purple-500/20 flex flex-col gap-3">
                                <div className="text-purple-400 text-xs uppercase tracking-widest font-bold">Step 1 — Generate</div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    A fresh Aleo private key is generated entirely on your device. It is <strong className="text-white">never</strong> transmitted in plaintext.
                                </p>
                            </div>
                            <div className="bg-black/40 rounded-xl p-5 border border-purple-500/20 flex flex-col gap-3">
                                <div className="text-purple-400 text-xs uppercase tracking-widest font-bold">Step 2 — Encrypt</div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    The private key is encrypted client-side using your password via <code className="text-purple-300 bg-white/5 px-1 rounded">AES-GCM + PBKDF2</code>. The ciphertext is what gets stored — not the key.
                                </p>
                            </div>
                            <div className="bg-black/40 rounded-xl p-5 border border-purple-500/20 flex flex-col gap-3">
                                <div className="text-purple-400 text-xs uppercase tracking-widest font-bold">Step 3 — Backup (Optional)</div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    You can optionally back up the encrypted key as an on-chain Aleo record in the <code className="text-purple-300 bg-white/5 px-1 rounded">zk_pay_proofs_privacy_wallet</code> program. Only you can decrypt it.
                                </p>
                            </div>
                        </div>

                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1">
                                <h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                    What the database stores about your burner
                                </h4>
                                <ul className="space-y-1 text-xs text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-orange-400">→</span> A SHA-256 hash of your main address (not the address itself)</li>
                                    <li className="flex items-center gap-2"><span className="text-orange-400">→</span> The <strong className="text-white">encrypted</strong> burner address (AES-256-GCM, server-side key)</li>
                                    <li className="flex items-center gap-2"><span className="text-orange-400">→</span> The <strong className="text-white">password-encrypted</strong> burner private key (your password, never leaves your device)</li>
                                </ul>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                    What is never stored
                                </h4>
                                <ul className="space-y-1 text-xs text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Your main wallet address in plaintext</li>
                                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Your burner private key in plaintext</li>
                                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Your NullPay password in any form</li>
                                    <li className="flex items-center gap-2"><span className="text-red-400">✗</span> Any payer note or merchant note from transactions</li>
                                </ul>
                            </div>
                        </div>
                    </GlassCard>

                    {/* CARD 9: DUAL-LAYER PASSWORD ARCHITECTURE — FULL WIDTH */}
                    <GlassCard className="p-10 flex flex-col relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">09</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 transition-colors duration-500">
                            <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-yellow-500/20 flex items-center justify-center text-white/70 group-hover:text-yellow-400 transition-all duration-500 border border-white/5 group-hover:border-yellow-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </span>
                            <span className="relative">
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                                    Dual-Layer Encryption Architecture
                                </span>
                                <span className="group-hover:opacity-0 transition-opacity duration-500">
                                    Dual-Layer Encryption Architecture
                                </span>
                            </span>
                        </h2>

                        <p className="text-gray-400 mb-8 leading-relaxed max-w-3xl">
                            NullPay protects sensitive data with two independent, orthogonal encryption layers. Even if one layer is compromised, the other keeps your data safe. This is not security theater — it is defense-in-depth.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Layer 1 */}
                            <div className="relative bg-black/40 rounded-xl p-6 border border-yellow-500/20 overflow-hidden">
                                <div className="absolute top-3 right-3 text-xs font-bold text-yellow-400 uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">Layer 1</div>
                                <h3 className="text-white font-bold text-base mb-2">Client-Side · Password-Based</h3>
                                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                                    Your NullPay password never leaves your browser. It is used locally to derive an <code className="text-yellow-400 bg-white/5 px-1 rounded">AES-256-GCM</code> encryption key via <code className="text-yellow-400 bg-white/5 px-1 rounded">PBKDF2</code>.
                                </p>
                                <div className="bg-black/40 rounded-lg p-3 font-mono text-xs space-y-1 border border-white/5">
                                    <div className="text-gray-500">// Runs in YOUR browser, not our server</div>
                                    <div><span className="text-yellow-400">password</span> + <span className="text-blue-400">salt</span> → <span className="text-green-400">PBKDF2</span> → <span className="text-purple-400">derivedKey</span></div>
                                    <div><span className="text-purple-400">derivedKey</span> + <span className="text-orange-400">burnerPrivKey</span> → <span className="text-green-400">AES-GCM</span> → <span className="text-gray-300">ciphertext</span></div>
                                </div>
                                <ul className="mt-4 space-y-1 text-xs text-gray-500">
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Password hashed locally using PBKDF2 with a random salt</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Encrypted key stored in DB or as an Aleo on-chain record</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Server cannot decrypt your burner key — it never has the password</li>
                                </ul>
                            </div>

                            {/* Layer 2 */}
                            <div className="relative bg-black/40 rounded-xl p-6 border border-blue-500/20 overflow-hidden">
                                <div className="absolute top-3 right-3 text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Layer 2</div>
                                <h3 className="text-white font-bold text-base mb-2">Server-Side · Server-Key-Based</h3>
                                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                                    All metadata stored in our database (merchant addresses, webhook URLs, SDK keys) is further encrypted at rest using a server-controlled <code className="text-blue-400 bg-white/5 px-1 rounded">AES-256-GCM</code> key stored in the environment, never in the DB.
                                </p>
                                <div className="bg-black/40 rounded-lg p-3 font-mono text-xs space-y-1 border border-white/5">
                                    <div className="text-gray-500">// Runs on our Node.js backend</div>
                                    <div><span className="text-blue-400">ENCRYPTION_KEY</span> + <span className="text-orange-400">plaintext</span> → <span className="text-green-400">AES-256-GCM</span></div>
                                    <div><span className="text-gray-400">format:</span> <span className="text-gray-300">iv:authTag:ciphertext</span></div>
                                </div>
                                <ul className="mt-4 space-y-1 text-xs text-gray-500">
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Merchant addresses encrypted before DB write, decrypted on demand</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> DB breach alone cannot expose plaintext merchant data</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Authenticated encryption (GCM auth tag prevents tampering)</li>
                                </ul>
                            </div>
                        </div>

                        {/* Separation boundary diagram */}
                        <div className="bg-black/60 rounded-xl p-5 border border-white/5">
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-bold">Trust Boundary Diagram</div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-xs">
                                <div className="md:col-span-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                                    <div className="text-yellow-400 font-bold mb-1">Your Browser</div>
                                    <div className="text-gray-500">Password lives here only</div>
                                    <div className="text-gray-500">Client-side AES-GCM</div>
                                </div>
                                <div className="md:col-span-1 flex justify-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-px h-8 md:hidden bg-white/10"></div>
                                        <div className="hidden md:block h-px w-full bg-white/10"></div>
                                        <span className="text-gray-600 text-[10px] uppercase tracking-widest px-2">HTTPS</span>
                                        <div className="hidden md:block h-px w-full bg-white/10"></div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                                    <div className="text-blue-400 font-bold mb-1">Our Backend + DB</div>
                                    <div className="text-gray-500">Server-side AES-256-GCM</div>
                                    <div className="text-gray-500">Encryption key in env only</div>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-4 text-center">
                                Neither layer alone can decrypt everything. Your password is the only key to your burner wallet — and we never hold it.
                            </p>
                        </div>
                    </GlassCard>

                </div>
            </div>
        </motion.div>
    );
};

export default Privacy;
