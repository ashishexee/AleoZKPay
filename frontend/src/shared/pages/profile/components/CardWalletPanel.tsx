import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, Copy, Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Trash2, Unlock, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Shimmer } from '../../../components/ui/Shimmer';
import ConfirmModal from '../../../components/modals/ConfirmModal';
import { useCardWallet } from '../../../hooks/wallet/CardWalletProvider';
import type { CardTokenCode } from '../../../types/tokens';
import { CARD_PIN_LENGTH, CARD_SECRET_MIN_LENGTH } from '../../../utils/card/cardInputLimits';
import { CARD_HINT_MAX_BYTES, CARD_LABEL_MAX_BYTES, getUtf8ByteLength } from '../../../utils/core/leoInputLimits';

interface CardWalletPanelProps {
    itemVariants: any;
}

const TOKEN_OPTIONS: Array<{
    code: CardTokenCode;
    label: string;
    key: 'credits' | 'usdcx' | 'usad';
    tint: string;
    muted: string;
}> = [
        { code: 'CREDITS', label: 'Credits', key: 'credits', tint: 'text-orange-400', muted: 'text-orange-300' },
        { code: 'USDCX', label: 'USDCx', key: 'usdcx', tint: 'text-purple-400', muted: 'text-purple-300' },
        { code: 'USAD', label: 'USAD', key: 'usad', tint: 'text-amber-400', muted: 'text-amber-300' }
    ];

const formatAmount = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });

const formatCap = (amount: number) =>
    (amount / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });

const toMicroUnits = (amount: number) => Math.round(amount * 1_000_000);

