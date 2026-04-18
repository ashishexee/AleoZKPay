import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletBalances } from '../../hooks/wallet/useWalletBalances';
import { GlassCard } from '../../components/ui/GlassCard';
import type { ReportOptions } from '../../types/receipt';
import { PROGRAM_ID } from '../../utils/aleo/aleoUtils';

// Extracted Hooks
import { useProfileUIState } from '../../hooks/profile/useProfileUIState';
import { useProfileData } from '../../hooks/profile/useProfileData';
import { useProfileAggregations } from '../../hooks/profile/useProfileAggregations';
import { useProfileInvoicesActions } from '../../hooks/profile/useProfileInvoicesActions';
import { useProfileReports } from '../../hooks/profile/useProfileReports';

// Components
import { VerifyModal } from './components/modals/VerifyModal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { PaymentHistoryModal } from './components/modals/PaymentHistoryModal';
import { ReceiptHashesModal } from './components/modals/ReceiptHashesModal';
import { PayerNotesModal } from './components/modals/PayerNotesModal';
import { WalletBalances } from './components/WalletBalances';
import { BurnerWalletSettings } from './components/BurnerWallet/BurnerWalletSettings';
import { StatsCards } from './components/StatsCards';
import { InvoiceDistributionChart } from './components/Charts/InvoiceDistributionChart';
import { TokenDistributionChart } from './components/Charts/TokenDistributionChart';
import { PaymentTimelineChart } from './components/Charts/PaymentTimelineChart';
import { InvoiceTable } from './components/InvoiceTable';
import { PaidInvoicesTable } from './components/PaidInvoicesTable';
import { DashboardChatbot } from './components/DashboardChatbot';
import { ReportConfigModal } from './components/modals/ReportConfigModal';
import { BackupBanner } from './components/BackupBanner';

