import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Shimmer } from '../components/ui/Shimmer';
import { useTransactions } from '../hooks/useTransactions';
import { PROGRAM_ID, parseMerchantReceipt, MerchantReceipt, parseInvoice, InvoiceRecord, parsePayerReceipt, PayerReceipt } from '../utils/aleo-utils';

const CopyButton = ({ text, title, className = "" }: { text: string, title?: string, className?: string }) => {
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
            className={`transition-colors p-1 ${className}`}
            title={title}
        >
            {copied ? (
                <span className="text-[10px] text-neon-primary font-bold">Copied!</span>
            ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 01-2-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                </svg>
            )}
        </button>
    );
};

const LinkButton = ({ url }: { url: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors font-medium group/btn ${copied
                ? "bg-green-500/10 border-green-500/20 text-green-500"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                }`}
        >
            {copied ? (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Link
                </>
            )}
        </button>
    );
};

const Profile: React.FC = () => {
    const { address, requestRecords, decrypt } = useWallet();
    const publicKey = address;
    const { transactions, loading: loadingTransactions, fetchTransactions } = useTransactions(publicKey || undefined);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [activeTab, setActiveTab] = useState<'created' | 'paid'>('created');
    const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [createdInvoices, setCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [payerReceipts, setPayerReceipts] = useState<PayerReceipt[]>([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [loadingCreated, setLoadingCreated] = useState(false);
    const [loadingPayerReceipts, setLoadingPayerReceipts] = useState(false);
    const fetchPayerReceiptsRef = useRef(0);

    useEffect(() => {
        if (publicKey) {
            console.log("Profile mounted/updated. Fetching all data...");
            fetchTransactions();
            fetchCreatedInvoices();
            fetchMerchantReceipts();
            fetchPayerReceipts();
        }
    }, [publicKey]);

    const fetchCreatedInvoices = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingCreated(true);
        try {
            const records = await requestRecords(PROGRAM_ID);
            const validInvoices: InvoiceRecord[] = [];

            if (records) {
                console.log("Fetching created invoices from records...");
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for created invoice:", e); }
                    }

                    const invoice = parseInvoice({ ...r, plaintext });
                    if (invoice) {
                        validInvoices.push(invoice);
                    }
                }
            }
            setCreatedInvoices(validInvoices.reverse());
        } catch (e) {
            console.error("Error fetching created invoices:", e);
        } finally {
            setLoadingCreated(false);
        }
    };

    const fetchMerchantReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingReceipts(true);
        console.log("Fetching Merchant Receipts...");
        try {
            const records = await requestRecords(PROGRAM_ID);
            const validReceipts: MerchantReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    if (r.spent) continue;

                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for merchant receipt:", e); }
                    }
                    // Try parsing as MerchantReceipt
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) {
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log("Merchant Receipts Found:", validReceipts.length);
            setMerchantReceipts(validReceipts.reverse());
        } catch (e) {
            console.error("Error fetching merchant receipts:", e);
        } finally {
            setLoadingReceipts(false);
        }
    };

    const fetchPayerReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        const fetchId = ++fetchPayerReceiptsRef.current;
        setLoadingPayerReceipts(true);
        console.log(`[fetchPayerReceipts #${fetchId}] Starting...`);
        try {
            const records = await requestRecords(PROGRAM_ID);
            // If a newer fetch started, discard this one's results
            if (fetchId !== fetchPayerReceiptsRef.current) {
                console.log(`[fetchPayerReceipts #${fetchId}] Stale fetch, discarding.`);
                return;
            }
            const validReceipts: PayerReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for payer receipt:", e); }
                    }

                    const receipt = parsePayerReceipt({ ...r, plaintext });
                    if (receipt) {
                        console.log(`[fetchPayerReceipts #${fetchId}] Found Payer Receipt:`, receipt);
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log(`[fetchPayerReceipts #${fetchId}] Total Payer Receipts Parsed:`, validReceipts.length);
            setPayerReceipts([...validReceipts].reverse());
            console.log(`[fetchPayerReceipts #${fetchId}] State updated with ${validReceipts.length} receipts.`);
        } catch (e) {
            console.error(`[fetchPayerReceipts #${fetchId}] Error:`, e);
        } finally {
            if (fetchId === fetchPayerReceiptsRef.current) {
                setLoadingPayerReceipts(false);
                console.log(`[fetchPayerReceipts #${fetchId}] Loading set to false.`);
            }
        }
    };

    // MERGE LOGIC: Combine DB Transactions + On-Chain Records
    const combinedInvoices = useMemo(() => {
        const merged = new Map<string, any>();

        // 1. Add all DB transactions first (Source of Truth for Pending/Metadata)
        transactions.forEach(tx => {
            if (!tx.invoice_hash) return;
            merged.set(tx.invoice_hash, {
                invoiceHash: tx.invoice_hash,
                amount: tx.amount, // Major Units from DB
                tokenType: tx.token_type || 0,
                status: tx.status,
                invoiceType: tx.invoice_type || 0,
                creationTx: tx.invoice_transaction_id,
                paymentTx: tx.payment_tx_ids?.[0] || tx.payment_tx_id,
                isPending: tx.status === 'PENDING',
                source: 'db',
                owner: tx.merchant_address,
                salt: tx.salt // Now available from DB!
            });
        });

        // 2. Merge On-Chain Records (Source of Truth for Confirmation)
        createdInvoices.forEach(record => {
            const existing = merged.get(record.invoiceHash);
            if (existing) {
                // Update existing with on-chain confirmation
                merged.set(record.invoiceHash, {
                    ...existing,
                    amount: record.amount / 1_000_000, // Convert Micro to Major
                    tokenType: record.tokenType,
                    isValidOnChain: true,
                    status: existing.status === 'SETTLED' ? 'SETTLED' : 'PENDING', // If DB says Settled, keep it. Else Pending.
                    isPending: false,
                    salt: record.salt // Prefer on-chain salt if available
                });
            } else {
                // Add Orphan On-Chain Record (not in DB
                merged.set(record.invoiceHash, {
                    invoiceHash: record.invoiceHash,
                    amount: record.amount / 1_000_000,
                    tokenType: record.tokenType,
                    status: 'PENDING',
                    invoiceType: record.invoiceType,
                    creationTx: null,
                    paymentTx: null,
                    isPending: false,
                    source: 'chain',
                    owner: record.owner,
                    salt: record.salt
                });
            }
        });

        return Array.from(merged.values()); // Show newest first (roughly)
    }, [transactions, createdInvoices]);

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
                let invoiceHash = (verifyingInvoice.invoiceHash || verifyingInvoice.invoice_hash || '').trim();
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



    const merchantStats = {
        balance: 'Loading...',
        totalSales: merchantReceipts
            .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
            .toFixed(2),
        invoices: combinedInvoices.length,
        multiPayCampaigns: combinedInvoices.filter(inv => inv.invoiceType === 1).length
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
                            className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Verify Invoice Payment</h3>
                                <button onClick={() => setShowVerifyModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                            </div>

                            {verifyingInvoice && (
                                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Verifying For Invoice</div>
                                    <div className="font-mono text-neon-primary text-sm truncate">{verifyingInvoice.invoiceHash}</div>
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

                                {/* PAYMENT RECORDS LIST */}
                                {verifyingInvoice && (() => {
                                    const seen = new Set<string>();
                                    const matchingReceipts = merchantReceipts.filter(r => {
                                        if (r.invoiceHash !== verifyingInvoice.invoiceHash) return false;
                                        if (seen.has(r.receiptHash)) return false;
                                        seen.add(r.receiptHash);
                                        return true;
                                    });
                                    if (matchingReceipts.length === 0) return null;
                                    return (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <svg className="w-4 h-4 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                <span className="text-sm font-bold text-white uppercase tracking-wider">Payment Records ({matchingReceipts.length})</span>
                                            </div>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                                {matchingReceipts.map((receipt, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/5 transition-colors cursor-pointer group"
                                                        onClick={() => setVerifyInput(receipt.receiptHash)}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-neon-accent text-xs">#{idx + 1}</span>
                                                            <span className="font-mono text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                                                                {receipt.receiptHash.slice(0, 12)}...{receipt.receiptHash.slice(-8)}
                                                            </span>
                                                            <CopyButton text={receipt.receiptHash} title="Copy Receipt Hash" className="text-gray-600 hover:text-white flex-shrink-0" />
                                                        </div>
                                                        <span className="font-bold text-white text-sm whitespace-nowrap ml-3">
                                                            {receipt.amount / 1_000_000} <span className="text-xs text-gray-400 font-normal">{receipt.tokenType === 1 ? 'USDCx' : 'Credits'}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 italic">Click a record to auto-fill its receipt hash for verification.</p>
                                        </div>
                                    );
                                })()}

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
                        {loadingReceipts ? (
                            <Shimmer className="h-10 w-32 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.totalSales} <span className="text-sm font-normal text-gray-500">Credits</span></h2>
                        )}
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                        {loadingCreated ? (
                            <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                        )}
                    </GlassCard>
                    <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Active Campaigns</span>
                        {loadingCreated ? (
                            <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.multiPayCampaigns}</h2>
                        )}
                    </GlassCard>
                </motion.div>

                {/* INVOICE HISTORY */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center gap-4">
                        <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 relative">
                            {['created', 'paid'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`relative z-10 px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {activeTab === tab && (
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

                    <div className="overflow-x-auto min-h-[300px]">
                        {/* CREATED TAB */}
                        <div style={{ display: activeTab === 'created' ? 'block' : 'none' }}>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 text-left">
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Hash</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Amount</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Type</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Tx IDs</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {((loadingCreated || loadingTransactions) && combinedInvoices.length === 0) ? (
                                        <tr><td colSpan={6} className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin"></div></td></tr>
                                    ) : combinedInvoices.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-gray-500 italic">No created invoices found.</td></tr>
                                    ) : (
                                        combinedInvoices.map((inv, i) => {
                                            const params = new URLSearchParams({
                                                merchant: inv.owner || '',
                                                amount: inv.amount.toString(),
                                                salt: inv.salt || ''
                                            });

                                            if (inv.tokenType === 1) params.append('token', 'usdcx');
                                            if (inv.invoiceType === 1) params.append('type', 'multipay');

                                            const paymentLink = `${window.location.origin}/pay?${params.toString()}`;

                                            return (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-white/5 transition-colors group"
                                                >
                                                    <td className="py-4 px-6 font-mono text-neon-accent group-hover:text-neon-primary transition-colors text-sm">
                                                        <div className="flex items-center gap-2 group/hash">
                                                            <span>{inv.invoiceHash?.slice(0, 8)}...{inv.invoiceHash?.slice(-6)}</span>
                                                            <CopyButton
                                                                text={inv.invoiceHash || ''}
                                                                title="Copy Full Hash"
                                                                className="text-gray-600 hover:text-white opacity-0 group-hover/hash:opacity-100"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="font-bold text-white text-lg">
                                                            {inv.amount} <span className="text-xs text-gray-400 font-normal uppercase">{inv.tokenType === 1 ? 'USDCx' : 'Credits'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${inv.invoiceType === 1
                                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                                                : 'bg-white/5 text-gray-400 border-white/10'
                                                            }`}>
                                                            {inv.invoiceType === 1 ? 'Multi Pay' : 'Standard'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <StatusBadge status={inv.status} />
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            {inv.creationTx && (
                                                                <button
                                                                    onClick={() => openExplorer(inv.creationTx)}
                                                                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-gray-400 hover:text-white border border-white/5 transition-colors"
                                                                >
                                                                    Creation Tx
                                                                </button>
                                                            )}
                                                            {inv.paymentTx && (
                                                                <button
                                                                    onClick={() => openExplorer(inv.paymentTx)}
                                                                    className="text-[10px] bg-neon-primary/10 hover:bg-neon-primary/20 px-2 py-0.5 rounded text-neon-primary border border-neon-primary/20 transition-colors"
                                                                >
                                                                    Payment Tx
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex gap-2 justify-end w-full">
                                                            <LinkButton url={paymentLink} />

                                                            <button
                                                                onClick={() => {
                                                                    setVerifyingInvoice(inv);
                                                                    setVerifyInput('');
                                                                    setShowVerifyModal(true);
                                                                }}
                                                                className="flex items-center gap-1.5 text-xs bg-neon-primary/10 hover:bg-neon-primary/20 px-3 py-1.5 rounded-md border border-neon-primary/20 hover:border-neon-primary/50 transition-all text-neon-primary font-medium group/btn"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Verify
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAID TAB */}
                        <div style={{ display: activeTab === 'paid' ? 'block' : 'none' }}>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-black/40 border-b border-white/5 text-left">
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider">Invoice Hash</th>
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-center">Amount Paid</th>
                                        <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-right">Receipt Hash</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loadingPayerReceipts ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="py-5 px-6"><Shimmer className="h-6 w-48 bg-white/5 rounded" /></td>
                                                <td className="py-5 px-6 text-center"><Shimmer className="h-6 w-24 bg-white/5 rounded mx-auto" /></td>
                                                <td className="py-5 px-6 text-right"><Shimmer className="h-6 w-48 bg-white/5 rounded ml-auto" /></td>
                                            </tr>
                                        ))
                                    ) : payerReceipts.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-12 text-gray-500 italic">No paid invoices found.</td></tr>
                                    ) : (
                                        payerReceipts.map((receipt, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-5 px-6 font-mono text-white text-sm">
                                                    <div className="flex items-center gap-3 group/ih pb-1">
                                                        <span className="text-gray-300 group-hover:text-neon-primary transition-colors">{receipt.invoiceHash.slice(0, 8)}...{receipt.invoiceHash.slice(-6)}</span>
                                                        <CopyButton text={receipt.invoiceHash} title="Copy Invoice Hash" className="text-gray-600 hover:text-white opacity-0 group-hover/ih:opacity-100 p-1.5 rounded-md hover:bg-white/10" />
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className="font-bold text-white text-lg">
                                                        {receipt.amount / 1_000_000} <span className="text-xs text-gray-400 font-normal uppercase">{receipt.tokenType === 1 ? 'USDCx' : 'Credits'}</span>
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-right font-mono text-neon-accent text-sm">
                                                    <div className="flex justify-end items-center gap-3 group/rh">
                                                        <span className="text-gray-400 group-hover:text-white transition-colors">{receipt.receiptHash.slice(0, 8)}...{receipt.receiptHash.slice(-6)}</span>
                                                        <CopyButton text={receipt.receiptHash} title="Copy Receipt Hash" className="flex items-center gap-1.5 text-xs bg-neon-accent/10 hover:bg-neon-accent/20 text-neon-accent px-3 py-1.5 rounded border border-neon-accent/30 transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* PRIVACY FOOTER */}
                    <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                        All this information is fetched from your private account records.
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Profile;
