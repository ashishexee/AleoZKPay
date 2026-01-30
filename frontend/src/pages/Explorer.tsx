import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { useTransactions } from '../hooks/useTransactions';
import { pageVariants, staggerContainer, fadeInUp, scaleIn } from '../utils/animations';
import { getInvoiceHashFromMapping, getInvoiceStatus } from '../utils/aleo-utils';
import { fetchInvoiceByHash, Invoice } from '../services/api';

const Explorer = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const { transactions, loading, fetchTransactions } = useTransactions();

    useEffect(() => {
        fetchTransactions(50);
    }, [fetchTransactions]);

    const [searchResult, setSearchResult] = useState<Invoice | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // On-chain verification state
    const [verificationStatus, setVerificationStatus] = useState<Record<string, 'idle' | 'verifying' | 'verified' | 'not-verified'>>({});

    const handleVerifyOnChain = async (invoiceHash: string) => {
        setVerificationStatus(prev => ({ ...prev, [invoiceHash]: 'verifying' }));

        try {
            const status = await getInvoiceStatus(invoiceHash);
            console.log(`Verification result for ${invoiceHash}:`, status, 'Type:', typeof status);

            // status: 0 = not verified/pending, 1 = verified/settled, null = error/not found
            if (status === 1) {
                setVerificationStatus(prev => ({ ...prev, [invoiceHash]: 'verified' }));
            } else if (status === 0) {
                setVerificationStatus(prev => ({ ...prev, [invoiceHash]: 'not-verified' }));
            } else {
                // null or undefined - API error or invoice not found
                console.error('Failed to get status - received:', status);
                setVerificationStatus(prev => ({ ...prev, [invoiceHash]: 'not-verified' }));
            }
        } catch (error) {
            console.error('Verification failed:', error);
            setVerificationStatus(prev => ({ ...prev, [invoiceHash]: 'not-verified' }));
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            const input = searchQuery.trim();
            let invoiceData = null;

            try {
                invoiceData = await fetchInvoiceByHash(input);
            } catch (ignore) {
            }
            if (invoiceData) {
                setSearchResult(invoiceData);
                return;
            }
            if (input.endsWith('field')) {
                const mappedHash = await getInvoiceHashFromMapping(input);
                if (mappedHash) {
                    try {
                        invoiceData = await fetchInvoiceByHash(mappedHash);
                        setSearchResult(invoiceData);
                        return;
                    } catch (e) {
                        throw new Error('Found mapping but failed to fetch invoice data.');
                    }
                }
            }
            throw new Error('Invoice not found.');

        } catch (err: any) {
            console.error(err);
            setSearchError(err.message || 'Invoice not found.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };



    // Derived Stats
    const totalVolume = transactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
    const settledCount = transactions.filter(t => t.status === 'SETTLED').length;
    const uniqueMerchants = new Set(transactions.map(t => t.merchant_address)).size;

    const stats = [
        { label: 'Total Invoices', value: transactions.length.toString(), trend: '' },
        { label: 'Pending', value: pendingCount.toString(), trend: '' },
        { label: 'Settled', value: settledCount.toString(), trend: '' },
        { label: 'Active Merchants', value: uniqueMerchants.toString(), trend: '' },
        { label: 'Total Volume', value: `${totalVolume.toFixed(2)}`, trend: '' },
    ];

    const filteredTransactions = transactions.filter(t => {
        const status = t.status || '';
        return activeFilter === 'all' || status.toLowerCase() === activeFilter.toLowerCase();
    });

    const containerVariants = staggerContainer;
    const itemVariants = fadeInUp;

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };
    const InvoiceGraph = ({ data, dates }: { data: number[], dates: string[] }) => {
        const rawMax = Math.max(...data, 5);
        const max = Math.ceil(rawMax * 1.1);
        return (
            <div className="w-full h-full relative flex flex-col">
                <div className="flex-1 relative flex pb-6 border-b border-neon-primary/20">

                    {/* Chart Area - Bars */}
                    <div className="flex-1 flex items-end justify-between px-2 gap-1.5 h-full">
                        {data.map((value, i) => {
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                                    {/* Tooltip - Only Invoice Count */}
                                    <div className="absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 bg-gradient-to-br from-neon-primary/20 to-black/95 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg border border-neon-primary/40 whitespace-nowrap z-20 pointer-events-none shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                                        <div className="font-bold text-neon-primary">{value} {value === 1 ? 'Invoice' : 'Invoices'}</div>
                                    </div>
                                    <div
                                        className={`w-full max-w-[14px] min-h-[3px] rounded-t-md transition-all duration-500 group-hover/bar:scale-105 relative overflow-hidden ${value > 0
                                            ? 'bg-gradient-to-t from-neon-primary via-neon-primary/80 to-neon-primary/60 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                                            : 'bg-white/5'
                                            }`}
                                        style={{
                                            height: `${(value / max) * 100}%`,
                                            opacity: value > 0 ? 1 : 0.3
                                        }}
                                    >
                                        {value > 0 && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* X Axis Labels - All 10 Days */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-gray-400 font-mono font-medium px-1">
                    {dates.map((_, i) => {
                        const label = i === 0 ? '10d' : i === dates.length - 1 ? 'Today' : `${10 - i}d`;
                        return <span key={i} className="flex-1 text-center">{label}</span>;
                    })}
                </div>
            </div>
        );
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
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white leading-tight">
                        Pay Privately. <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Nullify the Trace.</span>
                    </h1>

                    <div className="w-full max-w-2xl relative group">
                        <Input
                            placeholder=""
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSearching}
                            className="h-16 pl-14 pr-24 bg-black/30 backdrop-blur-md border border-white/10 rounded-full focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/50 text-xl font-medium font-mono text-white shadow-lg transition-all"
                        />

                        {/* ANIMATED PLACEHOLDER */}
                        {!searchQuery && (
                            <div className="absolute left-14 top-0 bottom-0 flex items-center pointer-events-none overflow-hidden">
                                <span className="text-gray-600 font-mono text-lg mr-2 whitespace-nowrap">SEARCH BY</span>
                                <div className="h-6 relative overflow-hidden flex flex-col justify-center w-[200px]">
                                    <div className="animate-cycle-text relative h-full">
                                        <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-lg">INVOICE HASH</span>
                                        <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-lg absolute top-full">SALT</span>
                                        <span className="block h-full flex items-center text-gray-400 font-normal font-mono tracking-widest text-lg absolute top-[200%]">INVOICE HASH</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-2 bottom-2 bg-white/5 hover:bg-neon-primary/10 border border-white/5 hover:border-neon-primary/30 px-5 flex items-center justify-center rounded-full text-xs font-bold text-gray-400 hover:text-neon-primary transition-all disabled:opacity-50 tracking-wider"
                        >
                            {isSearching ? (
                                <div className="w-4 h-4 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
                            ) : (
                                "SEARCH"
                            )}
                        </button>
                        <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* SEARCH ERROR */}
                    {searchError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 text-red-400 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20"
                        >
                            {searchError}
                        </motion.div>
                    )}
                    {/* SEARCH RESULT TILE */}
                    {searchResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="w-full mt-6"
                        >
                            <GlassCard className="p-0 border-neon-primary/30 shadow-[0_0_40px_rgba(0,243,255,0.1)] relative overflow-hidden group">
                                {/* ACCENT LINE & GLOW */}
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-neon-primary via-cyan-400 to-neon-primary shadow-[0_0_15px_rgba(0,243,255,0.5)] z-10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-neon-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                <div className="p-4 pl-8 flex items-center justify-between relative z-20 gap-4">
                                    {/* LEFT: HASH & COPY */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex items-center gap-3 group/hash">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neon-primary animate-pulse" />
                                            <h3 className="text-xl md:text-2xl font-bold text-white font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 truncate">
                                                {searchResult.invoice_hash.slice(0, 10)}...{searchResult.invoice_hash.slice(-10)}
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(searchResult.invoice_hash);
                                                    const btn = document.getElementById('copy-btn');
                                                    if (btn) {
                                                        btn.innerHTML = `<svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                                                        setTimeout(() => {
                                                            if (btn) btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" /></svg>`;
                                                        }, 2000);
                                                    }
                                                }}
                                                id="copy-btn"
                                                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all opacity-0 group-hover/hash:opacity-100"
                                                title="Copy Hash"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* RIGHT: STATUS, ACTIONS, CLOSE */}
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <StatusBadge status={searchResult.status as any} />

                                        <div className="h-8 w-px bg-white/10" />

                                        <div className="flex items-center gap-3">
                                            {searchResult.invoice_transaction_id && (
                                                <button
                                                    onClick={() => openExplorer(searchResult.invoice_transaction_id)}
                                                    className="flex items-center gap-1.5 text-xs bg-cyan-900/20 hover:bg-cyan-900/40 px-3 py-1.5 rounded-md border border-cyan-500/20 hover:border-cyan-500/50 transition-all text-cyan-400 font-medium group/btn"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Creation Tx
                                                </button>
                                            )}
                                            {(searchResult.payment_tx_ids?.length || searchResult.payment_tx_id) && (
                                                <button
                                                    onClick={() => openExplorer(searchResult.payment_tx_ids?.[searchResult.payment_tx_ids.length - 1] || searchResult.payment_tx_id)}
                                                    className="flex items-center gap-1.5 text-xs bg-emerald-900/20 hover:bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/20 hover:border-emerald-500/50 transition-all text-emerald-400 font-medium group/btn shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {searchResult.payment_tx_ids && searchResult.payment_tx_ids.length > 1 ? `Tx (${searchResult.payment_tx_ids.length})` : 'Payment Tx'}
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setSearchResult(null)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors ml-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </motion.div>

                {/* BENTO GRID LAYOUT */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                    <GlassCard variants={itemVariants} className="col-span-1 md:col-span-2 row-span-2 p-8 flex flex-col justify-between group h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500">
                            <svg className="w-8 h-8 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-neon-primary/10 border border-neon-primary/20">
                                    <svg className="w-5 h-5 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Invoice Created</h3>
                            </div>
                            <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase mb-6 pl-1 opacity-70">LAST 10 DAYS</p>
                        </div>

                        <div className="flex-1 flex flex-col justify-end">
                            <div className="h-40 w-full opacity-90 group-hover:opacity-100 transition-opacity duration-500">
                                <InvoiceGraph
                                    data={(() => {
                                        const days = Array.from({ length: 10 }, (_, i) => {
                                            const d = new Date();
                                            d.setDate(d.getDate() - (9 - i));
                                            return d.toISOString().split('T')[0];
                                        });
                                        return days.map(date =>
                                            transactions.filter(t => (t.created_at || '').startsWith(date)).length
                                        );
                                    })()}
                                    dates={(() => {
                                        return Array.from({ length: 10 }, (_, i) => {
                                            const d = new Date();
                                            d.setDate(d.getDate() - (9 - i));
                                            return d.toISOString().split('T')[0];
                                        });
                                    })()}
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
                            <h2 className="text-5xl font-bold text-white group-hover:scale-105 transition-transform duration-300 origin-left tracking-tighter">{stat.value}</h2>
                        </GlassCard>
                    ))}
                </motion.div>


                {/* TABLE SECTION */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden mt-8">
                    <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-primary animate-pulse"></span>
                            Recent Transactions
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
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice Hash</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">On-Chain Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-gray-500">Loading transactions...</td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-gray-500">No transactions found</td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((inv, i) => (
                                        <motion.tr
                                            key={i}
                                            variants={fadeInUp}
                                            className="hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="py-4 px-6 font-mono text-neon-accent group-hover:text-neon-primary transition-colors text-sm">
                                                <div className="flex items-center gap-2 group/hash">
                                                    <span>{inv.invoice_hash.slice(0, 8)}...{inv.invoice_hash.slice(-6)}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(inv.invoice_hash);
                                                        }}
                                                        className="text-gray-600 hover:text-white transition-colors opacity-0 group-hover/hash:opacity-100 p-1"
                                                        title="Copy Full Hash"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                                                        </svg>
                                                    </button>
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
                                                                onClick={() => openExplorer(inv.payment_tx_ids?.[inv.payment_tx_ids.length - 1] || inv.payment_tx_id)}
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

                                                    {/* Verify On-Chain Button */}
                                                    <div className="w-[140px] flex justify-end">
                                                        <button
                                                            onClick={() => handleVerifyOnChain(inv.invoice_hash)}
                                                            disabled={verificationStatus[inv.invoice_hash] === 'verifying'}
                                                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all font-medium w-full justify-center ${verificationStatus[inv.invoice_hash] === 'verified'
                                                                ? 'bg-green-900/20 border-green-500/30 text-green-400'
                                                                : verificationStatus[inv.invoice_hash] === 'not-verified'
                                                                    ? 'bg-red-900/20 border-red-500/30 text-red-400'
                                                                    : verificationStatus[inv.invoice_hash] === 'verifying'
                                                                        ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400 cursor-wait'
                                                                        : 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/20 hover:border-purple-500/50 text-purple-400'
                                                                }`}
                                                            title="Verify invoice status on-chain"
                                                        >
                                                            {verificationStatus[inv.invoice_hash] === 'verifying' ? (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Verifying...
                                                                </>
                                                            ) : verificationStatus[inv.invoice_hash] === 'verified' ? (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    Verified & Paid
                                                                </>
                                                            ) : verificationStatus[inv.invoice_hash] === 'not-verified' ? (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    Not Paid
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                                    </svg>
                                                                    Verify On-Chain
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </motion.div>
        </motion.div>

    );
};

export default Explorer;
