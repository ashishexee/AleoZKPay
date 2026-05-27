import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Link } from 'react-router-dom';
import { useBurnerWallet } from '../../hooks/wallet/BurnerWalletProvider';
import { PasswordPrompt } from '../auth/PasswordPrompt';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { connected } = useWallet();
    const { isUnlocked, isAutoUnlocking } = useBurnerWallet();
    const [dismissed, setDismissed] = useState(false);

    const needsConnect = !connected;
    const needsUnlock = connected && !isAutoUnlocking && !isUnlocked;
    const isLocked = needsConnect || isAutoUnlocking || needsUnlock;

    const lockReason = needsConnect ? 'connect' as const : isAutoUnlocking ? 'auto-unlock' as const : needsUnlock ? 'unlock' as const : 'ready' as const;
    const prevLockReason = useRef(lockReason);

    useEffect(() => {
        if (lockReason !== prevLockReason.current) {
            prevLockReason.current = lockReason;
            setDismissed(false);
        }
    }, [lockReason]);

    if (!isLocked || dismissed) return <>{children}</>;

    return (
        <>
            <div className="pointer-events-none select-none opacity-40">
                {children}
            </div>

            <div className="fixed inset-0 z-40 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

                <div className="relative z-50 max-h-[90vh] overflow-y-auto bg-[#0A0A0A]/95 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 max-w-md w-full mx-4 shadow-[0_0_80px_rgba(0,0,0,0.6)]">
                    {!isAutoUnlocking && (
                        <button
                            onClick={() => setDismissed(true)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
                            aria-label="Dismiss and browse"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    {needsConnect ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse-glow" />
                                <div className="relative w-20 h-20 bg-[#0A0A0A]/95 backdrop-blur-xl rounded-full flex items-center justify-center border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)]">
                                    <svg className="w-8 h-8 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Wallet Not Connected</h2>
                            <p className="text-white/50 mb-6 text-sm leading-relaxed">
                                Connect your Aleo wallet to access this secured page, or dismiss to browse.
                            </p>

                            <div className="wallet-adapter-wrapper w-full mb-3 [&>button]:!w-full [&>button]:!justify-center [&>button]:!rounded-2xl [&>button]:!h-12 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold">
                                <WalletMultiButton />
                            </div>
                            <a
                                href="https://chromewebstore.google.com/detail/shield/hhddpjpacfjaakjioinajgmhlbhfchao?pli=1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-2.5 px-5 py-3 bg-gradient-to-r from-orange-500/10 to-amber-500/5 hover:from-orange-500/20 hover:to-amber-500/10 border border-orange-500/30 hover:border-orange-500/50 rounded-2xl text-orange-300 hover:text-orange-200 transition-all duration-300 text-sm"
                            >
                                <span className="font-semibold">Get Shield Wallet Extension</span>
                            </a>

                            <div className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
                                <p className="text-xs font-semibold text-white">Auditor access</p>
                                <p className="mt-1 text-xs text-white/50">
                                    Auditors can verify audit bundles without connecting a wallet.
                                </p>
                                <Link
                                    to="/audit/verify"
                                    className="mt-2 inline-flex items-center text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
                                >
                                    Open auditor verification page
                                </Link>
                            </div>

                            <p className="mt-4 text-[10px] text-white/25 uppercase tracking-widest">
                                Dismiss to browse the interface
                            </p>
                        </div>
                    ) : isAutoUnlocking ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-neon-primary/30 border-t-neon-primary rounded-full animate-spin mb-4" />
                            <p className="text-gray-400 text-sm">Checking for on-chain records...</p>
                        </div>
                    ) : (
                        <PasswordPrompt variant="compact" />
                    )}
                </div>
            </div>
        </>
    );
};