const formatCardNumber = (cardNumber: string | null | undefined) =>
    (cardNumber || '')
        .replace(/\D/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim();

const CARD_SAFETY_NOTES = [
    {
        title: 'The database does not hold a spend-ready wallet',
        body: 'NullPay stores encrypted card payloads and metadata, not a live wallet someone can immediately use. The full card number, card address, and card private key are all stored as ciphertext.'
    },
    {
        title: 'Your PIN and secret are the real unlock layer',
        body: 'The private key is encrypted with your 6-digit PIN and card secret before it ever leaves the browser. Those credentials are not stored in the database, so a database leak alone is not enough to unlock the card.'
    },
    {
        title: 'Signing happens locally on your device',
        body: 'Even when you pay with the card, decryption and signing happen inside your browser session after you enter the correct credentials. NullPay only receives the signed authorization or encrypted payloads needed to relay the transaction.'
    },
    {
        title: 'Limits still reduce blast radius',
        body: 'Each token on the card has its own balance cap, and increasing that cap requires a fresh approval from your main wallet. That means even if a card is actively unlocked, you still control how much value can sit on it.'
    }
];

const Field = ({
    label,
    value,
    onChange,
    type = 'text',
    revealable = false,
    maxLength,
    placeholder,
    helper,
    className = ''
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    revealable?: boolean;
    maxLength?: number;
    placeholder?: string;
    helper?: React.ReactNode;
    className?: string;
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const resolvedType = revealable && isVisible ? 'text' : type;

    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</label>
            <div className="relative">
                <input
                    type={resolvedType}
                    value={value}
                    maxLength={maxLength}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:outline-none ${revealable ? 'pr-12' : ''} ${className}`}
                />
                {revealable && (
                    <button
                        type="button"
                        onClick={() => setIsVisible((current) => !current)}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 transition-colors hover:text-white"
                        aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
                    >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
            {helper ? <div className="text-[11px] leading-relaxed text-gray-500">{helper}</div> : null}
        </div>
    );
};

const PrimaryAction = ({
    icon: Icon,
    label,
    loading,
    loadingLabel,
    onClick,
    type = 'button',
    disabled = false
}: {
    icon: React.ComponentType<any>;
    label: string;
    loading?: boolean;
    loadingLabel?: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={loading || disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white text-sm font-bold text-black px-4 py-3 transition-colors hover:bg-orange-50 disabled:opacity-60"
    >
        {loading ? (
            <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                <span>{loadingLabel || 'Working...'}</span>
            </>
        ) : (
            <>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </>
        )}
    </button>
);

export const CardWalletPanel: React.FC<CardWalletPanelProps> = ({ itemVariants }) => {
    const {
        card,
        isLoading,
        isUnlocked,
        cardBalances,
        isRefreshingBalances,
        createCard,
        unlockCard,
        lockCard,
        refreshCardBalances,
        topUpCard,
        requestCardLimitChange,
        sweepCardFundsToMain,
        deleteCard
    } = useCardWallet();

    const [pin, setPin] = useState('');
    const [secret, setSecret] = useState('');
    const [label, setLabel] = useState('');
    const [hint, setHint] = useState('');
    const [selectedTopUpToken, setSelectedTopUpToken] = useState<CardTokenCode>('CREDITS');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isTopUpPending, setIsTopUpPending] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [limitDrafts, setLimitDrafts] = useState<Record<CardTokenCode, string>>({
        CREDITS: '',
        USDCX: '',
        USAD: ''
    });
    const [limitSavingToken, setLimitSavingToken] = useState<CardTokenCode | null>(null);
    const [isDeletingCard, setIsDeletingCard] = useState(false);
    const [isSweepingCard, setIsSweepingCard] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const balances = {
        credits: cardBalances?.ALEO || 0,
        usdcx: cardBalances?.USDCx || 0,
        usad: cardBalances?.USAD || 0
    };

    const balanceCaps = {
        credits: card?.limits?.CREDITS?.max_balance || 0,
        usdcx: card?.limits?.USDCX?.max_balance || 0,
        usad: card?.limits?.USAD?.max_balance || 0
    };
    const totalCardBalance = Object.values(balances).reduce((sum, value) => sum + value, 0);
    const hasCardBalance = totalCardBalance > 0;
    const deleteGuidance = hasCardBalance
        ? 'Please first do Transfer All To Main Wallet.'
        : 'There is no balance in your NullPay card. You can delete it from on-chain and off-chain both.';

    const maskedCardNumber = card?.card_last4 ? `**** **** **** ${card.card_last4}` : '**** **** **** ****';
    const fullCardNumber = formatCardNumber(card?.card_number);
    const cardAddress = card?.card_address || '';
    const labelBytes = getUtf8ByteLength(label.trim());
    const hintBytes = getUtf8ByteLength(hint.trim());
    const labelTooLong = labelBytes > CARD_LABEL_MAX_BYTES;
    const hintTooLong = hintBytes > CARD_HINT_MAX_BYTES;

    const copyAddress = () => {
        if (!cardAddress) return;
        navigator.clipboard.writeText(cardAddress);
        toast.success('Address copied');
    };

    const handleUnlock = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!pin || pin.length !== CARD_PIN_LENGTH || !secret) {
            toast.error(`PIN (${CARD_PIN_LENGTH} digits) and secret required`);
            return;
        }

        setIsUnlocking(true);
        try {
            await unlockCard(pin, secret);
            await refreshCardBalances(pin, secret, { retryOnZero: true });
            toast.success('Card unlocked');
            setPin('');
            setSecret('');
        } catch (err: any) {
            toast.error(err.message || 'Unlock failed');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!label.trim()) {
            toast.error('Card label is required');
            return;
        }
        if (labelTooLong) {
            toast.error(`Card label must stay within ${CARD_LABEL_MAX_BYTES} bytes.`);
            return;
        }
        if (hintTooLong) {
            toast.error(`Card hint must stay within ${CARD_HINT_MAX_BYTES} bytes.`);
            return;
        }
        if (!pin || pin.length !== CARD_PIN_LENGTH || !secret) {
            toast.error(`PIN (${CARD_PIN_LENGTH} digits) and secret required`);
            return;
        }

        setIsInitializing(true);
        try {
            await createCard(pin, secret, { label, hint });
            toast.success('NullPay Card created and published on-chain');
            setLabel('');
            setHint('');
            setPin('');
            setSecret('');
        } catch (err: any) {
            toast.error(err.message || 'Initialization failed');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleTopUp = async (event: React.FormEvent) => {
        event.preventDefault();
        const amount = Number(topUpAmount);
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        try {
            setIsTopUpPending(true);
            await topUpCard(selectedTopUpToken, amount, pin || undefined, secret || undefined);
            setTopUpAmount('');
            toast.success(`${selectedTopUpToken} top-up submitted.`);
        } catch (err: any) {
            toast.error(err.message || 'Top-up failed');
        } finally {
            setIsTopUpPending(false);
        }
    };

    const handleLimitDraftChange = (token: CardTokenCode, value: string) => {
        setLimitDrafts((current) => ({
            ...current,
            [token]: value
        }));
    };

    const handleLimitSave = async (token: CardTokenCode) => {
        const draft = limitDrafts[token]?.trim();
        if (!draft) {
            toast.error(`Enter a ${token} cap first`);
            return;
        }

        const nextAmount = Number(draft);
        if (!Number.isFinite(nextAmount) || nextAmount < 0) {
            toast.error('Limit must be a valid non-negative amount');
            return;
        }

        try {
            setLimitSavingToken(token);
            await requestCardLimitChange(token, { max_balance: toMicroUnits(nextAmount) });
            setLimitDrafts((current) => ({ ...current, [token]: '' }));
            toast.success(`${token} balance cap updated`);
        } catch (err: any) {
            toast.error(err.message || 'Limit update failed');
        } finally {
            setLimitSavingToken(null);
        }
    };

    const handleDeleteCard = async () => {
        setShowDeleteModal(false);

        try {
            setIsDeletingCard(true);
            await deleteCard();
            toast.success('NullPay Card deleted successfully.');
        } catch (err: any) {
            console.error('[CardWalletPanel] Delete card failed:', err);
            const errorMessage = err?.message
                || err?.error
                || err?.cause?.message
                || err?.data?.message
                || err?.data?.error
                || 'Failed to delete the card.';
            toast.error(errorMessage);
        } finally {
            setIsDeletingCard(false);
        }
    };

    const handleSweepToMain = async () => {
        try {
            setIsSweepingCard(true);
            const txIds = await sweepCardFundsToMain(pin || undefined, secret || undefined);
            toast.success(`Sweep confirmed across ${txIds.length} transaction${txIds.length === 1 ? '' : 's'} and the card balance scan is updating.`);
            setPin('');
            setSecret('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to sweep card funds.');
        } finally {
            setIsSweepingCard(false);
        }
    };

    const handleRefreshCardScan = async () => {
        try {
            await refreshCardBalances(undefined, undefined, { retryOnZero: true });
            toast.success('NullPay card records refreshed.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to refresh card records.');
        }
    };

    if (isLoading) {
        return (
            <GlassCard variants={itemVariants} className="p-8">
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-orange-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading card</p>
                </div>
            </GlassCard>
        );
    }

    if (!card) {
        return (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <GlassCard variants={itemVariants} className="p-6">
                    <div className="mb-6">
                        <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-orange-400">NullPay Card</span>
                        <h2 className="text-2xl font-bold tracking-tighter text-white">Create your dedicated private spending wallet</h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
                            The card key is generated in-browser, encrypted locally with your PIN and secret, then published on-chain before the dashboard unlocks.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Card Label"
                                value={label}
                                onChange={setLabel}
                                placeholder="Daily Spending"
                                helper={
                                    <span className={labelTooLong ? 'text-red-400' : 'text-gray-500'}>
                                        Encrypted and stored in the on-chain card record: {labelBytes}/{CARD_LABEL_MAX_BYTES} bytes.
                                    </span>
                                }
                                className={labelTooLong ? 'border-red-500/60 focus:border-red-500/60' : ''}
                            />
                            <Field
                                label="Optional Hint"
                                value={hint}
                                onChange={setHint}
                                placeholder="Non-secret reminder"
                                helper={
                                    <span className={hintTooLong ? 'text-red-400' : 'text-gray-500'}>
                                        Keep the hint short so the encrypted Leo record fits: {hintBytes}/{CARD_HINT_MAX_BYTES} bytes.
                                    </span>
                                }
                                className={hintTooLong ? 'border-red-500/60 focus:border-red-500/60' : ''}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="6-Digit PIN"
                                type="password"
                                revealable
                                value={pin}
                                onChange={(value) => setPin(value.replace(/\D/g, ''))}
                                placeholder="000000"
                                maxLength={CARD_PIN_LENGTH}
                                className="text-center tracking-[0.35em]"
                            />
                            <Field
                                label="Card Secret"
                                type="password"
                                revealable
                                value={secret}
                                onChange={setSecret}
                                placeholder="Recovery secret"
                                helper={`Use at least ${CARD_SECRET_MIN_LENGTH} characters.`}
                            />
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500">
                            Your hint should never contain the actual PIN or secret. NullPay waits for the on-chain card record to confirm before treating setup as complete.
                        </p>
                        <PrimaryAction
                            type="submit"
                            icon={Wallet}
                            label="Create NullPay Card"
                            loading={isInitializing}
                            loadingLabel="Creating card"
                            disabled={!label || !pin || !secret || labelTooLong || hintTooLong}
                        />
                    </form>
                </GlassCard>

                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
                    <GlassCard className="p-6 hover:border-white/20">
                        <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Private Setup</span>
                        <h3 className="text-lg font-bold text-white">Local key handling</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            Your private key is created client-side and stays encrypted until you unlock the card yourself.
                        </p>
                    </GlassCard>
                    <GlassCard className="p-6 hover:border-white/20">
                        <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Supported Assets</span>
                        <div className="space-y-2">
                            {TOKEN_OPTIONS.map((token) => (
                                <div key={token.code} className="flex items-center justify-between text-sm">
                                    <span className={`font-bold uppercase tracking-widest ${token.tint}`}>{token.label}</span>
                                    <span className="text-gray-500">Private</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6 hover:border-white/20">
                        <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Card Policy</span>
                        <p className="text-sm leading-relaxed text-gray-500">
                            Per-token balance caps stay in place by default, and raising limits remains a main-wallet approval flow.
                        </p>
                    </GlassCard>
                </motion.div>
            </div>
        );
    }

    if (!isUnlocked) {
        return (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <GlassCard variants={itemVariants} className="p-6">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-orange-400">Card Overview</span>
                    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_36%),linear-gradient(145deg,rgba(17,17,17,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                        <div className="flex items-start justify-between">
                            <div>
                                <div
                                    className="text-2xl font-bold tracking-tight text-white"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    NullPay
                                </div>
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                                    Private Card
                                </div>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                                Aleo
                            </div>
                        </div>

                        <div className="mt-10 flex items-center gap-3">
                            <div className="h-11 w-14 rounded-xl border border-white/10 bg-gradient-to-br from-white/20 to-white/5 shadow-inner" />
                            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04]" />
                        </div>

                        <div className="mt-10 font-mono text-[clamp(1.55rem,2vw,2.15rem)] tracking-[0.34em] text-white">
                            {maskedCardNumber}
                        </div>

                        <div className="mt-10">
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Card Label</div>
                            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">
                                {card.card_label}
                            </div>
                        </div>

                    </div>
                    <p className="mt-6 text-sm leading-relaxed text-gray-500">
                        Unlock this card with its PIN and secret to scan private balances and use the wallet locally.
                    </p>
                </GlassCard>

                <GlassCard variants={itemVariants} className="p-6">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Unlock Card</span>
                    <h3 className="text-xl font-bold tracking-tighter text-white">Enter card credentials</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        This decrypts the card key locally and starts a fresh private record scan.
                    </p>
                    <form onSubmit={handleUnlock} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="6-Digit PIN"
                                type="password"
                                revealable
                                value={pin}
                                onChange={(value) => setPin(value.replace(/\D/g, ''))}
                                placeholder="000000"
                                maxLength={CARD_PIN_LENGTH}
                                className="text-center tracking-[0.35em]"
                            />
                            <Field
                                label="Card Secret"
                                type="password"
                                revealable
                                value={secret}
                                onChange={setSecret}
                                placeholder="Card secret"
                                helper={`Use at least ${CARD_SECRET_MIN_LENGTH} characters.`}
                            />
                        </div>
                        <PrimaryAction
                            type="submit"
                            icon={Unlock}
                            label="Unlock Card Wallet"
                            loading={isUnlocking}
                            loadingLabel="Unlocking"
                        />
                    </form>
                </GlassCard>
            </div>
        );
    }

    return (
        <>
            <ConfirmModal
                open={showDeleteModal}
                tone="danger"
                title="Delete NullPay Card"
                description={
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100/90">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-2xl border border-red-400/20 bg-red-500/10 p-2 text-red-300">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">Irreversible Action</div>
                                    <p className="mt-2 leading-relaxed">
                                        This removes the live on-chain card record and clears the encrypted database mirror.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {Object.values(balances).some((value) => value > 0) ? (
                            <p className="leading-relaxed text-red-100/85">
                                This card still holds funds. If you delete it now, you may <span className="font-semibold text-white">lose access to that money permanently</span>.
                                <span className="font-semibold text-white"> Please first do Transfer All To Main Wallet.</span>
                            </p>
                        ) : (
                            <p className="leading-relaxed text-gray-300">
                                There is no balance in your NullPay card. You can delete it from on-chain and off-chain both.
                            </p>
                        )}
                    </div>
                }
                confirmLabel="Delete Card"
                cancelLabel="Keep Card"
                onConfirm={handleDeleteCard}
                onClose={() => setShowDeleteModal(false)}
                loading={isDeletingCard}
            />

            <div className="space-y-4">
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <GlassCard className="p-6">
                    <div className="w-full">
                        <div className="w-full max-w-[760px]">
                            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%),linear-gradient(145deg,rgba(17,17,17,0.99),rgba(8,8,8,0.99))] px-7 py-6 shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div
                                            className="text-[2rem] font-bold tracking-tight text-white"
                                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                        >
                                            NullPay
                                        </div>
                                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.32em] text-white/35">
                                            Private Card
                                        </div>
                                    </div>
                                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                                        Aleo
                                    </div>
                                </div>

                                <div className="mt-9 flex items-center gap-3">
                                    <div className="h-12 w-16 rounded-xl border border-white/10 bg-gradient-to-br from-white/25 to-white/5 shadow-[inset_0_1px_10px_rgba(255,255,255,0.12)]" />
                                    <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.05]" />
                                </div>

                                <div className="mt-9 font-mono text-[clamp(1.5rem,1.9vw,2.1rem)] tracking-[0.32em] text-white">
                                    {fullCardNumber || maskedCardNumber}
                                </div>

                                <div className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="min-w-[180px]">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Card Label</div>
                                        <div className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">
                                            {card.card_label}
                                        </div>
                                    </div>

                                    <div className="grid flex-1 grid-cols-3 gap-6">
                                        {TOKEN_OPTIONS.map((token) => (
                                            <div
                                                key={token.code}
                                                className="min-w-0"
                                            >
                                                <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${token.tint}`}>{token.label}</div>
                                                <div className="mt-2 text-xl font-black tracking-tighter text-white">
                                                    {isRefreshingBalances ? <Shimmer className="h-6 w-10 rounded-md bg-white/5" /> : formatAmount(balances[token.key])}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={copyAddress}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-mono text-gray-400 transition-colors hover:text-white"
                                >
                                    <span>{cardAddress.slice(0, 8)}...{cardAddress.slice(-8)}</span>
                                    <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={lockCard}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-gray-300 transition-colors hover:bg-white/[0.08]"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    Lock Session
                                </button>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300">
                                    <span className={`h-2 w-2 rounded-full ${isRefreshingBalances ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
                                    {isRefreshingBalances ? 'Scanning Records' : 'Ready'}
                                </div>
                                <button
                                    onClick={handleRefreshCardScan}
                                    disabled={isRefreshingBalances || isSweepingCard}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-gray-300 transition-colors hover:bg-white/[0.08] disabled:opacity-60"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
                                    Refresh Scan
                                </button>
                                <button
                                    onClick={handleSweepToMain}
                                    disabled={isSweepingCard || isRefreshingBalances || !hasCardBalance}
                                    title={hasCardBalance ? 'Sweep all private card funds back into the main wallet.' : 'This NullPay card has zero balance.'}
                                    className="inline-flex items-center gap-2 rounded-full border border-neon-primary/20 bg-neon-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-neon-primary transition-colors hover:bg-neon-primary/20 disabled:opacity-60"
                                >
                                    {isSweepingCard ? (
                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neon-primary/30 border-t-neon-primary" />
                                    ) : (
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    )}
                                    Transfer All To Main Wallet
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={isDeletingCard}
                                    className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                                >
                                    {isDeletingCard ? (
                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200/30 border-t-red-200" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                    Delete Card
                                </button>
                            </div>

                            <div className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100/90">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-2xl border border-red-400/20 bg-red-500/10 p-2 text-red-300">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">Important Warning</div>
                                        <p className="mt-2 leading-relaxed text-red-100/85">
                                            Deleting the card removes the live on-chain card record and clears the encrypted database mirror. If the card still holds funds,
                                            you may not be able to recover that money afterward.
                                        </p>
                                        <p className="mt-2 leading-relaxed text-red-100/75">
                                            {deleteGuidance}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-1 gap-4">
                    <GlassCard className="p-6">
                        <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Add Balance</span>
                        <h3 className="text-xl font-bold tracking-tighter text-gradient-gold drop-shadow-gold">Top up one token at a time</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            Move only what you need onto the card and keep everyday spending separated by token.
                        </p>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                            {TOKEN_OPTIONS.map((token) => (
                                <button
                                    key={token.code}
                                    type="button"
                                    onClick={() => setSelectedTopUpToken(token.code)}
                                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${selectedTopUpToken === token.code
                                            ? 'border-white/20 bg-white/10'
                                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                                        }`}
                                >
                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${token.tint}`}>{token.label}</div>
                                    <div className="mt-2 text-lg font-bold tracking-tighter text-white">
                                        {isRefreshingBalances ? <Shimmer className="h-6 w-10 rounded-md bg-white/5" /> : formatAmount(balances[token.key])}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleTopUp} className="mt-6 space-y-4">
                            <Field
                                label={`${TOKEN_OPTIONS.find((token) => token.code === selectedTopUpToken)?.label || 'Token'} Amount`}
                                value={topUpAmount}
                                onChange={setTopUpAmount}
                                type="number"
                                placeholder="0.00"
                            />
                            <PrimaryAction
                                type="submit"
                                icon={ArrowUpRight}
                                label={`Top Up ${TOKEN_OPTIONS.find((token) => token.code === selectedTopUpToken)?.label}`}
                                loading={isTopUpPending}
                                loadingLabel="Submitting"
                            />
                        </form>
                    </GlassCard>
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <GlassCard className="p-6 hover:border-white/20">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Limit Controls</span>
                            <h3 className="mt-3 text-xl font-bold tracking-tighter text-gradient-gold drop-shadow-gold">Adjust per-token balance caps</h3>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                                Keep all three token caps visible in one place and raise them only when you actually need more room on the card.
                            </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                            Main Wallet Approval
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        {TOKEN_OPTIONS.map((token) => {
                            const capValue = balanceCaps[token.key];
                            const isSaving = limitSavingToken === token.code;
                            return (
                                <div
                                    key={token.code}
                                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className={`text-[10px] font-bold uppercase tracking-[0.22em] ${token.tint}`}>{token.label}</div>
                                            <div className="mt-3 text-3xl font-black tracking-tighter text-white">
                                                {formatCap(capValue)}
                                            </div>
                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                                Current Balance Cap
                                            </div>
                                        </div>
                                        <div className="min-w-[118px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Current Balance</div>
                                            <div className="mt-2 text-xl font-bold text-white">
                                                {isRefreshingBalances ? <Shimmer className="ml-auto h-7 w-12 rounded-md bg-white/5" /> : formatAmount(balances[token.key])}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-col gap-3">
                                        <input
                                            type="number"
                                            value={limitDrafts[token.code]}
                                            onChange={(event) => handleLimitDraftChange(token.code, event.target.value)}
                                            placeholder={`Set new ${token.label} cap`}
                                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-white/20 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleLimitSave(token.code)}
                                            disabled={isSaving}
                                            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-orange-50 disabled:opacity-60"
                                        >
                                            {isSaving ? 'Requesting...' : 'Update Cap'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            </motion.div>

            <motion.div variants={itemVariants}>
                <GlassCard className="overflow-hidden p-0">
                    <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-6 py-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-orange-400">Why Funds Stay Safe</span>
                                <h3 className="mt-3 text-2xl font-bold tracking-tighter text-white">
                                    A database compromise alone is not enough to misuse this card
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                                    This card is designed so the database is a <span className="text-orange-200/90">storage layer</span>, not a custody layer.
                                    If someone only gets database access, they still do not get your <span className="text-orange-200/90">plain private key</span>,
                                    your <span className="text-orange-200/90">PIN</span>, your <span className="text-orange-200/90">card secret</span>, or a
                                    <span className="text-orange-200/90"> ready-to-broadcast wallet</span>.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-orange-400/20 bg-orange-500/10 px-5 py-4 text-sm leading-relaxed text-orange-100/90 lg:max-w-sm">
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">The key idea</div>
                                <div className="mt-2 text-base font-semibold text-white">
                                    database access is not the same as spending access
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-6">
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {CARD_SAFETY_NOTES.map((note, index) => (
                                <div
                                    key={note.title}
                                    className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-300">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">
                                                Layer {index + 1}
                                            </div>
                                            <div className="mt-2 text-base font-bold tracking-tight text-white">
                                                {note.title}
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                                {note.body}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-5">
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">Important Note</div>
                            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-gray-400">
                                This protects you against a <span className="text-orange-200/90">database-only compromise</span>, not against everything.
                                If someone gets your <span className="text-orange-200/90">PIN</span>, your <span className="text-orange-200/90">card secret</span>,
                                and access to your unlocked device or session, they could still act as you. The safest setup is to keep only
                                <span className="text-orange-200/90"> day-to-day spending balances</span> on the card, keep the secret offline, and raise
                                caps only when you actually need them.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
            </div>
        </>
    );
};
