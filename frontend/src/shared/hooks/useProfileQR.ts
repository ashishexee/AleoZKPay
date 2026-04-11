import { useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { estimateExecutionFee, generateSalt, getInvoiceHashFromMapping, PROGRAM_ID } from '../utils/aleo-utils';
import { executeWithShieldRetry } from '../utils/shieldRetry';
import { useBurnerWallet } from './BurnerWalletProvider';
import { useLeaveGuard } from './LeaveGuardProvider';
import { updateUserProfile, getUserProfile, createInvoice, fetchInvoiceByHash } from '../services/api';
import { encryptWithPassword, hashAddress } from '../utils/crypto';

export const useProfileQR = () => {
    const { address, executeTransaction, transactionStatus } = useWallet();
    const { burnerAddress, appPassword, userProfileMainAddress } = useBurnerWallet();
    const { setGuard, clearGuard } = useLeaveGuard();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [mainHash, setMainHash] = useState<string | null>(null);
    const [mainSalt, setMainSalt] = useState<string | null>(null);
    const [burnerHash, setBurnerHash] = useState<string | null>(null);
    const [burnerSalt, setBurnerSalt] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (address) {
            checkExistingProfile(address);
        }
    }, [address]);

    const checkExistingProfile = async (walletAddress: string) => {
        try {
            const profile = await getUserProfile(walletAddress);
            if (profile) {
                if (profile.profile_main_invoice_hash) {
                    setMainHash(profile.profile_main_invoice_hash);
                    setInitialized(true);
                    fetchInvoiceByHash(profile.profile_main_invoice_hash)
                        .then(inv => { if (inv?.salt) setMainSalt(inv.salt); })
                        .catch(console.warn);
                }
                if (profile.profile_burner_invoice_hash) {
                    setBurnerHash(profile.profile_burner_invoice_hash);
                    fetchInvoiceByHash(profile.profile_burner_invoice_hash)
                        .then(inv => { if (inv?.salt) setBurnerSalt(inv.salt); })
                        .catch(console.warn);
                }
            }
        } catch (e) {
            console.error("Failed to check profile", e);
        }
    };

    const generateSingleInvoice = async (isBurner: boolean): Promise<{ hash: string, salt: string }> => {
        if (!address || !executeTransaction) throw new Error("Wallet not connected");
        if (!appPassword) throw new Error("Please enter your password to unlock the application.");

        const salt = generateSalt();
        const merchantAddress = isBurner && burnerAddress ? burnerAddress : address;
        
        const typeInput = '2u8';
        const amountInput = '0u128';
        const functionName = 'create_invoice_any';
        
        const inputs = [
            merchantAddress,
            amountInput,
            salt,
            '0field',
            '0field',
            '0u32',
            typeInput,
            isBurner ? '1u8' : '0u8'
        ];

        const estimatedFee = await estimateExecutionFee({
            programName: PROGRAM_ID,
            functionName,
            inputs,
            fallbackMicrocredits: 100_000
        });

        const transaction: TransactionOptions = {
            program: PROGRAM_ID,
            function: functionName,
            inputs,
            fee: estimatedFee,
            privateFee: false
        };

        const result = await executeWithShieldRetry(
            () => executeTransaction(transaction),
            { onRetry: () => setStatus('Shield Wallet gave no response. Retrying profile QR invoice request...') }
        );

        let finalTxId: string = result?.transactionId || '';
        if (!finalTxId) throw new Error("Failed to get transaction ID");

        setStatus(`Waiting for ${isBurner ? 'Burner' : 'Main'} invoice confirmation...`);
        setGuard({
            active: true,
            title: 'Profile QR Is Syncing',
            message: `NullPay is waiting for your ${isBurner ? 'burner' : 'main'} profile invoice to confirm and sync. Leaving now can interrupt setup.`,
            confirmLabel: 'Leave Anyway',
            cancelLabel: 'Stay'
        });

        // PHASE 1: Poll transactionStatus for up to 4 minutes (2s interval × 120 attempts)
        let isPending = true;
        let attempts = 0;
        let hash: string | null = null;

        while (isPending && attempts < 120) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
            try {
                const statusRes: any = await transactionStatus(finalTxId);
                const currentStatus = typeof statusRes === 'string'
                    ? statusRes.toLowerCase()
                    : statusRes?.status?.toLowerCase();

                if (statusRes?.transactionId) finalTxId = statusRes.transactionId;

                // Try to extract hash from the status response itself
                if (statusRes?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                    hash = statusRes.execution.transitions[0].outputs[0].value;
                }

                if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                    isPending = false;
                    break;
                } else if (
                    currentStatus &&
                    currentStatus !== 'pending' &&
                    currentStatus !== 'processing' &&
                    currentStatus !== 'submitted'
                ) {
                    // Some unknown/terminal status — stop polling, try recovery below
                    console.warn('[ProfileQR] Unexpected tx status, attempting recovery:', currentStatus);
                    isPending = false;
                    break;
                }
            } catch (e: any) {
                // Network/polling error — log and keep trying. Don't abort.
                console.warn(`[ProfileQR] Status poll attempt ${attempts} failed:`, e?.message);
            }
        }

        // PHASE 2: Recover hash via all available methods regardless of how polling ended
        if (!hash) {
            try {
                hash = await getInvoiceHashFromMapping(salt);
                console.log('[ProfileQR] Hash recovered from on-chain mapping:', hash);
            } catch (e) {
                console.warn('[ProfileQR] Mapping lookup failed:', e);
            }
        }

        if (!hash) {
            try {
                const cleanTxId = finalTxId.replace(/['"\s]+/g, '').trim();
                const endpoints = [
                    `https://api.explorer.aleo.org/v1/testnet/transaction/${cleanTxId}`,
                    `https://api.explorer.aleo.org/v1/testnet3/transaction/${cleanTxId}`,
                ];
                for (const url of endpoints) {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) continue;
                        const data = await res.json();
                        const val = data?.execution?.transitions?.[0]?.outputs?.[0]?.value;
                        if (val) {
                            hash = val;
                            console.log('[ProfileQR] Hash recovered from explorer API:', hash);
                            break;
                        }
                    } catch (e) { /* try next endpoint */ }
                }
            } catch (e) {
                console.warn('[ProfileQR] Explorer fetch failed:', e);
            }
        }

        if (!hash) {
            throw new Error("Could not retrieve Invoice Hash. Transaction may still be processing. Please try again in a moment.");
        }

        // PHASE 3: Save to backend
        const encryptedMerchant = await encryptWithPassword(address, appPassword);
        const merchantHash = await hashAddress(address);
        const encryptedDesignated = await encryptWithPassword(merchantAddress, appPassword);

        await createInvoice({
            invoice_hash: hash,
            merchant_address: encryptedMerchant,
            merchant_address_hash: merchantHash,
            designated_address: encryptedDesignated,
            status: 'PENDING',
            invoice_transaction_id: finalTxId,
            salt,
            invoice_type: 2,
            token_type: 3,
            is_burner: isBurner,
        });

        clearGuard();
        return { hash, salt };
    };

    const initializeQRs = async () => {
        if (!address) {
            setStatus("Please connect wallet first");
            return;
        }
        setLoading(true);
        setStatus("Initializing Profile QR...");
        
        try {
            let newMainHash = mainHash;
            if (!newMainHash) {
                setStatus("Please approve the Main Wallet invoice creation...");
                const res = await generateSingleInvoice(false);
                newMainHash = res.hash;
                setMainHash(res.hash);
                setMainSalt(res.salt);
            }
            
            let newBurnerHash = burnerHash;
            if (!newBurnerHash && burnerAddress) {
                setStatus("Please approve the Burner Wallet invoice creation...");
                const res = await generateSingleInvoice(true);
                newBurnerHash = res.hash;
                setBurnerHash(res.hash);
                setBurnerSalt(res.salt);
            }
            
            setStatus("Saving your Profile QR details...");
            
            if (!mainHash || (!burnerHash && burnerAddress)) {
                if (!appPassword) throw new Error("Password missing for profile update");
                const currentEncryptedMain = userProfileMainAddress || await encryptWithPassword(address, appPassword);
                await updateUserProfile(
                    address, 
                    currentEncryptedMain, 
                    undefined, 
                    undefined, 
                    newMainHash || undefined, 
                    newBurnerHash || undefined
                );
            }
            
            setInitialized(true);
            setStatus("Profile QR successfully active!");
        } catch (e: any) {
            console.error("Initialization failed", e);
            setStatus(`Error: ${e.message}`);
        } finally {
            clearGuard();
            setLoading(false);
        }
    };

    return {
        initialized,
        loading,
        status,
        mainHash,
        mainSalt,
        burnerHash,
        burnerSalt,
        initializeQRs
    };
};
