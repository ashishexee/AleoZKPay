import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface InvoiceFormProps {
    amount: number | '';
    setAmount: (val: number | '') => void;
    expiry: string;
    setExpiry: (val: string) => void;
    memo: string;
    setMemo: (val: string) => void;
    handleCreate: () => void;
    loading: boolean;
    publicKey: string | null;
    status: string;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
    amount,
    setAmount,
    expiry,
    setExpiry,
    memo,
    setMemo,
    handleCreate,
    loading,
    publicKey,
    status
}) => {
    return (
        <GlassCard variant="heavy" className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Invoice Details</h2>

            <div className="space-y-6">
                <Input
                    label="Amount (USDC)"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider ml-1">Expiry</label>
                    <div className="relative">
                        <select
                            className="w-full bg-black/20 border border-white/5 text-white rounded-2xl px-4 py-3 appearance-none focus:outline-none focus:border-neon-primary/50 hover:bg-black/30 transition-colors"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                        >
                            <option value="0" className="bg-void-main">No Expiry (Permanent)</option>
                            <option value="1" className="bg-void-main">1 Hour</option>
                            <option value="24" className="bg-void-main">24 Hours</option>
                            <option value="168" className="bg-void-main">7 Days</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            ▼
                        </div>
                    </div>
                </div>

                <Input
                    label="Memo (Optional)"
                    type="text"
                    placeholder="e.g., Dinner Bill"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                />

                <Button
                    variant="primary"
                    className="w-full mt-4"
                    onClick={handleCreate}
                    disabled={loading || !publicKey}
                    glow={!loading && !!publicKey}
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating Invoice...
                        </span>
                    ) : !publicKey ? (
                        'Connect Wallet to Continue'
                    ) : (
                        'Generate Invoice Link'
                    )}
                </Button>

                {status && (
                    <div className={`p-4 rounded-xl text-center text-sm font-medium border ${status.includes('Error')
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-neon-primary/10 border-neon-primary/20 text-neon-primary'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
