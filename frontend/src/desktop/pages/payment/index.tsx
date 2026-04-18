import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/core/animations';
import { usePayment } from '../../../shared/hooks/payments/usePayment';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { BatchPayPage } from '../../../shared/pages/batchpay';
import { getAllowedTokensForInvoice, getTokenLabel, getTokenTypeFromCode } from '../../../shared/utils/payments/tokens';
import { TokenCode } from '../../../shared/types/tokens';
import { getUtf8ByteLength, LEO_PAYMENT_NOTE_MAX_BYTES } from '../../../shared/utils/core/leoInputLimits';
import { looksLikeAleoAddress, normalizeAleoAddress } from '../../../shared/utils/aleo/aleoAddress';
import { PaymentProgress } from './components/PaymentProgress';
import { PaymentSummaryPanel } from './components/PaymentSummaryPanel';
import { PaymentNotesPanel } from './components/PaymentNotesPanel';
import { PaymentActionPanel } from './components/PaymentActionPanel';
import { PaymentConversionModal } from './components/PaymentConversionModal';

const SingleInvoicePaymentPage = () => {
    const getTokenCodeFromType = (tokenType: number): TokenCode => tokenType === 1 ? 'USDCX' : tokenType === 2 ? 'USAD' : 'CREDITS';
    const {
        step,
        loading,
        error,
        invoice,
        txId,
        handleConnect,
        payInvoice,
        payWithCard,
        payWithGiftCard,
        convertPublicToPrivate,
        programId,
        receiptHash,
        receiptSearchFailed,
        donationAmount,
        setDonationAmount,
        quote,
        quoteTimeRemaining,
        checkOracleQuote,
        giftCardRedeemOption,
        redeemGiftCardBalance,
        statusLog,
        resetPaymentFeedback
    } = usePayment();

    const [customConvertAmount, setCustomConvertAmount] = useState<string>('');
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState<number>(0);
    const [selectedTokenInitializedFor, setSelectedTokenInitializedFor] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'giftcard'>('wallet');
    const [giftCode, setGiftCode] = useState<string>('');
    const [giftCardPayerAddress, setGiftCardPayerAddress] = useState('');
    const [cardNumber, setCardNumber] = useState<string>('');
    const [cardPin, setCardPin] = useState<string>('');
    const [cardSecret, setCardSecret] = useState<string>('');
    const [showCardOverlay, setShowCardOverlay] = useState(false);
    const [payerNote, setPayerNote] = useState('');
    const [shareMerchantNote, setShareMerchantNote] = useState(false);
    const [merchantNote, setMerchantNote] = useState('');
    const { address } = useWallet();
    const isProcess = loading;
    const allowedTokens: TokenCode[] = invoice
        ? getAllowedTokensForInvoice(invoice.tokenType, invoice.invoiceType, invoice.allowedTokens)
        : ['CREDITS', 'USDCX', 'USAD'];
    const hasSelectableTokens = allowedTokens.length > 1;
    const baseTokenType = invoice?.tokenType ?? 0;
    const hasCrossTokenSelection = Boolean(hasSelectableTokens && invoice && invoice.amount > 0 && baseTokenType !== 3 && selectedToken !== baseTokenType);

    useEffect(() => {
        if (!invoice || !hasSelectableTokens) return;
        const nextToken = allowedTokens.includes(getTokenCodeFromType(invoice.tokenType))
            ? invoice.tokenType
            : getTokenTypeFromCode(allowedTokens[0]);
        if (selectedTokenInitializedFor !== invoice.hash) {
            setSelectedToken(nextToken);
            setSelectedTokenInitializedFor(invoice.hash);
            return;
        }
        setSelectedToken((current) => allowedTokens.some((token) => getTokenTypeFromCode(token) === current) ? current : nextToken);
    }, [invoice?.hash, invoice?.tokenType, invoice?.allowedTokens?.join(','), hasSelectableTokens, allowedTokens.join(','), selectedTokenInitializedFor]);

    useEffect(() => {
        if (!invoice || !hasSelectableTokens || invoice.amount <= 0 || baseTokenType === 3) return;
        if (selectedToken === baseTokenType) return;
        checkOracleQuote?.(getTokenCodeFromType(baseTokenType), getTokenCodeFromType(selectedToken), invoice.amount);
    }, [invoice?.hash, invoice?.amount, hasSelectableTokens, baseTokenType, selectedToken, checkOracleQuote]);

    useEffect(() => {
        if (paymentMethod !== 'card') {
            setShowCardOverlay(false);
        }
    }, [paymentMethod]);

    useEffect(() => {
        if (step === 'SUCCESS' || step === 'ALREADY_PAID') {
            setShowCardOverlay(false);
        }
    }, [step]);

    const handlePay = async () => {
        if (step === 'CONVERT') {
            setShowConvertModal(true);
        } else {
            await payInvoice(hasSelectableTokens ? selectedToken : undefined, {
                payerNote,
                merchantNote: shareMerchantNote ? merchantNote : null
            });
        }
    };

    const handleGiftCardPay = async () => {
        if (!giftCode) return;
        await payWithGiftCard(giftCode, hasSelectableTokens ? selectedToken : undefined, {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        }, giftCardPayerAddress);
    };

    const handleCardPay = async () => {
        if (!cardNumber || !cardPin || !cardSecret) return;
        resetPaymentFeedback();
        setShowCardOverlay(true);
        await payWithCard(cardNumber, cardPin, cardSecret, hasSelectableTokens ? selectedToken : undefined, {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        });
    };

    const handleCardOverlayOpen = () => {
        if (cardNumber.replace(/\D/g, '').length !== 16) return;
        resetPaymentFeedback();
        setShowCardOverlay(true);
    };

    const handleSelectPaymentMethod = (method: 'wallet' | 'card' | 'giftcard') => {
        if (method === paymentMethod) return;
        setPaymentMethod(method);
        resetPaymentFeedback();
    };

    const confirmConversion = async () => {
        setShowConvertModal(false);
        const amountToConvert = customConvertAmount ? Number(customConvertAmount) : undefined;
        await convertPublicToPrivate(amountToConvert, hasSelectableTokens ? selectedToken : undefined);
    };

    const activeTokenType = hasSelectableTokens ? selectedToken : (invoice?.tokenType ?? 0);
    const currencyLabel = getTokenLabel(activeTokenType);
    const displayAmount = Number(hasCrossTokenSelection && quote?.expected_amount ? quote.expected_amount : ((invoice?.amount || 0) > 0 ? invoice?.amount : Number(donationAmount || '0')));
    const paymentAmountLabel = `${displayAmount} ${currencyLabel}`;
    const payerNoteBytes = getUtf8ByteLength(payerNote);
    const merchantNoteBytes = getUtf8ByteLength(merchantNote);
    const payerNoteTooLong = payerNoteBytes > LEO_PAYMENT_NOTE_MAX_BYTES;
    const merchantNoteTooLong = merchantNoteBytes > LEO_PAYMENT_NOTE_MAX_BYTES;
    const normalizedGiftCardPayerAddress = normalizeAleoAddress(giftCardPayerAddress);
    const giftCardPayerAddressInvalid = normalizedGiftCardPayerAddress.length > 0 && !looksLikeAleoAddress(normalizedGiftCardPayerAddress);

    return (
        <motion.div
            className="page-container flex flex-col items-center justify-center min-h-[85vh]"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* ALEO GLOBE BACKGROUND */}
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-4xl mx-auto"
            >
                {/* STATUS HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white">
                        {step === 'SUCCESS' ? 'Null Payment' : step === 'ALREADY_PAID' ? 'Null Invoice' : 'Make'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-amber-400 drop-shadow-[0_0_20px_rgba(249,115,22,0.22)]">{step === 'SUCCESS' ? 'Successful' : step === 'ALREADY_PAID' ? 'Paid' : 'Null Payment'}</span>
                    </h1>

                    {invoice && !error && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 shadow-[0_0_18px_rgba(249,115,22,0.14)]"
                        >
                            <svg className="w-5 h-5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-bold text-orange-200 tracking-wide uppercase">
                                Verified On-Chain
                            </span>
                        </motion.div>
                    )}
                </div>

                <GlassCard variant="heavy" className="p-8 relative overflow-hidden">
                    <PaymentProgress step={step} />

                    <div className="flex flex-col gap-6 mb-8">
                        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
                            <PaymentSummaryPanel
                                loading={loading}
                                invoice={invoice}
                                donationAmount={donationAmount}
                                setDonationAmount={setDonationAmount}
                                displayAmount={displayAmount}
                                currencyLabel={currencyLabel}
                                hasCrossTokenSelection={hasCrossTokenSelection}
                                quote={quote}
                                quoteTimeRemaining={quoteTimeRemaining}
                                baseTokenType={baseTokenType}
                                hasSelectableTokens={hasSelectableTokens}
                                step={step}
                                allowedTokens={allowedTokens}
                                selectedToken={selectedToken}
                                setSelectedToken={setSelectedToken}
                            />

                            <PaymentNotesPanel
                                step={step}
                                programId={programId || undefined}
                                receiptHash={receiptHash}
                                receiptSearchFailed={receiptSearchFailed}
                                txId={txId}
                                payerNote={payerNote}
                                setPayerNote={setPayerNote}
                                payerNoteBytes={payerNoteBytes}
                                payerNoteTooLong={payerNoteTooLong}
                                shareMerchantNote={shareMerchantNote}
                                setShareMerchantNote={setShareMerchantNote}
                                merchantNote={merchantNote}
                                setMerchantNote={setMerchantNote}
                                merchantNoteBytes={merchantNoteBytes}
                                merchantNoteTooLong={merchantNoteTooLong}
                            />
                        </div>

                        <PaymentActionPanel
                            step={step}
                            paymentMethod={paymentMethod}
                            handleSelectPaymentMethod={handleSelectPaymentMethod}
                            giftCode={giftCode}
                            setGiftCode={setGiftCode}
                            giftCardPayerAddress={giftCardPayerAddress}
                            setGiftCardPayerAddress={setGiftCardPayerAddress}
                            isProcess={isProcess}
                            giftCardPayerAddressInvalid={giftCardPayerAddressInvalid}
                            normalizedGiftCardPayerAddress={normalizedGiftCardPayerAddress}
                            giftCardRedeemOption={giftCardRedeemOption}
                            redeemGiftCardBalance={redeemGiftCardBalance}
                            address={address}
                            displayAmount={displayAmount}
                            currencyLabel={currencyLabel}
                            invoice={invoice}
                            donationAmount={donationAmount}
                            payerNoteTooLong={payerNoteTooLong}
                            shareMerchantNote={shareMerchantNote}
                            merchantNoteTooLong={merchantNoteTooLong}
                            handleGiftCardPay={handleGiftCardPay}
                            paymentAmountLabel={paymentAmountLabel}
                            cardNumber={cardNumber}
                            cardPin={cardPin}
                            cardSecret={cardSecret}
                            showCardOverlay={showCardOverlay}
                            statusLog={statusLog}
                            error={error}
                            setCardNumber={setCardNumber}
                            setCardPin={setCardPin}
                            setCardSecret={setCardSecret}
                            handleCardOverlayOpen={handleCardOverlayOpen}
                            setShowCardOverlay={setShowCardOverlay}
                            handleCardPay={handleCardPay}
                            handleConnect={handleConnect}
                            handlePay={handlePay}
                            loading={loading}
                        />
                    </div>
                </GlassCard>

                <p className="text-center mt-8 text-xs font-medium text-gray-500 uppercase tracking-widest">
                    Secured by Aleo Zero-Knowledge Proofs
                </p>
            </motion.div>

            <PaymentConversionModal
                open={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                customConvertAmount={customConvertAmount}
                setCustomConvertAmount={setCustomConvertAmount}
                displayAmount={displayAmount}
                currencyLabel={currencyLabel}
                onConfirm={confirmConversion}
            />
        </motion.div>
    );
};

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const hasParams = (searchParams.get('merchant') && searchParams.get('salt')) || searchParams.get('hash');

    if (!hasParams) {
        return <BatchPayPage />;
    }

    return <SingleInvoicePaymentPage />;
};

export default PaymentPage;
