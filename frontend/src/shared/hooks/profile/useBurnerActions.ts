import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import { useBurnerWallet } from '../wallet/BurnerWalletProvider';
import { encryptWithPassword, decryptWithPassword, stringToFieldChunks } from '../../utils/core/crypto';
import { estimateExecutionFee, WALLET_PROGRAM_ID } from '../../utils/aleo/aleoUtils';
import { getUtf8ByteLength, LEO_PASSWORD_BACKUP_MAX_BYTES } from '../../utils/core/leoInputLimits';
import { executeWithShieldRetry } from '../../utils/payments/shieldRetry';
import { fetchAllPrivateBalances } from '../../pages/Profile/components/BurnerWallet/scanner';
import type { PrivateBalances, SweepCurrency } from '../../types/burner';
import { sweepBurnerFundsToDestination } from '../../utils/burner/burnerSweep';

export function useBurnerActions() {
    const { address, executeTransaction, transactionStatus } = useWallet();
    const {
        burnerAddress, encryptedBurnerKey, decryptedBurnerKey,
        setDecryptedBurnerKey, refreshProfile, fetchedFromChain,
        hasOnChainRecord, setHasOnChainRecord, appPassword,
        decryptedBurnerAddress, hasBurnerOnChainRecord
    } = useBurnerWallet();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupSuccess, setBackupSuccess] = useState('');
    const [backupTxId, setBackupTxId] = useState<string | null>(null);
    const [isSweeping, setIsSweeping] = useState(false);
    const [isScanningBalances, setIsScanningBalances] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showSweepModal, setShowSweepModal] = useState(false);

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [sweepAmount, setSweepAmount] = useState('');
    const [sweepCurrency, setSweepCurrency] = useState<SweepCurrency>('ALEO');
    const [sweepDestination, setSweepDestination] = useState(address || '');

    const [sweepSuccess, setSweepSuccess] = useState('');
    const [sweepTxId, setSweepTxId] = useState<string | null>(null);
    const [sweepLogs, setSweepLogs] = useState<string[]>([]);

    const [privateBalances, setPrivateBalances] = useState<PrivateBalances>({ ALEO: -1, USDCx: -1, USAD: -1 });

    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback((msg: string) => {
        setSweepLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, []);

    const openSweepModal = useCallback(() => {
        setError(null);
        setSweepLogs([]);
        setSweepTxId(null);
        setSweepSuccess('');
        setPrivateBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
        setSweepDestination(address || '');
        setShowSweepModal(true);
        if (decryptedBurnerKey) {
            setIsScanningBalances(true);
            fetchAllPrivateBalances(decryptedBurnerKey)
                .then(setPrivateBalances)
                .catch(() => setPrivateBalances({ ALEO: 0, USDCx: 0, USAD: 0 }))
                .finally(() => setIsScanningBalances(false));
        }
    }, [address, decryptedBurnerKey]);

    const fetchPrivateBalances = useCallback(async () => {
        if (!decryptedBurnerKey) return;
        setIsScanningBalances(true);
        setPrivateBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
        try {
            const balances = await fetchAllPrivateBalances(decryptedBurnerKey);
            setPrivateBalances(balances);
        } catch (e) {
            console.error('Failed to fetch private balances:', e);
            setPrivateBalances({ ALEO: 0, USDCx: 0, USAD: 0 });
        } finally {
            setIsScanningBalances(false);
        }
    }, [decryptedBurnerKey]);

    const handleGenerateBurner = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!address) { setError('Wallet not connected.'); return; }
        if (!appPassword) { setError('App is locked.'); return; }
        try {
            setIsGenerating(true);
            setError(null);
            const newPrivateKey = new PrivateKey();
            const newAddress = newPrivateKey.to_address().to_string();
            const rawPrivateKeyStr = newPrivateKey.to_string();
            const encryptedKeyPayload = await encryptWithPassword(rawPrivateKeyStr, appPassword);
            const encryptedBurnerAddress = await encryptWithPassword(newAddress, appPassword);
            const encryptedMainAddress = await encryptWithPassword(address, appPassword);
            const { updateUserProfile } = await import('../../services/api');
            await updateUserProfile(address, encryptedMainAddress, encryptedBurnerAddress, encryptedKeyPayload);
            setDecryptedBurnerKey(rawPrivateKeyStr);
            await refreshProfile();
            setShowGenerateModal(false);
            setPassword('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate Burner Wallet.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnlockBurner = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!encryptedBurnerKey) return;
        if (!appPassword) { setError('App is locked.'); return; }
        try {
            setIsDecrypting(true);
            setError(null);
            const decryptedKey = await decryptWithPassword(encryptedBurnerKey, appPassword);
            try { PrivateKey.from_string(decryptedKey); } catch {
                throw new Error('Invalid decryption result. Please check your password.');
            }
            setDecryptedBurnerKey(decryptedKey);
            setShowUnlockModal(false);
            setPassword('');
        } catch (err: any) {
            console.error('Unlock failed', err);
            setError('Incorrect password or corrupted data.');
        } finally {
            setIsDecrypting(false);
        }
    };

    const handleBackupRecord = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!executeTransaction || !appPassword || !transactionStatus) {
            setError('Wallet must be connected and unlocked.');
            return;
        }
        if (getUtf8ByteLength(appPassword) > LEO_PASSWORD_BACKUP_MAX_BYTES) {
            setError(`Your password is too large for the single Leo backup field. Keep it within ${LEO_PASSWORD_BACKUP_MAX_BYTES} bytes.`);
            return;
        }
        try {
            setIsBackingUp(true);
            setError(null);
            const passField = stringToFieldChunks(appPassword, 1, 15)[0];

            let inputs;
            let functionName;
            let isBurnerBackup = false;

            if (!burnerAddress || !encryptedBurnerKey) {
                inputs = [passField];
                functionName = 'backup_password';
            } else {
                isBurnerBackup = true;
                let plaintextBurnerAddr = decryptedBurnerAddress;
                if (!plaintextBurnerAddr) {
                    plaintextBurnerAddr = await decryptWithPassword(burnerAddress, appPassword);
                }
                const payloadFields = stringToFieldChunks(encryptedBurnerKey, 10, 15);
                inputs = [plaintextBurnerAddr, passField, ...payloadFields];
                functionName = 'backup_burner_wallet';
            }

            const estimatedBackupFee = await estimateExecutionFee({
                programName: WALLET_PROGRAM_ID,
                functionName,
                inputs,
                fallbackMicrocredits: 500_000
            });

            const result = await executeWithShieldRetry(
                () => executeTransaction({
                    program: WALLET_PROGRAM_ID,
                    function: functionName,
                    inputs,
                    fee: estimatedBackupFee,
                    privateFee: false
                }),
                { onRetry: () => setError('Shield Wallet gave no response. Retrying backup request...') }
            );

            let txId = '';
            if (result && (result as any).transactionId) {
                txId = (result as any).transactionId;
            }

            if (txId) {
                let isPending = true;
                let attempts = 0;
                const maxAttempts = 120;

                while (isPending && attempts < maxAttempts) {
                    attempts += 1;
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    try {
                        const statusResponse: any = await transactionStatus(txId);
                        const currentStatus = typeof statusResponse === 'string'
                            ? statusResponse.toLowerCase()
                            : String(statusResponse?.status || '').toLowerCase();

                        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                            isPending = false;

                            if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                                const { default: toast } = await import('react-hot-toast');
                                toast.success(`Backup confirmed on-chain. TxID: ${txId.substring(0, 12)}...`);
                            } else {
                                throw new Error(`Backup transaction failed with status: ${currentStatus}`);
                            }
                        }
                    } catch (pollError: any) {
                        if (pollError.message?.includes('failed with status')) throw pollError;
                    }
                }
            }

            setHasOnChainRecord(true);
            if (isBurnerBackup) {
                try {
                    if (address) {
                        const { clearBurnerData } = await import('../../services/api');
                        await clearBurnerData(address);
                    }
                } catch (clearErr) {
                    console.warn('Failed to clear burner data from DB:', clearErr);
                }
            }

            setShowBackupModal(false);
            setPassword('');
        } catch (err: any) {
            console.error('Backup failed', err);
            setError(err.message || 'Failed to trigger backup transaction.');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleSweepFunds = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decryptedBurnerKey) { setError('Wallet must be unlocked to sweep funds.'); return; }

        const currentBal = privateBalances[sweepCurrency];
        if (currentBal >= 0 && Number(sweepAmount) > currentBal) {
            setError(`Insufficient private ${sweepCurrency} balance (Available: ${currentBal.toFixed(4)}).`);
            return;
        }

        if (!sweepAmount || isNaN(Number(sweepAmount)) || Number(sweepAmount) <= 0) {
            setError('Please enter a valid positive amount.');
            return;
        }
        if (!sweepDestination) {
            setError('Please enter a destination address.');
            return;
        }

        try {
            setIsSweeping(true);
            setError(null);
            setSweepSuccess('');
            setSweepTxId(null);
            setSweepLogs([]);

            const sweepResult = await sweepBurnerFundsToDestination({
                decryptedBurnerKey,
                amount: Number(sweepAmount),
                currency: sweepCurrency,
                destination: sweepDestination,
                onLog: addLog
            });

            setSweepTxId(sweepResult.txIds[0] || null);
            setSweepSuccess(
                sweepResult.txIds.length > 1
                    ? `Sweep broadcasted successfully across ${sweepResult.txIds.length} transactions!`
                    : 'Sweep broadcasted successfully!'
            );
            setSweepAmount('');
        } catch (err: any) {
            console.error('DPS Sweep Failed:', err);
            addLog(`Error: ${err.message}`);
            setError(err.message || 'Sweeping funds failed during DPS request.');
        } finally {
            setIsSweeping(false);
        }
    };

    const handleCopyKey = () => {
        if (!decryptedBurnerKey) return;
        navigator.clipboard.writeText(decryptedBurnerKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return {
        address, burnerAddress, decryptedBurnerKey, fetchedFromChain, hasOnChainRecord,
        decryptedBurnerAddress, hasBurnerOnChainRecord,
        isGenerating, isDecrypting, isBackingUp, isSweeping, copied,
        error, setError,
        showGenerateModal, setShowGenerateModal,
        showUnlockModal, setShowUnlockModal,
        showBackupModal, setShowBackupModal,
        showSweepModal, setShowSweepModal,
        backupSuccess, setBackupSuccess, backupTxId, setBackupTxId,
        password, setPassword, showPassword, setShowPassword,
        sweepAmount, setSweepAmount,
        sweepCurrency, setSweepCurrency,
        sweepDestination, setSweepDestination,
        sweepSuccess, setSweepSuccess, sweepTxId, setSweepTxId,
        sweepLogs, setSweepLogs, logsEndRef,
        privateBalances, setPrivateBalances, isScanningBalances,
        handleGenerateBurner, handleUnlockBurner, handleBackupRecord,
        handleSweepFunds, handleCopyKey, fetchPrivateBalances, openSweepModal,
        addLog,
    };
}
