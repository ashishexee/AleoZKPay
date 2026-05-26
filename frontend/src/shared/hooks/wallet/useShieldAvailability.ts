import { useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';

const SHIELD_WALLET_NAME = 'Shield Wallet';

const isShieldDetected = () => typeof window !== 'undefined' && !!(window as any).shield;

export const useShieldAvailability = () => {
    try {
        const { connected, wallets } = useWallet();

        const hasShieldWallet = useMemo(() => (
            connected || wallets.some(({ adapter, readyState }) => (
                adapter.name === SHIELD_WALLET_NAME && (
                    readyState === WalletReadyState.INSTALLED
                )
            ))
        ), [connected, wallets]);

        return {
            hasShieldWallet,
            shouldShowMobileDashboard: hasShieldWallet,
        };
    } catch {
        // Wallet providers not mounted — use lightweight fallback
        const hasShieldWallet = isShieldDetected();
        return {
            hasShieldWallet,
            shouldShowMobileDashboard: hasShieldWallet,
        };
    }
};
