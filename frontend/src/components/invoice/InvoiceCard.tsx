import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvoiceData } from '../../types/invoice';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface InvoiceCardProps {
    invoiceData: InvoiceData;
    resetInvoice: () => void;
    expiry: string;
    memo: string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoiceData,
    resetInvoice,
    expiry,
    memo
}) => {
    const getExpiryLabel = (val: string) => {
        if (val === '0') return 'No Expiry';
        if (val === '1') return '1 Hour';
        if (val === '24') return '24 Hours';
        if (val === '168') return '7 Days';
        return val + ' Hours';
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(invoiceData.link);
    };

    return (
        <GlassCard className="text-center p-8 bg-gradient-to-b from-glass-surface to-black/40">
            <h3 className="mb-6 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-primary to-neon-accent animate-pulse-glow">
                Invoice Ready!
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-black/30 p-5 rounded-2xl border border-white/5">
                <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Amount</span>
                    <span className="text-white font-bold text-xl">{invoiceData.amount} USDC</span>
                </div>
                <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Expiry</span>
                    <span className="text-gray-200">{getExpiryLabel(expiry)}</span>
                </div>
                {memo && (
                    <div className="col-span-2 pt-2 border-t border-white/5 mt-2">
                        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Memo</span>
                        <span className="text-gray-300">{memo}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center mb-8 p-6 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] mx-auto w-fit">
                <QRCodeSVG value={invoiceData.link} size={180} />
            </div>

            <div className="mb-8">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payment Link</label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 truncate">
                        {invoiceData.link}
                    </div>
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={handleCopy}
                    >
                        Copy
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-neon-primary/30 transition-colors group">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Hash</span>
                    <span className="font-mono text-neon-accent truncate block text-xs group-hover:text-neon-primary transition-colors" title={invoiceData.hash}>
                        {invoiceData.hash.slice(0, 6)}...{invoiceData.hash.slice(-6)}
                    </span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-purple-500/30 transition-colors group">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Salt</span>
                    <span className="font-mono text-purple-400 truncate block text-xs group-hover:text-purple-300 transition-colors" title={invoiceData.salt}>
                        {invoiceData.salt.slice(0, 6)}...
                    </span>
                </div>
            </div>

            <Button
                variant="outline"
                className="w-full"
                onClick={resetInvoice}
            >
                Create Another Invoice
            </Button>
        </GlassCard>
    );
};
