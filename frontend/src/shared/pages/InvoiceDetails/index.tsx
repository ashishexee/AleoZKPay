import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { motion } from 'framer-motion';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import { PROGRAM_ID, parseMerchantReceipt, MerchantReceipt } from '../../utils/aleo-utils';
import { VerifyModal } from '../Profile/components/modals/VerifyModal';

interface InvoiceData {
    invoice_hash: string;
    merchant_address?: string;
    designated_address?: string;
    is_burner?: boolean;
    payer_address?: string;
    amount?: number;
    memo?: string;
    status?: 'PENDING' | 'SETTLED';
    invoice_transaction_id?: string;
    payment_tx_ids?: string[];
    payment_tx_id?: string;
    created_at?: string;
    updated_at?: string;
    salt?: string;
    invoice_type?: number;
    token_type?: number;
    invoice_items?: { name: string; quantity: number; unitPrice: number; total: number }[];
}

const EXPLORER = 'https://testnet.explorer.provable.com/transaction';
const TOKEN_LABELS: Record<number, string> = { 0: 'Credits', 1: 'USDCx', 2: 'USAD' };
const TYPE_INFO: Record<number, { label: string; bg: string; text: string; border: string }> = {
    0: { label: 'Standard',  bg: 'bg-zinc-800/60',    text: 'text-zinc-300',   border: 'border-zinc-600/40' },
    1: { label: 'Multi-Pay', bg: 'bg-purple-900/30',  text: 'text-purple-300', border: 'border-purple-500/30' },
    2: { label: 'Donation',  bg: 'bg-pink-900/30',    text: 'text-pink-300',   border: 'border-pink-500/30' },
};

// ── Small reusable sub-components ────────────────────────────────────────────
const CopyBtn: React.FC<{ text: string; small?: boolean }> = ({ text, small }) => {
    const [ok, setOk] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); }}
            className={`flex-shrink-0 transition-all ${small ? 'p-1' : 'p-1.5'} rounded-md hover:bg-white/10 ${ok ? 'text-green-400' : 'text-gray-600 hover:text-gray-300'}`}
            title="Copy"
        >
            {ok
                ? <svg className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                : <svg className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            }
        </button>
    );
};

const TxChip: React.FC<{ txId: string; color?: 'blue' | 'green' }> = ({ txId, color = 'blue' }) => {
    const colorMap = {
        blue:  'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
        green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
    };
    return (
        <div className="flex items-center gap-1">
            <a href={`${EXPLORER}/${txId}`} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-medium transition-all ${colorMap[color]}`}>
                <span className="truncate max-w-[240px]">{txId}</span>
                <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <CopyBtn text={txId} small />
        </div>
    );
};

const DataRow: React.FC<{ label: string; children: React.ReactNode; mono?: boolean; value?: string }> = ({ label, children, mono, value }) => (
    <div className="flex items-start gap-4 py-3.5 border-b border-white/[0.04] last:border-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-28 flex-shrink-0 pt-0.5">{label}</span>
        <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${mono ? 'font-mono text-xs text-gray-300 break-all' : ''}`}>
            {children}
            {value && <CopyBtn text={value} small />}
        </div>
    </div>
);

