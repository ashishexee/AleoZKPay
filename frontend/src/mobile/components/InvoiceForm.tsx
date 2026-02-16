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
    tokenType: number;
    setTokenType: (val: number) => void;
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
    setInvoiceType,
    tokenType,
    setTokenType
}) => {
    return (
        <GlassCard variant="heavy" className="p-5">
            <h2 className="text-2xl font-bold text-white mb-6">Invoice Details</h2>

            <div className="space-y-6">

                {/* CURRENCY TOGGLE */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Currency</label>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5 mb-4">
                        <button
                            onClick={() => setTokenType(0)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 0
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Credits
                        </button>
                        <button
                            onClick={() => setTokenType(1)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 1
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            USDCx
                        </button>
                    </div>
                </div>

                {/* INVOICE TYPE TOGGLE */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</label>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                        <button
                            onClick={() => setInvoiceType('standard')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'standard'
                                ? 'bg-neon-primary text-black shadow-lg shadow-neon-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Standard
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
                        <button
                            onClick={() => setInvoiceType('donation')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'donation'
                                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Donation
                        </button>
                    </div>
                </div>

                <div className="text-xs text-gray-400 text-center -mt-4 mb-4">
                    {invoiceType === 'standard' && 'Single payment only. Invoice closes after payment.'}
                    {invoiceType === 'multipay' && 'Allows multiple payments. Ideal for campaigns.'}
                    {invoiceType === 'donation' && (
                        <span>
                            <strong className="text-pink-400 block mb-1">Donation Mode</strong>
                            Open-ended payments. Payer decides the amount.
                        </span>
                    )}
                </div>

                {invoiceType !== 'donation' && (
                    <Input
                        label={`Amount (${tokenType === 0 ? 'Credits' : 'USDCx'})`}
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                )}

                <Input
                    label="Memo (Optional)"
                    type="text"
                    placeholder={invoiceType === 'donation' ? "e.g., Save the Whales Campaign" : "e.g., Dinner Bill"}
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
                                    Creating...
                                </span>
                            ) : (
                                invoiceType === 'standard' ? 'Generate Null Invoice Link' :
                                    invoiceType === 'multipay' ? 'Create Multi Pay Link' :
                                        'Create Donation Link'
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
