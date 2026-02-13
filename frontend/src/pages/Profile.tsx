import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Shimmer } from '../components/ui/Shimmer';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID, parsePayerReceipt, PayerReceipt } from '../utils/aleo-utils';

const Profile = () => {
    const { address, executeTransaction, requestRecords, decrypt } = useWallet();
    const publicKey = address;
    const { transactions, loading, fetchTransactions } = useTransactions(publicKey || undefined);
    const [settling, setSettling] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [activeTab, setActiveTab] = useState<'created' | 'paid'>('created');
    const [paidInvoices, setPaidInvoices] = useState<PayerReceipt[]>([]);
    const [loadingPaid, setLoadingPaid] = useState(false);

    useEffect(() => {
        if (publicKey) {
            fetchTransactions();
            fetchPaidInvoices();
        }
    }, [publicKey, fetchTransactions]);

    const fetchPaidInvoices = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingPaid(true);
        try {
            const records = await requestRecords(PROGRAM_ID);
            const validReceipts: PayerReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    // Check if record is spent
                    if (r.spent) {
                        console.log("Skipping spent record");
                        continue;
                    }

                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext; // handle both keys if SDK varies
                    if (!plaintext && cipher && decrypt) {
                        try {
                            console.log("Attempting to decrypt record...");
                            plaintext = await decrypt(cipher);
                            console.log("Decrypted plaintext:", plaintext);
                        } catch (e) { console.warn("Decrypt error for paid invoice:", e); }
                    }
                    const receipt = parsePayerReceipt({ ...r, plaintext });
                    if (receipt) {
                        validReceipts.push(receipt);
                    }
                }
            }
            setPaidInvoices(validReceipts.reverse());
        } catch (e) {
            console.error("Error fetching paid invoices:", e);
        } finally {
            setLoadingPaid(false);
        }
    };

    const openVerifyModal = (invoice: any) => {
        setVerifyingInvoice(invoice);
        setVerifyInput('');
        setVerifyStatus('IDLE');
        setVerifiedRecord(null);
        setShowVerifyModal(true);
    };

    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt) return;

        try {
            setVerifyStatus('CHECKING');
            setVerifiedRecord(null);
            const records = await requestRecords(PROGRAM_ID);
            console.log("Checking records for receipt:", verifyInput);
            console.log("Records found:", records?.length);

            let foundRecord = null;

            if (records) {
                for (const [index, r] of (records as any[]).entries()) {
                    if (r.spent) {
                        console.log(`[Record ${index}] Skipped (spent)`);
                        continue;
                    }
                    let plaintext = r.plaintext;
                    if (!plaintext && r.recordCiphertext) {
                        try {
                            plaintext = await decrypt(r.recordCiphertext);
                        } catch (e) { console.warn("Decrypt error", e); }
                    }

                    if (plaintext) {
                        console.log(`[Record ${index}] Plaintext:`, plaintext);
                        if (plaintext.includes(verifyInput)) {
                            console.log("Match found in record:", index);
                            const amountMatch = plaintext.match(/amount:\s*([\d_]+)u64/);
                            const tokenTypeMatch = plaintext.match(/token_type:\s*(\d+)u8/);
                            const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);

                            const rInvoiceHash = invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown';

                            foundRecord = {
                                plaintext,
                                amount: amountMatch ? parseInt(amountMatch[1].replace(/_/g, '')) / 1_000_000 : 'Unknown',
                                tokenType: tokenTypeMatch ? parseInt(tokenTypeMatch[1]) : 0,
                                invoiceHash: rInvoiceHash
                            };

                            console.log("Parsed Record Data:", foundRecord);
                            break;
                        } else {
                            console.log(`[Record ${index}] No match for:`, verifyInput);
                        }
                    } else {
                        console.log(`[Record ${index}] No plaintext available`);
                    }
                }
            }

            if (foundRecord) {
                const recordHash = foundRecord.invoiceHash.trim();
                let invoiceHash = verifyingInvoice.invoice_hash.trim();
                if (invoiceHash.endsWith('field')) {
                    invoiceHash = invoiceHash.slice(0, -5);
                }

                console.log(`Verifying: Record[${recordHash}] vs Invoice[${invoiceHash}]`);

                if (verifyingInvoice && recordHash !== invoiceHash) {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('MISMATCH');
                } else {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('FOUND');
                }
            } else {
                setVerifyStatus('NOT_FOUND');
            }

        } catch (e) {
            console.error("Verification failed", e);
            setVerifyStatus('ERROR');
        }
    };

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
        multiPayCampaigns: transactions.filter(t => t.invoice_type === 1).length
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


            {/* VERIFY MODAL */}
            <AnimatePresence>
                {showVerifyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowVerifyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-lg w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Verify Invoice Payment</h3>
                                <button onClick={() => setShowVerifyModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                            </div>

                            {verifyingInvoice && (
                                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Verifying For Invoice</div>
                                    <div className="font-mono text-neon-primary text-sm truncate">{verifyingInvoice.invoice_hash}</div>
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span className="text-gray-400">Expected:</span>
                                        <span className="text-white font-bold">{verifyingInvoice.amount} {verifyingInvoice.token_type === 1 ? 'USDCx' : 'Credits'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Payer Receipt Hash</label>
                                    <input
                                        type="text"
                                        value={verifyInput}
                                        onChange={(e) => setVerifyInput(e.target.value)}
                                        placeholder="Enter receipt hash..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-primary"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Enter the receipt hash provided by the payer.</p>
                                </div>

                                {verifyStatus === 'FOUND' && verifiedRecord && (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2 text-green-400 font-bold">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Payment Verified!
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Amount Paid:</span>
                                                <span className="text-white font-mono">{verifiedRecord.amount} {verifiedRecord.tokenType === 1 ? 'USDCx' : 'Credits'}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">Matches your private records.</div>
                                        </div>
                                    </div>
                                )}

                                {verifyStatus === 'MISMATCH' && verifiedRecord && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Invoice Mismatch
                                        </div>
                                        <div className="text-sm text-gray-300">
                                            This receipt is valid but belongs to a <strong>different invoice</strong>.
                                            <div className="mt-1 font-mono text-xs text-gray-500">Receipt Invoice: {verifiedRecord.invoiceHash.slice(0, 10)}...</div>
                                        </div>
                                    </div>
                                )}

                                {verifyStatus === 'NOT_FOUND' && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center text-red-400 text-sm">
                                        No matching receipt found in your records.
                                    </div>
                                )}

                                <Button
                                    className="w-full mt-4"
                                    onClick={handleVerifyReceipt}
                                    disabled={verifyStatus === 'CHECKING' || !verifyInput}
                                >
                                    {verifyStatus === 'CHECKING' ? 'Checking Records...' : 'Verify Receipt'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TRANSACTION HISTORY MODAL (Legacy) */}
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
                className="w-full max-w-7xl mx-auto pt-0 relative z-10 pb-20"
            >
                {/* HEADER */}
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tighter leading-none text-white">
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Dashboard</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
                        Manage your invoices and settlements.
                    </p>

                    {/* REMOVED GLOBAL VERIFY BUTTON */}
                </motion.div>

                {/* STATS */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Settled Volume</span>
                        {loading ? (
                            <Shimmer className="h-10 w-32 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.totalSales} <span className="text-sm font-normal text-gray-500">Credits</span></h2>
                        )}
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                        {loading ? (
                            <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                        )}
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Active Campaigns</span>
                        {loading ? (
                            <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.multiPayCampaigns}</h2>
                        )}
                    </GlassCard>
                </motion.div>

                {/* INVOICE HISTORY */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('created')}
                                className={`text-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'created' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {activeTab === 'created' && <span className="w-2 h-2 rounded-full bg-neon-primary animate-pulse"></span>}
                                My Invoices
                            </button>
                            <button
                                onClick={() => setActiveTab('paid')}
                                className={`text-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'paid' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {activeTab === 'paid' && <span className="w-2 h-2 rounded-full bg-neon-accent animate-pulse"></span>}
                                Paid Invoices
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {activeTab === 'created' ? (
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
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="py-4 px-6">
                                                    <Shimmer className="h-5 w-32 bg-white/5 rounded" />
                                                    <Shimmer className="h-3 w-20 bg-white/5 rounded mt-2" />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex justify-center">
                                                        <Shimmer className="h-5 w-16 bg-white/5 rounded" />
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex justify-center">
                                                        <Shimmer className="h-6 w-20 bg-white/5 rounded-full" />
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Shimmer className="h-8 w-20 bg-white/5 rounded-md" />
                                                        <Shimmer className="h-8 w-16 bg-white/5 rounded-md" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
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
                                            if (inv.invoice_type === 1) params.append('type', 'multipay');
                                            // Include token type in link if not credits
                                            if (inv.token_type === 1) params.append('token', 'usdcx');

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
                                                        <span className="font-bold text-white">
                                                            {inv.amount} <span className="text-xs text-gray-400 font-normal">{inv.token_type === 1 ? 'USDCx' : 'Credits'}</span>
                                                        </span>
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
                                                            {/* Verify Button */}
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => openVerifyModal(inv)}
                                                                className="text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 h-8"
                                                            >
                                                                Verify
                                                            </Button>

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

                                                            {/* Settle Button for Multi Pay */}
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
                        ) : (
                            // PAID INVOICES TABLE
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-black/40 border-b border-white/5 text-left">
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider">Invoice Hash</th>
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-center">Amount Paid</th>
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-right">Receipt Hash</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loadingPaid ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="py-5 px-6">
                                                    <Shimmer className="h-6 w-48 bg-white/5 rounded" />
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <Shimmer className="h-6 w-24 bg-white/5 rounded mx-auto" />
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <Shimmer className="h-6 w-48 bg-white/5 rounded ml-auto" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : paidInvoices.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-12 text-gray-500 italic">No paid invoices found.</td></tr>
                                    ) : (
                                        paidInvoices.map((receipt, i) => (
                                            <motion.tr
                                                key={i}
                                                variants={itemVariants}
                                                className="hover:bg-white/5 transition-colors group"
                                            >
                                                <td className="py-5 px-6 font-mono text-white text-sm">
                                                    <div className="flex items-center gap-3 group/ih pb-1">
                                                        <span className="text-gray-300 group-hover:text-neon-primary transition-colors">{receipt.invoiceHash.slice(0, 14)}...</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(receipt.invoiceHash);
                                                            }}
                                                            className="text-gray-600 hover:text-white transition-colors opacity-0 group-hover/ih:opacity-100 p-1.5 rounded-md hover:bg-white/10"
                                                            title="Copy Invoice Hash"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className="font-bold text-white text-lg">
                                                        {receipt.amount / 1_000_000} <span className="text-xs text-gray-400 font-normal uppercase">{receipt.tokenType === 1 ? 'USDCx' : 'Credits'}</span>
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-right font-mono text-neon-accent text-sm">
                                                    <div className="flex justify-end items-center gap-3 group/rh">
                                                        <span className="text-gray-400 group-hover:text-white transition-colors">{receipt.receiptHash.slice(0, 10)}...</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(receipt.receiptHash);
                                                            }}
                                                            className="flex items-center gap-1.5 text-xs bg-neon-accent/10 hover:bg-neon-accent/20 text-neon-accent px-3 py-1.5 rounded border border-neon-accent/30 transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                                            title="Copy Receipt Hash"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                            Copy
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {/* PRIVACY FOOTER */}
                    <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                        {activeTab === 'paid' && "All this information is fetched from your account record these are fully private"}
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Profile;