const SectionCard: React.FC<{ delay?: number; icon: React.ReactNode; color: string; title: string; children: React.ReactNode }> = ({ delay = 0, icon, color, title, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
        className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 mb-3"
    >
        <div className="flex items-center gap-2 mb-4">
            <div className={`w-6 h-6 rounded-lg ${color} flex items-center justify-center`}>{icon}</div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
        </div>
        {children}
    </motion.div>
);

// ── Unauthorized screen ──────────────────────────────────────────────────────
const Unauthorized: React.FC<{ noWallet?: boolean; onBack: () => void }> = ({ noWallet, onBack }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-sm w-full text-center"
        >
            <div className="absolute inset-0 rounded-3xl bg-orange-500/5 blur-2xl" />
            <div className="relative bg-[#0f0f0f] border border-orange-500/20 rounded-3xl p-10 shadow-[0_0_60px_rgba(249,115,22,0.06)]">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-white font-bold text-xl mb-2 tracking-tight">Access Denied</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    {noWallet ? 'Connect your wallet to verify ownership and view this invoice.' : 'This invoice is private and only accessible to its owner.'}
                </p>
                <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 text-sm font-semibold transition-all">
                    ← Dashboard
                </button>
            </div>
        </motion.div>
    </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const InvoiceDetailsPage: React.FC = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const { address, requestRecords, decrypt } = useWallet();

    // Invoice data
    const [invoice, setInvoice]         = useState<InvoiceData | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [authStatus, setAuthStatus]   = useState<'loading' | 'authorized' | 'unauthorized' | 'no-wallet'>('loading');
    const [pdfLoading, setPdfLoading]   = useState(false);
    const [copied, setCopied]           = useState(false);

    // On-chain receipt hashes
    const [receipts, setReceipts]                   = useState<MerchantReceipt[]>([]);
    const [scanningReceipts, setScanningReceipts]   = useState(false);
    const [scanned, setScanned]                     = useState(false);

    // Verify modal state
    const [showVerify, setShowVerify]           = useState(false);
    const [verifyInput, setVerifyInput]         = useState('');
    const [verifyStatus, setVerifyStatus]       = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord]   = useState<any>(null);

    // ── Load invoice from DB ─────────────────────────────────────────────────
    useEffect(() => {
        if (!hash) { setError('No invoice hash provided.'); setLoading(false); return; }
        const load = async () => {
            setLoading(true); setError(null);
            try {
                const { fetchInvoiceByHash } = await import('../../services/api');
                const data = await fetchInvoiceByHash(hash);
                if (!data) { setError('Invoice not found.'); setLoading(false); return; }
                setInvoice(data);
                if (!address)                                                                      setAuthStatus('no-wallet');
                else if (address.toLowerCase() === (data.merchant_address || '').toLowerCase())   setAuthStatus('authorized');
                else                                                                                setAuthStatus('unauthorized');
            } catch (e: any) { setError(e.message || 'Failed to load invoice.'); }
            finally { setLoading(false); }
        };
        load();
    }, [hash, address]);

    // ── Scan on-chain receipt records ────────────────────────────────────────
    const handleScanReceipts = async () => {
        if (!requestRecords || !decrypt || !invoice) return;
        setScanningReceipts(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const found: MerchantReceipt[] = [];
            if (records) {
                for (const r of records as any[]) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher) {
                        try { plaintext = await decrypt(cipher); } catch { /* skip */ }
                    }
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) {
                        // Match on invoice hash — strip "field" suffix for comparison
                        const normalizedReceiptHash = (receipt.invoiceHash || '').replace(/field$/, '').trim();
                        const normalizedInvoiceHash = (invoice.invoice_hash || '').replace(/field$/, '').trim();
                        if (normalizedReceiptHash === normalizedInvoiceHash || receipt.invoiceHash === invoice.invoice_hash) {
                            found.push(receipt);
                        }
                    }
                }
            }
            // Deduplicate by receiptHash
            const seen = new Set<string>();
            const unique = found.filter(r => { if (seen.has(r.receiptHash)) return false; seen.add(r.receiptHash); return true; });
            setReceipts(unique);
        } catch (e) { console.error('Receipt scan failed', e); }
        finally { setScanningReceipts(false); setScanned(true); }
    };

    // ── Verify receipt ───────────────────────────────────────────────────────
    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt || !invoice) return;
        setVerifyStatus('CHECKING');
        setVerifiedRecord(null);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            let foundRecord: any = null;
            if (records) {
                for (const r of records as any[]) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher) {
                        try { plaintext = await decrypt(cipher); } catch { /* skip */ }
                    }
                    if (plaintext && plaintext.includes(verifyInput)) {
                        const amountMatch     = plaintext.match(/amount:\s*([\d_]+)u64/);
                        const tokenTypeMatch  = plaintext.match(/token_type:\s*(\d+)u8/);
                        const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);
                        foundRecord = {
                            plaintext,
                            amount:      amountMatch      ? parseInt(amountMatch[1].replace(/_/g, '')) / 1_000_000 : 'Unknown',
                            tokenType:   tokenTypeMatch   ? parseInt(tokenTypeMatch[1]) : 0,
                            invoiceHash: invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown',
                        };
                        break;
                    }
                }
            }
            if (foundRecord) {
                const recordHash  = foundRecord.invoiceHash.trim();
                let invoiceHash   = (invoice.invoice_hash || '').trim().replace(/field$/, '');
                if (recordHash !== invoiceHash) {
                    setVerifiedRecord(foundRecord); setVerifyStatus('MISMATCH');
                } else {
                    setVerifiedRecord(foundRecord); setVerifyStatus('FOUND');
                }
            } else { setVerifyStatus('NOT_FOUND'); }
        } catch { setVerifyStatus('ERROR'); }
    };

    // ── PDF ──────────────────────────────────────────────────────────────────
    const handlePdf = async () => {
        if (!invoice) return;
        setPdfLoading(true);
        try {
            await generateInvoicePdf({
                invoiceHash: invoice.invoice_hash,
                amount: invoice.amount ?? 0,
                tokenType:   invoice.token_type   ?? 0,
                invoiceType: invoice.invoice_type ?? 0,
                walletType:  invoice.is_burner ? 1 : 0,
                status:      invoice.status ?? 'PENDING',
                memo:        invoice.memo,
                creationTx:  invoice.invoice_transaction_id,
                paymentTxIds: paymentTxIds,
                items:       invoice.invoice_items,
            });
        } finally { setPdfLoading(false); }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    // ── Derived values ───────────────────────────────────────────────────────
    const paymentTxIds: string[] = invoice?.payment_tx_ids?.length
        ? invoice.payment_tx_ids
        : invoice?.payment_tx_id ? [invoice.payment_tx_id] : [];

    // ── Loading / Error / Auth states ────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-[#00f3ff]/20 border-t-[#00f3ff] animate-spin" />
                    <div className="absolute inset-2 rounded-full border border-[#00f3ff]/10 border-t-[#00f3ff]/50 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                </div>
                <p className="text-gray-500 text-sm tracking-wide">Loading invoice details...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="bg-red-500/8 border border-red-500/20 rounded-3xl p-10 text-center max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-white font-bold text-lg mb-2">Invoice Not Found</h2>
                <p className="text-red-400/80 text-sm">{error}</p>
                <button onClick={() => navigate('/profile')} className="mt-6 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">← Dashboard</button>
            </div>
        </div>
    );

    if (authStatus === 'unauthorized' || authStatus === 'no-wallet') {
        return <Unauthorized noWallet={authStatus === 'no-wallet'} onBack={() => navigate('/profile')} />;
    }

    if (!invoice) return null;

    const typeInfo   = TYPE_INFO[invoice.invoice_type ?? 0] || TYPE_INFO[0];
    const tokenLabel = TOKEN_LABELS[invoice.token_type ?? 0] || 'Credits';
    const isSettled  = invoice.status === 'SETTLED';
    const shortHash  = `${invoice.invoice_hash.slice(0, 14)}...${invoice.invoice_hash.slice(-10)}`;

    // Build a fake "verifyingInvoice" shape that VerifyModal expects
    const verifyingInvoice = { invoiceHash: invoice.invoice_hash };

    return (
        <div className="relative min-h-screen">
            {/* Verify Modal */}
            <VerifyModal
                isOpen={showVerify}
                onClose={() => { setShowVerify(false); setVerifyInput(''); setVerifyStatus('IDLE'); setVerifiedRecord(null); }}
                verifyingInvoice={verifyingInvoice}
                verifyInput={verifyInput}
                setVerifyInput={setVerifyInput}
                verifyStatus={verifyStatus}
                verifiedRecord={verifiedRecord}
                merchantReceipts={receipts}
                onVerify={handleVerifyReceipt}
            />

            {/* AMBIENT GLOWS */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00f3ff]/3 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[160px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative z-10 w-full max-w-3xl mx-auto pt-8 pb-24 px-4"
            >
                {/* ── TOP BAR ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors group">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-gray-500 hover:text-white hover:bg-white/10 text-xs font-medium transition-all">
                            {copied
                                ? <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-green-400">Copied!</span></>
                                : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Share Link</>
                            }
                        </button>
                        <button
                            onClick={() => { setVerifyInput(''); setVerifyStatus('IDLE'); setVerifiedRecord(null); setShowVerify(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Verify Receipt
                        </button>
                        <button onClick={handlePdf} disabled={pdfLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/20 text-[#00f3ff] hover:bg-[#00f3ff]/20 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50">
                            {pdfLoading
                                ? <div className="w-3.5 h-3.5 border border-[#00f3ff]/30 border-t-[#00f3ff] rounded-full animate-spin" />
                                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            }
                            {pdfLoading ? 'Generating...' : 'PDF'}
                        </button>
                    </div>
                </div>

                {/* ── HERO ────────────────────────────────────────────────────── */}
                <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0d0d0d] via-[#111117] to-[#0d0d14] p-8 shadow-[0_4px_60px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#00f3ff]/30 to-transparent" />
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-2.5 mb-4">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${isSettled ? 'bg-green-500/10 text-green-400 border-green-500/25' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isSettled ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                                {isSettled ? 'Settled' : 'Pending'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}>{typeInfo.label}</span>
                            {invoice.is_burner
                                ? <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-[#00f3ff]/8 text-[#00f3ff] border border-[#00f3ff]/20"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Burner</span>
                                : <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10">Main</span>
                            }
                        </div>
                        <div className="mb-5">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">Total Amount</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black tracking-tighter text-white tabular-nums">{invoice.amount ?? '—'}</span>
                                <span className="text-xl font-bold text-[#00f3ff]/70 uppercase tracking-wider">{tokenLabel}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Invoice Hash</p>
                            <span className="font-mono text-xs text-gray-400">{shortHash}</span>
                            <CopyBtn text={invoice.invoice_hash} small />
                        </div>
                        {invoice.memo && (
                            <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] inline-flex items-center gap-2">
                                <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                <span className="text-xs text-gray-500 italic">"{invoice.memo}"</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TRANSACTIONS ─────────────────────────────────────────────── */}
                <SectionCard delay={0.08} title="Transactions" color="bg-blue-500/15 border border-blue-500/20"
                    icon={<svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
                    <div className="space-y-3">
                        {invoice.invoice_transaction_id
                            ? <div><p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1.5">Creation Tx</p><TxChip txId={invoice.invoice_transaction_id} color="blue" /></div>
                            : <p className="text-xs text-gray-700 italic">No creation transaction recorded.</p>
                        }
                        {paymentTxIds.length > 0 && (
                            <div>
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1.5">Payment{paymentTxIds.length > 1 ? 's' : ''} ({paymentTxIds.length})</p>
                                <div className="space-y-1.5">{paymentTxIds.map((txId, i) => <TxChip key={i} txId={txId} color="green" />)}</div>
                            </div>
                        )}
                        {paymentTxIds.length === 0 && !invoice.invoice_transaction_id && (
                            <p className="text-xs text-gray-700 italic">No transactions recorded yet.</p>
                        )}
                    </div>
                </SectionCard>

                {/* ── RECEIPT HASHES ───────────────────────────────────────────── */}
                <SectionCard delay={0.11} title="Receipt Hashes (On-Chain)" color="bg-green-500/10 border border-green-500/20"
                    icon={<svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                    {!scanned ? (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                            <p className="text-xs text-gray-600">Scan your private records to find all receipt hashes for this invoice.</p>
                            <button
                                onClick={handleScanReceipts}
                                disabled={scanningReceipts}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {scanningReceipts
                                    ? <><div className="w-3.5 h-3.5 border border-green-400/30 border-t-green-400 rounded-full animate-spin" />Scanning Records...</>
                                    : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Scan Receipt Hashes</>
                                }
                            </button>
                        </div>
                    ) : receipts.length === 0 ? (
                        <div className="py-4 text-center">
                            <p className="text-xs text-gray-600 mb-2">No receipt records found for this invoice in your wallet.</p>
                            <button onClick={handleScanReceipts} disabled={scanningReceipts} className="text-[11px] text-gray-500 hover:text-white underline underline-offset-2 transition-colors">
                                Rescan
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {receipts.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] text-green-400/60 font-bold flex-shrink-0">#{idx + 1}</span>
                                        <span className="font-mono text-xs text-gray-300 truncate">{r.receiptHash.slice(0, 18)}...{r.receiptHash.slice(-10)}</span>
                                        <CopyBtn text={r.receiptHash} small />
                                    </div>
                                    <span className="text-xs font-bold text-white whitespace-nowrap ml-3">
                                        {(r.amount / 1_000_000)} <span className="text-[10px] text-gray-500 font-normal">{TOKEN_LABELS[r.tokenType]}</span>
                                    </span>
                                </div>
                            ))}
                            <p className="text-[10px] text-gray-600 mt-2 text-center italic">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found · <button onClick={handleScanReceipts} disabled={scanningReceipts} className="hover:text-white transition-colors underline underline-offset-2">Rescan</button></p>
                        </div>
                    )}
                </SectionCard>

                {/* ── HASHES & ADDRESSES ───────────────────────────────────────── */}
                <SectionCard delay={0.14} title="Hashes & Addresses" color="bg-[#00f3ff]/10 border border-[#00f3ff]/20"
                    icon={<svg className="w-3 h-3 text-[#00f3ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}>
                    <DataRow label="Invoice Hash" mono value={invoice.invoice_hash}><span>{shortHash}</span></DataRow>
                    {invoice.salt && <DataRow label="Salt" mono value={invoice.salt}><span className="truncate">{invoice.salt}</span></DataRow>}
                    {invoice.merchant_address && <DataRow label="Merchant" mono value={invoice.merchant_address}><span className="break-all">{invoice.merchant_address}</span></DataRow>}
                    {invoice.designated_address && invoice.designated_address !== invoice.merchant_address && (
                        <DataRow label="Designated" mono value={invoice.designated_address}><span className="break-all">{invoice.designated_address}</span></DataRow>
                    )}
                    {invoice.payer_address && <DataRow label="Payer" mono value={invoice.payer_address}><span className="break-all">{invoice.payer_address}</span></DataRow>}
                </SectionCard>

                {/* ── METADATA ─────────────────────────────────────────────────── */}
                <SectionCard delay={0.17} title="Metadata" color="bg-purple-500/10 border border-purple-500/20"
                    icon={<svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}>
                    <DataRow label="Status">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${isSettled ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{invoice.status ?? 'Pending'}</span>
                    </DataRow>
                    <DataRow label="Token"><span className="text-sm text-white font-medium">{tokenLabel}</span></DataRow>
                    <DataRow label="Invoice Type">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}>{typeInfo.label}</span>
                    </DataRow>
                    <DataRow label="Wallet Type">
                        {invoice.is_burner
                            ? <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#00f3ff]"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Burner Wallet</span>
                            : <span className="text-xs text-gray-400 font-semibold">Main Wallet</span>
                        }
                    </DataRow>
                    {invoice.created_at && <DataRow label="Created"><span className="text-sm text-gray-400">{new Date(invoice.created_at).toLocaleString()}</span></DataRow>}
                    {invoice.updated_at && <DataRow label="Updated"><span className="text-sm text-gray-400">{new Date(invoice.updated_at).toLocaleString()}</span></DataRow>}
                </SectionCard>

                {/* ── LINE ITEMS ───────────────────────────────────────────────── */}
                {invoice.invoice_items && invoice.invoice_items.length > 0 && (
                    <SectionCard delay={0.2} title="Line Items" color="bg-orange-500/10 border border-orange-500/20"
                        icon={<svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}>
                        <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                                        {['Item','Qty','Unit Price','Total'].map(h => (
                                            <th key={h} className={`py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600 ${h === 'Item' ? 'text-left' : h === 'Qty' ? 'text-center' : 'text-right'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {invoice.invoice_items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                                            <td className="py-3 px-4 text-center text-gray-400">{item.quantity}</td>
                                            <td className="py-3 px-4 text-right text-gray-400">{item.unitPrice} {tokenLabel}</td>
                                            <td className="py-3 px-4 text-right text-white font-semibold">{item.total} {tokenLabel}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/[0.06] bg-[#00f3ff]/[0.04]">
                                        <td colSpan={3} className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[#00f3ff]/70 text-right">Total</td>
                                        <td className="py-3 px-4 text-right font-black text-[#00f3ff]">{invoice.invoice_items.reduce((s, i) => s + i.total, 0)} {tokenLabel}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {/* ── PDF BANNER ───────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                    className="relative overflow-hidden rounded-2xl border border-[#00f3ff]/15 bg-gradient-to-r from-[#00f3ff]/5 to-transparent p-5 flex items-center justify-between gap-4"
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f3ff]/30 to-transparent" />
                    <div>
                        <p className="text-sm font-bold text-white mb-0.5">Download Invoice PDF</p>
                        <p className="text-xs text-gray-500">Formatted PDF receipt for your records.</p>
                    </div>
                    <button onClick={handlePdf} disabled={pdfLoading}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00f3ff]/15 border border-[#00f3ff]/25 text-[#00f3ff] hover:bg-[#00f3ff]/25 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
                        {pdfLoading
                            ? <div className="w-3.5 h-3.5 border border-[#00f3ff]/30 border-t-[#00f3ff] rounded-full animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        }
                        {pdfLoading ? 'Generating...' : 'Download PDF'}
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default InvoiceDetailsPage;
