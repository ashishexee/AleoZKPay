import React, { useEffect } from 'react';
import { AleoWalletProvider } from './WalletProvider';
import { BurnerWalletProvider } from './BurnerWalletProvider';
import { CardWalletProvider } from './CardWalletProvider';
import { WalletAppEffects } from './WalletAppEffects';
import { setWalletReady } from './walletReadyStore';

const WalletProviderShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        setWalletReady(true);
        return () => setWalletReady(false);
    }, []);

    return (
        <AleoWalletProvider>
            <BurnerWalletProvider>
                <CardWalletProvider>
                    <WalletAppEffects />
                    {children}
                </CardWalletProvider>
            </BurnerWalletProvider>
        </AleoWalletProvider>
    );
};

export default WalletProviderShell;
