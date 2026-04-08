import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import { AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import { useBurnerWallet } from '../../../../hooks/BurnerWalletProvider';
import { encryptWithPassword, decryptWithPassword, stringToFieldChunks } from '../../../../utils/crypto';
import { estimateExecutionFee, WALLET_PROGRAM_ID } from '../../../../utils/aleo-utils';
import { getUtf8ByteLength, LEO_PASSWORD_BACKUP_MAX_BYTES } from '../../../../utils/leo-input-limits';
import { executeWithShieldRetry } from '../../../../utils/shieldRetry';
import { getScannerSession, fetchAllPrivateBalances, findSpendableRecord } from './scanner';
import type { PrivateBalances, SweepCurrency } from './types';

export function useBurnerActions() {
    const { address, executeTransaction, transactionStatus } = useWallet();
    const {
        burnerAddress, encryptedBurnerKey, decryptedBurnerKey,
        setDecryptedBurnerKey, refreshProfile, fetchedFromChain,
        hasOnChainRecord, setHasOnChainRecord, appPassword,
        decryptedBurnerAddress, hasBurnerOnChainRecord
    } = useBurnerWallet();

    // ── UI state ──
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupSuccess, setBackupSuccess] = useState('');
    const [backupTxId, setBackupTxId] = useState<string | null>(null);
    const [isSweeping, setIsSweeping] = useState(false);
    const [isScanningBalances, setIsScanningBalances] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Modal visibility ──
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showSweepModal, setShowSweepModal] = useState(false);

    // ── Form values ──
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [sweepAmount, setSweepAmount] = useState('');
    const [sweepCurrency, setSweepCurrency] = useState<SweepCurrency>('ALEO');
    const [sweepDestination, setSweepDestination] = useState(address || '');

    // ── Sweep result ──
    const [sweepSuccess, setSweepSuccess] = useState('');
    const [sweepTxId, setSweepTxId] = useState<string | null>(null);
    const [sweepLogs, setSweepLogs] = useState<string[]>([]);

    // ── Private balances ──
    const [privateBalances, setPrivateBalances] = useState<PrivateBalances>({ ALEO: -1, USDCx: -1, USAD: -1 });

    const logsEndRef = useRef<HTMLDivElement>(null);

    // ── Helpers ──
    const addLog = useCallback((msg: string) => {
        setSweepLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
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
        // Kick off balance scan immediately
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

    // ── Handlers ──
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
            // Re-encrypt the main address (it's needed if this is a fresh profile)
            const encryptedMainAddress = await encryptWithPassword(address, appPassword);
            const { updateUserProfile } = await import('../../../../services/api');
            // Params: address, encrypted_main_address, burner_address, encrypted_burner_key
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
                // Password-only backup
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
                console.log(`⏳ Backup transaction submitted: ${txId}. Polling for confirmation...`);
                let isPending = true;
                let attempts = 0;
                const MAX_ATTEMPTS = 120;

                while (isPending && attempts < MAX_ATTEMPTS) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));

                    try {
                        const statusResponse = await transactionStatus(txId);
                        const currentStatus = typeof statusResponse === 'string'
                            ? (statusResponse as string).toLowerCase()
                            : (statusResponse as any)?.status?.toLowerCase();

                        console.log(`🔍 [Backup Polling] Status: ${currentStatus}`);

                        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                            isPending = false;

                            if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                                const { default: toast } = await import('react-hot-toast');
                                toast.success(`✅ Backup confirmed on-chain! TxID: ${txId.substring(0, 12)}...`);
                            } else {
                                throw new Error(`Backup transaction failed with status: ${currentStatus}`);
                            }
                        }
                    } catch (e: any) {
                        if (e.message?.includes('failed with status')) throw e;
                        console.warn('Polling error:', e);
                    }
                }

                if (isPending) {
                    const { default: toast } = await import('react-hot-toast');
                    toast.success(`Backup submitted (TxID: ${txId.substring(0, 12)}...). Confirmation may take a moment.`);
                }
            }

            setHasOnChainRecord(true);
            if (isBurnerBackup) {
                try {
                    if (address) {
                        const { clearBurnerData } = await import('../../../../services/api');
                        await clearBurnerData(address);
                        console.log('🗑️ Burner data cleared from DB after on-chain backup.');
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
            setError('Please enter a valid positive amount.'); return;
        }
        if (!sweepDestination) { setError('Please enter a destination address.'); return; }

        try {
            setIsSweeping(true);
            setError(null);
            setSweepSuccess('');
            setSweepTxId(null);
            setSweepLogs([]);

            addLog('Initializing burner wallet account...');
            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            addLog('Authenticating with Record Scanner...');
            const session = await getScannerSession(decryptedBurnerKey);
            addLog(`✓ Scanner registered. UUID: ${session.scannerUuid.substring(0, 20)}...`);

            const recordProvider = new NetworkRecordProvider(session.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(session.account);

            const microcreditsRequired = Number(sweepAmount) * 1_000_000;
            let programName: string;
            let functionName = 'transfer_private';
            let amountFormatted: string;
            let inputs: string[];

            if (sweepCurrency === 'ALEO') {
                programName = 'credits.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u64';
                addLog(`Scanning for private ALEO record (need ≥${sweepAmount} ALEO)...`);
                const recordPt = await findSpendableRecord(session, programName, 'credits', microcreditsRequired, true);
                if (!recordPt) throw new Error(`No private ALEO record ≥ ${sweepAmount} found.`);
                addLog('✓ Found private ALEO record!');
                inputs = [recordPt, sweepDestination, amountFormatted];
            } else {
                programName = sweepCurrency === 'USDCx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u128';

                addLog(`Generating Freeze List proofs for ${sweepCurrency}...`);
                let proofsInput = '';
                try {
                    const { generateFreezeListProof, getFreezeListIndex } = await import('../../../../utils/aleo-utils');
                    const { Address } = await import('@provablehq/wasm');
                    const firstIndex = await getFreezeListIndex(0);
                    let index0FieldStr: string | undefined;
                    if (firstIndex) {
                        try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                    }
                    const proof = await generateFreezeListProof(1, index0FieldStr);
                    proofsInput = `[${proof}, ${proof}]`;
                    addLog('✓ Freeze List proofs ready.');
                } catch {
                    throw new Error('Compliance subsystem unreachable — cannot generate transfer proofs.');
                }

                addLog(`Scanning for private ${sweepCurrency} Token record...`);
                const recordPt = await findSpendableRecord(session, programName, 'Token', microcreditsRequired, false);
                if (!recordPt) throw new Error(`No private ${sweepCurrency} Token record ≥ ${sweepAmount} found.`);
                addLog(`✓ Found private ${sweepCurrency} Token record!`);
                inputs = [sweepDestination, amountFormatted, recordPt, proofsInput];
            }

            addLog(`Building ZK authorization for ${programName}/${functionName}...`);
            const authorization = await programManager.buildAuthorization({ programName, functionName, inputs });
            addLog('✓ Authorization built! Requesting fee sponsorship from backend...');

            const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${apiUrl}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Backend sponsorship failed.');

            const txId = response.transaction?.id || response.transactionId || '';
            addLog(`✓ Sweep submitted! TxID: ${txId}`);
            setSweepTxId(txId);
            setSweepSuccess('Sweep broadcasted successfully!');
            setSweepAmount('');
        } catch (err: any) {
            console.error('DPS Sweep Failed:', err);
            addLog(`✗ Error: ${err.message}`);
            setError(err.message || 'Sweeping funds failed during DPS Request.');
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
        // wallet context
        address, burnerAddress, decryptedBurnerKey, fetchedFromChain, hasOnChainRecord,
        decryptedBurnerAddress, hasBurnerOnChainRecord,
        // loading states
        isGenerating, isDecrypting, isBackingUp, isSweeping, copied,
        // error/success
        error, setError,
        // modal visibility
        showGenerateModal, setShowGenerateModal,
        showUnlockModal, setShowUnlockModal,
        showBackupModal, setShowBackupModal,
        showSweepModal, setShowSweepModal,
        // backup state
        backupSuccess, setBackupSuccess, backupTxId, setBackupTxId,
        // form values
        password, setPassword, showPassword, setShowPassword,
        sweepAmount, setSweepAmount,
        sweepCurrency, setSweepCurrency,
        sweepDestination, setSweepDestination,
        // sweep result
        sweepSuccess, setSweepSuccess, sweepTxId, setSweepTxId,
        sweepLogs, setSweepLogs, logsEndRef,
        // balances
        privateBalances, setPrivateBalances, isScanningBalances,
        // handlers
        handleGenerateBurner, handleUnlockBurner, handleBackupRecord,
        handleSweepFunds, handleCopyKey, fetchPrivateBalances, openSweepModal,
        addLog,
    };
}
