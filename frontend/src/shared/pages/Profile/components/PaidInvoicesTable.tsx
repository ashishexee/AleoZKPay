import React, { useMemo } from 'react';
import { Shimmer } from '../../../components/ui/Shimmer';
import { CopyButton } from '../../../components/ui/CopyButton';
import { PayerReceipt } from '../../../utils/aleo-utils';

interface PaidInvoicesTableProps {
    receipts: PayerReceipt[];
    loading: boolean;
    search: string;
    onViewReceipts: (hashes: string[]) => void;
}

const formatFieldHash = (hash: string, startLength = 5, endLength = 4) => {
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
    return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
};

export const PaidInvoicesTable: React.FC<PaidInvoicesTableProps> = ({ receipts, loading, search, onViewReceipts }) => {
    // Process receipts to group by invoiceHash
    const groupedReceipts = useMemo(() => {
        // Deduplicate by receiptHash first
        const seenReceipts = new Set<string>();
        const deduped = receipts.filter(r => {
            if (seenReceipts.has(r.receiptHash)) return false;
            seenReceipts.add(r.receiptHash);
            return true;
        });

        const grouped = new Map<string, PayerReceipt[]>();
        deduped.forEach(r => {
            const key = r.invoiceHash;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(r);
        });

        return Array.from(grouped.entries())
            .filter(([hash]) => !search || hash.toLowerCase().includes(search.toLowerCase()));
    }, [receipts, search]);

    return (
        <table className="w-full">
            <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-orange-500/8 via-amber-400/5 to-cyan-400/8 text-left">
                    <th className="py-5 px-6 text-xs font-bold text-orange-100/90 uppercase tracking-[0.24em]">Invoice Hash</th>
                    <th className="py-5 px-6 text-xs font-bold text-amber-100/90 uppercase tracking-[0.24em] text-center">Amount Paid</th>
                    <th className="py-5 px-6 text-xs font-bold text-cyan-100/90 uppercase tracking-[0.24em]">Your Note</th>
                    <th className="py-5 px-6 text-xs font-bold text-emerald-100/90 uppercase tracking-[0.24em] text-right">Receipt Hash</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td className="py-5 px-6"><Shimmer className="h-6 w-48 bg-white/5 rounded" /></td>
                            <td className="py-5 px-6 text-center"><Shimmer className="h-6 w-24 bg-white/5 rounded mx-auto" /></td>
                            <td className="py-5 px-6"><Shimmer className="h-6 w-36 bg-white/5 rounded" /></td>
                            <td className="py-5 px-6 text-right"><Shimmer className="h-6 w-48 bg-white/5 rounded ml-auto" /></td>
                        </tr>
                    ))
                ) : groupedReceipts.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 italic">No paid invoices found.</td>
                    </tr>
                ) : (
                    groupedReceipts.map(([invoiceHash, receipts]) => {
                        let totalCredits = 0;
                        let totalUSDCx = 0;
                        let totalUSAD = 0;
                        
                        receipts.forEach(r => {
                           if (r.tokenType === 1) totalUSDCx += r.amount;
                           else if (r.tokenType === 2) totalUSAD += r.amount;
                           else totalCredits += r.amount;
                        });

                        const noteSummary = Array.from(new Set(receipts.map((receipt) => receipt.payerNote).filter(Boolean)));

                        return (
                            <tr key={invoiceHash} className="group hover:bg-white/5 transition-colors">
                                <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-orange-200/90" title={invoiceHash}>
                                            {formatFieldHash(invoiceHash)}
                                        </span>
                                        <CopyButton text={invoiceHash} title="Copy Invoice Hash" className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-200/50 hover:text-orange-100" />
                                    </div>
                                    <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-gray-500">{receipts.length} payments</span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        {totalCredits > 0 && (
                                            <span className="font-bold text-white text-md">
                                                {formatTokenAmount(totalCredits)}
                                                <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-amber-200/75">Credits</span>
                                            </span>
                                        )}
                                        {totalUSDCx > 0 && (
                                            <span className="font-bold text-white text-md">
                                                {formatTokenAmount(totalUSDCx)}
                                                <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200/75">USDCx</span>
                                            </span>
                                        )}
                                        {totalUSAD > 0 && (
                                            <span className="font-bold text-white text-md">
                                                {formatTokenAmount(totalUSAD)}
                                                <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/75">USAD</span>
                                            </span>
                                        )}
                                        {totalCredits === 0 && totalUSDCx === 0 && totalUSAD === 0 && (
                                            <span className="font-bold text-white text-md">0</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-5 px-6">
                                    <div className="max-w-[220px]">
                                        {noteSummary.length > 0 ? (
                                            <>
                                                <span className="block truncate text-sm text-gray-200" title={noteSummary[0]}>
                                                    {noteSummary[0]}
                                                </span>
                                                {noteSummary.length > 1 && (
                                                    <span className="mt-1 block text-[11px] text-cyan-200/60">
                                                        +{noteSummary.length - 1} more note{noteSummary.length > 2 ? 's' : ''}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-600">No payer note</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-right font-mono text-neon-accent text-sm">
                                    {receipts.length === 1 ? (
                                        <div className="flex justify-end items-center gap-3 group/rh">
                                            <span className="text-emerald-200/90 transition-colors group-hover:text-emerald-100" title={receipts[0].receiptHash}>
                                                {formatFieldHash(receipts[0].receiptHash)}
                                            </span>
                                            <CopyButton text={receipts[0].receiptHash} title="Copy Receipt Hash" className="text-emerald-200/55 hover:text-emerald-100 transition-colors" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => onViewReceipts(receipts.map(r => r.receiptHash))}
                                                className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer border-b border-cyan-400/30 hover:border-cyan-300/50 transition-colors font-medium"
                                            >
                                                Receipts ({receipts.length})
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );
};
