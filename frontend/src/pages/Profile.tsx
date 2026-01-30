import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID } from '../utils/aleo-utils';

const Profile = () => {
    const { address, executeTransaction } = useWallet();
    const publicKey = address;
    const { transactions, loading, fetchTransactions } = useTransactions(publicKey || undefined);
    const [settling, setSettling] = useState<string | null>(null); // Hash of invoice being settled
    const [copiedHash, setCopiedHash] = useState<string | null>(null); // Track which invoice link was copied

    // Modal State
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);

    useEffect(() => {
        if (publicKey) {
            fetchTransactions();
        }
    }, [publicKey, fetchTransactions]);

    const handleSettle = async (invoice: any) => {
        if (!invoice.salt || !executeTransaction) return;
        setSettling(invoice.invoice_hash);

        try {
            console.log(`Settling Invoice ${invoice.invoice_hash}...`);
            const amountMicro = Math.round(Number(invoice.amount) * 1_000_000);

            const inputs = [
                invoice.salt,
                `${amountMicro}u64`
            ];

            const tx: TransactionOptions = {
                program: PROGRAM_ID,
                function: 'settle_invoice',
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            await executeTransaction(tx);
            console.log('Executed on-chain settling');
            try {
                const { updateInvoiceStatus } = await import('../services/api');
                await updateInvoiceStatus(invoice.invoice_hash, { status: 'SETTLED' });
                await fetchTransactions();
            } catch (dbErr) {
                console.error("Failed to update status in DB", dbErr);
            }

        } catch (e) {
            console.error("Settlement failed", e);
        } finally {
            setSettling(null);
        }
    };

    const merchantStats = {
        balance: 'Loading...',
        totalSales: transactions
            .filter(t => t.status === 'SETTLED')
            .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
            .toFixed(2),
        invoices: transactions.length,
        fundraisingCampaigns: transactions.filter(t => t.invoice_type === 1).length
    };

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
            {/* BACKGROUND */}
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


            {/* MODAL */}
            <AnimatePresence>
                {selectedPaymentIds && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedPaymentIds(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">Payment History</h3>
                                <button onClick={() => setSelectedPaymentIds(null)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <div className="space-y-3">
                                {selectedPaymentIds.map((id, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10">
                                        <span className="font-mono text-sm text-gray-300">{id.slice(0, 10)}...{id.slice(-8)}</span>
                                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => openExplorer(id)}>
                                            View Tx
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="w-full max-w-7xl mx-auto pt-12 relative z-10 pb-20"
            >
                {/* HEADER */}
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter text-white" style={{ fontSize: '50px' }}>
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Dashboard</span>
                    </h1>
                </motion.div>

                {/* STATS */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Settled Volume</span>
                        <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.totalSales} <span className="text-sm font-normal text-gray-500">Credits</span></h2>
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                        <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Active Campaigns</span>
                        <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.fundraisingCampaigns}</h2>
                    </GlassCard>
                </motion.div>

                {/* INVOICE HISTORY */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-primary animate-pulse"></span>
                            Your Invoices
                        </h2>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 text-left">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice Hash</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Amount</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading your invoices...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No invoices found. Create one!</td></tr>
                                ) : (
                                    transactions.map((inv, i) => {
                                        // Generate payment link with correct format matching create invoice hook
                                        const params = new URLSearchParams({
                                            merchant: inv.merchant_address,
                                            amount: inv.amount.toString(),
                                            salt: inv.salt || ''
                                        });
                                        if (inv.memo) params.append('memo', inv.memo);
                                        if (inv.invoice_type === 1) params.append('type', 'fundraising');
                                        const paymentLink = `${window.location.origin}/pay?${params.toString()}`;

                                        return (
                                            <motion.tr
                                                key={i}
                                                variants={itemVariants}
                                                className="hover:bg-white/5 transition-colors group"
                                            >
                                                {/* Invoice Hash with Copy Button */}
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
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    {inv.memo && <div className="text-xs text-gray-500 mt-1">{inv.memo}</div>}
                                                </td>

                                                {/* Amount - Centered */}
                                                <td className="py-4 px-6 text-center">
                                                    <span className="font-bold text-white">{inv.amount} ALEO</span>
                                                </td>

                                                {/* Status - Centered */}
                                                <td className="py-4 px-6">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <StatusBadge status={inv.status as any} />
                                                        {inv.invoice_type === 1 && (
                                                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider font-bold">Fund</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions - Right Aligned */}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex gap-2 justify-end items-center">
                                                        {/* Copy Link Button */}
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(paymentLink);
                                                                setCopiedHash(inv.invoice_hash);
                                                                setTimeout(() => setCopiedHash(null), 2000);
                                                            }}
                                                            className="text-xs bg-neon-primary/10 hover:bg-neon-primary/20 text-neon-primary px-3 py-1.5 rounded-md border border-neon-primary/30 font-medium transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                                                            title="Copy payment link"
                                                        >
                                                            {copiedHash === inv.invoice_hash ? 'Copied!' : 'Copy Link'}
                                                        </button>

                                                        {/* Settle Button for Fundraising */}
                                                        {(inv.invoice_type === 1 && inv.status !== 'SETTLED' && inv.salt) && (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => handleSettle(inv)}
                                                                disabled={settling === inv.invoice_hash}
                                                                className="text-xs bg-red-500 hover:bg-red-600 text-white border-red-500/50 shadow-red-900/20"
                                                            >
                                                                {settling === inv.invoice_hash ? 'Settling...' : 'Settle'}
                                                            </Button>
                                                        )}

                                                        {/* View Proof Button */}
                                                        {inv.invoice_transaction_id && (
                                                            <button
                                                                onClick={() => openExplorer(inv.invoice_transaction_id)}
                                                                className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1.5 rounded"
                                                                title="View on-chain proof"
                                                            >
                                                                Proof
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Profile;
