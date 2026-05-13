import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../../shared/components/feedback/StatusBadge';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { Input } from '../../../shared/components/ui/Input';
import { Shimmer } from '../../../shared/components/ui/Shimmer';
import { useTransactions } from '../../../shared/hooks/transactions/useTransactions';
import { pageVariants, staggerContainer, fadeInUp, scaleIn } from '../../../shared/utils/core/animations';
import { PaymentHistoryModal } from '../../../shared/pages/profile/components/modals/PaymentHistoryModal';
import React from 'react';
import { InvoiceCreationTimelineChart, type InvoiceTimelineRange, type InvoiceTimelineStatusFilter } from './components/InvoiceCreationTimelineChart';

const CopyButton = ({ text, title }: { text: string, title?: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="group-hover/hash:opacity-100 opacity-0 transition-opacity p-1"
            title={title}
        >
            {copied ? (
                <span className="text-[10px] text-neon-primary font-bold">Copied!</span>
            ) : (
                <svg className="w-3.5 h-3.5 text-gray-600 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 01-2-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                </svg>
            )}
        </button>
    );
};

const Explorer: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [invoiceChartRange, setInvoiceChartRange] = useState<InvoiceTimelineRange>('1M');
    const [sdkOnlyChart, setSdkOnlyChart] = useState(false);
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceTimelineStatusFilter>('BOTH');
    const itemsPerPage = 10;
    const { transactions, loading, fetchTransactions } = useTransactions();

    useEffect(() => {
        fetchTransactions(50);
    }, [fetchTransactions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, searchQuery]);

    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);

    const handleKeyDown = () => {
        // if (e.key === 'Enter') handleSearch();
    };

    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
    const settledCount = transactions.filter(t => t.status === 'SETTLED').length;
    const uniqueMerchants = new Set(transactions.map(t => t.merchant_address)).size;

    const stats = [
        { label: 'Total Null Invoices', value: transactions.length.toString(), trend: '' },
        { label: 'Pending', value: pendingCount.toString(), trend: '' },
        { label: 'Settled', value: settledCount.toString(), trend: '' },
        { label: 'Active Merchants', value: uniqueMerchants.toString(), trend: '' },
        // { label: 'Total Volume', value: `${totalVolume.toFixed(2)}`, trend: '' },
    ];

    const filteredTransactions = transactions.filter(t => {
        const matchesStatus = activeFilter === 'all' || (t.status || '').toLowerCase() === activeFilter.toLowerCase();
        const matchesSearch = !searchQuery || t.invoice_hash.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const containerVariants = staggerContainer;
    const itemVariants = fadeInUp;

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };
    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>


            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="w-full max-w-7xl mx-auto pt-12 pb-20 relative z-10"
            >
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white leading-tight">
                        Pay Privately. <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Nullify the Trace.</span>
                    </h1>

                    {/* SEARCH BAR - HERO SECTION */}
                    <div className="w-full max-w-2xl mt-8 relative group z-50">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-primary/20 via-cyan-500/20 to-neon-primary/20 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative">
                            <Input
                                placeholder=""
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-14 pl-14 pr-12 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/50 text-lg font-medium font-mono text-white shadow-2xl transition-all"
                            />

                            {/* AQUA SEARCH ICON */}
                            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-neon-primary/70 group-hover:text-neon-primary transition-colors filter drop-shadow-[0_0_3px_rgba(0,243,255,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>

                            {/* ANIMATED PLACEHOLDER - visible when empty */}
                            {!searchQuery && (
                                <div className="absolute left-14 top-0 bottom-0 flex items-center pointer-events-none overflow-hidden">
                                    <span className="text-gray-500 font-mono text-base mr-2 whitespace-nowrap pt-1">SEARCH BY</span>
                                    <div className="h-6 relative overflow-hidden flex flex-col justify-center w-[200px]">
                                        <div className="animate-cycle-text relative h-full">
                                            <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-base pt-1">INVOICE HASH</span>
                                            <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-base absolute top-full pt-1">SALT</span>
                                            <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-base absolute top-[200%] pt-1">INVOICE HASH</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CLEAR BUTTON - visible when has query */}
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all transform hover:scale-110"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* SEARCH RESULTS DROPDOWN */}
                        <AnimatePresence>
                            {searchQuery && filteredTransactions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute top-full left-0 right-0 mt-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[400px] overflow-y-auto custom-scrollbar"
                                >
                                    <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-sm sticky top-0 z-10">
                                        <h3 className="text-xs font-bold text-neon-primary uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-primary animate-pulse"></span>
                                            Found {filteredTransactions.length} Matches
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {filteredTransactions.slice(0, 5).map((inv, idx) => (
                                            <div key={idx} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-sm text-white truncate group-hover:text-neon-primary transition-colors">
                                                            {inv.invoice_hash.slice(0, 8)}...{inv.invoice_hash.slice(-8)}
                                                        </span>
                                                        <CopyButton text={inv.invoice_hash} title="Copy Hash" />
                                                    </div>


                                                    {/* Transaction IDs */}
                                                    <div className="flex flex-col gap-2 my-3">
                                                        {inv.invoice_transaction_id && (
                                                            <a
                                                                href={`https://testnet.explorer.provable.com/transaction/${inv.invoice_transaction_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 group/btn w-fit"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover/btn:bg-white/10 group-hover/btn:text-white transition-colors">
                                                                    Creation TX
                                                                </div>
                                                                <span className="text-xs font-mono text-neon-primary group-hover/btn:underline flex items-center gap-1">
                                                                    {inv.invoice_transaction_id.slice(0, 10)}...
                                                                    <svg className="w-3 h-3 opacity-50 group-hover/btn:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                </span>
                                                            </a>
                                                        )}
                                                        {inv.payment_tx_id && (
                                                            <a
                                                                href={`https://testnet.explorer.provable.com/transaction/${inv.payment_tx_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 group/btn w-fit"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-wider group-hover/btn:bg-purple-500/20 group-hover/btn:text-purple-300 transition-colors">
                                                                    Payment TX
                                                                </div>
                                                                <span className="text-xs font-mono text-neon-primary group-hover/btn:underline flex items-center gap-1">
                                                                    {inv.payment_tx_id.slice(0, 10)}...
                                                                    <svg className="w-3 h-3 opacity-50 group-hover/btn:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                </span>
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <StatusBadge status={inv.status as any} />
                                                        <span className="text-[10px] font-mono text-gray-500">
                                                            {new Date(inv.created_at || Date.now()).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {inv.invoice_transaction_id && (
                                                    <a
                                                        href={`https://testnet.explorer.provable.com/transaction/${inv.invoice_transaction_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                        title="View on Explorer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {filteredTransactions.length > 5 && (
                                        <div className="p-3 text-center border-t border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">
                                            View all {filteredTransactions.length} results
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* BENTO GRID LAYOUT */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                    <GlassCard variants={itemVariants} className="col-span-1 md:col-span-2 row-span-2 p-8 flex flex-col justify-between group h-full relative overflow-hidden">
                        <div>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-xl font-bold text-white tracking-tight">Null Invoice Created</h3>
                                <div className="flex flex-wrap items-center rounded-full border border-white/5 bg-black/45 p-1 shadow-2xl backdrop-blur-xl gap-1">
                                    {(['1D', '1W', '1M'] as const).map((entry) => {
                                        const isActive = invoiceChartRange === entry;
                                        return (
                                            <button
                                                key={entry}
                                                onClick={() => setInvoiceChartRange(entry)}
                                                className={`rounded-full px-5 py-1.5 text-[11px] font-bold transition-colors duration-300 ${isActive ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-500 hover:text-gray-200'}`}
                                            >
                                                {entry}
                                            </button>
                                        );
                                    })}
                                    <div className="mx-1 h-4 w-px self-center bg-white/10" />
                                    {(['BOTH', 'PENDING', 'SETTLED'] as const).map((entry) => {
                                        const isActive = invoiceStatusFilter === entry;
                                        return (
                                            <button
                                                key={entry}
                                                onClick={() => setInvoiceStatusFilter(entry)}
                                                className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors duration-300 ${isActive ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                                            >
                                                {entry === 'BOTH' ? 'Both' : entry === 'PENDING' ? 'Pending' : 'Settled'}
                                            </button>
                                        );
                                    })}
                                    <div className="mx-1 h-4 w-px self-center bg-white/10" />
                                    <button
                                        onClick={() => setSdkOnlyChart((current) => !current)}
                                        className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors duration-300 ${sdkOnlyChart ? 'bg-[#A78BFA]/18 text-[#D8B4FE] ring-1 ring-[#A78BFA]/30' : 'text-gray-500 hover:text-gray-200'}`}
                                    >
                                        SDK
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-end">
                            <div className="w-full opacity-90 transition-opacity duration-500 group-hover:opacity-100">
                                <InvoiceCreationTimelineChart
                                    transactions={transactions}
                                    isLoading={loading}
                                    range={invoiceChartRange}
                                    sdkOnly={sdkOnlyChart}
                                    statusFilter={invoiceStatusFilter}
                                />
                            </div>
                        </div>
                    </GlassCard>
                    {stats.map((stat, i) => (
                        <GlassCard
                            key={i}
                            variants={scaleIn}
                            className={`p-8 flex flex-col items-start justify-center group relative overflow-hidden hover:border-white/20 ${i === 4 ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}
                        >
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block group-hover:text-white transition-colors">{stat.label}</span>
                            {loading ? (
                                <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                            ) : (
                                <h2 className="text-5xl font-bold text-white group-hover:scale-105 transition-transform duration-300 origin-left tracking-tighter">{stat.value}</h2>
                            )}
                        </GlassCard>
                    ))}
                </motion.div>


                {/* SEARCH BAR & FILTERS */}


                {/* TABLE SECTION */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden mt-2">
                    <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-primary animate-pulse"></span>
                            Transactions
                        </h2>
                        <div className="flex bg-black/30 rounded-full p-1 border border-white/5">
                            {['all', 'pending', 'settled'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeFilter === filter
                                        ? 'bg-neon-primary/10 text-neon-primary shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                                        : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 text-left">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Null Invoice Hash</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">On-Chain Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-4 px-6">
                                                <Shimmer className="h-5 w-48 bg-white/5 rounded" />
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-center">
                                                    <Shimmer className="h-6 w-24 bg-white/5 rounded-full" />
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-end gap-2">
                                                    <Shimmer className="h-8 w-24 bg-white/5 rounded-md" />
                                                    <Shimmer className="h-8 w-24 bg-white/5 rounded-md" />
                                                    <Shimmer className="h-8 w-32 bg-white/5 rounded-md" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-gray-500">No Null Invoices found</td>
                                    </tr>
                                ) : (
                                    filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((inv, i) => (
                                        <motion.tr
                                            key={i}
                                            variants={fadeInUp}
                                            className="hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="py-4 px-6 font-mono text-neon-accent group-hover:text-neon-primary transition-colors text-sm">
                                                <div className="flex items-center gap-2 group/hash">
                                                    <span>{inv.invoice_hash.slice(0, 8)}...{inv.invoice_hash.slice(-6)}</span>
                                                    <CopyButton text={inv.invoice_hash} title="Copy Full Hash" />
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={inv.status as any} />
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex gap-2 justify-end w-full">
                                                    <div className="w-[120px] flex justify-end">
                                                        {inv.invoice_transaction_id && (
                                                            <button
                                                                onClick={() => openExplorer(inv.invoice_transaction_id)}
                                                                className="flex items-center gap-1.5 text-xs bg-cyan-900/20 hover:bg-cyan-900/40 px-3 py-1.5 rounded-md border border-cyan-500/20 hover:border-cyan-500/50 transition-all text-cyan-400 font-medium group/btn w-full justify-center"
                                                                title="View Invoice Creation Proof"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                Creation Tx
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="w-[120px] flex justify-end">
                                                        {(inv.payment_tx_ids?.length || inv.payment_tx_id) && (
                                                            <button
                                                                onClick={() => {
                                                                    const ids = inv.payment_tx_ids?.length ? inv.payment_tx_ids : [inv.payment_tx_id!];
                                                                    if (ids.length > 1) {
                                                                        setSelectedPaymentIds(ids);
                                                                    } else {
                                                                        openExplorer(ids[0]);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1.5 text-xs bg-emerald-900/20 hover:bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/20 hover:border-emerald-500/50 transition-all text-emerald-400 font-medium group/btn shadow-[0_0_10px_rgba(16,185,129,0.1)] w-full justify-center"
                                                                title="View Payment Proof"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {inv.payment_tx_ids && inv.payment_tx_ids.length > 1 ? `Tx (${inv.payment_tx_ids.length})` : 'Payment Tx'}
                                                            </button>
                                                        )}
                                                    </div>


                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* PAGINATION CONTROLS */}
                    {Math.ceil(filteredTransactions.length / itemsPerPage) > 1 && (
                        <div className="flex justify-center items-center gap-2 py-6 border-t border-white/5">
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
                                {Array.from({ length: Math.ceil(filteredTransactions.length / itemsPerPage) }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    // Show limited page numbers if too many pages? For now show all as requested "page 1 page 2 page 3"
                                    if (filteredTransactions.length / itemsPerPage > 10 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== Math.ceil(filteredTransactions.length / itemsPerPage)) {
                                        if (Math.abs(currentPage - pageNum) === 3) return <span key={pageNum} className="text-gray-600 self-end">...</span>;
                                        return null;
                                    }

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
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTransactions.length / itemsPerPage)))}
                                disabled={currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)}
                                className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </GlassCard>
            </motion.div>

            <PaymentHistoryModal
                paymentIds={selectedPaymentIds}
                onClose={() => setSelectedPaymentIds(null)}
                onViewTx={openExplorer}
            />
        </motion.div>

    );
};

export default Explorer;
