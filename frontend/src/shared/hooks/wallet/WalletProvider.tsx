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
import { CORE_PROGRAM_ID, WALLET_PROGRAM_ID } from "../../utils/aleo/aleoUtils";

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
            programs={[CORE_PROGRAM_ID, WALLET_PROGRAM_ID, 'credits.aleo', 'test_usdcx_stablecoin.aleo', 'test_usad_stablecoin.aleo']}
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
