import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { getInvoiceHashFromMapping, getInvoiceData, PROGRAM_ID, generateSalt } from '../utils/aleo-utils';

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
        tokenType: number;
        invoiceType: number;
    } | null>(null);

    const [donationAmount, setDonationAmount] = useState<string>('');

    const [status, setStatus] = useState<string>('Initializing...');
    const [step, setStep] = useState<PaymentStep>('CONNECT');
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [conversionTxId, setConversionTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [programId, setProgramId] = useState<string | null>(null);

    const [paymentSecret, setPaymentSecret] = useState<string | null>(null);
    const [receiptHash] = useState<string | null>(null);
    const [receiptSearchFailed, setReceiptSearchFailed] = useState(false);

    useEffect(() => {
        const init = async () => {
            const merchant = searchParams.get('merchant');
            const amount = searchParams.get('amount');
            const salt = searchParams.get('salt');
            const memo = searchParams.get('memo') || '';
            const tokenParam = searchParams.get('token');
            const tokenType = tokenParam === 'usdcx' ? 1 : 0;
            const typeParam = searchParams.get('type');
            let initialType = typeParam === 'donation' ? 2 : (typeParam === 'multipay' ? 1 : 0);

            if (!merchant || !salt) {
                setError('Invalid Invoice Link: Missing parameters');
                return;
            }
            if (!amount && initialType !== 2) {
                setError('Invalid Invoice Link: Missing amount');
                return;
            }

            setError(null);

            try {
                setLoading(true);
                setStatus('Verifying Invoice on-chain...');

                setProgramId(PROGRAM_ID);
                setPaymentSecret(generateSalt());

                const fetchedHash = await getInvoiceHashFromMapping(salt);

                if (!fetchedHash) {
                    setError('Invoice not found or invalid salt.');
                    setLoading(false);
                    return;
                }

                const invoiceData = await getInvoiceData(fetchedHash);
                const statusOnChain = invoiceData ? invoiceData.status : 0;
                const tokenTypeOnChain = invoiceData ? invoiceData.tokenType : (tokenType || 0);
                const invoiceTypeOnChain = invoiceData ? invoiceData.invoiceType : initialType;

                console.log(`🔗 On-Chain Invoice Data | Status: ${statusOnChain}, Token Type: ${tokenTypeOnChain}, Type: ${invoiceTypeOnChain}`);

                if (statusOnChain === 1) {
                    let dbInvoice = null;
                    try {
                        const { fetchInvoiceByHash } = await import('../services/api');
                        dbInvoice = await fetchInvoiceByHash(fetchedHash);
                        if (dbInvoice && dbInvoice.payment_tx_id) {
                            setTxId(dbInvoice.payment_tx_id);
                        }
                    } catch (e) { console.warn("Could not fetch DB details", e); }

                    setInvoice({
                        merchant,
                        amount: Number(amount) || 0,
                        salt,
                        hash: fetchedHash,
                        memo,
                        tokenType: tokenTypeOnChain,
                        invoiceType: invoiceTypeOnChain
                    });
                    setStep('ALREADY_PAID');
                    setLoading(false);
                    return;
                }

                setInvoice({
                    merchant,
                    amount: Number(amount) || 0,
                    salt,
                    hash: fetchedHash,
                    memo,
                    tokenType: tokenTypeOnChain,
                    invoiceType: invoiceTypeOnChain
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

        init();
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
            const parsedDonation = Number(donationAmount);
            const finalAmount = (invoice.amount === 0 && parsedDonation > 0) ? parsedDonation : invoice.amount;
            const bufferAmount = finalAmount + 0.01;
            const amountMicro = Math.round(bufferAmount * 1_000_000);

            const transaction: TransactionOptions = {
                program: 'credits.aleo',
                function: 'transfer_public_to_private',
                inputs: [publicKey, `${amountMicro}u64`],
                fee: 100_000,
                privateFee: false
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

    const pollTransaction = async (initialTxId: string) => {
        if (!wallet || !wallet.adapter) return;

        let isPending = true;
        let attempts = 0;
        let onChainId = initialTxId;

        while (isPending && attempts < 120) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            try {
                const statusRes = await wallet.adapter.transactionStatus(initialTxId);
                const statusStr = typeof statusRes === 'string'
                    ? (statusRes as string).toLowerCase()
                    : (statusRes as any)?.status?.toLowerCase();

                if ((statusRes as any)?.transactionId) {
                    onChainId = (statusRes as any).transactionId;
                    console.log("Payment On-Chain ID found:", onChainId);
                    setTxId(onChainId);
                }

                if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                    setStep('SUCCESS');
                    setStatus('Payment Successful!');

                    try {
                        const { updateInvoiceStatus, fetchInvoiceByHash } = await import('../services/api');

                        const updatePayload: any = {
                            payment_tx_ids: onChainId,
                            payer_address: publicKey || undefined
                        };
                        if (invoice?.hash) {
                            const currentDbInvoice = await fetchInvoiceByHash(invoice.hash);
                            if (currentDbInvoice && currentDbInvoice.invoice_type === 1) {
                                console.log("Multi Pay Invoice detected. Keeping status as PENDING.");
                            } else {
                                updatePayload.status = 'SETTLED';
                            }
                            await updateInvoiceStatus(invoice.hash, updatePayload);
                        }
                        if (programId && invoice?.hash) {
                            setStatus('Syncing Receipt Record...');
                            await new Promise(r => setTimeout(r, 1000));
                            setReceiptSearchFailed(true);
                        }

                    } catch (dbErr) { console.error(dbErr); }

                    isPending = false;
                } else if (statusStr === 'failed' || statusStr === 'rejected') {
                    throw new Error('Transaction rejected on-chain.');
                }
            } catch (err) {
                console.warn("Polling error:", err);
            }
        }
    };

    const payInvoiceUSDCx = async () => {
        if (!invoice || !publicKey || !executeTransaction || !requestRecords || !programId) return;

        try {
            setLoading(true);
            setStatus('Syncing USDCx Records...');

            const usdcxProgramId = 'test_usdcx_stablecoin.aleo';

            // Define helper to process/decrypt single record
            const processUSDCxRecord = async (r: any): Promise<bigint> => {
                try {
                    // 1. Try plaintext amount
                    if (r.data && r.data.amount) return BigInt(r.data.amount.replace('u128', ''));
                    if (r.plaintext) {
                        const match = r.plaintext.match(/amount:\s*([\d_]+)u128/);
                        if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
                    }

                    // 2. Try decrypting if needed
                    if (r.recordCiphertext && !r.plaintext && decrypt) {
                        try {
                            const decrypted = await decrypt(r.recordCiphertext);
                            if (decrypted) {
                                console.log("Decrypted USDCx Record:", decrypted);
                                r.plaintext = decrypted;
                                const match = decrypted.match(/amount:\s*([\d_]+)u128/);
                                if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
                            }
                        } catch (e) { console.warn("USDCx Decrypt failed", e); }
                    }
                    return BigInt(0);
                } catch { return BigInt(0); }
            };

            // First Attempt
            let records = await requestRecords(usdcxProgramId, false);
            console.log("USDCx Records (Initial):", records);

            const isDonation = invoice.invoiceType === 2;
            const parsedDonation = Number(donationAmount);
            const finalAmount = (isDonation && parsedDonation > 0) ? parsedDonation : invoice.amount;
            const amountMicro = BigInt(Math.round(finalAmount * 1_000_000));

            let recordsAny = records as any[];
            let payRecord = null;
            for (const r of recordsAny) {
                if (r.spent) continue;
                const val = await processUSDCxRecord(r);
                if (val >= amountMicro) {
                    payRecord = r;
                    break;
                }
            }
            if (!payRecord) {
                setStatus('Syncing latest USDCx records...');
                await new Promise(r => setTimeout(r, 2000));
                records = await requestRecords(usdcxProgramId, false);
                console.log("USDCx Records (Retry):", records);
                recordsAny = records as any[];
                let totalAvailable = BigInt(0);

                for (const r of recordsAny) {
                    if (r.spent) continue;
                    const val = await processUSDCxRecord(r);
                    totalAvailable += val;

                    if (!payRecord && val >= amountMicro) {
                        payRecord = r;
                    }
                }

                if (!payRecord) {
                    if (totalAvailable >= amountMicro) {
                        setError(`Insufficient single record. Total: ${Number(totalAvailable) / 1_000_000} USDCx. Please merge records.`);
                    } else {
                        setError(`Insufficient private balance. Total: ${Number(totalAvailable) / 1_000_000} USDCx. Needed: ${finalAmount}`);
                    }
                    setLoading(false);
                    return;
                }
            }

            // Proceed with found record
            setStatus('Fetching Freeze List State...');

            // Dynamic Proof Generation Logic
            // Import helper functions dynamically to avoid circular dependencies if any, 
            // or just use what we imported. We need them from ../utils/aleo-utils
            const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex } = await import('../utils/aleo-utils');

            const root = await getFreezeListRoot();
            const count = await getFreezeListCount();
            const firstIndex = await getFreezeListIndex(0);
            console.log(`Freeze List State -> Root: ${root}, Count: ${count}, Index[0]: ${firstIndex}`);
            const { generateFreezeListProof } = await import('../utils/aleo-utils');
            const { Address } = await import('@provablehq/wasm');

            let index0FieldStr = undefined;
            if (firstIndex) {
                // Convert Address to Field (X Coordinate)
                try {
                    const addr = Address.from_string(firstIndex);
                    // Standard way to get field from address in recent SDKs:
                    const grp = addr.toGroup();
                    const x = grp.toXCoordinate();
                    index0FieldStr = x.toString();
                } catch (e) { console.warn("Failed to convert address to field", e); }
            } else {
                console.warn("firstIndex was null or undefined, proceeding with undef for occupied value");
            }
            // Generate proof for Index 1, with neighbor Index 0 potentially occupied
            const proof = await generateFreezeListProof(1, index0FieldStr);

            console.log("Generated Merkle Proof (Right Edge / Index 1):", proof);
            const proofsInput = `[${proof}, ${proof}]`;

            let recordInput = payRecord.plaintext;
            if (!recordInput) {
                if (payRecord.ciphertext) {
                    recordInput = payRecord.ciphertext;
                } else {
                    setError("Could not read record plaintext.");
                    setLoading(false);
                    return;
                }
            }

            setStatus('Requesting USDCx Payment Signature...');

            let inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u128`,
                invoice.salt,
                paymentSecret || '0field',
                invoice.hash,
                proofsInput
            ];

            // Should call pay_donation_usdcx if donation
            const funcName = isDonation ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';

            console.log("Transaction Inputs:", JSON.stringify(inputs, null, 2));

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: funcName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`USDCx Payment Broadcasted: ${result.transactionId}. Polling...`);
                await pollTransaction(result.transactionId);
            } else {
                throw new Error("Transaction failed.");
            }

        } catch (e: any) {
            console.error("USDCx Payment Error:", e);
            setError(e.message || 'USDCx Payment Failed');
            setLoading(false);
        }
    };

    const payInvoiceCredits = async () => {
        if (!invoice || !publicKey || !executeTransaction || !requestRecords || !programId) return;

        try {
            setLoading(true);
            setStatus('Searching for suitable private record...');
            const records = await requestRecords('credits.aleo', false);
            console.log("Wallet Records (Initial):", records);
            const isDonation = invoice.invoiceType === 2;
            const parsedDonation = Number(donationAmount);
            const finalAmount = (isDonation && parsedDonation > 0) ? parsedDonation : invoice.amount;
            const amountMicro = Math.round(finalAmount * 1_000_000);

            const recordsAny = records as any[];
            let payRecord = null;

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
                    let totalBalance = 0;
                    for (const r of latestRecordsAny) {
                        if (!r.spent) totalBalance += await processRecord(r);
                    }
                    if (totalBalance >= amountMicro) {
                        setStatus(`Privacy Protocol requires a single record > ${finalAmount}. Converting...`);
                    } else {
                        setStatus(`Insufficient private balance. Converting...`);
                    }
                    setLoading(false);
                    return;
                }
            }

            console.log("Selected Pay Record:", finalRecord);
            let recordInput = finalRecord.plaintext;

            if (!recordInput) {
                console.warn("Record missing plaintext.");
                const nonce = finalRecord.nonce || finalRecord._nonce || finalRecord.data?._nonce;
                if (nonce) {
                    const microcredits = getMicrocredits(finalRecord.data);
                    const owner = finalRecord.owner;
                    recordInput = `{ owner: ${owner}.private, microcredits: ${microcredits}u64.private, _nonce: ${nonce}.public }`;
                } else if (finalRecord.ciphertext) {
                    recordInput = finalRecord.ciphertext;
                } else {
                    recordInput = finalRecord;
                }
            }

            setStatus('Requesting Payment Signature...');

            // Choose function based on donation status.
            // If donation, we call pay_donation which takes amount_to_donate and calculates hash with 0.
            const funcName = isDonation ? 'pay_donation' : 'pay_invoice';

            let inputs = [
                recordInput,
                invoice.merchant,
                `${amountMicro}u64`,
                invoice.salt,
                paymentSecret || '0field',
                invoice.hash // message/extra field
            ];

            // inputs.push(invoice.hash); // REMOVED: Duplicate argument push 

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: funcName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Transaction Broadcasted: ${result.transactionId}. Polling confirmation...`);
                await pollTransaction(result.transactionId);
            } else {
                throw new Error("Transaction failed.");
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Payment Failed');
            setLoading(false);
        }
    };

    const payInvoice = async () => {
        if (!invoice) return;
        if (invoice.tokenType === 1) {
            await payInvoiceUSDCx();
        } else {
            await payInvoiceCredits();
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
        paymentSecret,
        receiptHash,
        receiptSearchFailed,
        donationAmount,
        setDonationAmount
    };
};
