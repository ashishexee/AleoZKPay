
import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { generateSalt, getInvoiceHashFromMapping, PROGRAM_ID } from '../utils/aleo-utils';
import { InvoiceData } from '../types/invoice';

export type InvoiceType = 'standard' | 'multipay';

export const useCreateInvoice = () => {
    const { address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();
    const publicKey = address;

    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [memo, setMemo] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('standard');
    const [tokenType, setTokenType] = useState<number>(0);

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
            const merchant = publicKey;
            let salt = generateSalt();
            console.log('this is the salt', salt);
            setStatus('Requesting wallet signature...');

            const typeInput = invoiceType === 'standard' ? '0u8' : '1u8';
            const amountMicro = Math.round(Number(amount) * 1_000_000);

            const functionName = tokenType === 0 ? 'create_invoice' : 'create_invoice_usdcx';
            const amountInput = tokenType === 0 ? `${amountMicro}u64` : `${amountMicro}u128`;

            // Ensure salt is ready
            if (!salt) {
                salt = generateSalt();
            }

            const inputs = [
                publicKey,
                amountInput,
                salt,
                '0u32', // expiry hardcoded to 0
                typeInput
            ];

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: functionName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            let txId = '';
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

                        const currentStatus = typeof statusResponse === 'string'
                            ? (statusResponse as string).toLowerCase()
                            : (statusResponse as any)?.status?.toLowerCase();

                        console.log('🔍 [Polling] Status:', currentStatus);

                        if (typeof statusResponse === 'object' && (statusResponse as any).transactionId) {
                            finalTransactionId = (statusResponse as any).transactionId;
                            console.log("Final Transaction ID:", finalTransactionId);
                        }

                        const responseAny = statusResponse as any;
                        if (responseAny?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                            hashFromStatus = responseAny.execution.transitions[0].outputs[0].value;
                        }

                        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                            isPending = false;

                            if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                                console.log('Transaction accepted!');
                                setStatus('Transaction on-chain! Fetching execution data...');

                                let hash = hashFromStatus;

                                if (!hash) {
                                    console.log("Hash not found in status, attempting on-chain mapping lookup...");
                                    try {
                                        let attempts = 0;
                                        while (!hash && attempts < 5) {
                                            hash = await getInvoiceHashFromMapping(salt);
                                            if (!hash) await new Promise(r => setTimeout(r, 2000));
                                            attempts++;
                                        }
                                    } catch (err) {
                                        console.warn("Mapping lookup failed:", err);
                                    }
                                }

                                if (!hash) {
                                    console.log("Hash not found via mapping, attempting history lookup...");
                                    try {
                                        hash = await getInvoiceHashFromWallet(finalTransactionId, PROGRAM_ID);
                                    } catch (err: any) {
                                        console.warn("History lookup failed or timed out:", err);
                                    }
                                }

                                if (!hash) {
                                    console.log("Hash not found via wallet, attempting public chain fetch...");
                                    try {
                                        await new Promise(r => setTimeout(r, 2000));
                                        hash = await getInvoiceHashFromChain(finalTransactionId);
                                    } catch (err: any) {
                                        console.warn("Public chain lookup failed:", err);
                                    }
                                }

                                if (!hash) throw new Error("Could not retrieve Invoice Hash from wallet execution.");

                                setStatus('Hash retrieved successfully! Saving to database...');
                                try {
                                    const { createInvoice } = await import('../services/api');
                                    await createInvoice({
                                        invoice_hash: hash,
                                        merchant_address: merchant,
                                        amount: Number(amount),
                                        memo: memo || '',
                                        status: 'PENDING',
                                        invoice_transaction_id: finalTransactionId,
                                        salt: salt,
                                        invoice_type: invoiceType === 'multipay' ? 1 : 0,
                                        token_type: tokenType
                                    });
                                    console.log("Invoice saved to DB");
                                } catch (dbErr) {
                                    console.error("Failed to save invoice to DB:", dbErr);
                                }

                                const params = new URLSearchParams({
                                    merchant,
                                    amount: amount.toString(),
                                    salt
                                });
                                if (memo) params.append('memo', memo);
                                if (invoiceType === 'multipay') params.append('type', 'multipay');
                                if (tokenType === 1) params.append('token', 'usdcx');

                                const link = `${window.location.origin}/pay?${params.toString()}`;

                                setInvoiceData({ merchant, amount: Number(amount), salt, hash, link });
                                setStatus(`Invoice Created Successfully!`);
                                return;
                            } else {
                                throw new Error(`Transaction failed with status: ${currentStatus}`);
                            }
                        }
                    } catch (e: any) {
                        console.warn('Error polling status:', e);
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
    const getInvoiceHashFromWallet = async (finalTxId: string, programId: string): Promise<string | null> => {
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
                            const history = await requestTransactionHistory(programId);
                            const foundTx = history.transactions.find((t: any) => t.transactionId === safeTxId || t.id === safeTxId);

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
                // Ignore transient errors
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
        setInvoiceType('standard');
        setTokenType(0);
    };

    return {
        amount,
        setAmount,
        memo,
        setMemo,
        status,
        loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey,
        invoiceType,
        setInvoiceType,
        tokenType,
        setTokenType
    };
};
