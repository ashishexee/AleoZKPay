import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { getUserProfile } from '../services/api';
import { PROGRAM_ID, parseBurnerBackupRecord } from '../utils/aleo-utils';
import { fieldChunksToString, decryptWithPassword } from '../utils/crypto';

interface BurnerWalletContextType {
    burnerAddress: string | null;
    decryptedBurnerKey: string | null;
    setDecryptedBurnerKey: (key: string | null) => void;
    encryptedBurnerKey: string | null;
    refreshProfile: () => Promise<void>;
    fetchedFromChain: boolean;
    hasOnChainRecord: boolean;
    setHasOnChainRecord: (v: boolean) => void;
    appPassword: string | null;
    setAppPassword: (p: string | null) => void;
    isUnlocked: boolean;
    setIsUnlocked: (v: boolean) => void;
    hasProfile: boolean | null;
    userProfileMainAddress: string | null;
    isAutoUnlocking: boolean;
    decryptedBurnerAddress: string | null;
    hasBurnerOnChainRecord: boolean;
}

const BurnerWalletContext = createContext<BurnerWalletContextType | undefined>(undefined);

export const BurnerWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address, requestRecords, decrypt } = useWallet();
    const [burnerAddress, setBurnerAddress] = useState<string | null>(null);
    const [encryptedBurnerKey, setEncryptedBurnerKey] = useState<string | null>(null);
    const [decryptedBurnerKey, setDecryptedBurnerKey] = useState<string | null>(null);
    const [fetchedFromChain, setFetchedFromChain] = useState<boolean>(false);
    const [hasOnChainRecord, setHasOnChainRecord] = useState<boolean>(false);
    const [appPassword, setAppPassword] = useState<string | null>(null);
    const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    const [userProfileMainAddress, setUserProfileMainAddress] = useState<string | null>(null);
    const [isAutoUnlocking, setIsAutoUnlocking] = useState<boolean>(true); // Start as true to show loading
    const [decryptedBurnerAddress, setDecryptedBurnerAddress] = useState<string | null>(null);
    const [hasBurnerOnChainRecord, setHasBurnerOnChainRecord] = useState<boolean>(false);

    const refreshProfile = async () => {
        if (!address) {
            setBurnerAddress(null);
            setEncryptedBurnerKey(null);
            setDecryptedBurnerKey(null);
            setFetchedFromChain(false);
            setHasOnChainRecord(false);
            setAppPassword(null);
            setIsUnlocked(false);
            setHasProfile(null);
            setUserProfileMainAddress(null);
            return;
        }

        try {
            const profile = await getUserProfile(address);
            if (profile) {
                setHasProfile(true);
                setUserProfileMainAddress(profile.main_address || null);
                setBurnerAddress(profile.burner_address || null);
                setEncryptedBurnerKey(profile.encrypted_burner_key || null);
            } else {
                // If profile is null (e.g. 404 Not Found), they are a new user
                setHasProfile(false);
            }
        } catch (error: any) {
            console.error("Failed to fetch user profile for burner wallet details", error);
            // Don't get stuck loading forever on a network failure
            setHasProfile(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, [address]);

    // Silent background check and auto-unlock to see if a record already exists
    useEffect(() => {
        const fetchAndUnlockFromChain = async () => {
            if (isUnlocked || !address || !requestRecords) {
                setIsAutoUnlocking(false);
                return;
            }

            setIsAutoUnlocking(true);
            try {
                console.log('🔍 Fetching on-chain records for', PROGRAM_ID);
                const records = await requestRecords(PROGRAM_ID, true);
                console.log('📦 Records found:', records ? (records as any[]).length : 0);
                if (!records || (records as any[]).length === 0) {
                    setIsAutoUnlocking(false);
                    return;
                }

                // Phase 1: Parse all records and collect matching ones
                let passwordOnlyMatch: any = null;
                let fullBurnerMatch: any = null;

                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { continue; }
                    }

                    const burnerRecord = parseBurnerBackupRecord({ ...r, plaintext });
                    if (!burnerRecord || !burnerRecord.passwordPart) continue;

                    const isMatch = burnerRecord.burnerAddress === burnerAddress || burnerRecord.burnerAddress === address || !burnerAddress;
                    if (!isMatch) continue;

                    const payload = fieldChunksToString(burnerRecord.pkParts);
                    const hasRealPayload = payload && payload.length > 0 && !payload.startsWith('0');

                    console.log('🔎 Record:', {
                        burnerAddr: burnerRecord.burnerAddress?.substring(0, 15),
                        hasRealPayload,
                        payloadLen: payload.length
                    });

                    if (hasRealPayload) {
                        fullBurnerMatch = burnerRecord; // prefer this
                    } else if (!passwordOnlyMatch) {
                        passwordOnlyMatch = burnerRecord;
                    }
                }

                // Phase 2: Process the best match (prefer full burner over password-only)
                const bestMatch = fullBurnerMatch || passwordOnlyMatch;
                if (bestMatch) {
                    setHasOnChainRecord(true);
                    const passwordStr = fieldChunksToString([bestMatch.passwordPart]);
                    setAppPassword(passwordStr);
                    setIsUnlocked(true);
                    console.log("🔓 Auto-unlocked with on-chain record! Type:", fullBurnerMatch ? 'FULL BURNER' : 'PASSWORD-ONLY');

                    if (fullBurnerMatch) {
                        try {
                            const encryptedPayload = fieldChunksToString(fullBurnerMatch.pkParts);
                            setHasBurnerOnChainRecord(true);
                            console.log('🔐 Decrypting burner key from on-chain payload... (length:', encryptedPayload.length, ')');
                            const decryptedKey = await decryptWithPassword(encryptedPayload, passwordStr);
                            console.log('✅ Decryption succeeded!');
                            const { PrivateKey } = await import('@provablehq/sdk');
                            PrivateKey.from_string(decryptedKey);
                            setDecryptedBurnerKey(decryptedKey);
                            setFetchedFromChain(true);
                            setBurnerAddress(fullBurnerMatch.burnerAddress);
                            setDecryptedBurnerAddress(fullBurnerMatch.burnerAddress);
                            console.log("🔓 Burner Wallet restored! Address:", fullBurnerMatch.burnerAddress?.substring(0, 15));
                        } catch (e) {
                            console.warn("⚠️ Burner key decryption/validation failed:", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Auto-unlock from chain failed", e);
            }
            setIsAutoUnlocking(false);
        };

        if (hasProfile !== null && !hasOnChainRecord) {
            fetchAndUnlockFromChain();
        } else {
            setIsAutoUnlocking(false);
        }
    }, [address, isUnlocked, hasProfile, burnerAddress, encryptedBurnerKey, requestRecords, decrypt, hasOnChainRecord]);

    // Decrypt burner address for display when password is available
    useEffect(() => {
        const decryptAddress = async () => {
            if (appPassword && burnerAddress && !decryptedBurnerAddress) {
                try {
                    const addr = await decryptWithPassword(burnerAddress, appPassword);
                    setDecryptedBurnerAddress(addr);
                } catch (e) {
                    console.warn('Could not decrypt burner address for display', e);
                }
            }
        };
        decryptAddress();
    }, [appPassword, burnerAddress, decryptedBurnerAddress]);

    return (
        <BurnerWalletContext.Provider value={{
            burnerAddress,
            decryptedBurnerKey,
            setDecryptedBurnerKey,
            encryptedBurnerKey,
            refreshProfile,
            fetchedFromChain,
            hasOnChainRecord,
            setHasOnChainRecord,
            appPassword,
            setAppPassword,
            isUnlocked,
            setIsUnlocked,
            hasProfile,
            userProfileMainAddress,
            isAutoUnlocking,
            decryptedBurnerAddress,
            hasBurnerOnChainRecord
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
