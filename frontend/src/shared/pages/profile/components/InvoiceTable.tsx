import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../../components/feedback/StatusBadge';
import { LinkButton } from '../../../components/ui/LinkButton';
import { CopyButton } from '../../../components/ui/CopyButton';
import { generateInvoicePdf } from '../../../utils/invoice/generateInvoicePdf';
import { getTokenLabel } from '../../../utils/payments/tokens';

interface InvoiceTableProps {
    invoices: any[];
    loading: boolean;
    search: string;
    valueFilterType: 'none' | 'amount' | 'earnings';
    valueFilterAmount: number | null;
    dateFilterMode: 'all' | 'single' | 'range';
    singleDateFilter: string;
    rangeStartDateFilter: string;
    rangeEndDateFilter: string;
    currentPage: number;
    itemsPerPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onVerify: (invoice: any) => void;
    onSettle: (invoice: any) => void;
    onDelete?: (invoice: any) => void;
    settlingId: string | null;
    deletingId?: string | null;
    onViewPayments: (paymentIds: string[]) => void;
    transactions: any[];
    burnerDeleteReady?: boolean;
}

const ShimmerRow: React.FC = () => (
    <tr className="animate-pulse">
        <td className="py-4 px-6"><div className="h-4 w-28 bg-white/10 rounded" /></td>
        <td className="py-4 px-6 text-center"><div className="h-4 w-12 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-4 w-12 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-16 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-14 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-16 bg-white/10 rounded-full mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-4 w-16 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-left"><div className="h-4 w-20 bg-white/10 rounded" /></td>
        <td className="py-4 px-6 text-right"><div className="h-7 w-24 bg-white/10 rounded mx-auto" /></td>
    </tr>
);

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
    invoices,
    loading,
    search,
    valueFilterType,
    valueFilterAmount,
    dateFilterMode,
    singleDateFilter,
    rangeStartDateFilter,
    rangeEndDateFilter,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    onVerify,
    onSettle,
    onDelete,
    settlingId,
    deletingId = null,
    onViewPayments,
    transactions,
    burnerDeleteReady = false
}) => {
    const navigate = useNavigate();
    const [initialGrace, setInitialGrace] = useState(true);
    const normalizedSearch = search.trim().toLowerCase();

    const getDayRange = (value: string) => {
        if (!value) return null;

        const start = new Date(`${value}T00:00:00`);
        if (Number.isNaN(start.getTime())) return null;

        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        return { start: start.getTime(), end: end.getTime() };
    };

    const matchesDateFilter = (value?: string | null) => {
        if (dateFilterMode === 'all') return true;
        if (!value) return false;

        const timestamp = new Date(value).getTime();
        if (Number.isNaN(timestamp)) return false;

        if (dateFilterMode === 'single') {
            const selectedDay = getDayRange(singleDateFilter);
            if (!selectedDay) return true;
            return timestamp >= selectedDay.start && timestamp < selectedDay.end;
        }

        const startDay = getDayRange(rangeStartDateFilter);
        const endDay = getDayRange(rangeEndDateFilter);

        if (!startDay && !endDay) return true;
        if (startDay && timestamp < startDay.start) return false;
        if (endDay && timestamp >= endDay.end) return false;

        return true;
    };

    const renderTokenTotals = (
        totals: { credits?: number; usdcx?: number; usad?: number } | undefined,
        fallbackAmount: number,
        fallbackTokenType: number,
        invoiceType: number
    ) => {
        const values = [
            { key: 'credits', amount: totals?.credits || 0, label: 'Credits' },
            { key: 'usdcx', amount: totals?.usdcx || 0, label: 'USDCx' },
            { key: 'usad', amount: totals?.usad || 0, label: 'USAD' }
        ].filter((entry) => entry.amount > 0);

        if (values.length > 0) {
            return (
                <div className="flex items-start justify-center gap-4">
                    {values.map((entry) => (
                        <div key={entry.key} className="flex min-w-[52px] flex-col items-center">
                            <span className="font-bold text-white">{entry.amount}</span>
                            <span className="text-[10px] text-gray-500 uppercase">{entry.label}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center">
                <span className="font-bold text-gray-500">{fallbackAmount}</span>
                <span className="text-[10px] text-gray-600 uppercase">{getTokenLabel(fallbackTokenType, invoiceType)}</span>
            </div>
        );
    };

    // Always show shimmer for the first 5 seconds after mount, then allow empty state
    useEffect(() => {
        const timer = setTimeout(() => setInitialGrace(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // If invoices arrive, immediately kill the grace period
    useEffect(() => {
        if (invoices.length > 0) {
            setInitialGrace(false);
        }
    }, [invoices.length]);

    const getEarningsTotal = (invoice: any) => {
        const earnings = invoice.earnings || {};
        return Number(earnings.credits || 0) + Number(earnings.usdcx || 0) + Number(earnings.usad || 0);
    };

    const filteredInvoices = invoices.filter((inv) => {
        const merchantNotes = Array.isArray(inv.merchantNotes) ? inv.merchantNotes : [];
        const searchableValues = [
            inv.invoiceHash,
            inv.salt,
            inv.title,
            inv.memo,
            inv.latestMerchantNote,
            ...merchantNotes
        ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

        const matchesSearch = !normalizedSearch || searchableValues.some((value) => value.includes(normalizedSearch));
        if (!matchesSearch) {
            return false;
        }

        if (!matchesDateFilter(inv.createdAt || inv.created_at || null)) {
            return false;
        }

        if (valueFilterAmount === null) {
            return true;
        }

        if (valueFilterType === 'earnings') {
            return getEarningsTotal(inv) >= valueFilterAmount;
        }

        if (valueFilterType === 'amount') {
            return Number(inv.amount || 0) >= valueFilterAmount;
        }

        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Show shimmer if loading OR still within the initial grace period (and no data yet)
    const showShimmer = invoices.length === 0 && (loading || initialGrace);
    const showEmpty = invoices.length === 0 && !loading && !initialGrace;

    return (
        <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10 text-left">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Hash</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Amount</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Earnings</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Type</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Wallet</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Tx IDs</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">Title / Memo / Latest Note</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {showShimmer ? (
                        <>
                            <ShimmerRow />
                            <ShimmerRow />
                            <ShimmerRow />
                        </>
                    ) : showEmpty ? (
                        <tr><td colSpan={9} className="text-center py-12 text-gray-500 italic">{search || dateFilterMode !== 'all' ? 'No invoices match the active filters.' : 'No created invoices found.'}</td></tr>
                    ) : (
                        paginatedInvoices.map((inv, i) => {
                            const earningsTotal = getEarningsTotal(inv);
                            const hasRecordedPayments = (inv.paymentTxIds?.length || 0) > 0 || earningsTotal > 0;
                            const canDelete = inv.status !== 'SETTLED' && !hasRecordedPayments;
                            const deleteDisabled = deletingId === inv.invoiceHash || (inv.walletType === 1 && !burnerDeleteReady);
                            const deleteTitle = inv.walletType === 1 && !burnerDeleteReady
                                ? 'Unlock the burner wallet to delete this burner-owned invoice.'
                                : 'Delete invoice on-chain and off-chain';

                            // Base Params
                            const paymentParams = new URLSearchParams({
                                merchant: inv.owner || '',
                                amount: inv.invoiceType === 2 ? '0' : inv.amount.toString(),
                                salt: inv.salt || ''
                            });

                            if (inv.tokenType === 1) paymentParams.append('token', 'usdcx');
                            if (inv.tokenType === 2) paymentParams.append('token', 'usad');
                            if (inv.tokenType === 3) paymentParams.append('token', 'any');
                            if (inv.invoiceType === 1) paymentParams.append('type', 'multipay');
                            if (inv.invoiceType === 2) paymentParams.append('type', 'donation');

                            // 1. Link WITH title and memo
                            if (inv.title) paymentParams.append('title', inv.title);
                            if (inv.memo) paymentParams.append('memo', inv.memo);
                            const paymentLink = `${window.location.origin}/pay?${paymentParams.toString()}`;

                            // 2. Link WITHOUT Memo (Optional)
                            let paymentLinkNoMemo = undefined;
                            if (inv.memo) {
                                const paramsNo = new URLSearchParams(paymentParams);
                                paramsNo.delete('memo');
                                paymentLinkNoMemo = `${window.location.origin}/pay?${paramsNo.toString()}`;
                            }

                            return (
                                <tr
                                    key={i}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => navigate(`/invoice/${inv.invoiceHash}`)}
                                >
                                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/invoice/${inv.invoiceHash}`)}
                                                className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline text-left"
                                                title="Open invoice details"
                                            >
                                                {inv.invoiceHash?.slice(0, 10)}...{inv.invoiceHash?.slice(-6)}
                                            </button>
                                            <CopyButton text={inv.invoiceHash} title="Copy Invoice Hash" className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {inv.invoiceType === 2 ? (
                                            renderTokenTotals(inv.donations, 0, inv.tokenType, inv.invoiceType)
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-white">{inv.amount}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{getTokenLabel(inv.tokenType, inv.invoiceType)}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {renderTokenTotals(inv.earnings, 0, inv.tokenType, inv.invoiceType)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${inv.invoiceType === 1 ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
                                            inv.invoiceType === 2 ? 'bg-pink-900/30 text-pink-400 border border-pink-500/20' :
                                                'bg-gray-800 text-gray-400 border border-white/5'
                                            }`}>
                                            {inv.invoiceType === 1 ? 'Multi' : inv.invoiceType === 2 ? 'Donate' : 'Standard'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {inv.walletType === 1 ? (
                                            <div className="flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-neon-primary/40 bg-neon-primary/10 text-neon-primary" title="Funds protected by ephemeral burner address">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Burner
                                            </div>
                                        ) : (
                                            <span className="text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider text-gray-500">Main</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            {inv.creationTx && (
                                                <a href={`https://testnet.explorer.provable.com/transaction/${inv.creationTx}`} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-neon-primary transition-colors underline decoration-dotted">
                                                    Create Tx
                                                </a>
                                            )}
                                            {inv.paymentTxIds?.length > 0 && (
                                                <div className="group/tx relative">
                                                    <button
                                                        onClick={() => onViewPayments(inv.paymentTxIds)}
                                                        className="text-[10px] text-green-500 hover:text-green-400 cursor-pointer border-b border-green-500/30 hover:border-green-400/50 transition-colors"
                                                    >
                                                        {inv.paymentTxIds.length} Payment{inv.paymentTxIds.length > 1 ? 's' : ''}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-left">
                                        <div className="flex items-center gap-2">
                                            {canDelete && onDelete && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(inv); }}
                                                    disabled={deleteDisabled}
                                                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title={deleteTitle}
                                                >
                                                    {deletingId === inv.invoiceHash ? (
                                                        <span className="w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin block" />
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                            <div className="space-y-1 max-w-[220px]">
                                                <span className="text-sm font-semibold text-white truncate block" title={inv.title}>
                                                    {inv.title || 'Untitled Invoice'}
                                                </span>
                                                <span className="text-sm text-gray-400 truncate block" title={inv.memo}>
                                                    {inv.memo || '-'}
                                                </span>
                                            {inv.merchantNotes && inv.merchantNotes.length > 1 ? (
                                                <div 
                                                    className="inline-flex items-center gap-1 text-xs text-orange-400 font-medium hover:text-orange-300 transition-colors"
                                                    title={inv.merchantNotes.join('\n')}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                    </svg>
                                                    {inv.merchantNotes.length} Notes <span className="opacity-60 text-[10px] ml-1"></span>
                                                </div>
                                            ) : inv.latestMerchantNote ? (
                                                <span className="block truncate text-xs text-orange-300/80" title={inv.latestMerchantNote}>
                                                    Note: {inv.latestMerchantNote}
                                                </span>
                                            ) : (
                                                <span className="block truncate text-xs text-gray-600">No merchant note</span>
                                            )}
                                        </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex gap-2 justify-end w-full">
                                            {/* DOWNLOAD PDF */}
                                            <button
                                                onClick={() => {
                                                    const dbTx = transactions.find((t: any) => t.invoice_hash === inv.invoiceHash);
                                                    generateInvoicePdf({
                                                        invoiceHash: inv.invoiceHash,
                                                        amount: inv.amount,
                                                        tokenType: inv.tokenType,
                                                        invoiceType: inv.invoiceType,
                                                        walletType: inv.walletType,
                                                        title: inv.title,
                                                        status: inv.status,
                                                        memo: inv.memo,
                                                        creationTx: inv.creationTx,
                                                        paymentTxIds: inv.paymentTxIds,
                                                        items: dbTx?.invoice_items || undefined,
                                                        donations: inv.donations || undefined,
                                                    });
                                                }}
                                                className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-gray-400 hover:text-white"
                                                title="Download Invoice PDF"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>

                                            {(inv.amount === 0 && inv.invoiceType !== 2) ? (
                                                <span className="text-[10px] text-yellow-500 animate-pulse px-2">Syncing...</span>
                                            ) : (
                                                <LinkButton url={paymentLink} urlNoMemo={paymentLinkNoMemo} />
                                            )}

                                            {/* Settle Button for Donation (2) or Multipay (1) if not already settled */}
                                            {inv.status !== 'SETTLED' && (inv.invoiceType === 1 || inv.invoiceType === 2) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSettle(inv); }}
                                                    disabled={settlingId === inv.invoiceHash}
                                                    className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded border border-red-500/20 hover:border-red-500/50 transition-all text-red-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Stop accepting payments and settle on-chain"
                                                >
                                                    {settlingId === inv.invoiceHash ? (
                                                        <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                    Settle
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onVerify(inv); }}
                                                className="flex items-center gap-1.5 text-xs bg-neon-primary/10 hover:bg-neon-primary/20 px-3 py-1.5 rounded-md border border-neon-primary/20 hover:border-neon-primary/50 transition-all text-neon-primary font-medium group/btn"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Verify
                                            </button>

                                            {canDelete && onDelete && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(inv); }}
                                                    disabled={deleteDisabled}
                                                    className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-md border border-red-500/20 hover:border-red-500/50 transition-all text-red-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={deleteTitle}
                                                >
                                                    {deletingId === inv.invoiceHash ? (
                                                        <span className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
                                                        </svg>
                                                    )}
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                                        ? 'bg-neon-primary text-black font-bold shadow-lg shadow-neon-primary/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};
