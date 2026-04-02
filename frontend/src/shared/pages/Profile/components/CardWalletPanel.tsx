import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Copy, ExternalLink, Eye, EyeOff, Lock, ShieldCheck, Unlock, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Shimmer } from '../../../components/ui/Shimmer';
import { useCardWallet } from '../../../hooks/CardWalletProvider';
import type { CardTokenCode } from '../../../services/api';

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
        { code: 'USAD', label: 'USAD', key: 'usad', tint: 'text-emerald-400', muted: 'text-emerald-300' }
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

const Field = ({
    label,
    value,
    onChange,
    type = 'text',
    revealable = false,
    maxLength,
    placeholder,
    className = ''
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    revealable?: boolean;
    maxLength?: number;
    placeholder?: string;
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
        </div>
    );
};

const PrimaryAction = ({
    icon: Icon,
    label,
    loading,
    loadingLabel,
    onClick,
    type = 'button'
}: {
    icon: React.ComponentType<any>;
    label: string;
    loading?: boolean;
    loadingLabel?: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={loading}
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
        requestCardLimitChange
    } = useCardWallet();

    const [pin, setPin] = useState('');
    const [secret, setSecret] = useState('');
    const [label, setLabel] = useState('');
    const [hint, setHint] = useState('');
    const [selectedTopUpToken, setSelectedTopUpToken] = useState<CardTokenCode>('CREDITS');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isTopUpPending, setIsTopUpPending] = useState(false);
    const [lastTopUpTxId, setLastTopUpTxId] = useState<string | null>(null);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [limitDrafts, setLimitDrafts] = useState<Record<CardTokenCode, string>>({
        CREDITS: '',
        USDCX: '',
        USAD: ''
    });
    const [limitSavingToken, setLimitSavingToken] = useState<CardTokenCode | null>(null);

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

    const maskedCardNumber = card?.card_last4 ? `**** **** **** ${card.card_last4}` : '**** **** **** ****';
    const fullCardNumber = formatCardNumber(card?.card_number);
    const cardAddress = card?.card_address || '';

    const copyAddress = () => {
        if (!cardAddress) return;
        navigator.clipboard.writeText(cardAddress);
        toast.success('Address copied');
    };

    const handleUnlock = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!pin || pin.length !== 6 || !secret) {
            toast.error('PIN (6 digits) and secret required');
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
        if (!pin || pin.length !== 6 || !secret) {
            toast.error('PIN (6 digits) and secret required');
            return;
        }

        setIsInitializing(true);
        try {
            await createCard(pin, secret, { label, hint });
            toast.success('NullPay Card created');
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
            const txId = await topUpCard(selectedTopUpToken, amount, pin || undefined, secret || undefined);
            setLastTopUpTxId(txId);
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
                            The card key is generated in-browser, encrypted locally with your PIN and secret, and only decrypted in memory while you use it.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Card Label" value={label} onChange={setLabel} placeholder="Daily Spending" />
                            <Field label="Optional Hint" value={hint} onChange={setHint} placeholder="Non-secret reminder" maxLength={32} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="6-Digit PIN"
                                type="password"
                                revealable
                                value={pin}
                                onChange={(value) => setPin(value.replace(/\D/g, ''))}
                                placeholder="000000"
                                maxLength={6}
                                className="text-center tracking-[0.35em]"
                            />
                            <Field label="Card Secret" type="password" revealable value={secret} onChange={setSecret} placeholder="Recovery secret" />
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500">
                            Your hint should never contain the actual PIN or secret. NullPay stores ciphertext and card metadata only.
                        </p>
                        <PrimaryAction
                            type="submit"
                            icon={Wallet}
                            label="Create NullPay Card"
                            loading={isInitializing}
                            loadingLabel="Creating card"
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
                                maxLength={6}
                                className="text-center tracking-[0.35em]"
                            />
                            <Field label="Card Secret" type="password" revealable value={secret} onChange={setSecret} placeholder="Card secret" />
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

                                <div className="mt-8">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Card Label</div>
                                        <div className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">
                                            {card.card_label}
                                        </div>
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
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:max-w-[760px]">
                        {TOKEN_OPTIONS.map((token) => (
                            <div
                                key={token.code}
                                className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-5 transition-all hover:border-white/15 hover:bg-white/[0.05]"
                            >
                                <div className={`text-[10px] font-bold uppercase tracking-[0.22em] ${token.tint}`}>{token.label}</div>
                                <div className="mt-4 text-3xl font-black tracking-tighter text-white">
                                    {isRefreshingBalances ? <Shimmer className="h-8 w-14 rounded-md bg-white/5" /> : formatAmount(balances[token.key])}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <GlassCard className="p-6 hover:border-white/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Limit Controls</span>
                                <h3 className="mt-3 text-xl font-bold tracking-tighter text-white">Adjust per-token balance caps</h3>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                Main Wallet Approval
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
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
                                            <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Current Balance</div>
                                                <div className="mt-2 text-xl font-bold text-white">
                                                    {isRefreshingBalances ? <Shimmer className="ml-auto h-7 w-12 rounded-md bg-white/5" /> : formatAmount(balances[token.key])}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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

                    <GlassCard className="p-6 hover:border-white/20">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Protection</span>
                        <div className="mt-6 space-y-4">
                            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-3 text-orange-300">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Non-custodial key handling</div>
                                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                            NullPay stores encrypted payloads only. Unlock and signing happen locally in your browser session.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="text-sm font-bold text-white">Cap changes require approval</div>
                                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                    Every token cap change goes through a fresh main-wallet signature, so increasing limits stays intentional.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="text-sm font-bold text-white">Best practice</div>
                                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                    Keep only day-to-day spending amounts on the card and raise caps when you actually need more room.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <GlassCard className="p-6">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Add Balance</span>
                    <h3 className="text-xl font-bold tracking-tighter text-white">Top up one token at a time</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        Use the same private wallet flow as the rest of the dashboard and fund this card with only what you need.
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

                <GlassCard className="p-6">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Card Summary</span>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Card Label</span>
                            <div className="mt-3 text-xl font-bold tracking-tighter text-white">{card.card_label}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Card Number</span>
                            <div className="mt-3 font-mono text-sm font-semibold tracking-[0.22em] text-white">
                                {fullCardNumber || maskedCardNumber}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Hint</span>
                            <div className="mt-3 text-sm font-semibold text-white">{card.card_hint || 'No hint added'}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Latest Top-Up</span>
                            <div className="mt-3">
                                <AnimatePresence mode="wait">
                                    {lastTopUpTxId ? (
                                        <motion.a
                                            key="tx"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            href={`https://testnet.explorer.provable.com/transaction/${lastTopUpTxId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-mono text-orange-300 hover:text-orange-200"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            <span>{lastTopUpTxId.slice(0, 30)}...</span>
                                        </motion.a>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-sm text-gray-500"
                                        >
                                            No top-up submitted in this session yet.
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};
