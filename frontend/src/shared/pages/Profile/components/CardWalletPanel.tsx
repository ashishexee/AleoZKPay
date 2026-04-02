import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Lock, Unlock, CreditCard, ArrowUpRight, ShieldCheck, Zap, MoreHorizontal, Wallet, AlertCircle } from 'lucide-react';
import { useCardWallet } from '../../../hooks/CardWalletProvider';
import toast from 'react-hot-toast';

const formatAleo = (amount: number) => {
    return (amount / 1000000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

interface CardWalletPanelProps {
    itemVariants: any;
}

export const CardWalletPanel: React.FC<CardWalletPanelProps> = ({ itemVariants }) => {
    const { 
        card,
        isLoading,
        isUnlocked,
        cardBalances,
        createCard,
        unlockCard,
        lockCard,
    } = useCardWallet();

    const [pin, setPin] = useState('');
    const [secret, setSecret] = useState('');
    const [label, setLabel] = useState('');
    const [hint, setHint] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const isInitialized = !!card;
    const isLocked = !isUnlocked;
    const cardAddress = card?.card_address || '';
    const maskedCardNumber = card?.card_last4 ? `•••• •••• •••• ${card.card_last4}` : '•••• •••• •••• ••••';
    
    // Aggregate balances
    const balances = {
        credits: (cardBalances?.ALEO || 0),
        usdcx: (cardBalances?.USDCx || 0),
        usad: (cardBalances?.USAD || 0)
    };

    // Limits from first available token (usually CREDITS) or default
    const limits = {
        singleSpend: card?.limits?.CREDITS?.max_single_spend || 0,
        maxSingleSpend: 10_000_000, // Example fallback
        dailySpend: card?.spent_today?.CREDITS || 0,
        maxDailySpend: card?.limits?.CREDITS?.max_daily_spend || 0
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin || pin.length !== 6 || !secret) {
            toast.error('PIN (6 digits) and Secret are required');
            return;
        }
        setIsUnlocking(true);
        try {
            await unlockCard(pin, secret);
            toast.success('Card Wallet Unlocked');
            setPin('');
            setSecret('');
        } catch (err: any) {
            toast.error(err.message || 'Unlock failed');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleInitialize = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) {
            toast.error('Card label is required');
            return;
        }
        if (!pin || pin.length !== 6 || !secret) {
            toast.error('PIN (6 digits) and Secret are required');
            return;
        }
        setIsInitializing(true);
        try {
            await createCard(pin, secret, { label, hint });
            toast.success('Card Wallet Created & Secured');
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

    if (isLoading) {
        return (
            <GlassCard variants={itemVariants} className="p-8 flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            </GlassCard>
        );
    }

    if (!isInitialized) {
        return (
            <GlassCard variants={itemVariants} className="p-8">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">NullPay Card</span>
                            <h2 className="text-2xl font-bold text-white">Dedicated Multi-Token Card Wallet</h2>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Your card key is generated in the browser, encrypted locally with your PIN and secret, and only decrypted in memory when you actively use it.
                            </p>
                        </div>

                        <form onSubmit={handleInitialize} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Card Label</label>
                                <input 
                                    type="text" 
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="Personal Card"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Optional Card Hint</label>
                                <input
                                    type="text"
                                    maxLength={32}
                                    value={hint}
                                    onChange={(e) => setHint(e.target.value)}
                                    placeholder="e.g. travel card"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                                />
                                <p className="text-[10px] text-gray-500">
                                    Keep this non-secret. Do not store your PIN or secret in the hint.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">6-Digit PIN</label>
                                    <input 
                                        type="password" 
                                        maxLength={6}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors tracking-[0.5em]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Card Secret</label>
                                    <input 
                                        type="password" 
                                        value={secret}
                                        onChange={(e) => setSecret(e.target.value)}
                                        placeholder="Recovery secret"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isInitializing}
                                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50"
                            >
                                {isInitializing ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Wallet className="w-4 h-4" />
                                        Create NullPay Card
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="w-full md:w-72 p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-white/80">
                                <ShieldCheck className="w-4 h-4 text-orange-400" />
                                <span className="text-xs font-bold uppercase tracking-wider">Default Safety Profile</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Balance cap</span>
                                    <span className="text-white font-medium">25 per token</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Single spend cap</span>
                                    <span className="text-white font-medium">10 per token</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">24h spend cap</span>
                                    <span className="text-white font-medium">25 per token</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                            <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                Every limit change later requires a fresh main-wallet signature. The backend only stores ciphertext, card address, and limit metadata.
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>
        );
    }

    if (isLocked) {
        return (
            <GlassCard variants={itemVariants} className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-full md:w-auto flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
                            <Lock className="w-8 h-8 text-orange-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white">Card Locked</h3>
                            <p className="text-xs text-gray-500">Enter credentials to access card</p>
                        </div>
                    </div>

                    <form onSubmit={handleUnlock} className="flex-1 w-full space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">PIN</label>
                                <input 
                                    type="password" 
                                    maxLength={6}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-white focus:border-orange-500/50 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Secret</label>
                                <input 
                                    type="password" 
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    placeholder="Card secret"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            disabled={isUnlocking}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isUnlocking ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Unlock className="w-4 h-4" />
                                    Unlock Spending Card
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* VIRTUAL CARD */}
                <GlassCard variants={itemVariants} className="lg:col-span-2 p-0 overflow-hidden group">
                    <div className="relative h-64 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-8 flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] group-hover:bg-orange-500/10 transition-all duration-700" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 blur-[60px]" />
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-orange-400 tracking-widest uppercase">{card?.card_label}</div>
                                    <div className="text-sm text-white font-mono tracking-[0.25em]">{maskedCardNumber}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{cardAddress.slice(0, 8)}...{cardAddress.slice(-8)}</div>
                                </div>
                            </div>
                            <div className="flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1 items-center gap-1.5 shadow-xl">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Active</span>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {card?.card_hint && (
                                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                                    Hint: {card.card_hint}
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-white tracking-tighter">
                                    {formatAleo(balances.credits + balances.usdcx + balances.usad)}
                                </span>
                                <span className="text-xs text-gray-500 mb-1.5 font-bold tracking-widest uppercase">Total Power</span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Credits</div>
                                    <div className="text-sm font-bold text-white tabular-nums">{formatAleo(balances.credits)}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">USDCx</div>
                                    <div className="text-sm font-bold text-white tabular-nums">{formatAleo(balances.usdcx)}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">USAD</div>
                                    <div className="text-sm font-bold text-white tabular-nums">{formatAleo(balances.usad)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* LIMITS PANEL */}
                <GlassCard variants={itemVariants} className="p-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Spend Control</span>
                             </div>
                             <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                                 <MoreHorizontal className="w-4 h-4 text-gray-500" />
                             </button>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Single Spend</span>
                                    <span className="text-white font-mono">{formatAleo(limits.singleSpend)} / {formatAleo(limits.maxSingleSpend)}</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (limits.singleSpend / limits.maxSingleSpend) * 100)}%` }}
                                        className="h-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">24h Limit</span>
                                    <span className="text-white font-mono">{formatAleo(limits.dailySpend)} / {formatAleo(limits.maxDailySpend)}</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (limits.dailySpend / limits.maxDailySpend) * 100)}%` }}
                                        className="h-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                         <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98]">
                             Top Up
                         </button>
                         <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all active:scale-[0.98]">
                             <Zap className="w-4 h-4" />
                         </button>
                    </div>
                </GlassCard>
            </div>

            {/* QUICK ACTIONS */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Lock Card', icon: Lock, color: 'text-amber-500', bg: 'bg-amber-500/10', action: lockCard },
                    { label: 'Add Limit', icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Card Record', icon: ArrowUpRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'View Backup', icon: AlertCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/10' }
                ].map((item) => (
                    <button 
                        key={item.label}
                        onClick={item.action}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all group"
                    >
                        <div className={`p-2 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white tracking-tight">{item.label}</span>
                    </button>
                ))}
            </motion.div>
        </div>
    );
};
