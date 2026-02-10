import React from 'react';
import GlassCard from '../../components/GlassCard';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { InvoiceType } from '../../hooks/useCreateInvoice';

interface InvoiceFormProps {
    amount: number | '';
    setAmount: (val: number | '') => void;
    memo: string;
    setMemo: (val: string) => void;
    handleCreate: () => void;
    loading: boolean;
    publicKey: string | null;
    status: string;
    invoiceType: InvoiceType;
    setInvoiceType: (val: InvoiceType) => void;
}

export const MobileInvoiceForm: React.FC<InvoiceFormProps> = ({
    amount,
    setAmount,
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
        <GlassCard variant="heavy" className="p-5">
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
                        onClick={() => setInvoiceType('multipay')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'multipay'
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Multi Pay
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

                <Input
                    label="Memo (Optional)"
                    type="text"
                    placeholder="e.g., Dinner Bill"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                />

                <div className="w-full mt-4">
                    {!publicKey ? (
                        <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!h-12 [&>button]:!rounded-xl [&>button]:!font-bold [&>button]:!bg-white [&>button]:!text-black hover:[&>button]:!bg-gray-200 [&>button]:!transition-colors">
                            <WalletMultiButton className="!w-full !justify-center" />
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreate}
                            disabled={loading}
                            glow={!loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating {invoiceType === 'standard' ? 'Null-Invoice' : 'Multi Pay'}...
                                </span>
                            ) : (
                                invoiceType === 'standard' ? 'Generate Null-Invoice Link' : 'Create Null-Payment Link'
                            )}
                        </Button>
                    )}
                </div>

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
