import React, { useMemo } from "react";
import { AleoWalletProvider as ProvableWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import {
    DecryptPermission,
} from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";
import { WalletErrorBoundary } from "./WalletErrorBoundary";

interface AleoWalletProviderProps {
    children: React.ReactNode;
}

export const AleoWalletProvider = ({ children }: AleoWalletProviderProps) => {
    const wallets = useMemo(
        () => [
            new ShieldWalletAdapter({
                appName: 'NullPay'
            }),
        ],
        []
    );

    return (
        <ProvableWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.AutoDecrypt}
            network={Network.TESTNET}
            autoConnect
            programs={['zk_pay_proofs_privacy_v25.aleo', 'credits.aleo', 'test_usdcx_stablecoin.aleo', 'test_usad_stablecoin.aleo']}
            onError={(error) => {
                console.error('[NullPay] Wallet adapter error:', error.message);
            }}
        >
            <WalletModalProvider>
                <WalletErrorBoundary>
                    {children}
                </WalletErrorBoundary>
            </WalletModalProvider>
        </ProvableWalletProvider>
    );
};
