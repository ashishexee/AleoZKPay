import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { getInvoiceHashFromMapping, getInvoiceStatus, PROGRAM_ID, generateSalt } from '../utils/aleo-utils';

export type PaymentStep = 'CONNECT' | 'VERIFY' | 'CONVERT' | 'PAY' | 'SUCCESS' | 'ALREADY_PAID';

export const usePayment = () => {
    const [searchParams] = useSearchParams();
    const { address, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const publicKey = address;
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

    // New states for V7
    const [programId, setProgramId] = useState<string | null>(null);
    const [message, setMessage] = useState<string>('');
    const [paymentSecret, setPaymentSecret] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const merchant = searchParams.get('merchant');
            const amount = searchParams.get('amount');
            const salt = searchParams.get('salt');
            const memo = searchParams.get('memo') || '';

            if (!merchant || !amount || !salt) {
                setError('Invalid Invoice Link: Missing parameters');
                return;
            }

            try {
                setLoading(true);
                setStatus('Verifying Invoice on-chain...');

                // V7 Consolidation: We assume all valid invoices are on the V7 contract.
                setProgramId(PROGRAM_ID);

                // Always generate Payment Secret because V7 requires it (Standard or Fundraising)
                // For Standard invoices, this secret could still be used for a receipt, though less critical.
                setPaymentSecret(generateSalt());

                // Fetch Hash from Chain
                const fetchedHash = await getInvoiceHashFromMapping(salt); // This now uses PROGRAM_ID

                if (!fetchedHash) {
                    setError('Invoice not found or invalid salt.');
                    setLoading(false);
                    return;
                }

                // Check Status
                const invoiceStatus = await getInvoiceStatus(fetchedHash);

                // Status 1 means Settled/Paid.
                if (invoiceStatus === 1) {
                    // Fetch full details from DB (payment_tx_id etc)
                    let dbInvoice = null;
                    try {
                        const { fetchInvoiceByHash } = await import('../services/api');
                        dbInvoice = await fetchInvoiceByHash(fetchedHash);
                        // If we have a payment_tx_id, set it so "View Transaction" works
                        if (dbInvoice && dbInvoice.payment_tx_id) {
                            setTxId(dbInvoice.payment_tx_id);
                        }
                    } catch (e) { console.warn("Could not fetch DB details", e); }

                    setInvoice({
                        merchant,
                        amount: Number(amount),
                        salt,
                        hash: fetchedHash,
                        memo
                    });
                    setStep('ALREADY_PAID');
                    setLoading(false);
                    return;
                }

                setInvoice({
                    merchant,
                    amount: Number(amount),
                    salt,
                    hash: fetchedHash,
                    memo
                });

                setStatus(''); // Clear status after verification
                if (publicKey) {
                    setStep('PAY');
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

        if (!invoice) {
            init();
        }
    }, [searchParams, publicKey]);



    const getMicrocredits = (record: any): number => {
        try {
            if (record.data && record.data.microcredits) {
                return parseInt(record.data.microcredits.replace('u64', ''));
            }
            if (record.plaintext) {
                const match = record.plaintext.match(/microcredits:\s*([\d_]+)u64/);
                if (match && match[1]) {
                    return parseInt(match[1].replace(/_/g, ''));
                }
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
                setStatus(`Converting... TxID: ${result.transactionId.slice(0, 10)}... Polling for confirmation...`);

                if (!wallet || !wallet.adapter) {
                    await new Promise(r => setTimeout(r, 2000));
                    setStep('PAY');
                    return;
                }

                let isPending = true;
                let attempts = 0;
                while (isPending && attempts < 120) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(result.transactionId);
                        const statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();

                        // Check for final on-chain ID
                        if ((statusRes as any)?.transactionId) {
                            const finalId = (statusRes as any).transactionId;
                            console.log("Conversion On-Chain ID found:", finalId);
                            setConversionTxId(finalId);
                        }

                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Conversion Successful! Switching to Payment...');
                            await new Promise(r => setTimeout(r, 1500));
                            setStep('PAY');
                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Conversion transaction rejected on-chain.');
                        }
                    } catch (err) {
                        console.warn("Polling error or pending:", err);
                    }
                }
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
        if (!invoice || !publicKey || !executeTransaction || !requestRecords || !programId) return;

        try {
            setLoading(true);
            setStatus('Searching for suitable private record...');
            const records = await requestRecords('credits.aleo', false);
            console.log("Wallet Records (Initial):", records);
            const amountMicro = Math.round(invoice.amount * 1_000_000);

            const recordsAny = records as any[];
            let payRecord = null;

            // Helper to get value, decrypting if needed
            const processRecord = async (r: any) => {
                let val = getMicrocredits(r);
                if (val === 0 && r.recordCiphertext && !r.plaintext && decrypt) {
                    try {
                        const decrypted = await decrypt(r.recordCiphertext);
                        if (decrypted) {
                            r.plaintext = decrypted;
                            val = getMicrocredits(r);
                        }
                    } catch (e) { console.warn("Decrypt failed:", e); }
                }
                return val;
            };

            for (const r of recordsAny) {
                if (r.spent) continue;
                const val = await processRecord(r);

                // Check spendability again after potential decryption
                const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);

                if (isSpendable && val > amountMicro) {
                    payRecord = r;
                    break;
                }
            }

            let finalRecord = payRecord;

            if (!finalRecord) {
                setStatus('Syncing latest records...');
                await new Promise(r => setTimeout(r, 2000));
                const latestRecords = await requestRecords('credits.aleo', false);
                console.log("Wallet Records (Retry):", latestRecords);
                const latestRecordsAny = latestRecords as any[];

                for (const r of latestRecordsAny) {
                    if (r.spent) continue;
                    const val = await processRecord(r);
                    if (val >= amountMicro) {
                        finalRecord = r;
                        break;
                    }
                }

                if (finalRecord) {
                    setStatus('Records synced! Proceeding with payment...');
                } else {
                    setStep('CONVERT');

                    // Calculate total balance - need to decrypt all unspent
                    let totalBalance = 0;
                    let maxRecord = 0;

                    for (const r of latestRecordsAny) {
                        if (!r.spent) {
                            const val = await processRecord(r);
                            totalBalance += val;
                            if (val > maxRecord) maxRecord = val;
                        }
                    }

                    if (totalBalance >= amountMicro) {
                        setStatus(`Privacy Protocol requires a single record > ${invoice.amount}. Your largest is ${maxRecord / 1000000}. Converting ${invoice.amount} more will create a unified record.`);
                    } else {
                        setStatus(`Insufficient private balance. Converting ${invoice.amount + 0.01} to private...`);
                    }
                    setLoading(false);
                    return;
                }
            }

            console.log("Selected Pay Record:", finalRecord);
            let recordInput = finalRecord.plaintext;

            if (!recordInput) {
                console.warn("Record missing plaintext. Attempting to reconstruct...");
                const nonce = finalRecord.nonce || finalRecord._nonce || finalRecord.data?._nonce;

                if (nonce) {
                    const microcredits = getMicrocredits(finalRecord.data);
                    const owner = finalRecord.owner;
                    recordInput = `{ owner: ${owner}.private, microcredits: ${microcredits}u64.private, _nonce: ${nonce}.public }`;
                    console.log("Reconstructed Plaintext:", recordInput);
                } else if (finalRecord.ciphertext) {
                    console.log("Found Ciphertext. Using it as input.");
                    recordInput = finalRecord.ciphertext;
                } else {
                    console.warn("Could not find keys. Attempting to pass raw record object to adapter...");
                    recordInput = finalRecord;
                }
            }

            setStatus('Requesting Payment Signature...');

            let inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u64`,
                invoice.salt
            ];

            // Always add Secret and Message for V7
            console.log("Adding V7 secret and message inputs");
            inputs.push(paymentSecret || '0field');
            // Message: Use Invoice Hash so we can track payments publicly
            inputs.push(invoice.hash);

            console.log("Transaction Inputs:", inputs);

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: 'pay_invoice',
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Transaction Broadcasted: ${result.transactionId}. Polling confirmation...`);


                if (!wallet || !wallet.adapter) {
                    await new Promise(r => setTimeout(r, 2000));
                    setStep('SUCCESS');
                    return;
                }
                let isPending = true;
                let attempts = 0;
                let onChainId = result.transactionId; // Start with broadcast ID

                while (isPending && attempts < 120) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(result.transactionId);
                        const statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();

                        // Check for final on-chain ID
                        if ((statusRes as any)?.transactionId) {
                            onChainId = (statusRes as any).transactionId;
                            console.log("Payment On-Chain ID found:", onChainId);
                            setTxId(onChainId);
                        }

                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStep('SUCCESS');
                            setStatus('Payment Successful!');

                            // Update Database
                            try {
                                const { updateInvoiceStatus, fetchInvoiceByHash } = await import('../services/api');
                                console.log('Final Payment TX ID for DB:', onChainId);

                                // Fetch invoice first to check type (if not already known, but we likely verify it)
                                // We rely on the initial verification. However, invoice state in hook might NOT have type if it was just loaded from URL params.
                                // We should probably fetch it during init. But assuming we want to be safe:

                                const updatePayload: any = {
                                    payment_tx_ids: onChainId,
                                    payer_address: publicKey || undefined
                                };

                                // ONLY Set 'SETTLED' if it is a Standard Invoice (Type 0)
                                // If Fundraising (Type 1), we leave it PENDING/OPEN.
                                // If we don't know the type from state, default to SETTLED (Wave 1 behavior) unless we are sure.
                                // Ideally, 'invoice' state should have 'type'.
                                // For now, let's assume if it is NOT fundraising explicit, we settle.
                                // Note: We need to ensure we know the type.

                                // Let's fetch the invoice type from DB to be sure before updating status
                                const currentDbInvoice = await fetchInvoiceByHash(invoice.hash);
                                if (currentDbInvoice && currentDbInvoice.invoice_type === 1) {
                                    console.log("Fundraising Invoice detected. Keeping status as PENDING.");
                                } else {
                                    updatePayload.status = 'SETTLED';
                                }

                                await updateInvoiceStatus(invoice.hash, updatePayload);
                                console.log("Invoice updated in DB");
                            } catch (dbErr) {
                                console.error("Failed to update invoice in DB:", dbErr);
                            }

                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Transaction rejected on-chain.');
                        }
                    } catch (err) {
                        console.warn("Polling error or pending:", err);
                    }
                }
            } else {
                throw new Error("Transaction failed.");
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Payment Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!publicKey) return;
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
        handleConnect,
        programId,
        message,
        setMessage,
        paymentSecret
    };
};
