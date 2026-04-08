import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { estimateExecutionFee, getInvoiceHashFromMapping, getInvoiceData, PROGRAM_ID, generateSalt } from '../../utils/aleo-utils';
import { executeWithShieldRetry } from '../../utils/shieldRetry';
import { useWalletErrorHandler } from '../Wallet/WalletErrorBoundary';
import type { PaymentStep, InvoiceState, PaymentNoteInput } from './types';
import { createClient } from '@supabase/supabase-js';
import { getScannerSession, findSpendableRecord } from '../../pages/Profile/components/BurnerWallet/scanner';
import { PrivateKey, AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import { getAllowedTokensForInvoice, getTokenTypeFromCode } from '../../utils/tokens';
import { decryptCardPrivateKey } from '../../utils/card-crypto';
import { hashAddress } from '../../utils/crypto';
import { resolveCardLookupByHashHex } from '../../utils/card-chain';
import { stringToField } from '../../utils/aleo-utils';
import { getUtf8ByteLength, LEO_PAYMENT_NOTE_MAX_BYTES } from '../../utils/leo-input-limits';

const fromHex = (hex: string) => new TextDecoder().decode(new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface GiftCardRedeemOption {
    giftCode: string;
    availableAmount: number;
    redeemMicros: number;
    tokenProgram: string;
    tokenLabel: string;
    isCredits: boolean;
}

export const useSharedPayment = () => {
    const [searchParams] = useSearchParams();
    const { address, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const publicKey = address;
    const [invoice, setInvoice] = useState<InvoiceState | null>(null);
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
    const [giftCardRedeemOption, setGiftCardRedeemOption] = useState<GiftCardRedeemOption | null>(null);
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const resolveActiveTokenType = (selectedTokenOverride?: number) => {
        if (!invoice) return 0;
        if (selectedTokenOverride !== undefined) return selectedTokenOverride;
        const allowedTokens = getAllowedTokensForInvoice(invoice.tokenType, invoice.invoiceType);
        return getTokenTypeFromCode(allowedTokens[0]);
    };

    const encodePaymentNote = (value?: string | null, label: string = 'Payment note') => {
        const normalized = (value || '').trim();
        if (!normalized) {
            return '0field';
        }
        if (getUtf8ByteLength(normalized) > LEO_PAYMENT_NOTE_MAX_BYTES) {
            throw new Error(`${label} must stay within ${LEO_PAYMENT_NOTE_MAX_BYTES} bytes for one Leo field.`);
        }
        return stringToField(normalized);
    };

    useEffect(() => {
        if (!status || status.startsWith('at1')) return;
        setStatusLog((current) => current[current.length - 1] === status ? current : [...current, status]);
    }, [status]);

    useEffect(() => {
        if (!error) return;
        const errorMessage = `ERROR: ${error}`;
        setStatusLog((current) => current[current.length - 1] === errorMessage ? current : [...current, errorMessage]);
    }, [error]);

    const clearStatusLog = () => setStatusLog([]);

    const resetPaymentFeedback = () => {
        setError(null);
        setStatus('');
        setGiftCardRedeemOption(null);
        clearStatusLog();
    };

    useEffect(() => {
        const init = async () => {
            let merchant = searchParams.get('merchant');
            let amount = searchParams.get('amount');
            let salt = searchParams.get('salt');
            let hashParam = searchParams.get('hash');

            const memo = searchParams.get('memo') || '';
            const tokenParam = searchParams.get('token');
            const tokenType = tokenParam === 'usdcx' ? 1 : tokenParam === 'usad' ? 2 : tokenParam === 'any' ? 3 : 0;
            const typeParam = searchParams.get('type');
            let initialType = typeParam === 'donation' ? 2 : (typeParam === 'multipay' ? 1 : 0);
            const sessionId = searchParams.get('session_id');

            try {
                setLoading(true);
                setStatus('Verifying Invoice...');

                setProgramId(PROGRAM_ID);
                setPaymentSecret(generateSalt());

                let fetchedHash: string | null = hashParam || null;

                // If they provided a raw hash (like from Profile QR), try fetching metadata from DB first
                if (fetchedHash && (!merchant || !salt)) {
                    try {
                        const { fetchInvoiceByHash } = await import('../../services/api');
                        const dbInvoice = await fetchInvoiceByHash(fetchedHash);
                        if (dbInvoice) {
                            // Use designated_address (plaintext) since merchant_address is now encrypted
                            merchant = dbInvoice.designated_address || dbInvoice.merchant_address || null;
                            salt = dbInvoice.salt || null;

                            // Amount is conceptually 0 for Donations, but DB doesn't store Amount.
                            // However Profile/Donation QR creates them with 0.
                            const coercedAmount = dbInvoice.amount ? dbInvoice.amount.toString() : amount;
                            amount = dbInvoice.invoice_type === 2 ? '0' : (coercedAmount || null);
                            initialType = dbInvoice.invoice_type !== undefined ? dbInvoice.invoice_type : initialType;
                        }
                    } catch (e) { console.warn("Could not fetch missing DB details for Hash-only link", e); }
                }

                if (!merchant || !salt) {
                    setError('Invalid Invoice Link: Missing merchant or salt parameters');
                    setLoading(false);
                    return;
                }

                setError(null);

                if (!fetchedHash) {
                    fetchedHash = await getInvoiceHashFromMapping(salt || '');
                    if (!fetchedHash) {
                        setError('Invoice not found or invalid salt.');
                        setLoading(false);
                        return;
                    }
                }

                const invoiceData = await getInvoiceData(fetchedHash);
                const statusOnChain = invoiceData ? invoiceData.status : 0;
                const tokenTypeOnChain = invoiceData ? invoiceData.tokenType : (tokenType || 0);

                // Fetch DB details to check for manual settlement or off-chain status
                let dbInvoice = null;
                try {
                    const { fetchInvoiceByHash } = await import('../../services/api');
                    dbInvoice = await fetchInvoiceByHash(fetchedHash);
                } catch (e) { console.warn("Could not fetch DB details", e); }

                const finalInvoiceType = invoiceData ? invoiceData.invoiceType : (dbInvoice?.invoice_type !== undefined ? dbInvoice.invoice_type : initialType);

                console.log(`🔗 On-Chain Invoice Data | Status: ${statusOnChain}, Token Type: ${tokenTypeOnChain}, Type: ${finalInvoiceType}`);

                if (!amount && finalInvoiceType !== 2) {
                    setError('Invalid Invoice Link: Missing amount');
                    setLoading(false);
                    return;
                }
                // Safely parse URL amount which might be a micro-token string like '1000000u128' or '1000000u64'
                let finalAmount = 0;
                if (amount) {
                    if (amount.includes('u')) {
                        const rawVal = parseFloat(amount.split('u')[0]);
                        if (!isNaN(rawVal)) finalAmount = rawVal / 1_000_000;
                    } else {
                        finalAmount = Number(amount) || 0;
                    }
                }

                // Override with exact DB amount if available
                if (dbInvoice && dbInvoice.amount !== undefined) {
                    finalAmount = dbInvoice.invoice_type === 2 ? 0 : Number(dbInvoice.amount);
                }

                // Check if Settled on-chain OR manually settled in DB
                if (statusOnChain === 1 || (dbInvoice && dbInvoice.status === 'SETTLED')) {
                    if (dbInvoice && dbInvoice.payment_tx_id) {
                        setTxId(dbInvoice.payment_tx_id);
                    }

                    setInvoice({
                        merchant,
                        amount: finalAmount,
                        salt,
                        hash: fetchedHash!,
                        memo,
                        tokenType: tokenTypeOnChain,
                        invoiceType: finalInvoiceType,
                        items: dbInvoice?.invoice_items || undefined,
                        sessionId: sessionId || undefined
                    });
                    setStep('ALREADY_PAID');
                    setLoading(false);
                    return;
                }

                setInvoice({
                    merchant,
                    amount: finalAmount,
                    salt,
                    hash: fetchedHash!,
                    memo,
                    tokenType: tokenTypeOnChain,
                    invoiceType: finalInvoiceType,
                    items: dbInvoice?.invoice_items || undefined,
                    sessionId: sessionId || undefined
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

    // Real-Time Supabase Listener for Payment Intents
    useEffect(() => {
        const sessionId = invoice?.sessionId;
        if (!sessionId || !supabaseUrl || !supabaseKey) return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const channel = supabase.channel(`intent_monitor_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payment_intents',
                    filter: `id=eq.${sessionId}`
                },
                async (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus === 'SETTLED') {
                        console.log(`📡 [Real-Time] Payment Intent settled! Fetching session redirect URL...`);
                        setStep('SUCCESS');
                        setStatus('Payment Successful! Redirecting...');

                        try {
                            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                            const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`);
                            if (response.ok) {
                                const data = await response.json();
                                const redirectUrl = data.success_url;

                                if (redirectUrl) {
                                    console.log(`[useSharedPayment] Scheduling redirect to: ${redirectUrl} in 2 seconds...`);
                                    setTimeout(() => {
                                        try {
                                            const url = new URL(redirectUrl as string);
                                            url.searchParams.set('session_id', sessionId);
                                            window.location.href = url.toString();
                                        } catch (e) {
                                            window.location.href = redirectUrl as string + (redirectUrl.includes('?') ? '&' : '?') + `session_id=${sessionId}`;
                                        }
                                    }, 2000);
                                }
                            }
                        } catch (err) {
                            console.error("Failed to fetch session redirect url", err);
                        }
                    }
                }
            )
            .subscribe();
        const intervalId = setInterval(async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'SETTLED' && step !== 'SUCCESS') {
                        console.log(`📡 [Polling] Payment Intent settled! Fetching session redirect URL...`);
                        setStep('SUCCESS');
                        setStatus('Payment Successful! Redirecting...');

                        const redirectUrl = data.success_url;
                        if (redirectUrl) {
                            console.log(`[useSharedPayment] Scheduling redirect to: ${redirectUrl} in 2 seconds...`);
                            setTimeout(() => {
                                try {
                                    const url = new URL(redirectUrl as string);
                                    url.searchParams.set('session_id', sessionId);
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.href = redirectUrl as string + (redirectUrl.includes('?') ? '&' : '?') + `session_id=${sessionId}`;
                                }
                            }, 2000);
                        }
                    }
                }
            } catch (err) { }
        }, 3000);

        return () => {
            channel.unsubscribe();
            clearInterval(intervalId);
        };
    }, [invoice?.sessionId]);


    const pollTransaction = async (initialTxId: string) => {
        let isPending = true;
        let attempts = 0;
        let onChainId = initialTxId;

        while (isPending && attempts < 120) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            try {
                let statusStr = '';
                if (wallet && wallet.adapter) {
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(initialTxId);
                        statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();
                        if ((statusRes as any)?.transactionId) {
                            onChainId = (statusRes as any).transactionId;
                        }
                    } catch (e) { }
                }

                if (!statusStr) {
                    try {
                        const res = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${initialTxId}`);
                        if (res.ok) {
                            statusStr = 'completed';
                        }
                    } catch (e) { }
                }

                if (onChainId) {
                    setTxId(onChainId);
                }

                if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                    setStep('SUCCESS');
                    setStatus('Payment Successful!');

                    try {
                        const { updateInvoiceStatus, fetchInvoiceByHash } = await import('../../services/api');
                        console.log("📝 [usePayment] Updating Invoice in DB...", { onChainId, invoiceHash: invoice?.hash });

                        const updatePayload: any = {
                            payment_tx_ids: onChainId
                        };

                        if (invoice?.sessionId) {
                            updatePayload.session_id = invoice.sessionId;
                        }

                        if (invoice?.hash) {
                            const currentDbInvoice = await fetchInvoiceByHash(invoice.hash);
                            if (currentDbInvoice && (currentDbInvoice.invoice_type === 1 || currentDbInvoice.invoice_type === 2)) {
                                console.log("ℹ️ Multi Pay / Donation Invoice detected. Keeping status as PENDING.");
                            } else {
                                updatePayload.status = 'SETTLED';
                            }
                            console.log("📤 Sending Update Payload:", updatePayload);
                            await updateInvoiceStatus(invoice.hash, updatePayload);
                            console.log("✅ DB Update Successful!");
                        }

                        if (invoice?.sessionId) {
                            try {
                                console.log(`📢 [usePayment] Updating Checkout Session ${invoice.sessionId}`);
                                const checkoutApiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                                await fetch(`${checkoutApiUrl}/checkout/sessions/${invoice.sessionId}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'SETTLED', tx_id: onChainId })
                                });
                                console.log("✅ Checkout Session Updated!");
                            } catch (checkoutErr) {
                                console.error("❌ Failed to update checkout session:", checkoutErr);
                            }
                        }

                        if (programId && invoice?.hash) {
                            setStatus('Syncing Receipt Record...');
                            await new Promise(r => setTimeout(r, 1000));
                            setReceiptSearchFailed(true);
                        }

                    } catch (dbErr) { console.error("❌ DB Update Error:", dbErr); }

                    isPending = false;
                } else if (statusStr === 'failed' || statusStr === 'rejected') {
                    throw new Error('Transaction rejected on-chain.');
                }
            } catch (err) {
                console.warn("Polling error:", err);
            }
        }
    };

    // ─── Convert public Credits/Tokens to private ─────────────────────────────
    const convertPublicToPrivate = async (overrideAmount?: number, selectedTokenOverride?: number) => {
        if (!invoice || !publicKey || !executeTransaction) return;

        try {
            setLoading(true);

            const activeTokenType = resolveActiveTokenType(selectedTokenOverride);

            // Determine Program ID and type suffix based on token type
            let tokenProgramId = 'credits.aleo';
            let typeSuffix = 'u64';
            let tokenName = 'Credits';

            if (activeTokenType === 1) {
                tokenProgramId = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USDCx';
            } else if (activeTokenType === 2) {
                tokenProgramId = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USAD';
            }

            setStatus(`Converting Public ${tokenName} to Private...`);
            const parsedDonation = Number(donationAmount);
            const invoiceAmount = (invoice.amount === 0 && parsedDonation > 0) ? parsedDonation : invoice.amount;

            const finalAmount = (overrideAmount !== undefined && overrideAmount > 0) ? overrideAmount : invoiceAmount;
            const amountMicro = Math.round(finalAmount * 1_000_000);
            const inputs = [publicKey, `${amountMicro}${typeSuffix}`];
            const estimatedFee = await estimateExecutionFee({
                programName: tokenProgramId,
                functionName: 'transfer_public_to_private',
                inputs,
                fallbackMicrocredits: 100_000
            });

            const transaction: TransactionOptions = {
                program: tokenProgramId,
                function: 'transfer_public_to_private',
                inputs,
                fee: estimatedFee,
                privateFee: false
            };

            const result = await executeWithShieldRetry(
                () => executeTransaction(transaction),
                { onRetry: () => setStatus('Shield Wallet gave no response. Retrying conversion request...') }
            );

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
                        if ((statusRes as any)?.transactionId) {
                            const finalId = (statusRes as any).transactionId;
                            console.log("Conversion On-Chain ID found:", finalId);
                            setConversionTxId(finalId);
                        }

                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Conversion Successful! Refreshing page...');
                            await new Promise(r => setTimeout(r, 1500));
                            // Refresh the page so the newly minted private records are picked up correctly
                            window.location.reload();
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

    const redeemGiftCardBalance = async () => {
        if (!invoice || !giftCardRedeemOption) return;
        if (!publicKey) {
            setError('Connect your wallet first so we can redeem the gift card balance to it.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setStatus(`Redeeming ${giftCardRedeemOption.availableAmount.toFixed(2)} ${giftCardRedeemOption.tokenLabel} to your wallet...`);

            const hex = giftCardRedeemOption.giftCode.replace('gift-', '');
            const pkStr = fromHex(hex);
            PrivateKey.from_string(pkStr);

            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            const scannerSession = await getScannerSession(pkStr);
            const recordProvider = new NetworkRecordProvider(scannerSession.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(scannerSession.account);

            const recordName = giftCardRedeemOption.isCredits ? 'credits' : 'Token';
            const redeemRecordStr = await findSpendableRecord(
                scannerSession,
                giftCardRedeemOption.tokenProgram,
                recordName,
                giftCardRedeemOption.redeemMicros,
                giftCardRedeemOption.isCredits
            );

            if (!redeemRecordStr) {
                throw new Error('This gift card balance is split across multiple records. Please redeem it from the Gift Cards page or try a smaller amount.');
            }

            const amountFormatted = `${giftCardRedeemOption.redeemMicros}${giftCardRedeemOption.isCredits ? 'u64' : 'u128'}`;
            const functionName = 'transfer_private';
            let inputs: string[];

            if (giftCardRedeemOption.isCredits) {
                inputs = [redeemRecordStr, publicKey, amountFormatted];
            } else {
                const { getFreezeListIndex, generateFreezeListProof } = await import('../../utils/aleo-utils');
                const { Address } = await import('@provablehq/wasm');
                const firstIndex = await getFreezeListIndex(0);
                let index0FieldStr = undefined;
                if (firstIndex) {
                    try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                }
                const proof = await generateFreezeListProof(1, index0FieldStr);
                const proofsInput = `[${proof}, ${proof}]`;
                inputs = [publicKey, amountFormatted, redeemRecordStr, proofsInput];
            }

            const authorization = await programManager.buildAuthorization({
                programName: giftCardRedeemOption.tokenProgram,
                functionName,
                inputs
            });

            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    execution_authorization_string: authorization.toString(),
                    programName: giftCardRedeemOption.tokenProgram
                }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Redeem sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            setTxId(transactionId);
            setGiftCardRedeemOption(null);
            setStatus(`Redeem submitted! NullPay covered the gas fee. Once it settles, switch to Wallet and pay the invoice.`);
        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || 'Failed to redeem gift card balance.');
        } finally {
            setLoading(false);
        }
    };

    const payWithGiftCard = async (giftCode: string, selectedTokenOverride?: number, notes?: PaymentNoteInput) => {
        if (!invoice) return;
        if (!giftCode.startsWith('gift-')) {
            setError('Invalid Gift Card format.');
            return;
        }
        if (!publicKey) {
            setError('Connect your main wallet first so NullPay can mint the payer receipt to it.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setGiftCardRedeemOption(null);
            setStatus('Authenticating Gift Card...');

            const hex = giftCode.replace('gift-', '');
            const pkStr = fromHex(hex);
            PrivateKey.from_string(pkStr); // Validate format

            const isDonationType = invoice.invoiceType === 2 || invoice.amount === 0;
            const parsedDonation = Number(donationAmount) || 0;
            const finalAmount = (isDonationType && parsedDonation > 0) ? parsedDonation : invoice.amount;
            if (finalAmount <= 0) throw new Error("Amount must be greater than zero.");

            const activeTokenType = resolveActiveTokenType(selectedTokenOverride);

            let tokenProgram = 'credits.aleo';
            let tokenName = 'Credits';
            let amountMicro = Math.round(finalAmount * 1_000_000);
            let typeSuffix = 'u64';
            let funcName = isDonationType ? 'pay_donation' : 'pay_invoice';

            if (activeTokenType === 1) {
                tokenProgram = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
                tokenName = 'USDCx';
            } else if (activeTokenType === 2) {
                tokenProgram = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usad' : 'pay_invoice_usad';
                tokenName = 'USAD';
            }

            setStatus('Scanning Gift Card balance...');
            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            const scannerSession = await getScannerSession(pkStr);
            const recordProvider = new NetworkRecordProvider(scannerSession.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(scannerSession.account);

            let recordName = activeTokenType === 0 ? 'credits' : 'Token';

            const { scanProgramBalance } = await import('../../pages/Profile/components/BurnerWallet/scanner');
            const totalMicros = await scanProgramBalance(scannerSession, tokenProgram, recordName);
            if (totalMicros < amountMicro) {
                if (!isDonationType && totalMicros > 0) {
                    setGiftCardRedeemOption({
                        giftCode,
                        availableAmount: totalMicros / 1_000_000,
                        redeemMicros: totalMicros,
                        tokenProgram,
                        tokenLabel: tokenName,
                        isCredits: activeTokenType === 0
                    });
                    throw new Error(`This gift card has ${totalMicros / 1_000_000} ${tokenName}. Redeem it to your wallet first, then pay the invoice from Wallet. NullPay covers the redeem gas fee.`);
                }
                throw new Error(`Insufficient balance! Your card has ${totalMicros / 1_000_000} ${tokenName}, but you need ${finalAmount} ${tokenName}.`);
            }

            const payRecordStr = await findSpendableRecord(scannerSession, tokenProgram, recordName, amountMicro, activeTokenType === 0);

            if (!payRecordStr) throw new Error(`Insufficient Gift Card balance. Must have a single record large enough.`);

            setStatus('Generating ZK Proofs locally...');
            let proofsInput = undefined;
            if (activeTokenType !== 0) {
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex, generateFreezeListProof } = await import('../../utils/aleo-utils');
                await getFreezeListRoot();
                await getFreezeListCount();
                const firstIndex = await getFreezeListIndex(0);
                const { Address } = await import('@provablehq/wasm');
                let index0FieldStr = undefined;
                if (firstIndex) {
                    try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                }
                const proof = await generateFreezeListProof(1, index0FieldStr);
                proofsInput = `[${proof}, ${proof}]`;
            }

            if (!invoice.merchant) throw new Error("Merchant address is missing from invoice details.");
            const payerNoteField = encodePaymentNote(notes?.payerNote, 'Payer note');
            const merchantNoteField = encodePaymentNote(notes?.merchantNote, 'Merchant note');

            const inputs = [
                payRecordStr,
                invoice.merchant,
                publicKey,
                `${amountMicro}${typeSuffix}`,
                invoice.salt || '',
                paymentSecret || '',
                payerNoteField,
                merchantNoteField,
                invoice.hash || ''
            ];

            if (proofsInput) inputs.push(proofsInput);

            const authorization = await programManager.buildAuthorization({
                programName: programId || PROGRAM_ID,
                functionName: funcName,
                inputs
            });

            setStatus('Submitting payment via DPS Relayer...');
            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName: programId || PROGRAM_ID }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Payment sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            setTxId(transactionId);
            setStatus(`Transaction Broadcasted! Waiting for network...`);

            // Start polling for this success
            pollTransaction(transactionId);

        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || "An error occurred during Gift Card payment.");
        } finally {
            setLoading(false);
        }
    };

    const payWithCard = async (
        cardNumber: string,
        pin: string,
        cardSecret: string,
        selectedTokenOverride?: number,
        notes?: PaymentNoteInput
    ) => {
        if (!invoice) return;

        try {
            setLoading(true);
            setError(null);
            setGiftCardRedeemOption(null);
            setStatus('Looking up your NullPay card...');

            const normalizedCardNumber = cardNumber.replace(/\D/g, '');
            if (normalizedCardNumber.length !== 16) {
                throw new Error('Enter a valid 16-digit card number.');
            }

            const cardNumberHash = await hashAddress(normalizedCardNumber);
            const cardProfile = await resolveCardLookupByHashHex(cardNumberHash);

            if (!cardProfile) {
                throw new Error('Card not found. Check the card number and try again.');
            }
            if (cardProfile.card_status !== 'ACTIVE') {
                throw new Error('This NullPay card is not active.');
            }
            if (!cardProfile.encrypted_card_private_key || !cardProfile.card_kdf_salt) {
                throw new Error('This card is missing encrypted key material.');
            }
            if (!cardProfile.mainOwner) {
                throw new Error('This card is missing the linked main wallet address.');
            }

            setStatus('Unlocking your NullPay card locally...');

            const kdfAlgorithm = cardProfile.card_kdf_algorithm === 'argon2id'
                ? 'argon2id'
                : 'pbkdf2-sha256';
            const kdfParams = {
                opslimit: Number((cardProfile.card_kdf_params as any)?.opslimit),
                memlimit: Number((cardProfile.card_kdf_params as any)?.memlimit),
                alg: Number((cardProfile.card_kdf_params as any)?.alg),
                iterations: Number((cardProfile.card_kdf_params as any)?.iterations),
                hash: (cardProfile.card_kdf_params as any)?.hash === 'SHA-256' ? 'SHA-256' : undefined,
                version: Number((cardProfile.card_kdf_params as any)?.version || 1)
            };

            const pkStr = await decryptCardPrivateKey(
                cardProfile.encrypted_card_private_key,
                pin,
                cardSecret,
                cardProfile.card_kdf_salt,
                kdfAlgorithm as any,
                kdfParams as any
            );
            PrivateKey.from_string(pkStr);

            const isDonationType = invoice.invoiceType === 2 || invoice.amount === 0;
            const parsedDonation = Number(donationAmount) || 0;
            const finalAmount = (isDonationType && parsedDonation > 0) ? parsedDonation : invoice.amount;
            if (finalAmount <= 0) throw new Error('Amount must be greater than zero.');

            const activeTokenType = resolveActiveTokenType(selectedTokenOverride);

            let tokenProgram = 'credits.aleo';
            let amountMicro = Math.round(finalAmount * 1_000_000);
            let typeSuffix = 'u64';
            let funcName = isDonationType ? 'pay_donation' : 'pay_invoice';

            if (activeTokenType === 1) {
                tokenProgram = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
            } else if (activeTokenType === 2) {
                tokenProgram = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usad' : 'pay_invoice_usad';
            }

            setStatus('Scanning your NullPay card balance...');

            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            const scannerSession = await getScannerSession(pkStr);
            const recordProvider = new NetworkRecordProvider(scannerSession.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(scannerSession.account);

            const recordName = activeTokenType === 0 ? 'credits' : 'Token';
            const payRecordStr = await findSpendableRecord(
                scannerSession,
                tokenProgram,
                recordName,
                amountMicro,
                activeTokenType === 0
            );

            if (!payRecordStr) {
                throw new Error('The card needs a single private record large enough for this payment.');
            }

            setStatus('Generating card proofs locally...');
            let proofsInput = undefined;
            if (activeTokenType !== 0) {
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex, generateFreezeListProof } = await import('../../utils/aleo-utils');
                await getFreezeListRoot();
                await getFreezeListCount();
                const firstIndex = await getFreezeListIndex(0);
                const { Address } = await import('@provablehq/wasm');
                let index0FieldStr = undefined;
                if (firstIndex) {
                    try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                }
                const proof = await generateFreezeListProof(1, index0FieldStr);
                proofsInput = `[${proof}, ${proof}]`;
            }

            if (!invoice.merchant) {
                throw new Error('Merchant address is missing from invoice details.');
            }
            const payerNoteField = encodePaymentNote(notes?.payerNote, 'Payer note');
            const merchantNoteField = encodePaymentNote(notes?.merchantNote, 'Merchant note');

            setStatus('Authorizing secure card payment...');
            const inputs = [
                payRecordStr,
                invoice.merchant,
                cardProfile.mainOwner,
                `${amountMicro}${typeSuffix}`,
                invoice.salt || '',
                paymentSecret || '',
                payerNoteField,
                merchantNoteField,
                invoice.hash || ''
            ];

            if (proofsInput) inputs.push(proofsInput);

            const authorization = await programManager.buildAuthorization({
                programName: programId || PROGRAM_ID,
                functionName: funcName,
                inputs
            });

            setStatus('Submitting card payment via DPS Relayer...');
            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    execution_authorization_string: authorization.toString(),
                    programName: programId || PROGRAM_ID
                }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Card payment sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            setTxId(transactionId);
            setStatus('Card payment broadcasted. Waiting for final confirmation...');
            pollTransaction(transactionId);
        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || 'An error occurred during card payment.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!publicKey) return;
        setStep('PAY');
    };

    return {
        // State
        invoice,
        donationAmount,
        setDonationAmount,
        status,
        setStatus,
        step,
        setStep,
        loading,
        setLoading,
        txId,
        setTxId,
        conversionTxId,
        error,
        setError,
        programId,
        paymentSecret,
        receiptHash,
        receiptSearchFailed,
        setReceiptSearchFailed,
        giftCardRedeemOption,
        statusLog,
        clearStatusLog,
        resetPaymentFeedback,
        // Wallet
        publicKey,
        executeTransaction,
        requestRecords,
        decrypt,
        wallet,
        // Helpers
        pollTransaction,
        convertPublicToPrivate,
        handleConnect,
        payWithCard,
        payWithGiftCard,
        redeemGiftCardBalance,
    };
};
