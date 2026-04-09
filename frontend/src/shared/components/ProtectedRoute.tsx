import React from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Link } from 'react-router-dom';
import { useBurnerWallet } from '../hooks/BurnerWalletProvider';
import { PasswordPrompt } from './PasswordPrompt';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { connected } = useWallet();
    const { isUnlocked, isAutoUnlocking } = useBurnerWallet();

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse-glow" />
                    <div className="relative w-24 h-24 bg-[#0A0A0A]/95 backdrop-blur-xl rounded-full flex items-center justify-center border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)]">
                        <svg className="w-10 h-10 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-sm">Wallet Not Connected</h2>
                <p className="text-white/60 mb-10 max-w-md text-[15px] leading-relaxed">
                    Please connect your Aleo wallet to access this secured page. Connect your provider to execute and sign this transaction.
                </p>

                {/* Desktop-only Shield Extension Link */}
                <div className="wallet-adapter-wrapper w-full max-w-xs mb-4 [&>button]:!w-full [&>button]:!justify-center [&>button]:!rounded-2xl [&>button]:!h-12 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold">
                    <WalletMultiButton />
                </div>
                <a
                    href="https://chromewebstore.google.com/detail/shield/hhddpjpacfjaakjioinajgmhlbhfchao?pli=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden md:flex items-center justify-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-orange-500/10 to-amber-500/5 hover:from-orange-500/20 hover:to-amber-500/10 border border-orange-500/30 hover:border-orange-500/50 rounded-2xl text-orange-300 hover:text-orange-200 transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.05)] hover:shadow-[0_0_25px_rgba(249,115,22,0.15)] group"
                >
                    <span className="font-semibold tracking-wide text-[15px]">Get Shield Wallet Extension</span>
                </a>

                <div className="mt-6 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left backdrop-blur-xl">
                    <p className="text-sm font-semibold text-white">Auditor access</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                        If you are an auditor, you can verify audit bundles without connecting a wallet.
                    </p>
                    <Link
                        to="/audit/verify"
                        className="mt-4 inline-flex items-center text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                    >
                        Open the auditor verification page
                    </Link>
                </div>
            </div>
        );
    }

    // Show loading while checking for on-chain backup records
    if (isAutoUnlocking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-8 h-8 border-2 border-neon-primary/30 border-t-neon-primary rounded-full animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Checking for on-chain records...</p>
            </div>
        );
    }

    if (!isUnlocked) {
        return <PasswordPrompt />;
    }

    return <>{children}</>;
};
