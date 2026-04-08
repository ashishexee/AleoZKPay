import { useMemo, useState, useEffect, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check,
    ChevronDown, 
    Coins, 
    Hash, 
    Info, 
    MessageSquare, 
    ShieldCheck, 
    Terminal, 
    Trash2,
    User, 
    Zap 
} from 'lucide-react';
import { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } from '@provablehq/sdk';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordPrompt } from '../../components/PasswordPrompt';
import { fetchInvoiceByHash, updateInvoiceStatus } from '../../services/api';
import { estimateExecutionFee, fetchBurnerRecordsFromTx, generateSalt, getFreezeListIndex, getFreezeListRoot, getInvoiceData, getInvoiceHashFromMapping, PROGRAM_ID } from '../../utils/aleo-utils';
import { ANY_ALLOWED_TOKENS, getAllowedTokensForInvoice, getTokenCodeFromType, getTokenLabel, getTokenTypeFromCode, TOKEN_LABELS } from '../../utils/tokens';
import { parsePaymentLink } from '../../utils/paymentLinks';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { findSpendableRecord, getScannerSession, scanProgramBalance } from '../Profile/components/BurnerWallet/scanner';
import { executeWithShieldRetry } from '../../utils/shieldRetry';

interface BatchInvoiceRow {
    id: string;
    merchant: string;
    hash: string;
    salt: string;
    amount: number;
    memo: string;
    tokenType: number;
    invoiceType: number;
    status: string;
    source: 'link' | 'qr';
    selectedTokenType: number | null;
    donationAmount: string;
    executionState: 'idle' | 'queued' | 'processing' | 'paid' | 'failed';
    executionMessage: string | null;
    txId: string | null;
}

interface FundingRequirement {
    tokenType: number;
    requiredMicros: number;
    burnerAvailableMicros: number;
    mainWalletAvailableMicros: number;
    topUpMicros: number;
    reason: 'needs_top_up' | 'insufficient_combined_balance';
    txId: string | null;
}

type BatchExecutionMode = 'burner' | 'contract';

const shorten = (value: string) => `${value.slice(0, 10)}...${value.slice(-6)}`;
const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
const PROVABLE_HOST = 'https://api.explorer.provable.com/v1';

const getProgramForToken = (tokenType: number) => {
    if (tokenType === 1) {
        return { program: 'test_usdcx_stablecoin.aleo', recordName: 'Token', typeSuffix: 'u128', isCredits: false };
    }
    if (tokenType === 2) {
        return { program: 'test_usad_stablecoin.aleo', recordName: 'Token', typeSuffix: 'u128', isCredits: false };
    }
    return { program: 'credits.aleo', recordName: 'credits', typeSuffix: 'u64', isCredits: true };
};

const getFunctionForRow = (row: BatchInvoiceRow, effectiveTokenType: number) => {
    if (effectiveTokenType === 1) return row.invoiceType === 2 ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
    if (effectiveTokenType === 2) return row.invoiceType === 2 ? 'pay_donation_usad' : 'pay_invoice_usad';
    return row.invoiceType === 2 ? 'pay_donation' : 'pay_invoice';
};

const getEffectiveAmount = (row: BatchInvoiceRow) => {
    if (row.invoiceType === 2) {
        const donation = Number(row.donationAmount);
        return Number.isFinite(donation) && donation > 0 ? donation : 0;
    }
    return row.amount;
};

const getEffectiveTokenType = (row: BatchInvoiceRow) => {
    if (row.tokenType === 3) return row.selectedTokenType;
    return row.tokenType;
};

const buildBatchCreditsInput = (row: BatchInvoiceRow) => {
    const amountMicros = Math.round(getEffectiveAmount(row) * 1_000_000);
    return `{ merchant: ${row.merchant}, amount: ${amountMicros}u64, salt: ${row.salt}, payment_secret: ${generateSalt()} }`;
};

const formatExecutionState = (row: BatchInvoiceRow) => {
    if (row.executionState === 'paid') return 'PAID';
    if (row.executionState === 'processing') return 'PROCESSING';
    if (row.executionState === 'failed') return 'FAILED';
    return row.status;
};

