import { useEffect, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID, WALLET_PROGRAM_ID, estimateExecutionFee, generateSalt, stringToField } from '../../../utils/aleo-utils';
import { executeWithShieldRetry } from '../../../utils/shieldRetry';
import { CheckoutSession } from '../types';
import { useWalletErrorHandler } from '../../../hooks/Wallet/WalletErrorBoundary';
import { getScannerSession, findSpendableRecord } from '../../Profile/components/BurnerWallet/scanner';
import { PrivateKey, AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import { TokenCode } from '../../../utils/tokens';
import { decryptCardPrivateKey } from '../../../utils/card-crypto';
import { hashAddress } from '../../../utils/crypto';
import { resolveCardLookupByHashHex } from '../../../utils/card-chain';
import { CARD_PIN_LENGTH, CARD_SECRET_MIN_LENGTH } from '../../../utils/card-input-limits';
import { getUtf8ByteLength, LEO_PAYMENT_NOTE_MAX_BYTES } from '../../../utils/leo-input-limits';
import { isValidAleoAddress, normalizeAleoAddress } from '../../../utils/aleo-address';
import { useLeaveGuard } from '../../../hooks/LeaveGuardProvider';

// Convert Hex back to String
const fromHex = (hex: string) => new TextDecoder().decode(new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));

interface GiftCardRedeemOption {
    giftCode: string;
    availableAmount: number;
    redeemMicros: number;
    tokenProgram: string;
    tokenLabel: string;
    isCredits: boolean;
}

interface PaymentNoteInput {
    payerNote?: string;
    merchantNote?: string | null;
}

const getAllowedCheckoutTokens = (session: CheckoutSession | null): TokenCode[] => {
    if (!session) {
        return ['CREDITS', 'USDCX', 'USAD'];
    }

    if (Array.isArray(session.allowed_tokens) && session.allowed_tokens.length > 0) {
        return session.allowed_tokens.filter((token): token is TokenCode =>
            token === 'CREDITS' || token === 'USDCX' || token === 'USAD'
        );
    }

    if (session.token_type === 'ANY') {
        return ['CREDITS', 'USDCX', 'USAD'];
    }

    return [session.token_type as TokenCode];
};

const resolveCheckoutToken = (session: CheckoutSession | null, selectedTokenOverride?: string): TokenCode => {
    const allowedTokens = getAllowedCheckoutTokens(session);
    const requestedToken = (selectedTokenOverride || allowedTokens[0]) as TokenCode;
    if (!allowedTokens.includes(requestedToken)) {
        throw new Error(`This checkout only accepts ${allowedTokens.join(', ')}.`);
    }
    return requestedToken;
};

