import React from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useBurnerWallet } from '../hooks/BurnerWalletProvider';
import { PasswordPrompt } from './PasswordPrompt';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { connected } = useWallet();
    const { isUnlocked, isAutoUnlocking } = useBurnerWallet();

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                <p className="text-gray-400">Please connect your Aleo wallet to access this secured page.</p>
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
