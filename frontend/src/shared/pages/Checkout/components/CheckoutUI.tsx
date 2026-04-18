import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Eye, EyeOff, KeyRound, LockKeyhole, Terminal } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { Shimmer } from '../../../components/ui/Shimmer';
import { CheckoutSession } from '../types';
import { GiftCardRedeemPrompt } from '../../../components/ui/GiftCardRedeemPrompt';
import { GiftCodeInput } from '../../../components/ui/GiftCodeInput';
import { CARD_PIN_LENGTH } from '../../../utils/card-input-limits';
import { getAllowedTokensForInvoice, getTokenLabel, getTokenTypeFromCode } from '../../../utils/tokens';
import { getUtf8ByteLength, LEO_PAYMENT_NOTE_MAX_BYTES } from '../../../utils/leo-input-limits';
import { looksLikeAleoAddress, normalizeAleoAddress } from '../../../utils/aleo-address';

interface CheckoutUIProps {
    session: CheckoutSession | null;
    loading: boolean;
    error: string | null;
    publicKey: string | null | undefined;
    paymentStatus: string;
    paymentStatusLog: string[];
    paymentLoading: boolean;
    txId: string | null;
    success: boolean;
    onPay: (donationAmount?: number, selectedToken?: string, notes?: { payerNote?: string; merchantNote?: string | null }) => void;
    onPayWithCard: (cardNumber: string, pin: string, cardSecret: string, donationAmount?: number, selectedToken?: string, notes?: { payerNote?: string; merchantNote?: string | null }) => void;
    onPayWithGiftCard: (giftCode: string, donationAmount?: number, selectedToken?: string, notes?: { payerNote?: string; merchantNote?: string | null }, payerAddress?: string) => void;
    giftCardRedeemOption?: { giftCode: string; availableAmount: number; tokenLabel: string } | null;
    onRedeemGiftCardBalance: () => void;
    quote?: { expected_amount: number; expires_at: number; signature: string; from_token: string; to_token: string } | null;
    quoteTimeRemaining?: number;
    checkOracleQuote?: (from: string, to: string, amount: number) => void;
}