const Profile = () => {
    const navigate = useNavigate();
    const { address: publicKey, requestRecords, decrypt, executeTransaction, transactionStatus } = useWallet();
    const { balances } = useWalletBalances();

    // 1. UI State
    const ui = useProfileUIState();

    // 2. Data Fetching
    const data = useProfileData(publicKey);

    // 3. Aggregations
    const agg = useProfileAggregations({
        transactions: data.transactions,
        createdInvoices: data.createdInvoices,
        merchantReceipts: data.merchantReceipts,
        payerReceipts: data.payerReceipts,
        burnerCreatedInvoices: data.burnerCreatedInvoices,
        burnerMerchantReceipts: data.burnerMerchantReceipts,
        profileMainHash: data.profileMainHash,
        profileBurnerHash: data.profileBurnerHash,
    });

    // 4. Actions
    const actions = useProfileInvoicesActions({
        fetchCreatedInvoices: data.fetchCreatedInvoices,
        fetchTransactions: data.fetchTransactions,
        fetchMerchantReceipts: data.fetchMerchantReceipts,
        fetchPayerReceipts: data.fetchPayerReceipts,
        requestRecords,
        decrypt,
        executeTransaction,
        transactionStatus
    });

    // 5. Reports
    const reports = useProfileReports({
        combinedInvoices: agg.combinedInvoices,
        uniqueMainReceipts: agg.uniqueMainReceipts,
        uniqueBurnerReceipts: agg.uniqueBurnerReceipts,
        mainDashboardPayerReceipts: agg.mainDashboardPayerReceipts,
        balances,
        merchantStats: agg.merchantStats,
        publicKey,
        loadingBurner: data.loadingBurner,
        programId: PROGRAM_ID,
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };

    return (
        <div className="page-container relative min-h-screen">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
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

            <VerifyModal
                isOpen={actions.showVerifyModal}
                onClose={() => actions.setShowVerifyModal(false)}
                verifyingInvoice={actions.verifyingInvoice}
                verifyInput={actions.verifyInput}
                setVerifyInput={actions.setVerifyInput}
                verifyStatus={actions.verifyStatus}
                verifiedRecord={actions.verifiedRecord}
                merchantReceipts={[...data.merchantReceipts, ...data.burnerMerchantReceipts]}
                onVerify={actions.handleVerifyReceipt}
            />

            <ConfirmModal
                open={Boolean(actions.invoicePendingDeletion)}
                tone="danger"
                title="Delete Invoice"
                description={
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100/90">
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">What Happens Next</div>
                            <p className="mt-2 leading-relaxed">
                                This removes the active on-chain invoice record and deletes the mirrored dashboard database entry.
                            </p>
                        </div>
                        <p className="leading-relaxed text-gray-300">
                            This only works for invoices with <span className="font-semibold text-white">no recorded payments</span>.
                        </p>
                        {actions.invoicePendingDeletion?.walletType === 1 ? (
                            <p className="leading-relaxed text-gray-300">
                                This is a <span className="font-semibold text-white">burner-owned invoice</span>. NullPay will use the unlocked burner wallet to submit the on-chain deletion first, then clear the database entry.
                            </p>
                        ) : (
                            <p className="leading-relaxed text-gray-300">
                                NullPay will request approval from your connected main wallet, wait for on-chain confirmation, and then remove the database entry.
                            </p>
                        )}
                    </div>
                }
                confirmLabel="Delete Invoice"
                cancelLabel="Keep Invoice"
                onConfirm={actions.confirmDeleteInvoice}
                onClose={() => actions.setInvoicePendingDeletion(null)}
                loading={Boolean(actions.deletingInvoiceId && actions.invoicePendingDeletion && actions.deletingInvoiceId === actions.invoicePendingDeletion.invoiceHash)}
            />

            <PaymentHistoryModal
                paymentIds={ui.selectedPaymentIds}
                onClose={() => ui.setSelectedPaymentIds(null)}
                onViewTx={openExplorer}
            />

            <ReceiptHashesModal
                receipts={ui.selectedReceipts}
                onClose={() => ui.setSelectedReceipts(null)}
            />

            <PayerNotesModal
                notes={ui.selectedNotes}
                onClose={() => ui.setSelectedNotes(null)}
            />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="w-full max-w-7xl mx-auto pt-10 relative z-10 pb-20"
            >
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Dashboard</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
                        Manage your invoices and settlements.
                    </p>

                    <WalletBalances itemVariants={itemVariants} balances={balances} />
                    
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => {
                                reports.setCurrentReportType('credit');
                                reports.setShowReportConfigModal(true);
                            }}
                            disabled={reports.creditReportLoading || (!data.loadingBurner && agg.combinedInvoices.length === 0 && agg.uniqueMainReceipts.length === 0 && agg.uniqueBurnerReceipts.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m3 6V7m3 10v-3m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0118 10.414V17a2 2 0 01-2 2z" />
                            </svg>
                            {reports.creditReportLoading ? 'Preparing Credit Report...' : 'Download Credit Report'}
                        </button>

                        <button
                            onClick={() => {
                                reports.setCurrentReportType('audit');
                                reports.setShowReportConfigModal(true);
                            }}
                            disabled={reports.auditReportLoading || (!data.loadingBurner && agg.combinedInvoices.length === 0 && agg.uniqueMainReceipts.length === 0 && agg.uniqueBurnerReceipts.length === 0 && agg.mainDashboardPayerReceipts.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
                            </svg>
                            {reports.auditReportLoading ? 'Preparing Audit Report...' : 'Download Audit Report'}
                        </button>
                    </div>
                    <div className="mt-4 text-center">
                        <Link
                            to="/audit/verify"
                            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-white"
                        >
                            Open Auditor Verification Page
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        <p className="mt-2 text-xs text-gray-500">
                            Auditors should verify the encrypted JSON package and audit key here before trusting the HTML report.
                        </p>
                        {ui.hasInvalidValueFilter ? (
                            <p className="mt-2 text-center text-xs text-red-400">
                                Enter a valid positive number for the value filter.
                            </p>
                        ) : ui.valueFilterType !== 'none' ? (
                            <p className="mt-2 text-center text-xs text-gray-500">
                                Showing {ui.activeTab === 'created' && ui.valueFilterType === 'earnings' ? 'invoices with total earnings' : ui.activeTab === 'paid' ? 'paid invoices with total paid amount' : 'invoices with amount'} at or above the value you enter.
                            </p>
                        ) : null}
                    </div>
                </motion.div>

                <BackupBanner />

                <div className="mb-8">
                    <BurnerWalletSettings itemVariants={itemVariants} transactions={data.transactions} />
                </div>

                <motion.div variants={itemVariants} className="mb-12 flex justify-center px-2">
                    <div className="relative w-full max-w-[520px] rounded-[24px] bg-black/30 p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl border border-white/[0.08]">
                        <div className="grid grid-cols-2 gap-2 relative">
                        {[
                            {
                                id: 'statistics',
                                label: 'Statistics',
                                icon: (isActive: boolean) => (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <motion.path
                                            initial={false}
                                            animate={{ 
                                                d: isActive ? "M9 19V9m4 10V5m4 14V11m-12 8v-6" : "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10",
                                                strokeWidth: isActive ? 2 : 1.5,
                                                opacity: isActive ? 1 : 0.6
                                            }}
                                            transition={{ duration: 0.3 }}
                                            strokeLinecap="round" strokeLinejoin="round" 
                                        />
                                    </svg>
                                )
                            },
                            {
                                id: 'dashboard',
                                label: 'Dashboard',
                                icon: (isActive: boolean) => (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <motion.path
                                            initial={false}
                                            animate={{ 
                                                strokeWidth: isActive ? 2 : 1.5,
                                                opacity: isActive ? 1 : 0.6,
                                                scale: isActive ? 1.1 : 1
                                            }}
                                            transition={{ duration: 0.3 }}
                                            strokeLinecap="round" strokeLinejoin="round"
                                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                        />
                                    </svg>
                                )
                            }
                        ].map((tab) => {
                            const isActive = ui.mainViewTab === tab.id;
                            return (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => {
                                        ui.setMainViewTab(tab.id as any);
                                        navigate(tab.id === 'dashboard' ? '/dashboard' : '/dashboard/stats');
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative z-10 flex min-h-[52px] items-center justify-center gap-3 overflow-hidden rounded-[18px] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors duration-300 ${isActive
                                        ? 'text-white'
                                        : 'text-white/40 hover:text-white/70'
                                        }`}
                                >
                                    <motion.div 
                                        layout
                                        className="relative z-20 flex items-center gap-3"
                                        animate={{ 
                                            y: isActive ? 0 : 0.5,
                                            scale: isActive ? 1.05 : 1
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25
                                        }}
                                    >
                                        <motion.span 
                                            animate={{ 
                                                color: isActive ? "#F97316" : "currentColor",
                                                filter: isActive ? "drop-shadow(0 0 8px rgba(249,115,22,0.4))" : "none"
                                            }}
                                        >
                                            {tab.icon(isActive)}
                                        </motion.span>
                                        <span className="relative whitespace-nowrap font-bold">
                                            {tab.label}
                                        </span>
                                    </motion.div>

                                    {isActive && (
                                        <>
                                            <motion.div
                                                layoutId="mainViewTabHighlight"
                                                className="absolute inset-0 z-10 rounded-[18px] border border-white/20 bg-gradient-to-b from-white/[0.12] to-white/[0.04] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 260,
                                                    damping: 26,
                                                    mass: 1
                                                }}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="absolute inset-0 z-0 bg-orange-500/[0.03] blur-2xl rounded-full"
                                            />
                                        </>
                                    )}
                                </motion.button>
                            );
                        })}
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {ui.mainViewTab === 'statistics' ? (
                        <motion.div
                            key="stats-view"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={containerVariants}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 gap-4 mb-4">
                                <motion.div variants={itemVariants}>
                                    <StatsCards
                                        merchantStats={agg.merchantStats}
                                        loadingReceipts={data.loadingReceipts}
                                        loadingCreated={data.loadingCreated}
                                        loadingBurner={data.loadingBurner}
                                        itemVariants={itemVariants}
                                    />
                                </motion.div>

                                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InvoiceDistributionChart invoices={data.loadingBurner ? [] : agg.combinedInvoices} isLoading={data.loadingCreated || data.loadingBurner} />
                                    <TokenDistributionChart receipts={[...data.merchantReceipts, ...data.burnerMerchantReceipts]} isLoading={data.loadingReceipts || data.loadingBurner} />
                                </motion.div>
                            </div>

                            <motion.div variants={itemVariants}>
                                <PaymentTimelineChart
                                    receipts={agg.timelineReceipts}
                                    paymentTimestampsByTxId={agg.paymentTimestampsByTxId}
                                    isLoading={data.loadingReceipts || data.loadingBurner}
                                    isRefreshing={false}
                                    onRefresh={data.refreshPaymentTimeline}
                                />
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard-view"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={containerVariants}
                        >
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center gap-4">
                                    <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 relative">
                                        {['created', 'paid'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => ui.setActiveTab(tab as any)}
                                                className={`relative z-10 px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${ui.activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                {ui.activeTab === tab && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute inset-0 bg-white rounded-full -z-10"
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                                {tab === 'created' ? 'My Invoices' : 'Paid Invoices'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-6 pb-4">
                                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder={ui.searchPlaceholder}
                                                value={ui.invoiceSearch}
                                                onChange={(e) => ui.setInvoiceSearch(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-colors"
                                            />
                                            {ui.invoiceSearch && (
                                                <button
                                                    onClick={() => ui.setInvoiceSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative" ref={ui.filterDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => ui.setIsFilterDropdownOpen(!ui.isFilterDropdownOpen)}
                                                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-[9px] text-sm text-white focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-all hover:bg-white/10 group"
                                            >
                                                <span className={ui.valueFilterType === 'none' ? 'text-gray-400' : 'text-white'}>
                                                    {ui.valueFilterType === 'none' ? 'No value filter' :
                                                        ui.valueFilterType === 'amount' ? 'By Amount' : 'By Earnings'}
                                                </span>
                                                <svg className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-all duration-300 ${ui.isFilterDropdownOpen ? 'rotate-180 translate-y-[-1px]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            <AnimatePresence>
                                                {ui.isFilterDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                        className="absolute top-full left-0 right-0 mt-2 z-[20] bg-[#0F0F0F]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-1.5"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => { ui.setValueFilterType('none'); ui.setIsFilterDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${ui.valueFilterType === 'none' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            <span>No value filter</span>
                                                            {ui.valueFilterType === 'none' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { ui.setValueFilterType('amount'); ui.setIsFilterDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${ui.valueFilterType === 'amount' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            <span>By Amount</span>
                                                            {ui.valueFilterType === 'amount' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                        </button>
                                                        {ui.activeTab === 'created' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { ui.setValueFilterType('earnings'); ui.setIsFilterDropdownOpen(false); }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${ui.valueFilterType === 'earnings' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                            >
                                                                <span>By Earnings</span>
                                                                {ui.valueFilterType === 'earnings' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder={ui.valueFilterType === 'none' ? 'Optional min value' : `Enter min ${ui.valueFilterType}...`}
                                            value={ui.valueFilterInput}
                                            onChange={(e) => ui.setValueFilterInput(e.target.value)}
                                            disabled={ui.valueFilterType === 'none'}
                                            className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${ui.hasInvalidValueFilter ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10' : 'border-white/10 focus:border-neon-primary/40 focus:ring-neon-primary/20 hover:border-white/20'}`}
                                        />
                                    </div>
                                    <div className="mx-auto mt-3 flex flex-col md:flex-row items-center gap-3 max-w-4xl justify-center md:justify-start">
                                        {ui.activeTab === 'created' && (
                                            <div className="flex rounded-xl border border-white/5 bg-[#0F0F0F]/60 backdrop-blur p-1 shadow-inner w-full md:w-auto">
                                                {[
                                                    { key: 'all', label: 'All Dates' },
                                                    { key: 'single', label: 'Single Day' },
                                                    { key: 'range', label: 'Date Range' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.key}
                                                        type="button"
                                                        onClick={() => ui.setDateFilterMode(option.key as 'all' | 'single' | 'range')}
                                                        className={`flex-1 md:flex-none rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${ui.dateFilterMode === option.key ? 'bg-white text-black shadow-md shadow-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <AnimatePresence mode="popLayout">
                                            {ui.activeTab === 'created' && ui.dateFilterMode !== 'all' && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex w-full md:w-auto items-center gap-2 bg-[#0F0F0F]/40 backdrop-blur border border-white/10 rounded-xl p-1 shadow-inner"
                                                >
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={ui.dateFilterMode === 'single' ? ui.singleDateFilter : ui.rangeStartDateFilter}
                                                            onChange={(e) => {
                                                                if (ui.dateFilterMode === 'single') {
                                                                    ui.setSingleDateFilter(e.target.value);
                                                                    return;
                                                                }
                                                                ui.setRangeStartDateFilter(e.target.value);
                                                            }}
                                                            className="w-full md:w-[140px] bg-transparent border-none text-sm text-white focus:outline-none focus:ring-1 focus:ring-neon-primary/30 rounded-lg px-3 py-1.5 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-all font-medium placeholder-gray-500"
                                                        />
                                                    </div>

                                                    {ui.dateFilterMode === 'range' && (
                                                        <>
                                                            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                            <div className="relative">
                                                                <input
                                                                    type="date"
                                                                    value={ui.rangeEndDateFilter}
                                                                    onChange={(e) => ui.setRangeEndDateFilter(e.target.value)}
                                                                    className="w-full md:w-[140px] bg-transparent border-none text-sm text-white focus:outline-none focus:ring-1 focus:ring-neon-primary/30 rounded-lg px-3 py-1.5 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-all font-medium placeholder-gray-500"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="h-4 w-px bg-white/10 mx-1 border-r border-white/5"></div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            ui.setDateFilterMode('all');
                                                            ui.setSingleDateFilter('');
                                                            ui.setRangeStartDateFilter('');
                                                            ui.setRangeEndDateFilter('');
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                                        title="Clear Dates"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {ui.hasInvalidValueFilter ? (
                                        <p className="mt-2 text-center text-[11px] font-medium text-red-400/90 tracking-wide uppercase">
                                            Please enter a valid positive amount
                                        </p>
                                    ) : ui.valueFilterType !== 'none' ? (
                                        <p className="mt-2 text-center text-[11px] font-medium text-gray-500 tracking-wide uppercase">
                                            Filtering {ui.activeTab === 'created' && ui.valueFilterType === 'earnings' ? 'earnings' : ui.activeTab === 'paid' ? 'total paid' : 'invoice amount'} ≥ {ui.valueFilterInput || '0'}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="overflow-x-auto min-h-[300px]">
                                    <div style={{ display: ui.activeTab === 'created' ? 'block' : 'none' }}>
                                    <InvoiceTable
                                            invoices={data.loadingBurner ? [] : agg.combinedInvoices}
                                            loading={data.loadingCreated || data.loadingTransactions || data.loadingBurner}
                                            search={ui.invoiceSearch}
                                            valueFilterType={ui.valueFilterType}
                                            valueFilterAmount={ui.appliedValueFilterAmount}
                                            dateFilterMode={ui.dateFilterMode}
                                            singleDateFilter={ui.singleDateFilter}
                                            rangeStartDateFilter={ui.rangeStartDateFilter}
                                            rangeEndDateFilter={ui.rangeEndDateFilter}
                                            currentPage={ui.currentPage}
                                            itemsPerPage={ui.itemsPerPage}
                                            setCurrentPage={ui.setCurrentPage}
                                            onVerify={(inv) => {
                                                actions.setVerifyingInvoice(inv);
                                                actions.setVerifyInput('');
                                                actions.setVerifyStatus('IDLE');
                                                actions.setVerifiedRecord(null);
                                                actions.setShowVerifyModal(true);
                                            }}
                                            onSettle={actions.handleSettle}
                                            onDelete={actions.handleDeleteInvoice}
                                            settlingId={actions.settling}
                                            deletingId={actions.deletingInvoiceId}
                                            onViewPayments={(ids) => ui.setSelectedPaymentIds(ids)}
                                            transactions={data.transactions}
                                            burnerDeleteReady={Boolean(data.decryptedBurnerKey)}
                                        />
                                    </div>

                                    <div style={{ display: ui.activeTab === 'paid' ? 'block' : 'none' }}>
                                        <PaidInvoicesTable
                                            receipts={agg.mainDashboardPayerReceipts}
                                            loading={data.loadingPayerReceipts}
                                            search={ui.invoiceSearch}
                                            valueFilterAmount={ui.valueFilterType === 'none' ? null : ui.appliedValueFilterAmount}
                                            dateFilterMode="all"
                                            singleDateFilter=""
                                            rangeStartDateFilter=""
                                            rangeEndDateFilter=""
                                            onViewReceipts={(receipts) => ui.setSelectedReceipts(receipts)}
                                            onViewNotes={(notes) => ui.setSelectedNotes(notes)}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                                    All this information is fetched from your private account records.
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <DashboardChatbot
                mainWalletAddress={publicKey || null}
                burnerWalletAddress={data.decryptedBurnerAddress || null}
                balances={balances}
                merchantStats={agg.merchantStats}
                invoices={data.loadingBurner ? [] : agg.combinedInvoices}
                mainMerchantReceipts={agg.uniqueMainReceipts}
                burnerMerchantReceipts={agg.uniqueBurnerReceipts}
                payerReceipts={agg.mainDashboardPayerReceipts}
                loadingInvoices={data.loadingCreated || data.loadingTransactions || data.loadingBurner}
                loadingReceipts={data.loadingReceipts || data.loadingBurner}
                loadingPayerReceipts={data.loadingPayerReceipts}
            />

            <ReportConfigModal
                isOpen={reports.showReportConfigModal}
                onClose={() => reports.setShowReportConfigModal(false)}
                reportType={reports.currentReportType}
                onDownload={(options: ReportOptions) => {
                    if (reports.currentReportType === 'audit') {
                        return reports.handleDownloadAuditReport(options);
                    } else {
                        return reports.handleDownloadCreditReport(options);
                    }
                }}
            />
        </div>
    );
};

export default Profile;