const extractErrorDetails = (error: unknown) => {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;

    const err = error as Record<string, any>;
    const candidates = [
        err.message,
        err.reason,
        err.details,
        err.data?.message,
        err.data?.reason,
        err.data?.details,
        err.error?.message,
        err.error?.reason,
        err.error?.details,
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (candidates.length > 0) {
        return candidates.join(' | ');
    }

    try {
        return JSON.stringify(error);
    } catch {
        return 'Unknown error';
    }
};

const isConfigComplete = (row: BatchInvoiceRow) => {
    if (row.status !== 'OPEN') return false;
    if (getEffectiveTokenType(row) === null) return false;
    return getEffectiveAmount(row) > 0;
};

async function buildStablecoinProofInput() {
    await getFreezeListRoot();
    const firstIndex = await getFreezeListIndex(0);
    const { generateFreezeListProof } = await import('../../utils/aleo-utils');
    const { Address } = await import('@provablehq/wasm');
    let index0FieldStr: string | undefined;
    if (firstIndex) {
        try {
            index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString();
        } catch (error) {
            console.warn('Failed to convert freeze list address to field', error);
        }
    }
    const proof = await generateFreezeListProof(1, index0FieldStr);
    return `[${proof}, ${proof}]`;
}

function selectNextBurnerRecord(records: any[], tokenType: number) {
    const candidate = records.find((record) => {
        const plaintext = record.plaintext || '';
        if (!plaintext || /invoice_hash/.test(plaintext)) return false;
        if (tokenType === 0) return /microcredits\s*:\s*\d+u64/.test(plaintext);
        return /amount\s*:\s*\d+u128/.test(plaintext);
    });

    return candidate?.plaintext?.trim() || null;
}

function extractRecordMicros(plaintext: string | null | undefined, tokenType: number) {
    if (!plaintext) return 0;
    if (tokenType === 0) {
        const match = plaintext.match(/microcredits\s*:\s*(\d+)u64/);
        return match ? Number(match[1]) : 0;
    }
    const match = plaintext.match(/amount\s*:\s*(\d+)u128/);
    return match ? Number(match[1]) : 0;
}

export const BatchPayPage = () => {
    const { address: publicKey, executeTransaction, transactionStatus, wallet, requestRecords, decrypt } = useWallet();
    const { burnerAddress, decryptedBurnerAddress, decryptedBurnerKey, hasProfile, isAutoUnlocking, isUnlocked } = useBurnerWallet();
    const [rawInput, setRawInput] = useState('');
    const [rows, setRows] = useState<BatchInvoiceRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [batchStatus, setBatchStatus] = useState<string>('');
    const [fundingRequirements, setFundingRequirements] = useState<FundingRequirement[]>([]);
    const [fundingLoadingToken, setFundingLoadingToken] = useState<number | null>(null);
    const [batchLogs, setBatchLogs] = useState<string[]>([]);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [executionMode, setExecutionMode] = useState<BatchExecutionMode>('burner');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openRows = useMemo(() => rows.filter((row) => row.status === 'OPEN'), [rows]);
    const unresolvedRows = useMemo(() => openRows.filter((row) => !isConfigComplete(row)), [openRows]);
    const readyRows = useMemo(() => openRows.filter((row) => isConfigComplete(row)), [openRows]);
    const paidRows = useMemo(() => readyRows.filter((row) => row.executionState === 'paid'), [readyRows]);
    const batchCompleted = readyRows.length > 0 && paidRows.length === readyRows.length;
    const burnerExecutionAddress = useMemo(() => {
        if (decryptedBurnerAddress?.startsWith('aleo1')) return decryptedBurnerAddress;
        if (burnerAddress?.startsWith('aleo1')) return burnerAddress;
        return null;
    }, [burnerAddress, decryptedBurnerAddress]);
    const burnerRequirementMessage = useMemo(() => {
        if (!publicKey) return 'Connect your main wallet first. Batch receipts mint back to your main wallet.';
        if (isAutoUnlocking) return 'Checking your encrypted profile and burner wallet state...';
        if (!hasProfile) return 'Create and unlock your NullPay profile first so the batch page can use your burner wallet.';
        if (!isUnlocked) return 'Unlock the app first. This batch page executes invoices from your burner wallet.';
        if (!burnerAddress) return 'Create a burner wallet first from the Dashboard. Batch payments execute from the burner.';
        if (!burnerExecutionAddress) return 'Restore your burner wallet address on this device first. The batch page needs the real burner address for top-ups.';
        if (!decryptedBurnerKey) return 'Restore your burner wallet key on this device first. The batch runner needs the decrypted burner key.';
        return null;
    }, [burnerAddress, burnerExecutionAddress, decryptedBurnerKey, hasProfile, isAutoUnlocking, isUnlocked, publicKey]);
    const activeRequirementMessage = executionMode === 'burner'
        ? burnerRequirementMessage
        : (!publicKey ? 'Connect your main wallet first. Batch receipts mint back to your main wallet.' : null);
    const showPasswordPrompt = Boolean(executionMode === 'burner' && publicKey && !isAutoUnlocking && !isUnlocked);

    const totals = useMemo(() => {
        return readyRows.reduce(
            (acc, row) => {
                const amount = getEffectiveAmount(row);
                const tokenType = getEffectiveTokenType(row);
                if (tokenType === 1) acc.usdcx += amount;
                else if (tokenType === 2) acc.usad += amount;
                else acc.credits += amount;
                return acc;
            },
            { credits: 0, usdcx: 0, usad: 0 }
        );
    }, [readyRows]);

    const contractBatchEligibility = useMemo(() => {
        const issues: string[] = [];
        if (readyRows.length !== 2) {
            issues.push('Contract batching currently supports exactly 2 ready invoices.');
        }

        const nonCreditsRows = readyRows.filter((row) => getEffectiveTokenType(row) !== 0);
        if (nonCreditsRows.length > 0) {
            issues.push('Contract batching currently supports Credits invoices only.');
        }

        const donationRows = readyRows.filter((row) => row.invoiceType === 2);
        if (donationRows.length > 0) {
            issues.push('Donation invoices still use the burner flow for now.');
        }

        return {
            supported: issues.length === 0,
            issues,
        };
    }, [readyRows]);

    const updateRow = (rowId: string, patch: Partial<BatchInvoiceRow>) => {
        setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
    };

    const updateFundingRequirement = (tokenType: number, patch: Partial<FundingRequirement>) => {
        setFundingRequirements((current) => current.map((item) => item.tokenType === tokenType ? { ...item, ...patch } : item));
    };

    const removeRow = (rowId: string) => {
        setRows((current) => current.filter((row) => row.id !== rowId));
        if (activeDropdownId === rowId) {
            setActiveDropdownId(null);
        }
    };

    const listMainWalletCreditRecords = async () => {
        if (!requestRecords) {
            throw new Error('Wallet record access is unavailable.');
        }

        const records = await requestRecords('credits.aleo', false);
        const entries: Array<{ plaintext: string; micros: number }> = [];

        for (const record of (records as any[])) {
            if (record.spent) continue;

            let plaintext = String(record.plaintext || '').trim();
            const cipher = record.recordCiphertext || record.ciphertext;
            if (!plaintext && cipher && decrypt) {
                try {
                    plaintext = String(await decrypt(cipher)).trim();
                } catch {
                    plaintext = '';
                }
            }

            if (!plaintext || !/microcredits\s*:\s*\d+u64/.test(plaintext)) continue;
            entries.push({ plaintext, micros: extractRecordMicros(plaintext, 0) });
        }

        return entries.sort((a, b) => b.micros - a.micros);
    };

    const assignCreditsRecords = (
        entries: Array<{ plaintext: string; micros: number }>,
        amountOne: number,
        amountTwo: number
    ) => {
        for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
            for (let secondIndex = 0; secondIndex < entries.length; secondIndex += 1) {
                if (firstIndex === secondIndex) continue;
                const first = entries[firstIndex];
                const second = entries[secondIndex];
                if (first.micros >= amountOne && second.micros >= amountTwo) {
                    return [first.plaintext, second.plaintext] as const;
                }
            }
        }
        return null;
    };

    const prepareContractMainWalletCreditsRecords = async (
        amountOne: number,
        amountTwo: number
    ) => {
        const spendableRecords = await listMainWalletCreditRecords();
        const existingPair = assignCreditsRecords(spendableRecords, amountOne, amountTwo);
        if (existingPair) {
            return { payRecordOne: existingPair[0], payRecordTwo: existingPair[1] };
        }

        const combinedRequired = amountOne + amountTwo + 10_000;
        const sourceRecord = spendableRecords.find((entry) => entry.micros >= combinedRequired);
        if (!sourceRecord) {
            throw new Error('Contract batch needs either two spendable Credits records or one larger Credits record that can be split from the main wallet.');
        }

        if (!executeTransaction) {
            throw new Error('Main-wallet execution is not available in this wallet adapter.');
        }

        const splitAmount = Math.min(amountOne, amountTwo);
        pushBatchLog('Splitting a main-wallet Credits record so the contract batch can pay both invoices.');
        setBatchStatus('Splitting main-wallet Credits record for contract batch...');
        const splitFee = await estimateExecutionFee({
            programName: 'credits.aleo',
            functionName: 'split',
            inputs: [sourceRecord.plaintext, `${splitAmount}u64`],
            fallbackMicrocredits: 100_000,
        });
        const splitResult = await executeWithShieldRetry<any>(
            () => executeTransaction({
                program: 'credits.aleo',
                function: 'split',
                inputs: [sourceRecord.plaintext, `${splitAmount}u64`],
                fee: splitFee,
                privateFee: false,
            }),
            { onRetry: () => setBatchStatus('Retrying main-wallet split request...') }
        );
        const splitTxId = splitResult?.transactionId || '';
        if (!splitTxId) {
            throw new Error('Main-wallet split did not return a transaction id.');
        }
        const finalizedSplitTxId = await pollTransaction(splitTxId);
        pushBatchLog(`Credits split confirmed: ${finalizedSplitTxId}`);

        let splitPair: readonly [string, string] | null = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1800 : 1200));
            const refreshedRecords = await listMainWalletCreditRecords();
            splitPair = assignCreditsRecords(refreshedRecords, amountOne, amountTwo);
            if (splitPair) break;
        }

        if (!splitPair) {
            throw new Error('Credits split completed, but the expected spendable main-wallet records were not found.');
        }

        return { payRecordOne: splitPair[0], payRecordTwo: splitPair[1] };
    };

    const pushBatchLog = (message: string) => {
        const stamped = `[${new Date().toLocaleTimeString()}] ${message}`;
        setBatchLogs((current) => [...current, stamped]);
    };

    const getWalletRecordBalance = async (record: any, tokenType: number): Promise<number> => {
        const fieldName = tokenType === 0 ? 'microcredits' : 'amount';
        const suffix = tokenType === 0 ? 'u64' : 'u128';
        try {
            if (record?.data?.[fieldName]) {
                return Number(String(record.data[fieldName]).replace(suffix, '').replace(/_/g, ''));
            }
            if (record?.plaintext) {
                const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${suffix}`);
                const match = record.plaintext.match(regex);
                if (match?.[1]) {
                    return Number(match[1].replace(/_/g, ''));
                }
            }
            if (record?.recordCiphertext && !record?.plaintext && decrypt) {
                const decryptedRecord = await decrypt(record.recordCiphertext);
                if (decryptedRecord) {
                    record.plaintext = decryptedRecord;
                    const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${suffix}`);
                    const match = decryptedRecord.match(regex);
                    if (match?.[1]) {
                        return Number(match[1].replace(/_/g, ''));
                    }
                }
            }
        } catch {
            return 0;
        }
        return 0;
    };

    const findMainWalletPrivateRecord = async (tokenType: number, amountMicros: number) => {
        if (!requestRecords) {
            throw new Error('Wallet record access is unavailable.');
        }

        const tokenMeta = getProgramForToken(tokenType);
        let matchingRecord: any = null;
        let totalBalance = 0;

        const locateRecord = async (records: any[]) => {
            matchingRecord = null;
            totalBalance = 0;
            for (const record of records) {
                if (record.spent) continue;
                const balance = await getWalletRecordBalance(record, tokenType);
                totalBalance += balance;
                if (!matchingRecord && balance >= amountMicros) {
                    matchingRecord = record;
                }
            }
        };

        let records = await requestRecords(tokenMeta.program, false);
        await locateRecord(records as any[]);

        if (!matchingRecord) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            records = await requestRecords(tokenMeta.program, false);
            await locateRecord(records as any[]);
        }

        return { matchingRecord, totalBalance };
    };

    const getFreshScannerSession = async () => getScannerSession(decryptedBurnerKey!);

    const withScannerRetry = async <T,>(operation: (session: Awaited<ReturnType<typeof getScannerSession>>) => Promise<T>, session: Awaited<ReturnType<typeof getScannerSession>>) => {
        try {
            return { result: await operation(session), session };
        } catch (error: any) {
            const message = String(error?.message || error || '');
            const shouldRetry = message.includes("No credentials found for given 'iss'") || message.includes('Records fetch failed');
            if (!shouldRetry) throw error;
            const refreshedSession = await getFreshScannerSession();
            return { result: await operation(refreshedSession), session: refreshedSession };
        }
    };

    const pollTransaction = async (initialTxId: string) => {
        let attempts = 0;
        let finalTransactionId = initialTxId;

        while (attempts < 120) {
            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));

            try {
                let statusStr = '';
                let statusResponse: any = null;

                if (transactionStatus) {
                    try {
                        statusResponse = await transactionStatus(initialTxId);
                    } catch {
                        statusResponse = null;
                    }
                }

                if (!statusResponse && wallet?.adapter?.transactionStatus) {
                    try {
                        statusResponse = await wallet.adapter.transactionStatus(initialTxId);
                    } catch {
                        statusResponse = null;
                    }
                }

                if (statusResponse) {
                    statusStr = typeof statusResponse === 'string'
                        ? statusResponse.toLowerCase()
                        : statusResponse?.status?.toLowerCase?.() || '';

                    if (statusResponse?.transactionId) {
                        finalTransactionId = statusResponse.transactionId;
                    }
                }

                if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                    pushBatchLog(`Transaction confirmed on-chain: ${finalTransactionId}`);
                    return finalTransactionId;
                }

                if (statusStr === 'failed' || statusStr === 'rejected') {
                    throw new Error(`Transaction failed with status: ${statusStr}`);
                }

                if (!statusStr) {
                    try {
                        const response = await fetch(`${PROVABLE_HOST}/testnet/transaction/${finalTransactionId}`);
                        if (response.ok) {
                            return finalTransactionId;
                        }
                    } catch {
                        // Ignore explorer fallback failures while wallet polling continues.
                    }
                }
            } catch (error: any) {
                if (error?.message?.includes('Transaction failed with status')) {
                    throw error;
                }
            }
        }

        throw new Error(`Timed out waiting for transaction ${initialTxId} to finalize.`);
    };

    const appendResolvedLink = async (rawValue: string, source: 'link' | 'qr') => {
        const parsed = parsePaymentLink(rawValue);
        if (!parsed) {
            throw new Error('That does not look like a valid NullPay payment link or QR payload.');
        }

        let hash = parsed.hash;
        let merchant = parsed.merchant;
        let salt = parsed.salt;
        let amount = parsed.amount;
        let invoiceType = parsed.invoiceType;
        let tokenType = parsed.tokenType;
        let memo = parsed.memo;

        if (!hash && salt) {
            hash = await getInvoiceHashFromMapping(salt);
        }
        if (!hash) {
            throw new Error('Could not resolve the invoice hash from that link.');
        }

        const [dbInvoice, chainInvoice] = await Promise.all([
            fetchInvoiceByHash(hash).catch(() => null),
            getInvoiceData(hash).catch(() => null),
        ]);

        merchant = merchant || dbInvoice?.designated_address || dbInvoice?.merchant_address || '';
        salt = salt || dbInvoice?.salt || '';
        memo = memo || dbInvoice?.memo || '';
        invoiceType = chainInvoice?.invoiceType ?? dbInvoice?.invoice_type ?? invoiceType;
        tokenType = chainInvoice?.tokenType ?? dbInvoice?.token_type ?? tokenType;

        let finalAmount = 0;
        if (amount) {
            if (amount.includes('u')) finalAmount = Number(amount.split('u')[0]) / 1_000_000;
            else finalAmount = Number(amount);
        }
        if (dbInvoice?.amount !== undefined) {
            finalAmount = dbInvoice.invoice_type === 2 ? 0 : Number(dbInvoice.amount);
        }

        if (!merchant || !salt) {
            throw new Error(`Missing merchant or salt for invoice ${hash}.`);
        }

        setRows((current) => {
            if (current.some((row) => row.hash === hash)) return current;
            const allowedTokens = getAllowedTokensForInvoice(tokenType, invoiceType);
            const defaultToken = tokenType === 3 ? getTokenTypeFromCode(allowedTokens[0] || ANY_ALLOWED_TOKENS[0]) : tokenType;
            return [
                ...current,
                {
                    id: `${hash}-${source}`,
                    merchant,
                    hash,
                    salt,
                    amount: finalAmount,
                    memo,
                    tokenType,
                    invoiceType,
                    status: chainInvoice?.status === 1 || dbInvoice?.status === 'SETTLED' ? 'SETTLED' : 'OPEN',
                    source,
                    selectedTokenType: tokenType === 3 ? defaultToken : tokenType,
                    donationAmount: invoiceType === 2 ? '' : String(finalAmount || ''),
                    executionState: 'idle',
                    executionMessage: null,
                    txId: null,
                },
            ];
        });
    };

    const handleAddLinks = async () => {
        const values = rawInput.split('\n').map((value) => value.trim()).filter(Boolean);
        if (!values.length) return;

        try {
            setLoading(true);
            setError(null);
            for (const value of values) {
                await appendResolvedLink(value, 'link');
            }
            setRawInput('');
        } catch (err: any) {
            setError(err.message || 'Could not add that invoice.');
        } finally {
            setLoading(false);
        }
    };

    const handleQrUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setError(null);
            const Detector = (window as any).BarcodeDetector;
            if (!Detector) {
                throw new Error('QR image import needs a browser with BarcodeDetector support.');
            }

            const detector = new Detector({ formats: ['qr_code'] });
            const bitmap = await createImageBitmap(file);
            const result = await detector.detect(bitmap);
            const rawValue = result?.[0]?.rawValue;
            if (!rawValue) {
                throw new Error('No NullPay QR code was found in that image.');
            }

            await appendResolvedLink(rawValue, 'qr');
        } catch (err: any) {
            setError(err.message || 'Could not read that QR code.');
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    const checkFundingRequirements = async (session: Awaited<ReturnType<typeof getScannerSession>>) => {
        const requirements: FundingRequirement[] = [];
        let activeSession = session;

        for (const tokenType of [0, 1, 2]) {
            const tokenRows = readyRows.filter((row) => getEffectiveTokenType(row) === tokenType);
            if (!tokenRows.length) continue;

            const tokenMeta = getProgramForToken(tokenType);
            const requiredMicros = tokenRows.reduce((sum, row) => sum + Math.round(getEffectiveAmount(row) * 1_000_000), 0);
            const scanResult = await withScannerRetry(
                (scannerSession) => scanProgramBalance(scannerSession, tokenMeta.program, tokenMeta.recordName),
                activeSession
            );
            activeSession = scanResult.session;
            const burnerAvailableMicros = scanResult.result;
            if (burnerAvailableMicros >= requiredMicros) continue;

            const { totalBalance: mainWalletAvailableMicros } = await findMainWalletPrivateRecord(tokenType, requiredMicros);
            const topUpMicros = Math.max(requiredMicros - burnerAvailableMicros, 0);
            const reason: FundingRequirement['reason'] = burnerAvailableMicros + mainWalletAvailableMicros >= requiredMicros
                ? 'needs_top_up'
                : 'insufficient_combined_balance';

            requirements.push({
                tokenType,
                requiredMicros,
                burnerAvailableMicros,
                mainWalletAvailableMicros,
                topUpMicros,
                reason,
                txId: null,
            });
        }

        setFundingRequirements(requirements);
        return requirements;
    };

    const runBatchExecution = async (payerOwner: string, session: Awaited<ReturnType<typeof getScannerSession>>) => {
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        const networkClient = new AleoNetworkClient(PROVABLE_HOST);
        networkClient.setVerboseErrors(true);
        const recordProvider = new NetworkRecordProvider(session.account, networkClient);
        const programManager = new ProgramManager(PROVABLE_HOST, keyProvider, recordProvider);
        programManager.setAccount(session.account);
        let activeSession = session;

        const stablecoinProofInput = readyRows.some((row) => {
            const tokenType = getEffectiveTokenType(row);
            return tokenType === 1 || tokenType === 2;
        }) ? await buildStablecoinProofInput() : null;

        for (const tokenType of [0, 1, 2]) {
            const tokenRows = readyRows.filter((row) => getEffectiveTokenType(row) === tokenType);
            if (!tokenRows.length) continue;

            const tokenMeta = getProgramForToken(tokenType);
            let currentRecord: string | null = null;

            for (let index = 0; index < tokenRows.length; index += 1) {
                const row = tokenRows[index];
                const amountMicros = Math.round(getEffectiveAmount(row) * 1_000_000);
                const funcName = getFunctionForRow(row, tokenType);

                if (!currentRecord || extractRecordMicros(currentRecord, tokenType) < amountMicros) {
                    setBatchStatus(`Looking for a ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} burner record for payment ${index + 1}/${tokenRows.length}...`);
                    pushBatchLog(`Searching for a ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} burner record for payment ${index + 1} of ${tokenRows.length}.`);
                    const recordResult = await withScannerRetry(
                        (scannerSession) => findSpendableRecord(
                            scannerSession,
                            tokenMeta.program,
                            tokenMeta.recordName,
                            amountMicros,
                            tokenMeta.isCredits
                        ),
                        activeSession
                    );
                    activeSession = recordResult.session;
                    currentRecord = recordResult.result;
                }

                if (!currentRecord) {
                    throw new Error(`Your burner wallet does not have a usable ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} private record for invoice ${index + 1}/${tokenRows.length}.`);
                }

                const inputs = [
                    currentRecord,
                    row.merchant,
                    payerOwner,
                    `${amountMicros}${tokenMeta.typeSuffix}`,
                    row.salt,
                    generateSalt(),
                    '0field',
                    '0field',
                    row.hash,
                ];

                if (!tokenMeta.isCredits && stablecoinProofInput) {
                    inputs.push(stablecoinProofInput);
                }

                updateRow(row.id, { executionState: 'processing', executionMessage: 'Authorizing payment...', txId: null });
                setBatchStatus(`Authorizing ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} payment ${index + 1}/${tokenRows.length}...`);
                pushBatchLog(`Authorizing ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} payment ${index + 1} of ${tokenRows.length}.`);

                const authorization = await programManager.buildAuthorization({
                    programName: PROGRAM_ID,
                    functionName: funcName,
                    inputs,
                });

                const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        execution_authorization_string: authorization.toString(),
                        programName: PROGRAM_ID,
                    }),
                });

                const response = await sponsorRes.json();
                if (!sponsorRes.ok) {
                    throw new Error(response?.error || response?.message || `Failed to execute invoice ${row.hash}.`);
                }

                const transactionId = response.transaction?.id || response.transactionId || '';
                if (!transactionId) {
                    throw new Error(`Missing transaction ID for invoice ${row.hash}.`);
                }

                updateRow(row.id, { executionState: 'processing', executionMessage: 'Broadcasted. Waiting for confirmation...', txId: transactionId });
                setBatchStatus(`Waiting for ${TOKEN_LABELS[getTokenCodeFromType(tokenType)]} transaction ${index + 1}/${tokenRows.length} to finalize...`);
                pushBatchLog(`Payment broadcasted for invoice ${shorten(row.hash)}. Waiting for confirmation.`);

                const finalizedTransactionId = await pollTransaction(transactionId);

                updateRow(row.id, { executionState: 'processing', executionMessage: 'Confirmed on-chain. Syncing invoice record...', txId: finalizedTransactionId });
                pushBatchLog(`Invoice ${shorten(row.hash)} confirmed on-chain. Syncing payment tx id to the database.`);

                try {
                    const updatePayload: Record<string, unknown> = {
                        payment_tx_ids: [finalizedTransactionId],
                        payer_address: payerOwner,
                    };

                    if (row.invoiceType !== 1 && row.invoiceType !== 2) {
                        updatePayload.status = 'SETTLED';
                    }

                    await updateInvoiceStatus(row.hash, updatePayload);
                    pushBatchLog(`Database updated for invoice ${shorten(row.hash)} with payment tx ${shorten(finalizedTransactionId)}.`);
                } catch (syncError: any) {
                    const syncMessage = syncError?.message || 'Unknown invoice sync failure';
                    updateRow(row.id, {
                        executionState: 'failed',
                        executionMessage: 'Payment confirmed on-chain, but saving the tx id to the database failed.',
                        txId: finalizedTransactionId
                    });
                    pushBatchLog(`Invoice ${shorten(row.hash)} was paid on-chain, but database sync failed: ${syncMessage}`);
                    throw new Error(`Invoice ${shorten(row.hash)} was paid on-chain, but the payment tx id could not be stored in the database: ${syncMessage}`);
                }

                const burnerRecords = await fetchBurnerRecordsFromTx(finalizedTransactionId, decryptedBurnerKey!);
                currentRecord = selectNextBurnerRecord(burnerRecords, tokenType);

                updateRow(row.id, { executionState: 'paid', executionMessage: 'Paid successfully.', txId: finalizedTransactionId });
                pushBatchLog(`Invoice ${shorten(row.hash)} paid successfully.`);
            }
        }

        setBatchStatus('Batch payment complete. Every queued invoice was submitted from the burner wallet.');
        pushBatchLog('Batch payment complete. Every queued invoice was submitted from the burner wallet.');
    };

    const runContractBatchExecution = async (payerOwner: string) => {
        if (!contractBatchEligibility.supported) {
            throw new Error(contractBatchEligibility.issues[0] || 'Contract batch is not ready for this cart.');
        }

        if (!executeTransaction) {
            throw new Error('Main-wallet execution is not available in this wallet adapter.');
        }

        const [firstRow, secondRow] = readyRows;
        const firstAmountMicros = Math.round(getEffectiveAmount(firstRow) * 1_000_000);
        const secondAmountMicros = Math.round(getEffectiveAmount(secondRow) * 1_000_000);

        updateRow(firstRow.id, { executionState: 'processing', executionMessage: 'Preparing contract batch...', txId: null });
        updateRow(secondRow.id, { executionState: 'processing', executionMessage: 'Preparing contract batch...', txId: null });

        const { payRecordOne, payRecordTwo } = await prepareContractMainWalletCreditsRecords(
            firstAmountMicros,
            secondAmountMicros
        );

        setBatchStatus('Submitting contract batch payment from the main wallet...');
        pushBatchLog('Submitting batch_pay_2_credits from the main wallet.');

        const batchInputs = [
            payRecordOne,
            payRecordTwo,
            buildBatchCreditsInput(firstRow),
            buildBatchCreditsInput(secondRow),
            payerOwner,
            '0field',
        ];
        const batchFee = await estimateExecutionFee({
            programName: PROGRAM_ID,
            functionName: 'batch_pay_2_credits',
            inputs: batchInputs,
            fallbackMicrocredits: 150_000,
        });
        const batchResult = await executeWithShieldRetry<any>(
            () => executeTransaction({
                program: PROGRAM_ID,
                function: 'batch_pay_2_credits',
                inputs: batchInputs,
                fee: batchFee,
                privateFee: false,
            }),
            { onRetry: () => setBatchStatus('Retrying contract batch request from the main wallet...') }
        );
        const transactionId = batchResult?.transactionId || '';
        if (!transactionId) {
            throw new Error('Contract batch execution did not return a transaction id.');
        }

        updateRow(firstRow.id, { executionState: 'processing', executionMessage: 'Broadcasted. Waiting for confirmation...', txId: transactionId });
        updateRow(secondRow.id, { executionState: 'processing', executionMessage: 'Broadcasted. Waiting for confirmation...', txId: transactionId });
        setBatchStatus('Waiting for contract batch transaction to finalize...');
        pushBatchLog(`Contract batch broadcasted: ${transactionId}`);

        const finalizedTransactionId = await pollTransaction(transactionId);

        for (const row of [firstRow, secondRow]) {
            try {
                const updatePayload: Record<string, unknown> = {
                    payment_tx_ids: [finalizedTransactionId],
                    payer_address: payerOwner,
                };

                if (row.invoiceType !== 1 && row.invoiceType !== 2) {
                    updatePayload.status = 'SETTLED';
                }

                await updateInvoiceStatus(row.hash, updatePayload);
            } catch (syncError: any) {
                throw new Error(`Contract batch confirmed on-chain, but invoice ${shorten(row.hash)} failed to sync in the database: ${syncError?.message || 'Unknown error'}`);
            }
        }

        updateRow(firstRow.id, { executionState: 'paid', executionMessage: 'Paid successfully through contract batch.', txId: finalizedTransactionId });
        updateRow(secondRow.id, { executionState: 'paid', executionMessage: 'Paid successfully through contract batch.', txId: finalizedTransactionId });
        setBatchStatus('Contract batch payment complete.');
        pushBatchLog('Contract batch payment complete.');
    };

    const handlePayAll = async () => {
        if (executionMode === 'burner' && burnerRequirementMessage) {
            setError(burnerRequirementMessage);
            return;
        }
        if (executionMode === 'contract' && !publicKey) {
            setError('Connect your main wallet first. Batch receipts mint back to your main wallet.');
            return;
        }
        const payerOwner: string = publicKey!;
        if (!readyRows.length) {
            setError('Add at least one open invoice with a complete payment configuration.');
            return;
        }
        if (unresolvedRows.length > 0) {
            setError('Finish the donation amount and token selection for every open invoice before paying.');
            return;
        }
        if (executionMode === 'contract' && !contractBatchEligibility.supported) {
            setError(contractBatchEligibility.issues[0] || 'Contract batch is not ready for this cart.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setFundingRequirements([]);
            setBatchLogs([]);
            setRows((current) => current.map((row) => row.status === 'OPEN' ? { ...row, executionState: 'queued', executionMessage: null } : row));

            if (executionMode === 'contract') {
                setBatchStatus('Preparing main-wallet contract batch...');
                pushBatchLog('Using the main wallet contract-batch flow.');
                await runContractBatchExecution(payerOwner);
                return;
            }

            setBatchStatus('Preparing burner wallet session...');
            pushBatchLog('Preparing burner wallet session.');
            let activeSession = await getScannerSession(decryptedBurnerKey!);
            pushBatchLog('Burner wallet session ready. Checking balances.');
            const requirements = await checkFundingRequirements(activeSession);
            const insufficientRequirements = requirements.filter((item) => item.reason === 'insufficient_combined_balance');
            if (insufficientRequirements.length > 0) {
                setBatchStatus('NullPay checked both wallets. The combined main-wallet private balance and burner private balance are still not enough for this cart.');
                pushBatchLog('Combined main-wallet and burner balances are still not enough for this cart.');
                return;
            }

            if (requirements.length > 0) {
                if (!executeTransaction) {
                    throw new Error('Main-wallet execution is not available in this wallet adapter.');
                }

                for (const requirement of requirements) {
                    if (requirement.reason !== 'needs_top_up' || requirement.topUpMicros <= 0) continue;

                    setFundingLoadingToken(requirement.tokenType);
                    setBatchStatus(`Requesting main-wallet top-up for ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]}...`);
                    pushBatchLog(`Requesting ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]} private top-up from the main wallet to the burner.`);

                    const tokenMeta = getProgramForToken(requirement.tokenType);
                    const { matchingRecord, totalBalance } = await findMainWalletPrivateRecord(requirement.tokenType, requirement.topUpMicros);
                    if (!matchingRecord) {
                        if (totalBalance >= requirement.topUpMicros) {
                            throw new Error(`Your main wallet has enough ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]}, but it is split across multiple private records. Merge them first, then retry the burner top-up.`);
                        }
                        throw new Error(`Your main wallet does not have enough private ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]} to top up the burner.`);
                    }

                    let inputs: string[];
                    if (requirement.tokenType === 0) {
                        inputs = [
                            matchingRecord.plaintext || matchingRecord.ciphertext || matchingRecord.recordCiphertext || matchingRecord,
                            burnerExecutionAddress!,
                            `${requirement.topUpMicros}${tokenMeta.typeSuffix}`,
                        ];
                    } else {
                        const proofsInput = await buildStablecoinProofInput();
                        inputs = [
                            burnerExecutionAddress!,
                            `${requirement.topUpMicros}${tokenMeta.typeSuffix}`,
                            matchingRecord.plaintext || matchingRecord.ciphertext || matchingRecord.recordCiphertext || matchingRecord,
                            proofsInput,
                        ];
                    }

                    const estimatedFee = await estimateExecutionFee({
                        programName: tokenMeta.program,
                        functionName: 'transfer_private',
                        inputs,
                        fallbackMicrocredits: 100_000,
                    });

                    const result = await executeWithShieldRetry<any>(
                        () => executeTransaction({
                            program: tokenMeta.program,
                            function: 'transfer_private',
                            inputs,
                            fee: estimatedFee,
                            privateFee: false,
                        }),
                        { onRetry: () => setBatchStatus(`Retrying ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]} burner top-up request...`) }
                    );

                    const transactionId = result?.transactionId || '';
                    if (!transactionId) {
                        throw new Error(`Failed to get a funding transaction ID for ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]}.`);
                    }

                    updateFundingRequirement(requirement.tokenType, { txId: transactionId });
                    setBatchStatus(`Waiting for ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]} top-up to finalize...`);
                    pushBatchLog(`Top-up submitted for ${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]}. Waiting for confirmation.`);
                    const finalizedTransactionId = await pollTransaction(transactionId);
                    updateFundingRequirement(requirement.tokenType, { txId: finalizedTransactionId });
                    pushBatchLog(`${TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)]} top-up confirmed: ${finalizedTransactionId}`);
                }
                setFundingLoadingToken(null);
                setBatchStatus('Syncing burner wallet records...');
                pushBatchLog('Syncing burner wallet records.');
                let postFundingRequirements: FundingRequirement[] = [];
                let synced = false;

                for (let attempt = 0; attempt < 12; attempt += 1) {
                    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2500 : 2000));
                    const rescannedSession = await getScannerSession(decryptedBurnerKey!);
                    postFundingRequirements = await checkFundingRequirements(rescannedSession);
                    if (postFundingRequirements.length === 0) {
                        activeSession = rescannedSession;
                        synced = true;
                        break;
                    }
                    if (attempt < 11) {
                        setBatchStatus(`Still syncing burner wallet records... (${attempt + 2}/12)`);
                        pushBatchLog(`Burner rescan ${attempt + 2}/12 did not find all required records yet. Retrying...`);
                    }
                }

                if (!synced) {
                    setBatchStatus('NullPay kept rescanning the burner wallet, but the required spendable records still have not appeared.');
                    pushBatchLog('Repeated rescans did not find the required burner records yet.');
                    return;
                }

                setBatchStatus('Burner wallet synced. Starting payment execution...');
                pushBatchLog('Burner wallet synced. Starting payment execution.');
            }

            pushBatchLog(`Starting payment execution for ${readyRows.length} invoice(s).`);
            await runBatchExecution(payerOwner, activeSession);
        } catch (err: any) {
            const detailedError = extractErrorDetails(err);
            console.error('Batch payment failed', err);
            setError(detailedError || 'Batch payment failed.');
            pushBatchLog(`Batch payment failed: ${detailedError}`);
            setBatchStatus('');
        } finally {
            setFundingLoadingToken(null);
            setLoading(false);
        }
    };

    if (showPasswordPrompt) {
        return <PasswordPrompt />;
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 pt-10 pb-20 relative min-h-screen">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-40 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <div className="relative z-10 flex w-full flex-col gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center text-center mb-6"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight !text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Batch{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                            Payments
                        </span>
                    </h1>
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-md mb-6">
                        Paste payment links or import QR payloads. Configure your cart, then execute all invoices from your burner wallet in one secure step.
                    </p>
                </motion.div>

                <div className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => {
                            setExecutionMode('burner');
                            setError(null);
                        }}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                            executionMode === 'burner'
                                ? 'border-orange-400/40 bg-gradient-to-br from-orange-400/12 to-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.08)]'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <ShieldCheck className={`h-4 w-4 ${executionMode === 'burner' ? 'text-orange-400' : 'text-gray-400'}`} />
                            <span className="text-sm font-semibold">Burner Wallet Flow</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-400">
                            Best for mixed merchants, mixed tokens, donation invoices, and the current production-ready batch flow.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setExecutionMode('contract');
                            setError(null);
                        }}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                            executionMode === 'contract'
                                ? 'border-orange-400/40 bg-gradient-to-br from-orange-400/12 to-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.08)]'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <Zap className={`h-4 w-4 ${executionMode === 'contract' ? 'text-orange-400' : 'text-gray-400'}`} />
                            <span className="text-sm font-semibold">Contract Batch Flow</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-400">
                            Fixed-size on-chain batching for exactly 2 Credits invoice payments, with receipts still minted to the payer main wallet.
                        </p>
                    </button>
                </div>

                {activeRequirementMessage && (
                    <GlassCard className="mx-auto max-w-3xl border border-red-500/25 bg-[linear-gradient(135deg,rgba(239,68,68,0.12),rgba(127,29,29,0.08))] p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/12 text-red-300 shadow-[0_10px_30px_rgba(127,29,29,0.22)]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-semibold tracking-[0.2em] text-red-300 uppercase">Action Required</p>
                                    <span className="h-px flex-1 bg-gradient-to-r from-red-400/30 to-transparent" />
                                </div>
                                <p className="mt-2 text-sm leading-7 text-red-50/88">{activeRequirementMessage}</p>
                            </div>
                        </div>
                    </GlassCard>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        <GlassCard className="border-white/10 p-6 sm:p-8">
                            <div className="mb-6 flex flex-col gap-1.5">
                                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">1</span>
                                    Add Invoices
                                </h2>
                                <p className="text-sm text-gray-400 pl-8">Paste NullPay payment links or upload QR payloads to build your cart.</p>
                            </div>
                            <div className="pl-8">
                                <Input
                                    label="Payment Links"
                                    value={rawInput}
                                    onChange={(event: any) => setRawInput(event.target.value)}
                                    placeholder="Paste one payment link per line..."
                                />
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button variant="primary" onClick={handleAddLinks} disabled={loading || !rawInput.trim()}>
                                        {loading ? 'Resolving...' : 'Add Links'}
                                    </Button>
                                    <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                                        Upload QR
                                        <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                    </label>
                                </div>
                                {error && !activeRequirementMessage && <p className="mt-3 text-sm text-red-400">{error}</p>}
                            </div>
                        </GlassCard>

                        <GlassCard className="border-white/10 p-6 sm:p-8 overflow-visible">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex flex-col gap-1.5">
                                    <h2 className="text-xl font-medium text-white flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">2</span>
                                        Invoice Summary
                                    </h2>
                                    <p className="text-sm text-gray-400 pl-8">{rows.length} item{rows.length === 1 ? '' : 's'} in cart</p>
                                </div>
                                {rows.length > 0 && (
                                    <button 
                                        onClick={() => setRows([])} 
                                        disabled={loading}
                                        className="text-sm text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                                    >
                                        Clear Cart
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-4 pl-8">
                                {rows.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center text-sm text-gray-500">
                                        No invoices added yet.
                                    </div>
                                )}
                                <AnimatePresence mode="popLayout">
                                    {rows.map((row) => {
                                    const allowedTokens = getAllowedTokensForInvoice(row.tokenType, row.invoiceType);
                                    const effectiveTokenType = getEffectiveTokenType(row);
                                    const effectiveAmount = getEffectiveAmount(row);
                                    const isWaitingConfig = (row.tokenType === 3 || row.invoiceType === 2) && row.status === 'OPEN' && (!row.selectedTokenType && row.invoiceType !== 2);

                                    return (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            key={row.id} 
                                            style={{ zIndex: activeDropdownId === row.id ? 50 : 0 }}
                                            className={`group relative rounded-2xl border transition-all duration-500 
                                                ${row.executionState === 'paid' ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 
                                                  row.executionState === 'failed' ? 'border-red-500/20 bg-red-500/[0.02]' : 
                                                  isWaitingConfig ? 'border-orange-500/30 bg-orange-500/[0.03]' : 'border-white/10 bg-white/[0.02]'}
                                                p-5 hover:border-white/20 hover:bg-white/[0.04]`}
                                        >
                                            {/* Status Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        <Zap className="h-3 w-3 text-orange-400" />
                                                        {row.source} link
                                                    </span>
                                                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        row.executionState === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                                        row.executionState === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                                        row.executionState === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                        row.status === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                                        'bg-white/5 text-gray-500 border border-white/10'
                                                    }`}>
                                                        {row.executionState === 'processing' && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                                                        {formatExecutionState(row)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                        <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> {row.hash.slice(0, 8)}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(row.id)}
                                                        disabled={loading}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-gray-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                                        title="Remove invoice from cart"
                                                        aria-label="Remove invoice from cart"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Main Info Grid */}
                                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                        <User className="h-3 w-3" /> Merchant
                                                    </p>
                                                    <p className="font-mono text-xs text-gray-200">{shorten(row.merchant)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                        <Coins className="h-3 w-3" /> Amount
                                                    </p>
                                                    <p className="text-sm font-medium text-white">
                                                        {effectiveAmount || 0} <span className="text-[10px] text-gray-500">{effectiveTokenType === null ? getTokenLabel(row.tokenType, row.invoiceType) : TOKEN_LABELS[getTokenCodeFromType(effectiveTokenType)]}</span>
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                        <ShieldCheck className="h-3 w-3" /> Type
                                                    </p>
                                                    <p className="text-xs text-gray-200">{row.invoiceType === 2 ? 'Donation' : row.invoiceType === 1 ? 'Multi Pay' : 'Standard'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                        <Terminal className="h-3 w-3" /> Status
                                                    </p>
                                                    <p className="text-xs text-gray-200 capitalize">{row.status.toLowerCase()}</p>
                                                </div>
                                            </div>

                                            {/* Configuration Panel */}
                                            {(row.tokenType === 3 || row.invoiceType === 2) && row.status === 'OPEN' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-6 rounded-2xl border border-orange-400/20 bg-gradient-to-b from-orange-400/[0.08] to-transparent p-4"
                                                >
                                                    <div className="grid gap-5 sm:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-300/80 flex items-center gap-1.5">
                                                                <Coins className="h-3 w-3" /> Payment Token
                                                            </label>
                                                            <div className="relative" ref={activeDropdownId === row.id ? dropdownRef : null}>
                                                                <button
                                                                    disabled={loading}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(activeDropdownId === row.id ? null : row.id);
                                                                    }}
                                                                    className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-orange-400/50 hover:border-white/20 active:scale-[0.98]"
                                                                >
                                                                    <span className="flex items-center gap-2">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                                                                        {effectiveTokenType === null ? 'Select Token' : TOKEN_LABELS[getTokenCodeFromType(effectiveTokenType)]}
                                                                    </span>
                                                                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${activeDropdownId === row.id ? 'rotate-180 text-orange-400' : ''}`} />
                                                                </button>
                                                                
                                                                <AnimatePresence>
                                                                    {activeDropdownId === row.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                                                            className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-white/10 bg-[#0A0A0A]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                                                                        >
                                                                            {allowedTokens.map((tokenCode) => {
                                                                                const tType = getTokenTypeFromCode(tokenCode);
                                                                                const isSelected = effectiveTokenType === tType;
                                                                                return (
                                                                                    <button
                                                                                        key={tokenCode}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            updateRow(row.id, { selectedTokenType: tType });
                                                                                            setActiveDropdownId(null);
                                                                                        }}
                                                                                        className={`group/opt flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                                                                                            isSelected 
                                                                                                ? 'bg-orange-500/10 text-orange-400' 
                                                                                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                                                        }`}
                                                                                    >
                                                                                        <span className="flex items-center gap-2.5">
                                                                                            <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]' : 'bg-white/10 group-hover/opt:bg-white/30'}`} />
                                                                                            {TOKEN_LABELS[tokenCode]}
                                                                                        </span>
                                                                                        {isSelected && (
                                                                                            <motion.div
                                                                                                initial={{ scale: 0 }}
                                                                                                animate={{ scale: 1 }}
                                                                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20"
                                                                                            >
                                                                                                <Check className="h-3 w-3 text-orange-400" />
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>

                                                        {row.invoiceType === 2 && (
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-300/80 flex items-center gap-1.5">
                                                                    <Coins className="h-3 w-3" /> Donation Amount
                                                                </label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.000001"
                                                                        value={row.donationAmount}
                                                                        disabled={loading}
                                                                        onChange={(event) => updateRow(row.id, { donationAmount: event.target.value })}
                                                                        placeholder="0.00"
                                                                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-orange-400/50 hover:border-white/20"
                                                                    />
                                                                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[10px] font-bold uppercase tracking-widest text-orange-400/60">
                                                                        {effectiveTokenType === null ? 'Token' : TOKEN_LABELS[getTokenCodeFromType(effectiveTokenType)]}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Footer Extras */}
                                            {(row.memo || row.executionMessage || row.txId) && (
                                                <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4">
                                                    {row.memo && (
                                                        <div className="flex items-start gap-2.5 text-xs text-gray-400">
                                                            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-gray-600" />
                                                            <span className="italic leading-relaxed">"{row.memo}"</span>
                                                        </div>
                                                    )}
                                                    {row.executionMessage && (
                                                        <div className="flex items-start gap-2.5 text-[11px] text-gray-300">
                                                            <Info className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                                                            {row.executionMessage}
                                                        </div>
                                                    )}
                                                    {row.txId && (
                                                        <div className="flex items-center gap-2.5 text-[10px] text-gray-500">
                                                            <Terminal className="h-3 w-3 shrink-0 text-gray-700" />
                                                            Tx: <span className="font-mono text-gray-400">{shorten(row.txId)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                                </AnimatePresence>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
                        <GlassCard className="border-white/10 p-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                            <div className="relative z-10 space-y-6">
                                <div>
                                    <h2 className="text-xl font-medium text-white">{executionMode === 'burner' ? 'Review & Pay' : 'Contract Batch Review'}</h2>
                                    <p className="mt-1 text-sm text-gray-400">
                                        {executionMode === 'burner'
                                            ? 'Total cart amounts'
                                            : 'Fixed-size contract batching for Credits invoice groups'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center transition-colors group-hover:bg-white/[0.04]">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Credits</p>
                                        <p className="mt-1 text-lg font-medium text-white">{totals.credits.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center transition-colors group-hover:bg-white/[0.04]">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">USDCx</p>
                                        <p className="mt-1 text-lg font-medium text-white">{totals.usdcx.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center transition-colors group-hover:bg-white/[0.04]">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">USAD</p>
                                        <p className="mt-1 text-lg font-medium text-white">{totals.usad.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="space-y-2.5 text-xs text-gray-400 rounded-xl bg-black/40 p-4 border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span>Main wallet</span>
                                        <span className="font-mono text-gray-300">{publicKey ? shorten(publicKey) : 'Not connected'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>{executionMode === 'burner' ? 'Burner wallet' : 'Mode'}</span>
                                        <span className={executionMode === 'burner' ? (decryptedBurnerKey ? 'text-emerald-400' : 'text-amber-400') : 'text-orange-300'}>
                                            {executionMode === 'burner' ? (decryptedBurnerKey ? 'Ready' : 'Not ready') : 'Contract batch'}
                                        </span>
                                    </div>
                                </div>
                                {executionMode === 'contract' && (
                                    <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-4 text-sm text-orange-100">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Current Limits</p>
                                        <p className="mt-2">
                                            This path is for the new fixed-size Credits contract batches only. Use exactly 2 ready Credits invoices.
                                        </p>
                                        {contractBatchEligibility.issues.length > 0 && (
                                            <div className="mt-3 space-y-1 text-orange-100/80">
                                                {contractBatchEligibility.issues.map((issue) => (
                                                    <p key={issue}>• {issue}</p>
                                                ))}
                                            </div>
                                        )}
                                        {contractBatchEligibility.supported && (
                                            <p className="mt-3 text-emerald-300">
                                                This cart matches the contract-batch constraints. NullPay can execute this batch now.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {unresolvedRows.length > 0 && <p className="text-sm text-red-400">{unresolvedRows.length} open invoice(s) still need setup.</p>}
                                {batchStatus && <p className="text-sm text-white/80">{batchStatus}</p>}
                                
                                {batchCompleted && (
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Success</p>
                                        <p className="mt-1 text-sm font-medium text-emerald-100">All {paidRows.length} invoices were paid.</p>
                                    </div>
                                )}

                                <Button
                                    variant="primary"
                                    onClick={handlePayAll}
                                    disabled={loading || openRows.length === 0 || batchCompleted}
                                    className="w-full py-3.5 text-sm"
                                >
                                    {loading
                                        ? 'Processing...'
                                        : batchCompleted
                                            ? 'Payments Completed'
                                            : executionMode === 'burner'
                                                ? `Pay All with Burner${readyRows.length ? ` (${readyRows.length})` : ''}`
                                                : contractBatchEligibility.supported
                                                    ? 'Pay 2 Credits Invoices'
                                                    : 'Contract Batch Not Ready'}
                                </Button>
                                
                                {fundingRequirements.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Funding Checks</p>
                                        {fundingRequirements.map((requirement) => {
                                            const tokenLabel = TOKEN_LABELS[getTokenCodeFromType(requirement.tokenType)];
                                            return (
                                                <div key={requirement.tokenType} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-white">{tokenLabel}</p>
                                                        {fundingLoadingToken === requirement.tokenType && (
                                                            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        Target: {(requirement.requiredMicros / 1_000_000).toFixed(2)} | Burner: {(requirement.burnerAvailableMicros / 1_000_000).toFixed(2)}
                                                    </p>
                                                    <p className={`mt-2 text-xs ${requirement.reason === 'needs_top_up' ? 'text-white/70' : 'text-red-400'}`}>
                                                        {requirement.reason === 'needs_top_up'
                                                            ? `Requesting ${(requirement.topUpMicros / 1_000_000).toFixed(2)} top-up.`
                                                            : `Insufficient balance across wallets.`}
                                                    </p>
                                                    {requirement.txId && <p className="mt-1 text-xs font-mono text-gray-500">{shorten(requirement.txId)}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {batchLogs.length > 0 && (
                            <GlassCard className="border-white/10 p-5">
                                <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
                                    <p className="text-xs font-medium text-white">Live Progress Log</p>
                                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                        Live
                                    </span>
                                </div>
                                <div className="max-h-48 overflow-y-auto rounded-lg bg-black/40 p-3 font-mono text-[10px] sm:text-[11px] leading-relaxed text-gray-400 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                                    {batchLogs.map((entry, index) => (
                                        <div key={`${entry}-${index}`} className={
                                            entry.toLowerCase().includes('failed') ? 'text-red-400' : 
                                            entry.toLowerCase().includes('complete') || entry.toLowerCase().includes('confirmed') || entry.toLowerCase().includes('paid successfully') ? 'text-emerald-400' : 
                                            entry.toLowerCase().includes('sync') || entry.toLowerCase().includes('authorizing') ? 'text-white' : ''
                                        }>
                                            {entry}
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
