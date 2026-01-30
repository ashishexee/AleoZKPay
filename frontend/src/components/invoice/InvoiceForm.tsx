import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { InvoiceType } from '../../hooks/useCreateInvoice';

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
    invoiceType: InvoiceType;
    setInvoiceType: (val: InvoiceType) => void;
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
    status,
    invoiceType,
    setInvoiceType
}) => {
    return (
        <GlassCard variant="heavy" className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Invoice Details</h2>

            <div className="space-y-6">

                {/* INVOICE TYPE TOGGLE */}
                <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                    <button
                        onClick={() => setInvoiceType('standard')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'standard'
                                ? 'bg-neon-primary text-black shadow-lg shadow-neon-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Standard Invoice
                    </button>
                    <button
                        onClick={() => setInvoiceType('fundraising')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'fundraising'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Fundraising (Multi-Pay)
                    </button>
                </div>
                <div className="text-xs text-gray-400 text-center -mt-4 mb-4">
                    {invoiceType === 'standard'
                        ? 'Single payment only. Invoice closes after payment.'
                        : 'Allows multiple payments. Ideal for donations or crowdfunding.'}
                </div>

                <Input
                    label="Amount (Credits)"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider ml-1">Expiry</label>
                    <div className="relative">
                        <select
                            className="w-full bg-black/20 border border-white/10 text-gray-200 rounded-2xl px-4 py-3 appearance-none focus:outline-none focus:border-white/20 hover:bg-black/30 transition-colors"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                        >
                            <option value="0" className="bg-void-main text-white">No Expiry (Permanent)</option>
                            <option value="1" className="bg-void-main text-white">1 Hour</option>
                            <option value="24" className="bg-void-main text-white">24 Hours</option>
                            <option value="168" className="bg-void-main text-white">7 Days</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
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
                            Creating {invoiceType === 'standard' ? 'Invoice' : 'Fundraiser'}...
                        </span>
                    ) : !publicKey ? (
                        'Connect Wallet to Continue'
                    ) : (
                        invoiceType === 'standard' ? 'Generate Invoice Link' : 'Create Fundraiser Link'
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
