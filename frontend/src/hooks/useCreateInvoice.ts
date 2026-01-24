import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { generateSalt } from '../utils/aleo-utils';
import { InvoiceData } from '../types/invoice';

export const useCreateInvoice = () => {
    // Adapter properties
    const { address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();

    // Alias address to publicKey for compatibility with existing logic
    const publicKey = address;

    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [expiry, setExpiry] = useState<string>('0');
    const [memo, setMemo] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const handleCreate = async () => {
        if (!publicKey || !executeTransaction || !transactionStatus) {
            setStatus('Wallet not fully supported or connected. Please update wallet.');
            return;
        }
        if (!amount || amount <= 0) {
            setStatus('Please enter a valid amount.');
            return;
        }

        setLoading(true);
        setStatus('Initializing invoice creation...');

        try {
            // 1. Generate Random Salt
            const merchant = publicKey;
            const salt = generateSalt();

            // 2. Request Transaction
            setStatus('Requesting wallet signature...');
            const microcredits = Math.round(Number(amount) * 1_000_000);

            const inputs = [
                merchant,
                `${microcredits}u64`,
                salt,
                `${expiry}u32`
            ];

            const transaction: TransactionOptions = {
                program: 'zk_pay_proofs_privacy_v4.aleo',
                function: 'create_invoice',
                inputs: inputs,
                fee: 100_000
            };

            let txId = '';

            // Execute transaction
            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                txId = result.transactionId;
            }

            if (txId) {
                setStatus(`Transaction Broadcasted! Polling for status...`);
                console.log("Temporary Transaction ID:", txId);
                let isPending = true;
                let finalTransactionId = txId;
                let attempts = 0;
                const MAX_ATTEMPTS = 120;

                let hashFromStatus: string | null = null;

                while (isPending && attempts < MAX_ATTEMPTS) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));

                    try {
                        const statusResponse = await transactionStatus(txId);
                        console.log('🔍 [Polling] Status Response:', JSON.stringify(statusResponse, null, 2));

                        let currentStatus = '';

                        // Handle both string and object responses (Adapter variations)
                        if (typeof statusResponse === 'string') {
                            console.log('👉 [Polling] Status is string:', statusResponse);
                            currentStatus = (statusResponse as string).toLowerCase();
                        } else if (statusResponse && typeof statusResponse === 'object') {
                            console.log('👉 [Polling] Status is object');
                            currentStatus = (statusResponse as any).status.toLowerCase();
                            // Capture the final on-chain ID if provided
                            if (statusResponse.transactionId) {
                                finalTransactionId = statusResponse.transactionId;
                                console.log('🆔 [Polling] On-chain Transaction ID updated:', finalTransactionId);
                            }
                            const responseAny = statusResponse as any;
                            if (responseAny.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                                console.log("✅ [Polling] Found Hash via Transaction Status Direct!");
                                hashFromStatus = responseAny.execution.transitions[0].outputs[0].value;
                                console.log("📦 [Polling] Extracted Hash:", hashFromStatus);
                            } else {
                                console.log("⚠️ [Polling] Execution data or hash not found in status object");
                            }
                        }

                        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                            isPending = false; // Stop polling

                            if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                                console.log('Transaction accepted!');
                                setStatus('Transaction on-chain! Fetching execution data...');

                                // Strategy 1: Use hash grabbed from status polling (Best for No-Permission/No-Password)
                                let hash = hashFromStatus;

                                // Strategy 2: If not found, try History API (Requires Permission)
                                if (!hash) {
                                    console.log("Hash not found in status, attempting history lookup...");
                                    try {
                                        hash = await getInvoiceHashFromWallet(finalTransactionId);
                                    } catch (err: any) {
                                        console.warn("History lookup failed or timed out:", err);
                                    }
                                }

                                // Strategy 3: Public Chain API (Fallback for nopw)
                                if (!hash) {
                                    console.log("Hash not found via wallet, attempting public chain fetch...");
                                    try {
                                        // Add a small delay to ensure propagation
                                        await new Promise(r => setTimeout(r, 2000));
                                        hash = await getInvoiceHashFromChain(finalTransactionId);
                                    } catch (err: any) {
                                        console.warn("Public chain lookup failed:", err);
                                    }
                                }

                                if (!hash) throw new Error("Could not retrieve Invoice Hash from wallet execution.");

                                setStatus('Hash retrieved successfully!');

                                // Success Flow
                                const params = new URLSearchParams({
                                    merchant,
                                    amount: amount.toString(),
                                    salt,
                                    hash
                                });
                                if (memo) params.append('memo', memo);
                                const link = `${window.location.origin}/pay?${params.toString()}`;

                                setInvoiceData({ merchant, amount: Number(amount), salt, hash, link });
                                setStatus(`Invoice Created Successfully!`);
                                return; // Done
                            } else {
                                throw new Error(`Transaction failed with status: ${currentStatus}`);
                            }
                        }
                    } catch (e: any) {
                        console.warn('Error polling status:', e);
                        // Continue polling on transient errors
                    }
                }

                if (isPending) throw new Error("Transaction polling timed out.");
            }

        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message || 'Failed to create invoice'}`);
        } finally {
            setLoading(false);
        }
    };

    // Helper to fetch from Public API (Fall back for No-Auth/No-PW)
    const getInvoiceHashFromChain = async (finalTxId: string): Promise<string | null> => {
        const safeTxId = finalTxId.replace(/['"]+/g, '').trim();
        console.log(`Fetching public chain data for ${safeTxId}...`);

        try {
            const response = await fetch(`https://api.explorer.aleo.org/v1/testnet3/transaction/${safeTxId}`);
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            // Check structure: execution -> transitions[0] -> outputs[0] -> value
            if (data?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                console.log("✅ Found Hash via Public Chain API!");
                return data.execution.transitions[0].outputs[0].value;
            }
        } catch (error) {
            console.warn("Public chain fetch failed:", error);
        }
        return null;
    };

    // Helper to get execution safely with retries (Wallet Only)
    const getInvoiceHashFromWallet = async (finalTxId: string): Promise<string | null> => {
        const safeTxId = finalTxId.replace(/['"]+/g, '').trim();
        console.log(`Getting execution output for ${safeTxId}...`);

        let i = 0;
        const MAX_RETRIES = 60; // Try for ~2 minutes (2s interval)
        let historyPermissionDenied = false;

        while (i < MAX_RETRIES) {
            try {
                // Try History Fetch (Primary method now since getExecution alias is gone)
                if (!historyPermissionDenied) {
                    try {
                        if (requestTransactionHistory) {
                            // console.log("Attempting history lookup...");
                            const history = await requestTransactionHistory('zk_pay_proofs_privacy_v4.aleo');
                            const foundTx = history.transactions.find((t: any) => t.transactionId === safeTxId || t.id === safeTxId);

                            // Note: TxHistoryResult definition in Step 92 says 'transactions: Array<{ transactionId, id }>'
                            // It does NOT explicitly show execution/outputs. 
                            // However, we rely on the object potentially having more data or using a legacy 'execution' prop if available on the runtime object.
                            // If strictly typed, we might need 'any' cast.
                            const txAny = foundTx as any;
                            if (txAny && txAny.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                                console.log("✅ Found Hash via Wallet History!");
                                return txAny.execution.transitions[0].outputs[0].value;
                            }
                        }
                    } catch (histError: any) {
                        console.warn('History lookup failed:', histError);
                        // Stop trying history if permission is denied to prevent spam
                        if (histError.message && (
                            histError.message.includes('NOT_GRANTED') ||
                            histError.message.includes('Permission') ||
                            histError.message.includes('Wallet not connected')
                        )) {
                            console.warn('Stopping history lookup due to permission denial or connection issue.');
                            return null; // Abort immediately to allow fallback strategies
                        }
                    }
                }
            } catch (e: any) {
                // ... error handling
            }

            // Wait before next retry
            await new Promise(r => setTimeout(r, 2000));
            i++;
        }

        throw new Error("Failed to retrieve execution data from wallet after multiple attempts.");
    };

    const resetInvoice = () => {
        setInvoiceData(null);
        setAmount('');
        setMemo('');
        setStatus('');
    };

    return {
        amount,
        setAmount,
        expiry,
        setExpiry,
        memo,
        setMemo,
        status,
        loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey
    };
};
