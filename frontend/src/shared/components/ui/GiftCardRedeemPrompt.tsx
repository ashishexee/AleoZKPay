import React from 'react';
import { motion } from 'framer-motion';

interface GiftCardRedeemPromptProps {
    availableAmount: number;
    tokenLabel: string;
    walletConnected: boolean;
    loading?: boolean;
    onRedeem: () => void;
}

export const GiftCardRedeemPrompt: React.FC<GiftCardRedeemPromptProps> = ({
    availableAmount,
    tokenLabel,
    walletConnected,
    loading = false,
    onRedeem
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-left relative overflow-hidden group"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/80">
                        Insufficient Balance
                    </p>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed">
                    This gift card only contains <span className="font-bold text-white whitespace-nowrap">{availableAmount.toFixed(2)} {tokenLabel}</span>. 
                    You can redeem this balance to your wallet first to complete the payment.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                            NullPay covers the redeem gas fee
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={onRedeem}
                        disabled={loading || !walletConnected}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-black transition-all hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                <span>Redeeming...</span>
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>{walletConnected ? `Redeem ${availableAmount.toFixed(2)} ${tokenLabel}` : 'Connect Wallet to Redeem'}</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

