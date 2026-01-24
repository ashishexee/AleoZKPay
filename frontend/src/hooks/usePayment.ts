import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network, TransactionOptions } from '@provablehq/aleo-types';

export type PaymentStep = 'CONNECT' | 'VERIFY' | 'CONVERT' | 'PAY' | 'SUCCESS';

export const usePayment = () => {
    const [searchParams] = useSearchParams();
    // Destructure only what exists/is needed from the new ProvableHQ hook
    // 'address' replaces 'publicKey'
    // 'executeTransaction' replaces 'requestTransaction' legacy usage
    const { address, wallet, executeTransaction, requestRecords } = useWallet();
    const publicKey = address; // Alias for compatibility

    // parsed params
    const [invoice, setInvoice] = useState<{
        merchant: string;
        amount: number;
        salt: string;
        hash: string;
        memo: string;
    } | null>(null);

    const [status, setStatus] = useState<string>('Initializing...');
    const [step, setStep] = useState<PaymentStep>('CONNECT');
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [conversionTxId, setConversionTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize & Verify
    useEffect(() => {
        const init = async () => {
            const merchant = searchParams.get('merchant');
            const amount = searchParams.get('amount');
            const salt = searchParams.get('salt');
            const hash = searchParams.get('hash');
            const memo = searchParams.get('memo') || '';

            if (!merchant || !amount || !salt || !hash) {
                setError('Invalid Invoice Link: Missing parameters');
                return;
            }

            try {
                setLoading(true);

                // We no longer verify the hash locally as per user requirement.
                // The contract is the source of truth. 
                // If the link is manipulated, the transaction will simply fail on-chain.

                setInvoice({
                    merchant,
                    amount: Number(amount),
                    salt,
                    hash,
                    memo
                });

                if (publicKey) {
                    setStep('VERIFY');
                } else {
                    setStep('CONNECT');
                }

            } catch (err) {
                console.error(err);
                setError('Failed to verify invoice integrity.');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [searchParams, publicKey]);

    // Check Balance / Records (Simple Heuristic for now)
    const checkPrivateBalance = async () => {
        if (!publicKey || !requestRecords || !invoice) return false;

        try {
            setStatus('Checking private records...');
            // Request credits.aleo records
            const records = await requestRecords('credits.aleo');
            // Cast to any[] since record responses can maintain arbitrary structures or legacy adapter responses
            const recordsAny = records as any[];

            // Filter for unspent records that are > invoice.amount
            const suitableRecord = recordsAny.find(r => !r.spent && getMicrocredits(r.data) >= invoice.amount);

            return !!suitableRecord;
        } catch (e) {
            console.warn("Failed to check records, assuming user might verify manually", e);
            return false;
        }
    };

    const getMicrocredits = (recordData: any): number => {
        // Parse "1000000u64" -> 1000000
        try {
            // Often data is { microcredits: "100u64", ... } or just string text
            // This parsing depends on how the wallet returns data.
            // For now, let's look for microcredits field.
            if (recordData && recordData.microcredits) {
                return parseInt(recordData.microcredits.replace('u64', ''));
            }
            return 0;
        } catch {
            return 0;
        }
    };

    const convertPublicToPrivate = async () => {
        if (!invoice || !publicKey || !executeTransaction) return;

        try {
            setLoading(true);
            setStatus('Converting Public Credits to Private...');
            const bufferAmount = invoice.amount + 0.01;
            const amountMicro = Math.round(bufferAmount * 1_000_000);

            const transaction: TransactionOptions = {
                program: 'credits.aleo',
                function: 'transfer_public_to_private',
                inputs: [publicKey, `${amountMicro}u64`],
                fee: 100_000
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                setConversionTxId(result.transactionId);
                setStatus(`Converting ${bufferAmount} credits (${invoice.amount} + 0.01 buffer). TxID: ${result.transactionId.slice(0, 10)}...`);
            } else {
                throw new Error("Transaction execution failed to return a Transaction ID.");
            }
            setLoading(false);

        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    const payInvoice = async () => {
        if (!invoice || !publicKey || !executeTransaction || !requestRecords) return;

        try {
            setLoading(true);
            setStatus('Searching for suitable private record...');
            const records = await requestRecords('credits.aleo');
            const amountMicro = Math.round(invoice.amount * 1_000_000);

            const recordsAny = records as any[];

            const payRecord = recordsAny.find(r => {
                const val = getMicrocredits(r.data);
                // Strict greater than logic
                return !r.spent && val > amountMicro;
            });

            if (!payRecord) {
                // Check if we have an EXACT match (which is likely why it failed previously)
                const exactMatch = recordsAny.find(r => !r.spent && getMicrocredits(r.data) === amountMicro);

                setStep('CONVERT');
                if (exactMatch) {
                    setStatus(`You have exactly ${invoice.amount} credits. Converting will automatically add 0.01 buffer to create a valid change output.`);
                } else {
                    // Check for fragmentation
                    const totalBalance = recordsAny.reduce((sum, r) => sum + getMicrocredits(r.data), 0);
                    const maxRecord = Math.max(...recordsAny.map(r => getMicrocredits(r.data)));

                    if (totalBalance >= amountMicro) {
                        setStatus(`Fragmented Balance: Total ${totalBalance / 1_000_000} credits, but largest coin is ${maxRecord / 1_000_000}. Converting ${invoice.amount + 0.01} will create one unified coin.`);
                    } else {
                        setStatus(`Insufficient balance. Converting ${invoice.amount + 0.01} credits to private...`);
                    }
                }
                setLoading(false);
                return;
            }

            console.log("Selected Pay Record:", payRecord);
            let recordInput = payRecord.plaintext;

            if (!recordInput) {
                console.warn("Record missing plaintext. Attempting to reconstruct...");
                // Check if we have nonce
                const nonce = payRecord.nonce || payRecord._nonce || payRecord.data?._nonce;

                if (nonce) {
                    const microcredits = getMicrocredits(payRecord.data);
                    const owner = payRecord.owner;
                    recordInput = `{ owner: ${owner}.private, microcredits: ${microcredits}u64.private, _nonce: ${nonce}.public }`;
                    console.log("Reconstructed Plaintext:", recordInput);
                } else if (payRecord.ciphertext) {
                    console.log("Found Ciphertext. Using it as input.");
                    recordInput = payRecord.ciphertext;
                } else {
                    console.warn("Could not find nonce AND missing ciphertext. Dumping Record Keys:", Object.keys(payRecord));
                    if (payRecord.data) console.log("Record Data Keys:", Object.keys(payRecord.data));

                    // Warn user instead of passing object which definitely fails
                    setStatus("Error: Wallet permission denied. Please enable 'Record Plaintext' access.");
                    setLoading(false);
                    return;
                }
            }

            setStatus('Requesting Payment Signature...');

            const inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u64`,
                invoice.salt,
                invoice.hash
            ];
            console.log("Transaction Inputs:", inputs);

            const transaction: TransactionOptions = {
                program: 'zk_pay_proofs_privacy_v4.aleo', // Ensure v3
                function: 'pay_invoice',
                inputs: inputs,
                fee: 100_000
            };

            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStep('SUCCESS');
                setStatus('Transaction Submitted! Check your wallet for confirmation.');
            } else {
                throw new Error("Transaction failed.");
            }

            // Removed optimistic backend sync to prevent confusion/errors
            // User must verify transaction in wallet

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Payment Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!publicKey) return;
        setStep('VERIFY');

        // Optional: Check balance here to auto-skip to CONVERT if needed
        // For now, we trust payInvoice's check logic 
        setStep('PAY');
    };

    return {
        step,
        status,
        loading,
        error,
        invoice,
        txId,
        conversionTxId,
        publicKey,
        payInvoice,
        convertPublicToPrivate,
        handleConnect
    };
};