export const CheckoutUI: React.FC<CheckoutUIProps> = ({
    session,
    loading,
    error,
    publicKey,
    paymentStatus,
    paymentStatusLog,
    paymentLoading,
    success,
    onPay,
    onPayWithCard,
    onPayWithGiftCard,
    giftCardRedeemOption,
    onRedeemGiftCardBalance,
    quote,
    quoteTimeRemaining,
    checkOracleQuote
}) => {
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedSalt, setCopiedSalt] = useState(false);
    const [donationAmount, setDonationAmount] = useState<string>('');
    const [selectedPayerToken, setSelectedPayerToken] = useState<string>('CREDITS');
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'giftcard' | 'card'>('wallet');
    const [giftCode, setGiftCode] = useState<string>('');
    const [giftCardPayerAddress, setGiftCardPayerAddress] = useState('');
    const [cardNumber, setCardNumber] = useState<string>('');
    const [cardPin, setCardPin] = useState<string>('');
    const [cardSecret, setCardSecret] = useState<string>('');
    const [showCardPin, setShowCardPin] = useState(false);
    const [showCardSecret, setShowCardSecret] = useState(false);
    const [payerNote, setPayerNote] = useState('');
    const [shareMerchantNote, setShareMerchantNote] = useState(false);
    const [merchantNote, setMerchantNote] = useState('');

    const isDonation = session?.amount === 0;
    const allowedTokens = session
        ? (session.allowed_tokens && session.allowed_tokens.length > 0 ? session.allowed_tokens as string[] : getAllowedTokensForInvoice(session.token_type === 'ANY' ? 3 : 0, session.invoice_type))
        : ['CREDITS', 'USDCX', 'USAD'];
    const hasSelectableTokens = allowedTokens.length > 1;
        
    const displayToken = selectedPayerToken || session?.token_type || 'CREDITS';
    const displayTokenLabel = displayToken ? getTokenLabel(getTokenTypeFromCode(displayToken as 'CREDITS' | 'USDCX' | 'USAD')) : 'Tokens';

    useEffect(() => {
        if (!session) return;
        if (!hasSelectableTokens) {
            if (!selectedPayerToken || selectedPayerToken !== session.token_type) {
                setSelectedPayerToken(session.token_type);
            }
            return;
        }

        const nextToken = allowedTokens.includes(session.token_type)
            ? session.token_type
            : (allowedTokens[0] || 'CREDITS');
        setSelectedPayerToken((current) => allowedTokens.includes(current as any) ? current : nextToken);
    }, [session, hasSelectableTokens, allowedTokens, selectedPayerToken]);

    // Decrease the countdown timer purely inside CheckoutUI visually
    const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(0);
    useEffect(() => {
        setLocalTimeRemaining(quoteTimeRemaining || 0);
    }, [quoteTimeRemaining]);

    useEffect(() => {
        if (localTimeRemaining <= 0) return;
        const interval = setInterval(() => {
            setLocalTimeRemaining(t => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [localTimeRemaining]);

    useEffect(() => {
        if (!session || isDonation || !hasSelectableTokens) return;
        if (selectedPayerToken !== session.token_type && session.amount > 0) {
            checkOracleQuote?.(session.token_type, selectedPayerToken, session.amount);
        }
    }, [selectedPayerToken, session, isDonation, hasSelectableTokens, checkOracleQuote]);

    const paymentLink = typeof window !== 'undefined' && session ? (() => {
        const amtStr = isDonation && donationAmount ? `${Math.round(parseFloat(donationAmount) * 1_000_000)}` : `${Math.round(session.amount * 1_000_000)}`;
        let invoiceTypeStr = isDonation ? 'donation' : 'multipay';
        if (session.invoice_type === 0) invoiceTypeStr = 'standard';
        else if (session.invoice_type === 1) invoiceTypeStr = 'multipay';
        else if (session.invoice_type === 2) invoiceTypeStr = 'donation';

        const params = new URLSearchParams({
            merchant: session.merchant_address || session.merchants?.aleo_address || '',
            amount: `${amtStr}${displayToken === 'CREDITS' ? 'u64' : 'u128'}`,
            salt: session.salt || '',
            type: invoiceTypeStr,
            token: (displayToken || 'usdcx').toLowerCase(),
            session_id: session.id
        });
        return `${window.location.origin}/pay?${params.toString()}`;
    })() : '';

    const handlePayClick = () => {
        const tokenToPass = hasSelectableTokens ? selectedPayerToken : undefined;
        const notes = {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        };
        if (isDonation) {
            onPay(parseFloat(donationAmount || '0'), tokenToPass, notes);
        } else {
            onPay(undefined, tokenToPass, notes);
        }
    };

    const handleGiftCardPayClick = () => {
        if (!giftCode) return;
        const tokenToPass = hasSelectableTokens ? selectedPayerToken : undefined;
        const notes = {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        };
        if (isDonation) {
            onPayWithGiftCard(giftCode, parseFloat(donationAmount || '0'), tokenToPass, notes, giftCardPayerAddress);
        } else {
            onPayWithGiftCard(giftCode, undefined, tokenToPass, notes, giftCardPayerAddress);
        }
    };

    const handleCardPayClick = () => {
        if (!cardNumber || !cardPin || !cardSecret) return;
        const tokenToPass = hasSelectableTokens ? selectedPayerToken : undefined;
        const notes = {
            payerNote,
            merchantNote: shareMerchantNote ? merchantNote : null
        };
        if (isDonation) {
            onPayWithCard(cardNumber, cardPin, cardSecret, parseFloat(donationAmount || '0'), tokenToPass, notes);
        } else {
            onPayWithCard(cardNumber, cardPin, cardSecret, undefined, tokenToPass, notes);
        }
    };

    const payerNoteBytes = getUtf8ByteLength(payerNote);
    const merchantNoteBytes = getUtf8ByteLength(merchantNote);
    const payerNoteTooLong = payerNoteBytes > LEO_PAYMENT_NOTE_MAX_BYTES;
    const merchantNoteTooLong = merchantNoteBytes > LEO_PAYMENT_NOTE_MAX_BYTES;
    const normalizedGiftCardPayerAddress = normalizeAleoAddress(giftCardPayerAddress);
    const giftCardPayerAddressInvalid = normalizedGiftCardPayerAddress.length > 0 && !looksLikeAleoAddress(normalizedGiftCardPayerAddress);

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md lg:max-w-3xl xl:max-w-4xl"
            >
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold tracking-tighter text-white">
                        NullPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-amber-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">Checkout</span>
                    </h1>
                </div>

                <GlassCard variant="heavy" className="p-8 relative overflow-hidden">
                    {!session && error ? (
                        <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    ) : loading && !session ? (
                        <div className="space-y-4">
                            <Shimmer className="h-4 w-1/3 bg-white/5 mx-auto rounded-md" />
                            <Shimmer className="h-10 w-full bg-white/5 rounded-xl" />
                            <Shimmer className="h-10 w-full bg-white/5 rounded-xl" />
                        </div>
                    ) : success || session?.status === 'SETTLED' ? (
                        <div className="text-center py-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-16 h-16 bg-white/15 border-2 border-white/40 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                            <h2 className="text-xl font-bold text-white mb-2">Payment Successful</h2>
                            <p className="text-sm text-gray-400 mb-6">Your transaction has been securely settled on the Aleo blockchain.</p>
                            <p className="text-xs text-gray-500 mt-4 animate-pulse">Redirecting you back to merchant...</p>
                        </div>
                    ) : session ? (
                        <div className="space-y-6">
                            {/* Merchant Info */}
                            <div className="text-center pb-6 border-b border-white/10">
                                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Paying To</p>
                                <p className="text-lg font-bold text-white">{session.merchant_name}</p>
                            </div>

                            {/* Amount & Currency Info */}
                            <div className="text-center pb-8 pt-2 border-b border-white/10 flex flex-col items-center">
                                {isDonation ? (
                                    <div className="w-full flex flex-col items-center animate-fade-in">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Amount to Donate</p>
                                        <div className="relative flex items-center bg-white/[0.03] rounded-2xl border border-white/10 transition-all duration-300 focus-within:border-white/20 focus-within:bg-white/[0.05]">
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                min="0.01"
                                                value={donationAmount}
                                                onChange={(e) => setDonationAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-[180px] sm:w-[220px] bg-transparent outline-none text-4xl sm:text-5xl font-bold tracking-tight text-white p-4 text-center placeholder:text-white/10"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center animate-fade-in">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Total Amount</p>
                                        <div className="relative inline-block">
                                            <p className="text-6xl sm:text-7xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] leading-none">
                                                {quote ? quote.expected_amount : session.amount} 
                                            </p>
                                            {quote && (
                                                <span className="absolute -top-3 -right-16 text-[10px] text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full border border-orange-400/20 font-bold whitespace-nowrap shadow-[0_0_15px_rgba(249,115,22,0.15)] backdrop-blur-md">
                                                    ~ {session.amount} {session.token_type}
                                                </span>
                                            )}
                                        </div>
                                        {quote && localTimeRemaining > 0 && (
                                            <div className="mt-5 inline-flex items-center gap-2 bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 shadow-inner">
                                                <svg className="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                <p className="text-xs text-orange-400 font-mono font-semibold">
                                                    Quote expires in {Math.floor(localTimeRemaining / 60)}:{(localTimeRemaining % 60).toString().padStart(2, '0')}
                                                </p>
                                            </div>
                                        )}
                                        {quote && localTimeRemaining === 0 && (
                                            <div className="mt-5 inline-flex items-center gap-2 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 shadow-inner">
                                                <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                <p className="text-xs text-red-400 font-mono animate-pulse font-semibold">
                                                    Quote expired. Please refresh.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {allowedTokens.length > 1 ? (
                                    <div className="mt-8 w-full max-w-[320px] animate-fade-in">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Pay With</p>
                                        <div className="flex justify-center p-1.5 bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-inner relative overflow-hidden">
                                            {allowedTokens.map((token) => {
                                                const isSelected = selectedPayerToken === token;
                                                const tLabel = token === 'CREDITS' ? 'Aleo' : token === 'USDCX' ? 'USDCx' : 'USAD';
                                                
                                                const iconMap: Record<string, React.ReactElement> = {
                                                    CREDITS: (
                                                        <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-white' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                    ),
                                                    USDCX: (
                                                        <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"/><line x1="12" y1="19" x2="12" y2="19.01" /></svg>
                                                    ),
                                                    USAD: (
                                                        <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2"/><path d="M12 3v3m0 12v3"/></svg>
                                                    )
                                                };

                                                return (
                                                    <button
                                                        key={token}
                                                        onClick={() => setSelectedPayerToken(token)}
                                                        className={`relative flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                                                            isSelected 
                                                                ? 'bg-gradient-to-b from-white/15 to-white/5 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/[0.15] scale-[1.02]' 
                                                                : 'text-gray-500 hover:text-white/80 hover:bg-white/5 border border-transparent'
                                                        }`}
                                                    >
                                                        {iconMap[token] || null}
                                                        {tLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-8 flex justify-center items-center gap-2 bg-white/[0.03] border border-white/10 px-5 py-2.5 rounded-full shadow-inner animate-fade-in">
                                        <span className="relative flex h-2.5 w-2.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{displayTokenLabel} Network</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start xl:grid-cols-[360px_minmax(0,1fr)]">
                                {/* Invoice Details */}
                                <div className="rounded-[28px] border border-white/8 bg-black/25 p-5 lg:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.24)] lg:sticky lg:top-6">
                                    <div className="space-y-5">
                                        <div className="flex justify-center">
                                            <div className="relative p-3 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                                <QRCodeSVG
                                                    value={paymentLink}
                                                    size={140}
                                                    level="H"
                                                    includeMargin={false}
                                                />
                                                <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                                                    <img
                                                        src="/assets/nullpay_logo.png"
                                                        alt="NullPay"
                                                        className="h-full w-full object-contain"
                                                        style={{ filter: 'brightness(0)' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payment Link</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-gray-300 truncate flex items-center">
                                                        {paymentLink}
                                                    </div>
                                                    <Button
                                                        variant={copiedLink ? "primary" : "secondary"}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(paymentLink);
                                                            setCopiedLink(true);
                                                            setTimeout(() => setCopiedLink(false), 2000);
                                                        }}
                                                        className="!py-2 !px-4 text-xs h-auto"
                                                    >
                                                        {copiedLink ? 'Copied!' : 'Copy'}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-left">
                                                <div
                                                    onClick={() => {
                                                        if (session.invoice_hash) {
                                                            navigator.clipboard.writeText(session.invoice_hash);
                                                            setCopiedHash(true);
                                                            setTimeout(() => setCopiedHash(false), 2000);
                                                        }
                                                    }}
                                                    className="p-3 rounded-xl border border-white/5 bg-black/30 hover:border-white/30 transition-colors group cursor-pointer active:scale-95"
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">Hash</span>
                                                        {copiedHash ? (
                                                            <span className="text-[9px] text-white font-bold">Copied!</span>
                                                        ) : (
                                                            <svg className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-white truncate block text-[10px] group-hover:text-white transition-colors" title={session.invoice_hash}>
                                                        {session.invoice_hash ? `${session.invoice_hash.slice(0, 6)}...${session.invoice_hash.slice(-6)}` : 'Generating...'}
                                                    </span>
                                                </div>

                                                <div
                                                    onClick={() => {
                                                        if (session.salt) {
                                                            navigator.clipboard.writeText(session.salt);
                                                            setCopiedSalt(true);
                                                            setTimeout(() => setCopiedSalt(false), 2000);
                                                        }
                                                    }}
                                                    className="p-3 rounded-xl border border-white/5 bg-black/30 hover:border-purple-500/30 transition-colors group cursor-pointer active:scale-95"
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">Salt</span>
                                                        {copiedSalt ? (
                                                            <span className="text-[9px] text-purple-400 font-bold">Copied!</span>
                                                        ) : (
                                                            <svg className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-purple-400 truncate block text-[10px] group-hover:text-purple-300 transition-colors" title={session.salt}>
                                                        {session.salt ? `${session.salt.slice(0, 6)}...${session.salt.slice(-4)}` : 'Generating...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            {/* Status and Action */}
                            <div className="space-y-4 rounded-[28px] border border-white/8 bg-black/20 p-5 lg:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payer Note</label>
                                        <textarea
                                            value={payerNote}
                                            onChange={(e) => setPayerNote(e.target.value)}
                                            rows={3}
                                            placeholder="Private note for your own records"
                                            className={`w-full resize-none bg-black/40 border rounded-xl text-sm text-white p-4 transition-colors outline-none ${payerNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-white/40'}`}
                                        />
                                        <p className={`mt-2 text-[11px] ${payerNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                                            Stored in one Leo field: {payerNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-white">Share note with merchant</p>
                                                <p className="text-[11px] text-gray-500">Turn this on only if you want the merchant to see an extra note in their dashboard.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShareMerchantNote((current) => !current)}
                                                aria-pressed={shareMerchantNote}
                                                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/10 transition-colors ${shareMerchantNote ? 'bg-white justify-end' : 'bg-white/10 justify-start'}`}
                                            >
                                                <span className="mx-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_10px_rgba(255,255,255,0.25)] transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                    {shareMerchantNote && (
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Merchant Note</label>
                                            <textarea
                                                value={merchantNote}
                                                onChange={(e) => setMerchantNote(e.target.value)}
                                                rows={3}
                                                placeholder="Optional note visible to the merchant"
                                                className={`w-full resize-none bg-black/40 border rounded-xl text-sm text-white p-4 transition-colors outline-none ${merchantNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-white/40'}`}
                                            />
                                            <p className={`mt-2 text-[11px] ${merchantNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                                                Merchant note: {merchantNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-fade-in">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {paymentStatus && !error && (
                                    <div className="p-3 bg-neon-primary/10 border border-neon-primary/20 rounded-xl text-center">
                                        <p className="text-xs text-neon-primary font-mono">{paymentStatus}</p>
                                    </div>
                                )}

                                {paymentMethod === 'card' && paymentStatusLog.length > 0 && !success && (
                                    <div className="rounded-xl border border-white/10 bg-black/30 p-4 animate-fade-in">
                                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                            <Terminal className="h-3.5 w-3.5" />
                                            Live Card Updates
                                        </div>
                                        <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                                            {paymentStatusLog.map((line, index) => {
                                                const isErrorLine = line.startsWith('ERROR:');
                                                return (
                                                    <div
                                                        key={`${line}-${index}`}
                                                        className={`rounded-lg border px-3 py-2 font-mono text-[10px] leading-relaxed ${isErrorLine ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-white/5 bg-white/[0.02] text-gray-400'}`}
                                                    >
                                                        <span className="mr-2 text-white/40">›</span>
                                                        {line.replace(/^ERROR:\s*/, '')}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 bg-black/40 p-1 rounded-xl mb-6 border border-white/5 gap-1">
                                    <button
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                            paymentMethod === 'wallet' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-white/80'
                                        }`}
                                    >
                                        Wallet
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                            paymentMethod === 'card' ? 'bg-white/10 text-white shadow-md flex items-center justify-center gap-2' : 'text-gray-500 hover:text-white/80'
                                        }`}
                                    >
                                        NullPay Card
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('giftcard')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                            paymentMethod === 'giftcard' ? 'bg-white/10 text-neon-primary shadow-md flex items-center justify-center gap-2' : 'text-gray-500 hover:text-white/80'
                                        }`}
                                    >
                                        Gift Card
                                    </button>
                                </div>

                                {paymentMethod === 'card' && (
                                    <div className="mb-4 animate-fade-in space-y-4 lg:grid lg:grid-cols-2 lg:gap-4">
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Card Number</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={cardNumber}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                                                    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
                                                    setCardNumber(grouped);
                                                }}
                                                placeholder="4123 4567 8910 1112"
                                                className="w-full bg-black/40 border border-white/10 focus:border-white/50 outline-none rounded-xl text-sm font-mono text-white p-4 transition-colors tracking-[0.22em] text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Card PIN</label>
                                            <div className="relative">
                                                <input
                                                    type={showCardPin ? 'text' : 'password'}
                                                    inputMode="numeric"
                                                    maxLength={CARD_PIN_LENGTH}
                                                    value={cardPin}
                                                    onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, CARD_PIN_LENGTH))}
                                                    placeholder="••••••"
                                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-10 py-3 text-center text-sm tracking-[0.28em] text-white outline-none transition-colors focus:border-white/20"
                                                />
                                                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                                <button type="button" onClick={() => setShowCardPin((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70">
                                                    {showCardPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Card Secret</label>
                                            <div className="relative">
                                                <input
                                                    type={showCardSecret ? 'text' : 'password'}
                                                    value={cardSecret}
                                                    onChange={(e) => setCardSecret(e.target.value)}
                                                    placeholder="Card secret"
                                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-10 py-3 text-center text-sm text-white outline-none transition-colors focus:border-white/20"
                                                />
                                                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                                <button type="button" onClick={() => setShowCardSecret((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70">
                                                    {showCardSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 text-center lg:col-span-2">
                                            The card key is decrypted in-memory on this device, used to generate the payment authorization locally, and never sent to NullPay.
                                        </p>
                                        <p className="text-xs text-white/80 text-center lg:col-span-2">
                                            No Shield connection needed. Card lookup uses the card number, while PIN and secret unlock the key locally on this device before the relayer-backed payment flow begins.
                                        </p>
                                    </div>
                                )}

                                 {paymentMethod === 'giftcard' && (
                                    <div className="mb-4 animate-fade-in space-y-4 lg:grid lg:grid-cols-2 lg:gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Gift Card Code</label>
                                            <GiftCodeInput
                                                value={giftCode}
                                                onChange={setGiftCode}
                                                disabled={paymentLoading}
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Payer Address (Optional)</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={giftCardPayerAddress}
                                                    onChange={(e) => setGiftCardPayerAddress(e.target.value)}
                                                    placeholder="aleo1..."
                                                    className={`w-full bg-black/40 border outline-none rounded-xl text-xs font-mono text-white p-4 transition-all ${giftCardPayerAddressInvalid ? 'border-red-500/40 focus:border-red-500/60 bg-red-500/5' : 'border-white/10 focus:border-white/20'}`}
                                                />
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-40">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className={`px-1 text-[10px] leading-relaxed ${giftCardPayerAddressInvalid ? 'text-red-400' : 'text-gray-500'}`}>
                                                {giftCardPayerAddressInvalid
                                                    ? 'Please enter a valid Aleo public address.'
                                                    : 'If left blank, the receipt will be minted to the gift card address.'}
                                            </p>
                                        </div>

                                        {giftCardRedeemOption && giftCardRedeemOption.giftCode === giftCode && (
                                            <GiftCardRedeemPrompt
                                                availableAmount={giftCardRedeemOption.availableAmount}
                                                tokenLabel={giftCardRedeemOption.tokenLabel}
                                                walletConnected={Boolean(publicKey)}
                                                loading={paymentLoading}
                                                onRedeem={onRedeemGiftCardBalance}
                                            />
                                        )}
                                    </div>
                                )}

                                {paymentMethod === 'wallet' && !publicKey ? (
                                    <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center">
                                        <WalletMultiButton className="!w-full !bg-white !text-black !font-bold !rounded-xl !h-12 hover:!bg-gray-200 transition-colors" />
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={
                                            paymentMethod === 'wallet'
                                                ? handlePayClick
                                                : paymentMethod === 'card'
                                                    ? handleCardPayClick
                                                    : handleGiftCardPayClick
                                        }
                                        disabled={
                                            paymentLoading ||
                                            payerNoteTooLong ||
                                            (shareMerchantNote && merchantNoteTooLong) ||
                                            (paymentMethod === 'giftcard' && giftCardPayerAddressInvalid) ||
                                            (isDonation && (!donationAmount || parseFloat(donationAmount) <= 0)) ||
                                            (paymentMethod === 'giftcard' && !giftCode) ||
                                            (paymentMethod === 'card' && (!cardNumber || !cardPin || !cardSecret))
                                        }
                                        glow
                                        className="w-full text-lg h-14"
                                    >
                                        {paymentLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Processing on-chain...
                                            </span>
                                        ) : (
                                            isDonation ? `Pay ${donationAmount || '0'} ${displayTokenLabel}` : `Pay ${session.amount} ${displayTokenLabel}`
                                        )}
                                    </Button>
                                )}
                            </div>
                            </div>
                        </div>
                    ) : null}
                </GlassCard>

                <p className="text-center mt-6 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    Zero-Knowledge Privacy • Instant Settlement
                </p>
            </motion.div>
        </div>
    );
};
