import { useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';

const SHIELD_WALLET_NAME = 'Shield Wallet';

export const useShieldAvailability = () => {
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
};
