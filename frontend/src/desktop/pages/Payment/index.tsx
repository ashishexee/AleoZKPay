import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/animations';
import { usePayment, PaymentStep } from '../../../shared/hooks/usePayment';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { Button } from '../../../shared/components/ui/Button';
import { Shimmer } from '../../../shared/components/ui/Shimmer';
import { Input } from '../../../shared/components/ui/Input';
import { GiftCodeInput } from '../../../shared/components/ui/GiftCodeInput';
import { GiftCardRedeemPrompt } from '../../../shared/components/ui/GiftCardRedeemPrompt';
import { NullPayCardPaymentPanel } from '../../../shared/components/payments/NullPayCardPaymentPanel';
import { BatchPayPage } from '../../../shared/pages/BatchPay';
import { PROGRAM_ID } from '../../../shared/utils/aleo-utils';
import { TokenCode, getAllowedTokensForInvoice, getTokenLabel, getTokenTypeFromCode } from '../../../shared/utils/tokens';
import { getUtf8ByteLength, LEO_PAYMENT_NOTE_MAX_BYTES } from '../../../shared/utils/leo-input-limits';
import { looksLikeAleoAddress, normalizeAleoAddress } from '../../../shared/utils/aleo-address';

const SingleInvoicePaymentPage = () => {
    const {
        step,
        status,
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
        giftCardRedeemOption,
        redeemGiftCardBalance,
        statusLog,
        resetPaymentFeedback
    } = usePayment();

    const [copiedHash, setCopiedHash] = useState(false); // Added copiedHash state
    const [customConvertAmount, setCustomConvertAmount] = useState<string>('');
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState<number>(0);
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
        ? getAllowedTokensForInvoice(invoice.tokenType, invoice.invoiceType)
        : ['CREDITS', 'USDCX', 'USAD'];

    useEffect(() => {
        if (!invoice || invoice.tokenType !== 3) return;
        const nextToken = getTokenTypeFromCode(allowedTokens[0]);
        setSelectedToken((current) => allowedTokens.some((token) => getTokenTypeFromCode(token) === current) ? current : nextToken);
    }, [invoice?.hash, invoice?.tokenType, allowedTokens.join(',')]);

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
            await payInvoice(invoice?.tokenType === 3 ? selectedToken : undefined, {
                payerNote,
                merchantNote: shareMerchantNote ? merchantNote : null
            });
        }
    };

    const handleGiftCardPay = async () => {
        if (!giftCode) return;
        await payWithGiftCard(giftCode, invoice?.tokenType === 3 ? selectedToken : undefined, {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        }, giftCardPayerAddress);
    };

    const handleCardPay = async () => {
        if (!cardNumber || !cardPin || !cardSecret) return;
        resetPaymentFeedback();
        setShowCardOverlay(true);
        await payWithCard(cardNumber, cardPin, cardSecret, invoice?.tokenType === 3 ? selectedToken : undefined, {
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
        await convertPublicToPrivate(amountToConvert, invoice?.tokenType === 3 ? selectedToken : undefined);
    };

    const steps: { key: PaymentStep; label: string }[] = [
        { key: 'CONNECT', label: '1. Connect' },
        { key: 'VERIFY', label: '2. Verify' },
        { key: 'PAY', label: '3. Pay' },
    ];

    const isMultiPay = programId === PROGRAM_ID;
    const activeTokenType = invoice?.tokenType === 3 ? selectedToken : (invoice?.tokenType ?? 0);
    const currencyLabel = getTokenLabel(activeTokenType);
    const paymentAmountLabel = `${(invoice?.amount || 0) > 0 ? invoice?.amount : (donationAmount || '0')} ${currencyLabel}`;
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
                className="w-full max-w-lg"
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
                    {/* Progress Bar */}
                    <div className="flex justify-between mb-8 relative">
                        <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10 -z-0" />
                        {steps.map((s, index) => {
                            let isActive = s.key === step ||
                                (step === 'CONVERT' && s.key === 'PAY') ||
                                ((step === 'SUCCESS' || step === 'ALREADY_PAID') && s.key === 'PAY') ||
                                (steps.findIndex(x => x.key === step) > index);

                            return (
                                <div key={s.key} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                                        ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                        : 'bg-black border-gray-700 text-gray-500'
                                        }`}>
                                        {isActive ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <span className="text-xs font-bold">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold tracking-wider uppercase transition-colors ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* INVOICE DETAILS */}
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/5 mb-8 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Merchant</span>
                            {loading && !invoice ? (
                                <Shimmer className="h-6 w-32 bg-white/5 rounded" />
                            ) : (
                                <span className="font-mono text-white text-sm bg-white/5 px-2 py-1 rounded">
                                    {invoice?.merchant ? `${invoice.merchant.slice(0, 10)}...${invoice.merchant.slice(-5)}` : 'Unknown'}
                                </span>
                            )}
                        </div>

                        {invoice?.title && (
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Invoice Title</span>
                                {loading && !invoice ? (
                                    <Shimmer className="h-5 w-48 bg-white/5 rounded" />
                                ) : (
                                    <span className="max-w-[60%] text-right text-white">{invoice.title}</span>
                                )}
                            </div>
                        )}

                        {/* LINE ITEMS BREAKDOWN */}
                        {invoice?.items && invoice.items.length > 0 && (
                            <div className="pt-4 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest block mb-3">Items</span>
                                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                                    <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Item</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Qty</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Price</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total</span>
                                    </div>
                                    {invoice.items.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 border-b border-white/5 last:border-b-0">
                                            <span className="text-sm text-white truncate">{item.name || 'Unnamed'}</span>
                                            <span className="text-sm text-gray-400 text-center">{item.quantity}</span>
                                            <span className="text-sm text-gray-400 text-center">{item.unitPrice}</span>
                                            <span className="text-sm text-amber-300 font-mono text-right">{item.total.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Amount</span>
                            {loading && !invoice ? (
                                <Shimmer className="h-8 w-24 bg-white/5 rounded" />
                            ) : (
                                invoice?.amount === 0 ? (
                                    <div className="w-1/2">
                                        <Input
                                            label=""
                                            type="number"
                                            placeholder="Enter donation"
                                            value={donationAmount}
                                            onChange={(e) => setDonationAmount(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-white tracking-tight">{invoice?.amount || '0'} <span className="text-sm text-gray-500 font-normal">{currencyLabel}</span></span>
                                )
                            )}
                        </div>

                        {/* ANY TOKEN SELECTOR */}
                        {invoice?.tokenType === 3 && step !== 'SUCCESS' && step !== 'ALREADY_PAID' && (
                            <div className="pt-4 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest block mb-2">Select Payment Token</span>
                                <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                                    {allowedTokens.map((token) => {
                                        const tokenType = getTokenTypeFromCode(token);
                                        const activeClass = tokenType === 0
                                            ? 'bg-white text-black shadow-lg'
                                            : tokenType === 1
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';

                                        return (
                                            <button
                                                key={token}
                                                onClick={() => setSelectedToken(tokenType)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${selectedToken === tokenType
                                                    ? activeClass
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {getTokenLabel(tokenType)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {invoice?.memo && (
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Memo</span>
                                {loading && !invoice ? (
                                    <Shimmer className="h-5 w-48 bg-white/5 rounded" />
                                ) : (
                                    <span className="text-gray-300">{invoice?.memo || '-'}</span>
                                )}
                            </div>
                        )}

                    </div>

                    {/* ACTION AREA */}
                    <div className="space-y-4">
                        {error && (
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                <p className="text-white text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {status && !status.startsWith('at1') && !error && step !== 'ALREADY_PAID' && step !== 'SUCCESS' && (
                            <div className="text-center rounded-xl border border-white/20 bg-white/10 p-3">
                                <p className="text-white text-sm font-mono animate-pulse">{status}</p>
                            </div>
                        )}

                        {(step === 'SUCCESS' || step === 'ALREADY_PAID') ? (
                            <div className="text-center space-y-4">
                                <p className="text-gray-400">
                                    {step === 'ALREADY_PAID'
                                        ? 'This invoice has already been settled on-chain.'
                                        : 'The transaction has been settled on-chain.'}
                                </p>
                                {isMultiPay && step !== 'ALREADY_PAID' && (
                                    <div className="bg-black/40 border border-orange-400/20 p-4 rounded-xl text-left space-y-3">
                                        <p className="text-xs text-white uppercase font-bold mb-1">Your Receipt Hash</p>

                                        {receiptHash ? (
                                            <div className="bg-white/10 border border-white/20 p-2 rounded break-all font-mono text-xs text-white relative cursor-copy hover:bg-white/15 transition-colors" onClick={() => {
                                                navigator.clipboard.writeText(receiptHash);
                                                setCopiedHash(true);
                                                setTimeout(() => setCopiedHash(false), 2000);
                                            }}>
                                                {receiptHash}
                                                <div className={`absolute top-1 right-2 text-[10px] font-bold transition-colors ${copiedHash ? 'text-white' : 'opacity-70 text-gray-400'}`}>
                                                    {copiedHash ? 'COPIED!' : 'COPY'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-center">
                                                {receiptSearchFailed ? (
                                                    <p className="text-xs text-gray-400 italic">
                                                        You can get your payment receipt from the profiles page in paid invoices section.
                                                    </p>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-orange-300 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-xs text-gray-400">Syncing Receipt...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {receiptHash && (
                                            <p className="text-[10px] text-gray-500 mt-1">Provide this Hash to the merchant for verification.</p>
                                        )}

                                    </div>
                                )}
                                {txId && (
                                    <Button
                                        variant="primary"
                                        onClick={() => window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank')}
                                    >
                                        View Transaction
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Payer Note</label>
                                        <textarea
                                            value={payerNote}
                                            onChange={(e) => setPayerNote(e.target.value)}
                                            rows={3}
                                            placeholder="Private note for your own paid-invoice history"
                                            className={`w-full resize-none rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors ${payerNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-neon-primary/40'}`}
                                        />
                                        <p className={`mt-2 text-[11px] ${payerNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                                            Payer note uses one Leo field: {payerNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Share note with merchant</p>
                                                <p className="text-[11px] text-gray-500">When enabled, the merchant gets a separate note in their dashboard and invoice details.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShareMerchantNote((current) => !current)}
                                                aria-pressed={shareMerchantNote}
                                                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/10 transition-colors ${shareMerchantNote ? 'bg-neon-primary/90 justify-end' : 'bg-white/10 justify-start'}`}
                                            >
                                                <span className="mx-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_10px_rgba(255,255,255,0.25)] transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                    {shareMerchantNote && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Merchant Note</label>
                                            <textarea
                                                value={merchantNote}
                                                onChange={(e) => setMerchantNote(e.target.value)}
                                                rows={3}
                                                placeholder="Optional note visible to the merchant"
                                                className={`w-full resize-none rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors ${merchantNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-neon-primary/40'}`}
                                            />
                                            <p className={`mt-2 text-[11px] ${merchantNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                                                Merchant note: {merchantNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 bg-black/40 p-1 rounded-xl mb-4 border border-white/5 gap-1">
                                    <button
                                        onClick={() => handleSelectPaymentMethod('wallet')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'wallet' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-white/80'
                                            }`}
                                    >
                                        Wallet
                                    </button>
                                    <button
                                        onClick={() => handleSelectPaymentMethod('card')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-white/80'
                                            }`}
                                    >
                                        NullPay Card
                                    </button>
                                    <button
                                        onClick={() => handleSelectPaymentMethod('giftcard')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'giftcard' ? 'bg-white/10 text-neon-primary shadow-md' : 'text-gray-500 hover:text-white/80'
                                            }`}
                                    >
                                        Gift Card
                                    </button>
                                </div>

                                {paymentMethod === 'giftcard' ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <GiftCodeInput
                                            value={giftCode}
                                            onChange={setGiftCode}
                                            disabled={isProcess}
                                        />
                                        <div>
                                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Payer Address Optional</label>
                                            <Input
                                                placeholder="aleo1..."
                                                value={giftCardPayerAddress}
                                                onChange={(e) => setGiftCardPayerAddress(e.target.value)}
                                                className={giftCardPayerAddressInvalid ? '!border-red-500/60' : ''}
                                            />
                                            <p className={`mt-2 text-[11px] ${giftCardPayerAddressInvalid ? 'text-red-400' : 'text-gray-500'}`}>
                                                {giftCardPayerAddressInvalid
                                                    ? 'Enter a valid Aleo public address or leave this blank.'
                                                    : 'If you leave this blank, the payment receipt hash will be minted on the gift card address.'}
                                            </p>
                                        </div>
                                        {giftCardRedeemOption && giftCardRedeemOption.giftCode === giftCode && (
                                            <GiftCardRedeemPrompt
                                                availableAmount={giftCardRedeemOption.availableAmount}
                                                tokenLabel={giftCardRedeemOption.tokenLabel}
                                                walletConnected={Boolean(address)}
                                                loading={isProcess}
                                                onRedeem={redeemGiftCardBalance}
                                            />
                                        )}
                                        <Button
                                            variant="primary"
                                            onClick={handleGiftCardPay}
                                            disabled={isProcess || payerNoteTooLong || (shareMerchantNote && merchantNoteTooLong) || giftCardPayerAddressInvalid || !giftCode || (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))}
                                            className="w-full text-lg h-14"
                                            glow
                                        >
                                            {isProcess ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                    Processing...
                                                </span>
                                            ) : (
                                                `Pay ${(invoice?.amount || 0) > 0 ? invoice?.amount : (donationAmount || '0')} ${currencyLabel}`
                                            )}
                                        </Button>
                                    </div>
                                ) : paymentMethod === 'card' ? (
                                    <NullPayCardPaymentPanel
                                        amountLabel={paymentAmountLabel}
                                        cardNumber={cardNumber}
                                        cardPin={cardPin}
                                        cardSecret={cardSecret}
                                        isOpen={showCardOverlay}
                                        isProcessing={isProcess}
                                        statusLog={statusLog}
                                        error={error}
                                        onCardNumberChange={setCardNumber}
                                        onCardPinChange={setCardPin}
                                        onCardSecretChange={setCardSecret}
                                        onOpenOverlay={handleCardOverlayOpen}
                                        onCloseOverlay={() => setShowCardOverlay(false)}
                                        onSubmit={handleCardPay}
                                        submitDisabled={
                                            isProcess ||
                                            payerNoteTooLong ||
                                            (shareMerchantNote && merchantNoteTooLong) ||
                                            cardNumber.replace(/\D/g, '').length !== 16 ||
                                            cardPin.length !== 6 ||
                                            !cardSecret ||
                                            (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))
                                        }
                                    />
                                ) : (
                                    <>
                                        {step === 'CONNECT' ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center">
                                                    <WalletMultiButton className="!w-full !bg-neon-primary !text-black !font-bold !rounded-xl !h-12 hover:!bg-neon-accent transition-colors" />
                                                </div>
                                                {address && (
                                                    <Button variant="secondary" onClick={handleConnect}>
                                                        Continue with Connected Wallet
                                                    </Button>
                                                )}
                                            </div>
                                        ) : step === 'VERIFY' ? (
                                            <Button variant="primary" onClick={handleConnect} className="w-full">
                                                Verify Hash & Records
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                onClick={handlePay}
                                                disabled={isProcess || payerNoteTooLong || (shareMerchantNote && merchantNoteTooLong) || (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))}
                                                className="w-full"
                                                glow
                                            >
                                                {isProcess ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                        Processing...
                                                    </span>
                                                ) : step === 'CONVERT' ? (
                                                    'Convert Public to Private'
                                                ) : (
                                                    `Pay ${(invoice?.amount || 0) > 0 ? invoice?.amount : (donationAmount || '0')} ${currencyLabel}`
                                                )}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </GlassCard>

                <p className="text-center mt-8 text-xs font-medium text-gray-500 uppercase tracking-widest">
                    Secured by Aleo Zero-Knowledge Proofs
                </p>
            </motion.div>

            {/* CONVERSION MODAL */}
            {showConvertModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md"
                    >
                        <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                            {/* Close Button */}
                            <button
                                onClick={() => setShowConvertModal(false)}
                                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="text-center pt-2 relative z-10">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">Convert to Private</h3>
                                <p className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                                    Specify how many public <span className="text-white font-medium">{currencyLabel}</span> you want to convert into private records for this payment.
                                </p>
                            </div>

                            <div className="space-y-3 bg-[#111] p-5 rounded-2xl border border-white/5 relative z-10 focus-within:border-white/20 transition-colors">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block text-center">Amount to Convert</label>
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="number"
                                        placeholder={`Default needed: ${(invoice?.amount || 0) > 0 ? invoice?.amount : (donationAmount || '0')}`}
                                        value={customConvertAmount}
                                        onChange={(e) => setCustomConvertAmount(e.target.value)}
                                        className="w-full bg-transparent text-center text-3xl font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 text-center mt-2">
                                    Leave blank to convert exactly the required amount.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 relative z-10">
                                <button className="w-full bg-white text-black font-semibold text-sm py-4 h-14 rounded-xl hover:bg-gray-200 transition-colors" onClick={confirmConversion}>
                                    Confirm Conversion
                                </button>
                                <button className="text-xs text-gray-500 hover:text-white transition-colors font-medium py-3 uppercase tracking-widest" onClick={() => setShowConvertModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
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