export const useCheckoutPayment = (session: CheckoutSession | null) => {
    const { address: publicKey, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const { setGuard, clearGuard } = useLeaveGuard();
    const shouldAutoSettleInvoice = session?.invoice_type !== 1 && session?.invoice_type !== 2;
    const [status, setStatus] = useState<string>('');
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [txId, setTxId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState<'PAY' | 'CONVERT'>('PAY');
    const [giftCardRedeemOption, setGiftCardRedeemOption] = useState<GiftCardRedeemOption | null>(null);

    const [quote, setQuote] = useState<{ expected_amount: number, expires_at: number, signature: string, from_token: string, to_token: string } | null>(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>(0);
    const hasSelectableTokens = getAllowedCheckoutTokens(session).length > 1;

    const checkOracleQuote = async (fromToken: string, toToken: string, amount: number) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const res = await fetch(`${API_URL}/oracle/quote?from_token=${fromToken}&to_token=${toToken}&amount=${amount}`);
            if (!res.ok) throw new Error('Quote fetch failed');
            const data = await res.json();
            setQuote(data);
            setQuoteTimeRemaining(Math.max(0, data.expires_at - Math.floor(Date.now() / 1000)));
            return data;
        } catch (e) {
            console.error('Oracle fetch error', e);
            setQuote(null);
            return null;
        }
    };

    const encodePaymentNote = (value?: string | null, label: string = 'Payment note') => {
        const normalized = (value || '').trim();
        if (!normalized) return '0field';
        if (getUtf8ByteLength(normalized) > LEO_PAYMENT_NOTE_MAX_BYTES) {
            throw new Error(`${label} must stay within ${LEO_PAYMENT_NOTE_MAX_BYTES} bytes for one Leo field.`);
        }
        return stringToField(normalized);
    };

    const getBalance = (record: any, tokenType: string): number => {
        try {
            const fieldName = tokenType === 'CREDITS' ? 'microcredits' : 'amount';
            let valStr = '';

            if (record.data && record.data[fieldName]) {
                valStr = record.data[fieldName];
            } else if (record.plaintext) {
                const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)u(64|128)`);
                const match = record.plaintext.match(regex);
                if (match && match[1]) {
                    valStr = match[1];
                }
            }
            if (valStr) {
                return parseInt(valStr.replace(/_/g, '').replace(/u(64|128)/, ''));
            }
        } catch { return 0; }
        return 0;
    };

    const pay = async (donationAmount?: number, selectedTokenOverride?: string, notes?: PaymentNoteInput, quoteOverride?: { signature: string, expires_at: number, expected_amount: number }) => {
        if (!session || !publicKey || !executeTransaction || !wallet?.adapter) return;

        try {
            setLoading(true);
            setError(null);
            setStatus('Searching your wallet for private balance...');

            // Compute Final Amount
            const isDonationType = session.amount === 0;
            const finalAmount = (isDonationType && donationAmount && donationAmount > 0) ? donationAmount : session.amount;

            if (finalAmount <= 0) {
                throw new Error("Amount must be greater than zero.");
            }

            const actualTokenType = hasSelectableTokens
                ? resolveCheckoutToken(session, selectedTokenOverride)
                : session.token_type;

            // Determine if this is a cross-token payment
            const baseTokenType = session.token_type === 'ANY' ? actualTokenType : session.token_type;
            const isCrossToken = !isDonationType && baseTokenType !== actualTokenType && (baseTokenType as string) !== 'ANY';

            // 1. Determine Token Program & Function Name
            let tokenProgram = 'credits.aleo';
            
            // For cross-token: amountMicro = converted amount (what payer actually sends)
            // For same-token: amountMicro = invoice amount
            let amountMicro = Math.round(finalAmount * 1_000_000);
            if (isCrossToken && quoteOverride?.expected_amount) {
                amountMicro = Math.round(quoteOverride.expected_amount * 1_000_000);
            }
            
            let typeSuffix = 'u64';
            let funcName = isDonationType ? 'pay_donation' : 'pay_invoice';

            if (isCrossToken) {
                // Cross-token: use pay_invoice_BASE_via_PAYER
                const baseKey = baseTokenType.toLowerCase();   // e.g. 'credits'
                const payerKey = actualTokenType.toLowerCase(); // e.g. 'usad'
                funcName = `pay_invoice_${baseKey}_via_${payerKey}`;
                
                // Token program is the PAYER's token
                if (actualTokenType === 'USDCX') {
                    tokenProgram = 'test_usdcx_stablecoin.aleo';
                    typeSuffix = 'u128';
                } else if (actualTokenType === 'USAD') {
                    tokenProgram = 'test_usad_stablecoin.aleo';
                    typeSuffix = 'u128';
                }
                // If payer pays in CREDITS, typeSuffix stays 'u64'
            } else {
                // Same-token payment (existing logic)
                if (actualTokenType === 'USDCX') {
                    tokenProgram = 'test_usdcx_stablecoin.aleo';
                    typeSuffix = 'u128';
                    funcName = isDonationType ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
                } else if (actualTokenType === 'USAD') {
                    tokenProgram = 'test_usad_stablecoin.aleo';
                    typeSuffix = 'u128';
                    funcName = isDonationType ? 'pay_donation_usad' : 'pay_invoice_usad';
                }
            }

            const targetProgramId = isCrossToken ? WALLET_PROGRAM_ID : PROGRAM_ID;

            // 2. Request Records from Wallet
            const records = await requestRecords(tokenProgram, false);

            let payRecord = null;
            for (const r of (records as any[])) {
                if (r.spent) continue;

                // Decrypt if needed
                if (r.recordCiphertext && !r.plaintext && decrypt) {
                    try { r.plaintext = await decrypt(r.recordCiphertext); } catch { }
                }

                const bal = getBalance(r, actualTokenType);
                if (bal >= amountMicro) {
                    payRecord = r;
                    break;
                }
            }

            if (!payRecord) {
                let totalPrivateBalance = 0;
                for (const r of (records as any[])) {
                    if (!r.spent) {
                        totalPrivateBalance += getBalance(r, actualTokenType);
                    }
                }

                if (totalPrivateBalance >= amountMicro) {
                    setStep('CONVERT');
                    setStatus(`Privacy Protocol requires a single consolidated record. Please merge records.`);
                    setLoading(false);
                    return;
                } else {
                    setStep('CONVERT');
                    setStatus(`Insufficient Private ${actualTokenType} balance. Please convert public tokens.`);
                    setLoading(false);
                    return;
                }
            }

            let proofsInput = undefined;
            if (actualTokenType !== 'CREDITS') {
                setStatus('Generating Compliance Proofs for Stablecoin...');
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex } = await import('../../../utils/aleo-utils');
                await getFreezeListRoot();
                await getFreezeListCount();
                const firstIndex = await getFreezeListIndex(0);
                const { generateFreezeListProof } = await import('../../../utils/aleo-utils');
                const { Address } = await import('@provablehq/wasm');

                let index0FieldStr = undefined;
                if (firstIndex) {
                    try {
                        const addr = Address.from_string(firstIndex);
                        const grp = addr.toGroup();
                        const x = grp.toXCoordinate();
                        index0FieldStr = x.toString();
                    } catch (e) { console.warn("Failed to convert address to field", e); }
                }
                const proof = await generateFreezeListProof(1, index0FieldStr);
                proofsInput = `[${proof}, ${proof}]`;
                setStatus('Requesting your approval to execute payment...');
            }

            // 3. Construct Inputs
            const paymentSecret = generateSalt();
            const payerNoteField = encodePaymentNote(notes?.payerNote, 'Payer note');
            const merchantNoteField = encodePaymentNote(notes?.merchantNote, 'Merchant note');

            if (!session.merchant_address) {
                throw new Error("Merchant address is missing from session details.");
            }

            const normalizedMerchantAddress = normalizeAleoAddress(session.merchant_address);
            if (!normalizedMerchantAddress || !(await isValidAleoAddress(normalizedMerchantAddress))) {
                throw new Error('Merchant address in checkout session is invalid. Refresh the page and try again.');
            }

            let inputs: any[];

            if (isCrossToken && quoteOverride) {
                // Cross-token input order matches Leo contract:
                // pay_record, merchant, payer_owner, original_amount, converted_amount,
                // salt, payment_secret, payer_note, merchant_note, message,
                // [proofs], oracle_sig, expires_at
                const originalAmountMicro = Math.round(finalAmount * 1_000_000);
                const baseTypeSuffix = (baseTokenType === 'USDCX' || baseTokenType === 'USAD') ? 'u128' : 'u64';

                inputs = [
                    payRecord.plaintext || payRecord.ciphertext || payRecord,
                    normalizedMerchantAddress,
                    publicKey,
                    `${originalAmountMicro}${baseTypeSuffix}`,  // original_amount (for hash)
                    `${amountMicro}${typeSuffix}`,              // converted_amount (actual transfer)
                    session.salt,
                    paymentSecret,
                    payerNoteField,
                    merchantNoteField,
                    session.invoice_hash
                ];

                if (proofsInput) {
                    inputs.push(proofsInput);
                }

                inputs.push(quoteOverride.signature);
                inputs.push(`${Math.floor(quoteOverride.expires_at)}u32`);
            } else {
                // Same-token input order (existing)
                inputs = [
                    payRecord.plaintext || payRecord.ciphertext || payRecord,
                    normalizedMerchantAddress,
                    publicKey,
                    `${amountMicro}${typeSuffix}`,
                    session.salt,
                    paymentSecret,
                    payerNoteField,
                    merchantNoteField,
                    session.invoice_hash
                ];

                if (proofsInput) {
                    inputs.push(proofsInput);
                }
            }

            const estimatedFee = await estimateExecutionFee({
                programName: targetProgramId,
                functionName: funcName,
                inputs,
                fallbackMicrocredits: 100_000
            });

            const transaction: TransactionOptions = {
                program: targetProgramId,
                function: funcName,
                inputs: inputs,
                fee: estimatedFee,
                privateFee: false
            };

            setGuard({
                active: true,
                title: 'Waiting For Wallet Approval',
                message: 'NullPay is waiting for your wallet approval and then final network confirmation. Do not leave this tab until the flow finishes.',
                confirmLabel: 'Leave Anyway',
                cancelLabel: 'Stay'
            });

            const result = await executeWithShieldRetry(
                () => executeTransaction(transaction),
                { onRetry: () => setStatus('Shield Wallet gave no response. Retrying payment request...') }
            );

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Transaction Broadcasted! Waiting for network...`);
                setGuard({
                    active: true,
                    title: 'Payment Is Syncing',
                    message: 'NullPay is waiting for the final payment result and syncing it with the backend. Leaving now can interrupt the confirmation flow.',
                    confirmLabel: 'Leave Anyway',
                    cancelLabel: 'Stay'
                });

                // 4. Poll for Success
                let isPending = true;
                let attempts = 0;
                let onChainId = result.transactionId; // Will be updated to real at1... ID
                while (isPending && attempts < 120) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(result.transactionId);
                        const statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();

                        // Extract the real on-chain ID once available (replaces initial Shield ID)
                        if ((statusRes as any)?.transactionId) {
                            onChainId = (statusRes as any).transactionId;
                            console.log('[useCheckoutPayment] Real on-chain TX ID found:', onChainId);
                            setTxId(onChainId);
                        }

                        // We will rely on our Supabase WebSocket listener to do the real redirect. 
                        // But locally, we can mark success to show UI and notify the backend to trigger webhooks.
                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Payment Successful! Notifying Merchant...');

                            try {
                                const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                                // Update the new standard invoice with the REAL on-chain payment TX ID.
                                await fetch(`${API_URL}/invoices/${session.invoice_hash}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        ...(shouldAutoSettleInvoice ? { status: 'SETTLED' } : {}),
                                        payment_tx_ids: [onChainId],
                                        session_id: session.id
                                    })
                                });

                                // Also update the checkout session with the REAL on-chain TX ID.
                                await fetch(`${API_URL}/checkout/sessions/${session.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'SETTLED', tx_id: onChainId })
                                });
                            } catch (err) {
                                console.error("Failed to notify backend", err);
                            }

                            setSuccess(true);
                            isPending = false;

                            console.log("[useCheckoutPayment] Transaction Successful! Attempting redirect handler...");
                            if (session.success_url) {
                                console.log(`[useCheckoutPayment] Scheduling redirect to: ${session.success_url} in 3 seconds...`);
                                setTimeout(() => {
                                    console.log(`[useCheckoutPayment] Executing redirect now!`);
                                    try {
                                        const url = new URL(session.success_url as string);
                                        url.searchParams.set('session_id', session.id);
                                        window.location.href = url.toString();
                                    } catch (e) {
                                        // Fallback if success_url is somehow not a valid URL object
                                        window.location.href = session.success_url as string + `?session_id=${session.id}`;
                                    }
                                }, 3000);
                            } else {
                                console.log("[useCheckoutPayment] No success_url found in session object:", session);
                            }
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Transaction rejected by the Aleo network.');
                        }
                    } catch (e) {
                        // Polling error, ignore
                    }
                }
            } else {
                throw new Error("Failed to get Transaction ID from wallet.");
            }

        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || "An error occurred during payment.");
        } finally {
            clearGuard();
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!status) return;
        setStatusLog((current: string[]) => current[current.length - 1] === status ? current : [...current, status]);
    }, [status]);

    useEffect(() => {
        if (!error) return;
        const errorMessage = `ERROR: ${error}`;
        setStatusLog((current: string[]) => current[current.length - 1] === errorMessage ? current : [...current, errorMessage]);
    }, [error]);

    const convertPublicToPrivate = async (overrideAmount?: number, selectedTokenOverride?: string) => {
        if (!session || !publicKey || !executeTransaction) return;

        try {
            setLoading(true);

            let tokenProgramId = 'credits.aleo';
            let typeSuffix = 'u64';
            let tokenName = 'Credits';

            const actualTokenType = hasSelectableTokens
                ? resolveCheckoutToken(session, selectedTokenOverride)
                : session.token_type;

            if (actualTokenType === 'USDCX') {
                tokenProgramId = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USDCX';
            } else if (actualTokenType === 'USAD') {
                tokenProgramId = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USAD';
            }

            setStatus(`Converting Public ${tokenName} to Private...`);

            const finalAmount = (overrideAmount !== undefined && overrideAmount > 0) ? overrideAmount : session.amount;
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

            setGuard({
                active: true,
                title: 'Waiting For Wallet Approval',
                message: 'NullPay is waiting for your conversion approval and confirmation. Do not leave this tab until the flow finishes.',
                confirmLabel: 'Leave Anyway',
                cancelLabel: 'Stay'
            });

            const result = await executeWithShieldRetry(
                () => executeTransaction(transaction),
                { onRetry: () => setStatus('Shield Wallet gave no response. Retrying conversion request...') }
            );

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Converting... TxID: ${result.transactionId.slice(0, 10)}...`);
                setGuard({
                    active: true,
                    title: 'Conversion Is Syncing',
                    message: 'NullPay is confirming your conversion before continuing the payment flow. Leaving now can interrupt the process.',
                    confirmLabel: 'Leave Anyway',
                    cancelLabel: 'Stay'
                });

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
                            console.log("Conversion On-Chain ID found.");
                        }
                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Conversion successful! Resuming payment flow...');
                            await new Promise(r => setTimeout(r, 1000));
                            setStep('PAY');
                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Transaction rejected by network');
                        }
                    } catch (e) {
                        // ignore poll
                    }
                }
            } else {
                throw new Error("Failed to get Transaction ID from wallet.");
            }
        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || 'Conversion failed');
        } finally {
            clearGuard();
            setLoading(false);
        }
    };

    const redeemGiftCardBalance = async () => {
        if (!session || !giftCardRedeemOption) return;
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
                const { getFreezeListIndex, generateFreezeListProof } = await import('../../../utils/aleo-utils');
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
            setStatus('Redeem submitted! NullPay covered the gas fee. Once it settles, switch to Wallet and pay the invoice.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to redeem gift card balance.');
        } finally {
            setLoading(false);
        }
    };

    const finalizeSponsoredCheckout = async (transactionId: string, waitingMessage: string) => {
        if (!session) {
            throw new Error('Checkout session is missing.');
        }

        setTxId(transactionId);
        setStatus(waitingMessage);

        let isPending = true;
        let attempts = 0;
        while (isPending && attempts < 120) {
            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
                const res = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${transactionId}`);
                if (res.ok) {
                    isPending = false;
                }
            } catch {
                // Keep polling until explorer sees the sponsored transaction.
            }
        }

        if (isPending) {
            throw new Error('Timed out waiting for transaction confirmation.');
        }

        const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
        await fetch(`${API_URL}/invoices/${session.invoice_hash}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...(shouldAutoSettleInvoice ? { status: 'SETTLED' } : {}),
                payment_tx_ids: [transactionId],
                session_id: session.id
            })
        });
        await fetch(`${API_URL}/checkout/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SETTLED', tx_id: transactionId })
        });

        setSuccess(true);
        setStatus('Payment Successful! Redirecting...');
        if (session.success_url) {
            setTimeout(() => {
                try {
                    const url = new URL(session.success_url as string);
                    url.searchParams.set('session_id', session.id);
                    window.location.href = url.toString();
                } catch {
                    window.location.href = `${session.success_url as string}?session_id=${session.id}`;
                }
            }, 3000);
        }
    };

    const payWithCard = async (
        cardNumber: string,
        pin: string,
        cardSecret: string,
        donationAmount?: number,
        selectedTokenOverride?: string,
        notes?: PaymentNoteInput,
        quoteOverride?: { signature: string, expires_at: number, expected_amount: number }
    ) => {
        if (!session) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setStatusLog([]);
            setStatus('Looking up your NullPay card...');

            const normalizedCardNumber = cardNumber.replace(/\D/g, '');
            if (normalizedCardNumber.length !== 16) {
                throw new Error('Enter a valid 16-digit card number.');
            }
            if (pin.replace(/\D/g, '').length !== CARD_PIN_LENGTH) {
                throw new Error(`Enter a valid ${CARD_PIN_LENGTH}-digit card PIN.`);
            }
            const normalizedCardSecret = cardSecret.trim();
            if (normalizedCardSecret.length < CARD_SECRET_MIN_LENGTH) {
                throw new Error(`Card secret must be at least ${CARD_SECRET_MIN_LENGTH} characters.`);
            }

            const cardNumberHash = await hashAddress(normalizedCardNumber);
            const cardProfile = await resolveCardLookupByHashHex(cardNumberHash);
            if (!cardProfile) {
                throw new Error('Card not found. Check the card number and try again.');
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

            const isDonationType = session.amount === 0;
            const finalAmount = (isDonationType && donationAmount && donationAmount > 0) ? donationAmount : session.amount;
            if (finalAmount <= 0) throw new Error('Amount must be greater than zero.');

            const actualTokenType = hasSelectableTokens
                ? resolveCheckoutToken(session, selectedTokenOverride)
                : session.token_type;

            let tokenProgram = 'credits.aleo';
            
            // If quote override exists, use its expected amount
            let amountMicro = quoteOverride?.expected_amount 
                ? Math.round(quoteOverride.expected_amount * 1_000_000)
                : Math.round(finalAmount * 1_000_000);
            
            let typeSuffix = 'u64';
            let funcName = isDonationType ? 'pay_donation' : 'pay_invoice';

            if (actualTokenType === 'USDCX') {
                tokenProgram = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
            } else if (actualTokenType === 'USAD') {
                tokenProgram = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usad' : 'pay_invoice_usad';
            }

            const targetProgramId = quoteOverride ? WALLET_PROGRAM_ID : PROGRAM_ID;

            setStatus('Scanning your card for private balance...');
            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            const scannerSession = await getScannerSession(pkStr);
            const recordProvider = new NetworkRecordProvider(scannerSession.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(scannerSession.account);

            const recordName = actualTokenType === 'CREDITS' ? 'credits' : 'Token';
            const payRecordStr = await findSpendableRecord(scannerSession, tokenProgram, recordName, amountMicro, actualTokenType === 'CREDITS');
            if (!payRecordStr) {
                throw new Error(`The card needs a single ${actualTokenType} record large enough for this payment.`);
            }

            setStatus('Preparing a spendable private card record...');
            let proofsInput = undefined;
            if (actualTokenType !== 'CREDITS') {
                setStatus('Generating card proofs locally...');
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex, generateFreezeListProof } = await import('../../../utils/aleo-utils');
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

            const paymentSecret = generateSalt();
            const payerNoteField = encodePaymentNote(notes?.payerNote, 'Payer note');
            const merchantNoteField = encodePaymentNote(notes?.merchantNote, 'Merchant note');
            if (!session.merchant_address) {
                throw new Error('Merchant address is missing from session details.');
            }

            const inputs = [
                payRecordStr,
                session.merchant_address,
                cardProfile.mainOwner,
                `${amountMicro}${typeSuffix}`,
                session.salt,
                paymentSecret,
                payerNoteField,
                merchantNoteField,
                session.invoice_hash
            ];

            if (proofsInput) inputs.push(proofsInput);

            if (quoteOverride) {
                inputs.push(`${Math.floor(quoteOverride.expires_at)}u32`);
                inputs.push(quoteOverride.signature);
            }

            setStatus('Building private card payment authorization...');
            const authorization = await programManager.buildAuthorization({
                programName: targetProgramId,
                functionName: funcName,
                inputs
            });

            setStatus('Submitting card payment via DPS Relayer...');
            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName: PROGRAM_ID }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Card payment sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            await finalizeSponsoredCheckout(transactionId, 'Card payment broadcasted. Waiting for final confirmation...');
        } catch (err: any) {
            if (handleWalletError(err)) return;
            console.error(err);
            setError(err.message || 'An error occurred during card payment.');
        } finally {
            setLoading(false);
        }
    };

    const payWithGiftCard = async (
        giftCode: string,
        donationAmount?: number,
        selectedTokenOverride?: string,
        notes?: PaymentNoteInput,
        payerAddressOverride?: string,
        quoteOverride?: { expected_amount: number; expires_at: number; signature: string }
    ) => {
        if (!session) return;
        if (!giftCode.startsWith('gift-')) {
            setError('Invalid Gift Card format.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setGiftCardRedeemOption(null);
            setStatus('Authenticating Gift Card...');

            const hex = giftCode.replace('gift-', '');
            const pkStr = fromHex(hex);
            const giftPrivateKey = PrivateKey.from_string(pkStr);
            const giftCardAddress = giftPrivateKey.to_address().to_string();
            const normalizedPayerAddress = normalizeAleoAddress(payerAddressOverride);
            if (normalizedPayerAddress && !(await isValidAleoAddress(normalizedPayerAddress))) {
                throw new Error('Enter a valid Aleo public address or leave it blank.');
            }
            const payerOwner = normalizedPayerAddress || giftCardAddress;

            const isDonationType = session.amount === 0;
            const finalAmount = (isDonationType && donationAmount && donationAmount > 0) ? donationAmount : session.amount;
            if (finalAmount <= 0) throw new Error("Amount must be greater than zero.");

            const actualTokenType = hasSelectableTokens
                ? resolveCheckoutToken(session, selectedTokenOverride)
                : session.token_type;

            let tokenProgram = 'credits.aleo';
            
            // If quote override exists, use its expected amount
            let amountMicro = quoteOverride?.expected_amount 
                ? Math.round(quoteOverride.expected_amount * 1_000_000)
                : Math.round(finalAmount * 1_000_000);
            
            let typeSuffix = 'u64';
            let funcName = isDonationType ? 'pay_donation' : 'pay_invoice';

            if (actualTokenType === 'USDCX') {
                tokenProgram = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usdcx' : 'pay_invoice_usdcx';
            } else if (actualTokenType === 'USAD') {
                tokenProgram = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = isDonationType ? 'pay_donation_usad' : 'pay_invoice_usad';
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

            let recordName = actualTokenType === 'CREDITS' ? 'credits' : 'Token';
            const { scanProgramBalance } = await import('../../Profile/components/BurnerWallet/scanner');
            const totalMicros = await scanProgramBalance(scannerSession, tokenProgram, recordName);
            if (totalMicros < amountMicro) {
                if (!isDonationType && totalMicros > 0) {
                    setGiftCardRedeemOption({
                        giftCode,
                        availableAmount: totalMicros / 1_000_000,
                        redeemMicros: totalMicros,
                        tokenProgram,
                        tokenLabel: actualTokenType,
                        isCredits: actualTokenType === 'CREDITS'
                    });
                    throw new Error(`This gift card has ${totalMicros / 1_000_000} ${actualTokenType}. Redeem it to your wallet first, then pay the invoice from Wallet. NullPay covers the redeem gas fee.`);
                }
                throw new Error(`Insufficient Gift Card balance for ${actualTokenType}.`);
            }
            const payRecordStr = await findSpendableRecord(scannerSession, tokenProgram, recordName, amountMicro, actualTokenType === 'CREDITS');

            if (!payRecordStr) throw new Error(`Insufficient Gift Card balance for ${actualTokenType}. Note: The card must have a single record large enough to cover the payment.`);

            setStatus('Generating ZK Proofs locally...');
            let proofsInput = undefined;
            if (actualTokenType !== 'CREDITS') {
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex, generateFreezeListProof } = await import('../../../utils/aleo-utils');
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

            const paymentSecret = generateSalt();
            const payerNoteField = encodePaymentNote(notes?.payerNote, 'Payer note');
            const merchantNoteField = encodePaymentNote(notes?.merchantNote, 'Merchant note');
            if (!session.merchant_address) throw new Error("Merchant address is missing from session details.");

            const inputs = [
                payRecordStr,
                session.merchant_address,
                payerOwner,
                `${amountMicro}${typeSuffix}`,
                session.salt,
                paymentSecret,
                payerNoteField,
                merchantNoteField,
                session.invoice_hash
            ];

            if (proofsInput) inputs.push(proofsInput);

            if (quoteOverride) {
                inputs.push(`${Math.floor(quoteOverride.expires_at)}u32`);
                inputs.push(quoteOverride.signature);
            }

            const authorization = await programManager.buildAuthorization({
                programName: PROGRAM_ID,
                functionName: funcName,
                inputs
            });

            setStatus('Submitting payment via DPS Relayer...');
            const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName: PROGRAM_ID }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Payment sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            await finalizeSponsoredCheckout(transactionId, 'Gift card payment broadcasted. Waiting for final confirmation...');

        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred during Gift Card payment.");
        } finally {
            setLoading(false);
        }
    };

    return {
        pay,
        payWithCard,
        payWithGiftCard,
        convertPublicToPrivate,
        status,
        statusLog,
        txId,
        loading,
        error,
        success,
        step,
        setStep,
        publicKey,
        giftCardRedeemOption,
        redeemGiftCardBalance,
        quote,
        quoteTimeRemaining,
        checkOracleQuote
    };
};
