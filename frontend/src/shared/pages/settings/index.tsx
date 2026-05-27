import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellOff, Copy, Gauge, LogOut, MessageSquareWarning } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '../../components/ui/GlassCard';
import { pageVariants } from '../../utils/core/animations';
import type { LinkedTelegramAccount } from '../../types/common';

export default function SettingsPage() {
    const { address: publicKey, connected, disconnect } = useWallet();
    const navigate = useNavigate();

    // ── Use Estimation (localStorage) ──
    const [estimationEnabled, setEstimationEnabled] = useState(() => {
        try { return localStorage.getItem('nullpay_fee_estimation') !== 'false'; }
        catch { return true; }
    });
    const toggleEstimation = useCallback(() => {
        const next = !estimationEnabled;
        setEstimationEnabled(next);
        try { localStorage.setItem('nullpay_fee_estimation', String(next)); }
        catch { /* noop */ }
    }, [estimationEnabled]);

    // ── Notifications (backend) ──
    const [notifyOnSettled, setNotifyOnSettled] = useState(false);
    const [notifyLoading, setNotifyLoading] = useState(true);
    const [notifySaving, setNotifySaving] = useState(false);

    useEffect(() => {
        if (!publicKey) { setNotifyLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const { getNotificationPreferences } = await import('../../services/api');
                const prefs = await getNotificationPreferences(publicKey);
                if (!cancelled) setNotifyOnSettled(prefs.notify_on_settled);
            } catch {}
            finally { if (!cancelled) setNotifyLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [publicKey]);

    const toggleSettled = async () => {
        if (!publicKey || notifySaving) return;
        setNotifySaving(true);
        const next = !notifyOnSettled;
        try {
            const { updateNotificationPreferences } = await import('../../services/api');
            await updateNotificationPreferences(publicKey, { notify_on_settled: next });
            setNotifyOnSettled(next);
        } catch {}
        finally { setNotifySaving(false); }
    };

    // ── Linked Telegram accounts ──
    const [telegramAccounts, setTelegramAccounts] = useState<LinkedTelegramAccount[]>([]);
    const [telegramLoading, setTelegramLoading] = useState(true);

    useEffect(() => {
        if (!publicKey) { setTelegramLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const { fetchLinkedTelegramAccounts } = await import('../../services/api');
                const accounts = await fetchLinkedTelegramAccounts(publicKey);
                if (!cancelled) setTelegramAccounts(accounts);
            } catch {}
            finally { if (!cancelled) setTelegramLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [publicKey]);

    // ── Helpers ──
    const copyAddress = async () => {
        if (!publicKey) return;
        try {
            await navigator.clipboard.writeText(publicKey);
            toast.success('Address copied to clipboard.');
        } catch {
            toast.error('Could not copy address.');
        }
    };

    const handleDisconnect = async () => {
        try { await disconnect(); } catch {}
    };

    const truncate = (addr: string) => addr.slice(0, 8) + '...' + addr.slice(-6);

    const formatLinkedAt = (iso: string | null) => {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / 86_400_000);
        if (diffDays < 1) return 'Today';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return d.toLocaleDateString();
    };

    // ── Section builder ──
    const SectionHeader = ({ title }: { title: React.ReactNode }) => (
        <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{title}</h2>
        </div>
    );

    const ToggleRow = ({
        icon, label, description, active, onToggle, disabled, statusText,
    }: {
        icon: React.ReactNode; label: string; description: string; active: boolean;
        onToggle: () => void; disabled?: boolean; statusText?: React.ReactNode;
    }) => (
        <button onClick={onToggle} disabled={disabled}
            className="w-full flex flex-col gap-3 px-6 py-5 hover:bg-white/[0.02] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-orange-500/10' : 'bg-white/[0.04]'}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-white font-medium text-sm">{label}</div>
                        <div className="text-white/30 text-xs mt-0.5">{description}</div>
                    </div>
                </div>
                <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${active ? 'bg-orange-500' : 'bg-white/10'}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </div>
            </div>
            {statusText && (
                <div className="ml-14 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs leading-relaxed">
                    {statusText}
                </div>
            )}
        </button>
    );

    return (
        <div className="page-container relative min-h-screen">
            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            {/* Aleo Globe background */}
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img src="/assets/aleo_globe.png" alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
                className="relative z-10 max-w-2xl mx-auto space-y-8">
                {/* Heading */}
                <div className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-1 tracking-tighter leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Settings</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">Manage your NullPay preferences</p>
                </div>

                {/* ── Wallet ── */}
                <GlassCard variant="default" hoverEffect={false} className="p-0 overflow-hidden">
                    <SectionHeader title="Wallet" />
                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <div className="text-white font-medium text-sm">
                                    {connected ? truncate(publicKey || '') : 'Not Connected'}
                                </div>
                                <div className="text-white/30 text-xs mt-0.5">
                                    {connected ? 'Aleo wallet connected' : 'Connect a wallet to access all features'}
                                </div>
                            </div>
                        </div>
                        {connected && (
                            <div className="flex items-center gap-2">
                                <button onClick={copyAddress}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                </button>
                                <button onClick={handleDisconnect}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-300 transition-all">
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Disconnect</span>
                                </button>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* ── Telegram ── */}
                <GlassCard variant="default" hoverEffect={false} className="p-0 overflow-hidden">
                    <SectionHeader title={
                        <span>
                            Telegram <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">Connected Accounts</span>
                        </span>
                    } />
                    <div className="px-6 py-5 space-y-3">
                        {telegramLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                            </div>
                        ) : telegramAccounts.length === 0 ? (
                            <div className="py-3">
                                <div className="text-white/40 text-sm mb-1">No linked Telegram accounts</div>
                                <div className="text-white/25 text-xs">Link your Telegram account via the NullBot to receive payment alerts and manage invoices from Telegram.</div>
                            </div>
                        ) : (
                            <>
                                {telegramAccounts.map((account) => (
                                    <div key={account.id}
                                        className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm font-semibold text-white/50">
                                                {(account.username || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-white text-sm font-medium">
                                                    {account.username ? `@${account.username}` : 'Unknown User'}
                                                </div>
                                                <div className="text-white/30 text-xs flex items-center gap-2">
                                                    {account.telegram_id && <span>ID: {account.telegram_id}</span>}
                                                    {account.linked_at && <span>{formatLinkedAt(account.linked_at)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${account.notifications_enabled ? 'bg-emerald-400' : 'bg-white/20'}`}
                                            title={account.notifications_enabled ? 'Alerts on' : 'Alerts off'} />
                                    </div>
                                ))}
                                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                                    <p className="text-white/30 text-xs">Use <span className="text-white/50 font-mono">/unlink</span> in the Telegram bot to remove an account.</p>
                                    <p className="text-white/20 text-[11px] italic">Unlink via website coming soon</p>
                                </div>
                            </>
                        )}
                    </div>
                </GlassCard>

                {/* ── Use Estimation ── */}
                <GlassCard variant="default" hoverEffect={false} className="p-0 overflow-hidden">
                    <SectionHeader title={
                        <span>
                            Use <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">Estimation</span>
                        </span>
                    } />
                    <ToggleRow
                        icon={<Gauge className={`w-5 h-5 ${estimationEnabled ? 'text-orange-400' : 'text-white/30'}`} />}
                        label="Match fees to current network conditions"
                        description="Automatically adjust fee estimates based on live Aleo network data."
                        active={estimationEnabled}
                        onToggle={toggleEstimation}
                        statusText={estimationEnabled ? (
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                    <span>Real-time optimization active</span>
                                </div>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    NullPay dynamically calculates optimal transaction fees by scanning current Aleo network congestion. A safety buffer is applied to prevent transaction execution drop-outs; unused gas credits are automatically refunded.
                                </p>
                                <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                    <span>• Priority: Fast</span>
                                    <span>• Buffer: ~10%</span>
                                    <span>• Auto-Refund: Enabled</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="text-amber-400/90 font-medium flex items-center gap-1.5">
                                    <span>Static Fee Mode Active</span>
                                </div>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    All transactions will use a pre-configured base fee. Note that during periods of high Aleo network congestion, static fees may result in transaction delays or execution failures.
                                </p>
                            </div>
                        )}
                    />
                </GlassCard>

                {/* ── Notifications ── */}
                <GlassCard variant="default" hoverEffect={false} className="p-0 overflow-hidden">
                    <SectionHeader title="Notifications" />
                    <ToggleRow
                        icon={notifyOnSettled ? <Bell className="w-5 h-5 text-orange-400" /> : <BellOff className="w-5 h-5 text-white/30" />}
                        label="Invoice Settled Alerts"
                        description="Get notified when an invoice is settled on-chain."
                        active={notifyOnSettled}
                        onToggle={toggleSettled}
                        disabled={notifyLoading || notifySaving}
                        statusText={notifyOnSettled ? (
                            <div className="space-y-2.5">
                                <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                                    <span>Real-time alerts active</span>
                                </div>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    You will receive instant browser alerts when incoming invoice payments are fully confirmed and settled on the Aleo blockchain.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="text-white/40 font-medium flex items-center gap-1.5">
                                    <span>Alerts Disabled</span>
                                </div>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    Settlement notifications are turned off. You will need to manually monitor the payment dashboard or search the transaction hash on the Aleo explorer to verify status updates.
                                </p>
                            </div>
                        )}
                    />
                </GlassCard>

                {/* ── Feedback ── */}
                <GlassCard variant="default" hoverEffect={false} className="p-0 overflow-hidden">
                    <SectionHeader title="Support" />
                    <button onClick={() => navigate('/support-feedback')}
                        className="w-full flex flex-col gap-3 px-6 py-5 hover:bg-white/[0.02] transition-colors text-left">
                        <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04]">
                                    <MessageSquareWarning className="w-5 h-5 text-white/30" />
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">Register Complaint / Feedback</div>
                                    <div className="text-white/30 text-xs mt-0.5">
                                        Open the support page to send your issue or product feedback and receive a confirmation email.
                                    </div>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
                                OPEN
                            </span>
                        </div>
                        <div className="ml-14 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs leading-relaxed space-y-1">
                            <div className="text-white/60 font-medium">NullPay Support Center</div>
                            <p className="text-white/40 text-xs">
                                Our support team typically responds to incoming queries and technical complaints within 24–48 business hours. Each submission generates a trackable support ticket sent directly to your designated email.
                            </p>
                        </div>
                    </button>
                </GlassCard>
            </motion.div>
        </div>
    );
}
