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

            // Update Database to SETTLED and Refresh UI
            try {
                const { updateInvoiceStatus } = await import('../services/api');
                await updateInvoiceStatus(invoice.invoice_hash, { status: 'SETTLED' });
                await fetchTransactions(); // Refresh list to remove the button
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
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter text-white">
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Dashboard</span>
                    </h1>

                    {publicKey && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Wallet Connected</span>
                            </div>
                            <div className="h-4 w-[1px] bg-white/10" />
                            <span className="font-mono text-sm text-white font-medium tracking-wide">{publicKey.slice(0, 10)}...{publicKey.slice(-5)}</span>
                        </div>
                    )}
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
                    <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-black/20">
                        <h3 className="text-xl font-bold text-white">Your Invoices</h3>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 text-left">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status / Type</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Payment Proofs</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">Loading your invoices...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">No invoices found. Create one!</td></tr>
                                ) : (
                                    transactions.map((inv, i) => {
                                        const paymentIds = inv.payment_tx_ids || (inv.payment_tx_id ? [inv.payment_tx_id] : []);
                                        const hasMultiple = paymentIds.length > 1;

                                        return (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-neon-accent group-hover:text-neon-primary transition-colors text-sm">{inv.invoice_hash.slice(0, 8)}...</span>
                                                        {inv.memo && <span className="text-xs text-gray-500 mt-1">{inv.memo}</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-white">{inv.amount}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <StatusBadge status={inv.status as any} />
                                                        {inv.invoice_type === 1 && (
                                                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider font-bold">Fundraising</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {paymentIds.length > 0 ? (
                                                        hasMultiple ? (
                                                            <button
                                                                onClick={() => setSelectedPaymentIds(paymentIds)}
                                                                className="text-xs bg-emerald-900/20 hover:bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/20 text-emerald-400 font-medium transition-all"
                                                            >
                                                                View All ({paymentIds.length})
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => openExplorer(paymentIds[0])}
                                                                className="text-xs hover:text-emerald-400 transition-colors underline decoration-dotted"
                                                            >
                                                                View Tx
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-gray-600">-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right flex justify-end gap-2">
                                                    {inv.invoice_transaction_id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openExplorer(inv.invoice_transaction_id)}
                                                            className="text-xs opacity-50 hover:opacity-100"
                                                            title="Creation Proof"
                                                        >
                                                            Proof
                                                        </Button>
                                                    )}
                                                    {/* SETTLE BUTTON For Fundraising Invoices or Open Invoices */}
                                                    {(inv.invoice_type === 1 && inv.status !== 'SETTLED' && inv.salt) && (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleSettle(inv)}
                                                            disabled={settling === inv.invoice_hash}
                                                            className="text-xs bg-red-500 hover:bg-red-600 text-white border-red-500/50 shadow-red-900/20"
                                                        >
                                                            {settling === inv.invoice_hash ? 'Settling...' : 'Close & Settle'}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
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
