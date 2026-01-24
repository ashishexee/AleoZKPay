import React, { useMemo } from "react";
import { AleoWalletProvider as ProvableWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { PuzzleWalletAdapter } from "@provablehq/aleo-wallet-adaptor-puzzle";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { FoxWalletAdapter } from "@provablehq/aleo-wallet-adaptor-fox";
import { SoterWalletAdapter } from "@provablehq/aleo-wallet-adaptor-soter";
import {
    DecryptPermission,
} from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";

// Default styles
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

interface AleoWalletProviderProps {
    children: React.ReactNode;
}

export const AleoWalletProvider = ({ children }: AleoWalletProviderProps) => {
    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: 'AleoZKPay Beta',
            }),
            new PuzzleWalletAdapter({
                appName: 'AleoZKPay Beta',
            }),
            new ShieldWalletAdapter({
                appName: 'AleoZKPay Beta'
            }),
            new FoxWalletAdapter({
                appName: 'AleoZKPay Beta'
            }),
            new SoterWalletAdapter({
                appName: 'AleoZKPay Beta'
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
            programs={['zk_pay_proofs_privacy_v4.aleo']}
        >
            <WalletModalProvider>
                {children}
            </WalletModalProvider>
        </ProvableWalletProvider>
    );
};