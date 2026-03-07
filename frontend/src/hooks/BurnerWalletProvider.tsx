import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { getUserProfile } from '../services/api';

interface BurnerWalletContextType {
    burnerAddress: string | null;
    decryptedBurnerKey: string | null;
    setDecryptedBurnerKey: (key: string | null) => void;
    encryptedBurnerKey: string | null;
    refreshProfile: () => Promise<void>;
}

const BurnerWalletContext = createContext<BurnerWalletContextType | undefined>(undefined);

export const BurnerWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address } = useWallet();
    const [burnerAddress, setBurnerAddress] = useState<string | null>(null);
    const [encryptedBurnerKey, setEncryptedBurnerKey] = useState<string | null>(null);
    const [decryptedBurnerKey, setDecryptedBurnerKey] = useState<string | null>(null);

    const refreshProfile = async () => {
        if (!address) {
            setBurnerAddress(null);
            setEncryptedBurnerKey(null);
            setDecryptedBurnerKey(null);
            return;
        }
        
        try {
            const profile = await getUserProfile(address);
            if (profile) {
                setBurnerAddress(profile.burner_address || null);
                setEncryptedBurnerKey(profile.encrypted_burner_key || null);
            }
        } catch (error) {
            console.error("Failed to fetch user profile for burner wallet details", error);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, [address]);

    // Auto-unlock: When the encrypted key is available, automatically decode and set it
    useEffect(() => {
        if (encryptedBurnerKey && !decryptedBurnerKey) {
            try {
                const decoded = atob(encryptedBurnerKey);
                // Dynamically import to avoid top-level WASM issues
                import('@provablehq/sdk').then(({ PrivateKey }) => {
                    try {
                        PrivateKey.from_string(decoded); // Validate
                        setDecryptedBurnerKey(decoded);
                        console.log("🔓 Burner Wallet auto-unlocked successfully");
                    } catch (e) {
                        console.warn("🔒 Auto-unlock: stored key is invalid, manual unlock required");
                    }
                }).catch(e => {
                    console.warn("🔒 Auto-unlock: SDK import failed", e);
                });
            } catch (e) {
                console.warn("🔒 Auto-unlock: base64 decode failed", e);
            }
        }
    }, [encryptedBurnerKey, decryptedBurnerKey]);

    return (
        <BurnerWalletContext.Provider value={{
            burnerAddress,
            decryptedBurnerKey,
            setDecryptedBurnerKey,
            encryptedBurnerKey,
            refreshProfile
        }}>
            {children}
        </BurnerWalletContext.Provider>
    );
};

export const useBurnerWallet = () => {
    const context = useContext(BurnerWalletContext);
    if (!context) {
        throw new Error('useBurnerWallet must be used within a BurnerWalletProvider');
    }
    return context;
};
