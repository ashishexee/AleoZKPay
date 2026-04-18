import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { PayerReceipt, MerchantReceipt } from '../../../../types/receipt';

interface ReceiptHashesModalProps {
    receipts: (PayerReceipt | MerchantReceipt)[] | null;
    onClose: () => void;
}

const formatFieldHash = (hash: string, startLength = 12, endLength = 10) => {
    if (!hash) return '';
    const fieldSuffix = hash.endsWith('field') ? 'field' : '';
    const baseHash = fieldSuffix ? hash.slice(0, -fieldSuffix.length) : hash;

    if (baseHash.length <= startLength + endLength) {
        return `${baseHash}${fieldSuffix}`;
    }

    return `${baseHash.slice(0, startLength)}...${baseHash.slice(-endLength)}${fieldSuffix}`;
};

const formatTokenAmount = (amount: number) => {
    const value = amount / 1_000_000;
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
};

const getTokenLabel = (tokenType: number) => {
    switch (tokenType) {
        case 1: return 'USDCx';
        case 2: return 'USAD';
        default: return 'Credits';
    }
};

export const ReceiptHashesModal: React.FC<ReceiptHashesModalProps> = ({ receipts, onClose }) => {
    const totalAmount = receipts?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    return (
        <AnimatePresence>
            {receipts && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="relative w-full max-w-2xl bg-[#0D0D0D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Payment Details</h3>
                                <p className="text-sm text-gray-400 mt-1">{receipts.length} successful payment{receipts.length > 1 ? 's' : ''}</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                                        <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-400">Amount & Token</th>
                                        <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-400 text-right">Receipt Hash</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05]">
                                    {receipts.map((receipt) => (
                                        <React.Fragment key={receipt.receiptHash}>
                                            <tr className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-6">
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="text-2xl font-bold text-white tracking-tight">
                                                            {formatTokenAmount(receipt.amount)}
                                                        </span>
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-[0.1em]">
                                                            {getTokenLabel(receipt.tokenType)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span className="font-mono text-sm text-gray-300" title={receipt.receiptHash}>
                                                            {formatFieldHash(receipt.receiptHash, 6, 4)}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <CopyButton 
                                                                text={receipt.receiptHash} 
                                                                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                                            />
                                                            <a 
                                                                href={`https://testnet.explorer.provable.com/transaction/${receipt.receiptHash.replace('field', '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                             {(receipt.transactionId || (receipt as any).payerNote || (receipt as any).merchantNote) && (
                                                <tr className="bg-white/[0.01]">
                                                    <td colSpan={2} className="px-6 py-4">
                                                        <div className="flex flex-col gap-4">
                                                            {receipt.transactionId && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[11px] uppercase tracking-wider font-bold text-blue-400/80">
                                                                        Aleo Transaction ID
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-sm text-gray-300">
                                                                            {receipt.transactionId}
                                                                        </span>
                                                                        <CopyButton 
                                                                            text={receipt.transactionId} 
                                                                            className="p-1 text-gray-500 hover:text-blue-300 transition-colors"
                                                                        />
                                                                        <a 
                                                                            href={`https://testnet.explorer.provable.com/transaction/${receipt.transactionId}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {((receipt as any).payerNote || (receipt as any).merchantNote) && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500">
                                                                        {(receipt as any).payerNote ? 'Payer Note' : 'Merchant Note'}
                                                                    </span>
                                                                    <span className="text-sm text-gray-300 leading-relaxed italic">
                                                                        {(receipt as any).payerNote || (receipt as any).merchantNote}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Estimated Total</span>
                            <div className="text-xl font-bold text-white">
                                {receipts.length > 1 ? (
                                    <span className="text-gray-400 text-sm">Mixed Tokens</span>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span>{formatTokenAmount(totalAmount)}</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-widest">{getTokenLabel(receipts[0].tokenType)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
