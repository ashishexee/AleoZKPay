import React from 'react';
import { CheckCircle, Key, Lock } from 'lucide-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { CopyButton } from '../../../components/ui/CopyButton';
import { SdkDashboard } from './SdkDashboard';


interface MerchantConsoleProps {
    publicKey: string | null;
    name: string;
    setName: (value: string) => void;
    webhookUrl: string;
    setWebhookUrl: (value: string) => void;
    loading: boolean;
    error: string | null;
    secretKey: string | null;
    setSecretKey: (value: string | null) => void;
    handleRegister: (e: React.FormEvent) => void;
}

export const MerchantConsole: React.FC<MerchantConsoleProps> = ({
    publicKey,
    name,
    setName,
    webhookUrl,
    setWebhookUrl,
    loading,
    error,
    secretKey,
    setSecretKey,
    handleRegister,
}) => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8 items-start">
                <GlassCard className="p-8">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Merchant Access</span>
                    <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">API Key And Dashboard Setup</h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        Connect your merchant wallet, register your store, save the secret key once, then use the SDK dashboard below for tagged SDK invoices.
                    </p>

                    {!publicKey ? (
                        <div className="space-y-5 text-center py-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
                                <Lock className="w-6 h-6 text-gray-500" />
                            </div>
                            <p className="text-gray-500 text-sm">Connect your wallet to register as a merchant and unlock the SDK dashboard.</p>
                            <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-black [&>button]:!rounded-xl [&>button]:!h-12">
                                <WalletMultiButton />
                            </div>
                        </div>
                    ) : secretKey ? (
                        <div className="space-y-5">
                            <div className="p-4 bg-cyan-400/10 border border-cyan-300/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-bold text-white">Merchant Registered</span>
                                </div>
                                <p className="text-gray-300 text-xs leading-relaxed mb-4">
                                    Save this key in your backend environment now. It will not be shown again on the dashboard.
                                </p>
                                <div className="bg-black/60 rounded-xl p-4 border border-white/10 relative overflow-hidden flex items-center justify-between gap-3">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-300 to-white" />
                                    <code className="text-cyan-300 text-xs font-mono break-all pl-2">************************************************</code>
                                    <CopyButton text={secretKey} className="text-cyan-300 hover:text-white" />
                                </div>
                            </div>

                            <Button variant="secondary" className="w-full" onClick={() => setSecretKey(null)}>
                                Register Another Store
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-5 items-start">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Store Name *</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. My Premium Store"
                                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Webhook URL</label>
                                    <input
                                        type="url"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        placeholder="https://yoursite.com/api/webhook"
                                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                    />
                                    <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Optional, but recommended for fulfillment.</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Settlement Address</label>
                                    <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.05] min-h-[56px] flex items-center">
                                        <p className="text-[10px] text-gray-500 font-mono break-all">{publicKey}</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-xs text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit" variant="primary" glow className="w-full xl:w-auto xl:min-w-[280px] h-14 text-base" disabled={loading}>
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Generating...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            Generate Secret Key
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </GlassCard>

                <SdkDashboard />
            </div>
        </div>
    );
};

export default MerchantConsole;
