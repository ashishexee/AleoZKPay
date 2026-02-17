import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'nullpay_changelog_seen';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring" as const, duration: 0.6, bounce: 0.3 }
    },
    exit: { opacity: 0, scale: 0.9, y: 30, transition: { duration: 0.3 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.1 + 0.3, duration: 0.5 }
    })
};

export const ChangelogOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = (dontShowAgain: boolean) => {
        setIsVisible(false);
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans antialiased">
                    {/* BACKDROP */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => handleClose(false)}
                    />

                    {/* MODAL */}
                    <motion.div
                        className="relative w-full max-w-2xl bg-[#080808] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* DECORATIVE BACKGROUND GLOWS */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon-primary/10 rounded-full blur-[120px] pointer-events-none opacity-60" />
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none opacity-60" />

                        {/* HEADER */}
                        <div className="p-8 pb-4 shrink-0 relative z-10">
                            <motion.h2
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight"
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary via-white to-purple-400 animate-gradient-x bg-[length:200%_auto]">
                                    New Things
                                </span> in NullPay
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-400 text-sm"
                            >
                                Major privacy upgrades and new capabilities available now.
                            </motion.p>
                        </div>

                        {/* CONTENT SCROLL */}
                        <div className="p-8 pt-2 overflow-y-auto custom-scrollbar space-y-8 relative z-10 pr-6">

                            {/* ITEM 1: USDCx */}
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Native USDCx Integration</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Dollar-pegged stability with full privacy. Send and receive payments in USDCx directly through the interface.
                                    </p>

                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                Atomic Swaps
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                The protocol now supports <code className="text-blue-300 bg-blue-500/10 px-1 rounded">token_type: 1u8</code> natively. Settlements engage the `test_usdcx_stablecoin.aleo` contract directly. This ensures <strong>atomic execution</strong>: the transfer and receipt generation happen in a single, inseparable step.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 2: PRIVATE RECORDS */}
                            <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">Dual-Record Privacy</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Moved beyond simple mappings. Transaction history is stored in encrypted records only you can decrypt.
                                    </p>

                                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                                Why Payment Secret?
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Your <code className="text-purple-300 bg-purple-500/10 px-1 rounded">receipt_hash</code> is derived from <code className="text-purple-300 bg-purple-500/10 px-1 rounded">BHP256::commit_to_field(secret, salt)</code>. This ensures you retain mathematical proof of ownership off-chain without revealing the encrypted record itself.
                                            </p>
                                        </div>
                                        <div className="pt-2 border-t border-purple-500/10">
                                            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Encrypted Proofs</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Instead of a public ledger, we issue separate <code className="text-purple-300 bg-purple-500/10 px-1 rounded">PayerReceipt</code> and <code className="text-purple-300 bg-purple-500/10 px-1 rounded">MerchantReceipt</code> records, encrypted to their respective owners.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 3: OPEN INVOICES */}
                            <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">Open-Ended Donations</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Create invoices with no fixed amount and let your community decide the value.
                                    </p>

                                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 backdrop-blur-sm mb-3">
                                        <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                            Zero-Amount Logic
                                        </h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            The contract validates <code className="text-orange-300 bg-orange-500/10 px-1 rounded">invoice_type: 2u8</code> allows for <code className="text-orange-300 bg-orange-500/10 px-1 rounded">amount: 0</code>. This enables the payer to input any dynamic value during settlement, perfect for variable donations.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-default">Buy Me a Coffee</span>
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-default">Fundraising</span>
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-default">Tips</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 4: MOBILE */}
                            <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/5 flex items-center justify-center text-pink-400 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">NullPay Mobile Lite</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-2">
                                        A streamlined payment interface optimized for mobile browsers, featuring instant QR scanning.
                                    </p>
                                    <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-3 backdrop-blur-sm">
                                        <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                            Lightweight Optimization
                                        </h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            While the core logic remains robust, the UI is stripped down to essential components (`CreateInvoice`, `PaymentPage`) ensuring lightning-fast load times on 4G networks.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-8 pt-6 shrink-0 bg-black/40 border-t border-white/5 flex items-center justify-between backdrop-blur-md relative z-10">
                            <button
                                onClick={() => handleClose(false)}
                                className="text-sm text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5"
                            >
                                Remind Me Later
                            </button>

                            <button
                                onClick={() => handleClose(true)}
                                className="px-8 py-3 bg-neon-primary hover:bg-neon-accent text-black text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Got it! Don't show again
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
