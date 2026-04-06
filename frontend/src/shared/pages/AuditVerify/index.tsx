import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyMerchantAuditPackage } from '../../utils/auditPackage';
import type { MerchantAuditPackage, MerchantAuditPayload } from '../../utils/auditPackage';
type VerifyState =
    | { status: 'idle' }
    | { status: 'verifying' }
    | { status: 'valid'; payload: MerchantAuditPayload; packageData: MerchantAuditPackage; signatureStatus: 'verified' | 'missing' | 'invalid' }
    | { status: 'invalid'; error: string };

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const rise = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } } };

const AuditVerifyPage = () => {
    const [packageText, setPackageText] = useState('');
    const [auditKey, setAuditKey] = useState('');
    const [state, setState] = useState<VerifyState>({ status: 'idle' });
    const [packageName, setPackageName] = useState('');
    const [auditKeyFileName, setAuditKeyFileName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<'package' | 'key' | null>(null);

    const canVerify = packageText.trim().length > 0 && auditKey.trim().length > 0 && state.status !== 'verifying';

    const aggregateRows = useMemo(() => {
        if (state.status !== 'valid') return [];
        return [
            { token: 'Credits', earned: state.payload.summary.totalEarnings.credits.toFixed(2), outgoing: state.payload.summary.totalOutgoing.credits.toFixed(2) },
            { token: 'USDCx', earned: state.payload.summary.totalEarnings.usdcx.toFixed(2), outgoing: state.payload.summary.totalOutgoing.usdcx.toFixed(2) },
            { token: 'USAD', earned: state.payload.summary.totalEarnings.usad.toFixed(2), outgoing: state.payload.summary.totalOutgoing.usad.toFixed(2) },
        ];
    }, [state]);

    const showMerchantView = state.status === 'valid' ? state.payload.role !== 'payer' : false;
    const showPayerView = state.status === 'valid' ? state.payload.role !== 'merchant' : false;

    const handlePackageUpload = async (file: File) => { setPackageName(file.name); setPackageText(await file.text()); setState({ status: 'idle' }); };
    const handleAuditKeyUpload = async (file: File) => { setAuditKeyFileName(file.name); setAuditKey((await file.text()).trim()); setState({ status: 'idle' }); };

    const handleVerify = async () => {
        try {
            setState({ status: 'verifying' });
            const parsed = JSON.parse(packageText) as MerchantAuditPackage;
            const result = await verifyMerchantAuditPackage(parsed, auditKey);
            setState({ status: 'valid', payload: result.payload, packageData: parsed, signatureStatus: result.signatureStatus });
        } catch (error: any) {
            setState({ status: 'invalid', error: error?.message || 'Failed to verify this audit package.' });
        }
    };

    const handleCopy = async (value: string, id: string) => {
        try { await navigator.clipboard.writeText(value); setCopiedId(id); window.setTimeout(() => setCopiedId(c => c === id ? null : c), 1400); } catch {}
    };

    return (
        <div className="w-full mx-auto relative min-h-screen">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            {/* Aleo Globe background */}
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

            <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 mx-auto max-w-6xl px-6 pb-32 pt-10">
                <motion.div variants={rise} className="flex flex-col items-center justify-center text-center mb-12 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight !text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Audit{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                            Verify
                        </span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                        Upload an encrypted audit package and its decryption key. All verification runs locally — nothing leaves your browser.
                    </p>
                </motion.div>



                <motion.div variants={rise} className="grid gap-4 lg:grid-cols-2">
                    <DropZone step="01" title="Audit Package" subtitle="Drop your .audit.json or paste below" accept=".json,application/json" fileName={packageName} fileLoaded={packageText.trim().length > 0} isDragOver={dragOver === 'package'} onDragOver={() => setDragOver('package')} onDragLeave={() => setDragOver(null)} onDrop={f => { setDragOver(null); handlePackageUpload(f); }} onFileChange={e => { const f = e.target.files?.[0]; if (f) handlePackageUpload(f); }} icon={<JsonIcon />} placeholderLabel="Encrypted audit bundle">
                        <textarea value={packageText} onChange={e => { setPackageText(e.target.value); setState({ status: 'idle' }); }} placeholder='{"version":"1.0","encryptedPayload":"..."}' className="min-h-[200px] w-full resize-none bg-transparent px-4 py-4 font-mono text-[11px] leading-6 text-white/70 placeholder:text-white/15 focus:outline-none" />
                    </DropZone>

                    <DropZone step="02" title="Audit Key" subtitle="Upload .audit-key.txt or paste the key" accept=".txt,text/plain" fileName={auditKeyFileName} fileLoaded={auditKey.trim().length > 0} isDragOver={dragOver === 'key'} onDragOver={() => setDragOver('key')} onDragLeave={() => setDragOver(null)} onDrop={f => { setDragOver(null); handleAuditKeyUpload(f); }} onFileChange={e => { const f = e.target.files?.[0]; if (f) handleAuditKeyUpload(f); }} icon={<KeyIcon />} placeholderLabel="Decryption key">
                        <textarea value={auditKey} onChange={e => { setAuditKey(e.target.value); setState({ status: 'idle' }); }} placeholder="Paste the audit key from your .audit-key.txt file..." className="min-h-[200px] w-full resize-none bg-transparent px-4 py-4 font-mono text-[11px] leading-6 text-white/70 placeholder:text-white/15 focus:outline-none" />
                    </DropZone>
                </motion.div>

                <motion.div variants={rise} className="mt-4 rounded-2xl border border-white/[0.12] bg-white/[0.04] p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[{ label: 'Key handshake', desc: 'Key hash matches fingerprint' }, { label: 'AES-GCM decrypt', desc: 'Payload opens cleanly' }, { label: 'Payload integrity', desc: 'Hash validates post-decrypt' }, { label: 'Wallet proof', desc: 'Signer signature verified' }].map(c => (
                                <div key={c.label} className="flex items-start gap-2">
                                    <div className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                                    <div><div className="text-[11px] font-semibold text-white/80">{c.label}</div><div className="mt-0.5 text-[10px] text-white/40">{c.desc}</div></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-stretch gap-2 lg:min-w-[260px] lg:items-end">
                            <motion.button onClick={handleVerify} disabled={!canVerify} whileHover={canVerify ? { scale: 1.02 } : {}} whileTap={canVerify ? { scale: 0.98 } : {}}
                                className={`relative overflow-hidden rounded-xl px-8 py-4 text-sm font-bold tracking-wide transition-all ${canVerify ? 'cursor-pointer bg-gradient-to-r from-orange-400 to-amber-300 text-black shadow-[0_0_32px_rgba(251,146,60,0.3)] hover:shadow-[0_0_48px_rgba(251,146,60,0.5)]' : 'cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-white/25'}`}
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {state.status === 'verifying' ? <span className="flex items-center gap-2"><SpinnerIcon />Verifying...</span> : 'Run Verification →'}
                                {canVerify && <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
                            </motion.button>
                            <p className="text-center text-[10px] text-white/20 lg:text-right">All checks run in-browser. No data transmitted.</p>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {state.status === 'invalid' && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">✕</div>
                                <div><div className="font-semibold text-red-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verification Failed</div><p className="mt-1 text-sm text-red-200/60">{state.error}</p></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {state.status === 'valid' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 text-lg">✓</div>
                                <div className="flex-1">
                                    <div className="font-semibold text-emerald-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Package Verified</div>
                                    <p className="mt-0.5 text-xs text-emerald-200/50">Report <span className="font-mono text-emerald-200/80">{state.payload.reportId}</span> · Signature: {state.signatureStatus}</p>
                                </div>
                                <div className="hidden items-center gap-2 sm:flex"><Chip label="Integrity ✓" color="emerald" /><Chip label="Decrypted ✓" color="emerald" /></div>
                            </motion.div>

                            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                                <ResultPanel title="Trusted Report Summary">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <InfoField label="Role" value={state.payload.role} />
                                        <InfoField label="Generated" value={new Date(state.payload.generatedAt).toLocaleString()} />
                                        <InfoField label="Program ID" value={state.payload.programId} mono copyId="program-id" copiedId={copiedId} onCopy={() => handleCopy(state.payload.programId, 'program-id')} />
                                        <InfoField label="Signer" value={state.packageData.signerAddress} mono copyId="signer-address" copiedId={copiedId} onCopy={() => handleCopy(state.packageData.signerAddress, 'signer-address')} />
                                        <InfoField label="Payload Hash" value={state.packageData.payloadHash} mono copyId="payload-hash" copiedId={copiedId} onCopy={() => handleCopy(state.packageData.payloadHash, 'payload-hash')} span2 />
                                    </div>
                                    <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.06]">
                                        <div className="grid grid-cols-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30"><span>Token</span><span>Earnings</span><span>Outgoing</span></div>
                                        {aggregateRows.map((row, i) => (
                                            <div key={row.token} className={`grid grid-cols-3 px-4 py-3 text-sm ${i < aggregateRows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                                                <span className="font-semibold text-white/70">{row.token}</span>
                                                <span className="text-emerald-400/80">{row.earned}</span>
                                                <span className="text-orange-300/80">{row.outgoing}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ResultPanel>

                                <ResultPanel title="Package Contents">
                                    <div className="space-y-3">
                                        <ContentStat label="Invoices" value={state.payload.invoices.length} />
                                        <ContentStat label="Incoming Receipts" value={state.payload.incomingMerchantReceipts.length} />
                                        <ContentStat label="Outgoing Receipts" value={state.payload.outgoingPayerReceipts.length} />
                                    </div>
                                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">Wallet Signature</div>
                                        <div className={`mt-1.5 text-sm font-semibold ${state.signatureStatus === 'verified' ? 'text-emerald-400' : state.signatureStatus === 'missing' ? 'text-white/40' : 'text-red-400'}`}>
                                            {state.signatureStatus === 'verified' ? '✓ Verified' : state.signatureStatus === 'missing' ? '— Not attached' : '✕ Invalid'}
                                        </div>
                                    </div>
                                </ResultPanel>
                            </div>

                            {state.payload.balances.length > 0 && (
                                <ResultPanel title="Balance Snapshot">
                                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                                        <div className="grid grid-cols-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30"><span>Asset</span><span>Public</span><span>Private</span></div>
                                        {state.payload.balances.map((bal, i) => (
                                            <div key={bal.name} className={`grid grid-cols-3 px-4 py-3 text-sm ${i < state.payload.balances.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                                                <span className="font-semibold text-white/70">{bal.name}</span>
                                                <span className="text-white/60">{bal.publicAmount.toFixed(2)}</span>
                                                <span className="text-orange-300/70">{bal.privateAmount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ResultPanel>
                            )}

                            {showMerchantView && (
                                <ResultPanel title="Invoice Register">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.2em] text-white/25">
                                                <th className="pb-3 pr-6 font-bold">Invoice</th><th className="pb-3 pr-6 font-bold">Status</th><th className="pb-3 pr-6 font-bold">Token</th><th className="pb-3 pr-6 font-bold">Amount</th>
                                                {state.payload.disclosure.includeMemo && <th className="pb-3 pr-6 font-bold">Memo</th>}
                                                <th className="pb-3 pr-6 font-bold">Type</th><th className="pb-3 font-bold">Wallet</th>
                                            </tr></thead>
                                            <tbody>
                                                {state.payload.invoices.map(inv => (
                                                    <tr key={inv.invoiceHash} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                        <td className="py-3 pr-6"><HashCell hash={inv.invoiceHash} copied={copiedId === `invoice-${inv.invoiceHash}`} onCopy={() => handleCopy(inv.invoiceHash, `invoice-${inv.invoiceHash}`)} /></td>
                                                        <td className="py-3 pr-6"><StatusBadge status={inv.status} /></td>
                                                        <td className="py-3 pr-6 text-white/50">{inv.tokenLabel}</td>
                                                        <td className="py-3 pr-6 font-semibold text-white/80">{inv.amountLabel}</td>
                                                        {state.payload.disclosure.includeMemo && <td className="py-3 pr-6 text-white/40">{inv.memo || '—'}</td>}
                                                        <td className="py-3 pr-6 text-white/40">{inv.invoiceTypeLabel}</td>
                                                        <td className="py-3 text-white/40">{inv.walletLabel}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </ResultPanel>
                            )}

                            {showMerchantView && state.payload.disclosure.includeIncomingReceipts && (
                                <ResultPanel title="Incoming Merchant Receipts"><ReceiptTable receipts={state.payload.incomingMerchantReceipts} copiedId={copiedId} onCopy={handleCopy} showMerchant={false} /></ResultPanel>
                            )}

                            {showPayerView && state.payload.disclosure.includeOutgoingReceipts && (
                                <ResultPanel title="Outgoing Payer Receipts"><ReceiptTable receipts={state.payload.outgoingPayerReceipts} copiedId={copiedId} onCopy={handleCopy} showMerchant /></ResultPanel>
                            )}

                            {showMerchantView && state.payload.disclosure.includeInvoiceAppendices && (
                                <ResultPanel title="Invoice Appendices" subtitle="Full cryptographic detail — identity, provenance, receipts, line items">
                                    <div className="space-y-4">
                                        {state.payload.invoices.map(invoice => (
                                            <div key={invoice.invoiceHash} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-sm text-white/70">{shortHash(invoice.invoiceHash, 14, 12)}</span>
                                                    <StatusBadge status={invoice.status} />
                                                </div>
                                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                    <InfoField label="Invoice Hash" value={invoice.invoiceHash} mono copyId={`ai-${invoice.invoiceHash}`} copiedId={copiedId} onCopy={() => handleCopy(invoice.invoiceHash, `ai-${invoice.invoiceHash}`)} />
                                                    <InfoField label="Owner" value={invoice.owner || '—'} mono copyId={`ao-${invoice.invoiceHash}`} copiedId={copiedId} onCopy={invoice.owner ? () => handleCopy(invoice.owner!, `ao-${invoice.invoiceHash}`) : undefined} />
                                                    <InfoField label="Salt" value={invoice.salt || '—'} mono copyId={`as-${invoice.invoiceHash}`} copiedId={copiedId} onCopy={invoice.salt ? () => handleCopy(invoice.salt!, `as-${invoice.invoiceHash}`) : undefined} />
                                                    <InfoField label="Token" value={invoice.tokenLabel} />
                                                    <InfoField label="Amount" value={invoice.amountLabel} />
                                                    {state.payload.disclosure.includeMemo && <InfoField label="Memo" value={invoice.memo || '—'} />}
                                                    {invoice.creationTx && <InfoField label="Creation Tx" value={invoice.creationTx} mono copyId={`ac-${invoice.invoiceHash}`} copiedId={copiedId} onCopy={() => handleCopy(invoice.creationTx!, `ac-${invoice.invoiceHash}`)} explorerUrl={`https://testnet.explorer.provable.com/transaction/${invoice.creationTx}`} />}
                                                </div>
                                                {invoice.paymentTxIds && invoice.paymentTxIds.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Payment Tx IDs</div>
                                                        <div className="space-y-2">{invoice.paymentTxIds.map((txId, i) => <HashRow key={txId} value={txId} copied={copiedId === `ptx-${i}-${invoice.invoiceHash}`} onCopy={() => handleCopy(txId, `ptx-${i}-${invoice.invoiceHash}`)} explorerUrl={`https://testnet.explorer.provable.com/transaction/${txId}`} />)}</div>
                                                    </div>
                                                )}
                                                {invoice.relatedReceiptHashes && invoice.relatedReceiptHashes.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Receipt Hashes</div>
                                                        <div className="space-y-2">{invoice.relatedReceiptHashes.map((hash, i) => <HashRow key={hash} value={hash} copied={copiedId === `rh-${i}-${invoice.invoiceHash}`} onCopy={() => handleCopy(hash, `rh-${i}-${invoice.invoiceHash}`)} />)}</div>
                                                    </div>
                                                )}
                                                {state.payload.disclosure.includeLineItems && invoice.items && invoice.items.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Line Items</div>
                                                        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                                                            <div className="grid grid-cols-4 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/25"><span>Item</span><span>Qty</span><span>Unit Price</span><span>Total</span></div>
                                                            {invoice.items.map((item, idx) => (
                                                                <div key={idx} className="grid grid-cols-4 border-b border-white/[0.03] px-4 py-2.5 text-sm last:border-0">
                                                                    <span className="text-white/70">{item.name || 'Unnamed'}</span><span className="text-white/50">{item.quantity}</span><span className="text-white/50">{item.unitPrice.toFixed(2)}</span><span className="text-white/70">{item.total.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ResultPanel>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <style>{`@keyframes shimmer{to{transform:translateX(200%)}}.animate-shimmer{animation:shimmer 1.6s infinite}`}</style>
        </div>
    );
};

const DropZone = ({ step, title, subtitle, accept, fileName, fileLoaded, isDragOver, onDragOver, onDragLeave, onDrop, onFileChange, icon, placeholderLabel, children }: any) => (
    <div className={`rounded-2xl border transition-all duration-200 ${isDragOver ? 'border-orange-400/40 bg-orange-500/[0.06]' : fileLoaded ? 'border-orange-400/30 bg-white/[0.08]' : 'border-white/[0.12] bg-white/[0.04]'}`} onDragOver={e => { e.preventDefault(); onDragOver(); }} onDragLeave={onDragLeave} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }}>
        <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
            <div>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold tracking-[0.25em] text-orange-400/60">STEP {step}</span><span className="h-px w-4 bg-white/20" />{fileLoaded && <span className="text-[10px] text-emerald-400/70">● Loaded</span>}</div>
                <h3 className="mt-1 text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
                <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
            </div>
            <label className="cursor-pointer rounded-lg border border-white/[0.12] bg-white/10 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-orange-400/40 hover:text-orange-300">
                <input type="file" accept={accept} className="hidden" onChange={onFileChange} />{fileName || 'Browse'}
            </label>
        </div>
        {!fileLoaded && (
            <label className="group flex cursor-pointer flex-col items-center gap-2 border-b border-white/[0.1] py-6 transition hover:bg-white/[0.04]">
                <input type="file" accept={accept} className="hidden" onChange={onFileChange} />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10 text-orange-300/80 transition group-hover:border-orange-400/40">{icon}</div>
                <span className="text-xs text-white/40">Drag & drop or click · {placeholderLabel}</span>
            </label>
        )}
        {children}
    </div>
);

const ResultPanel = ({ title, subtitle, children }: any) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-6 shadow-xl">
        <div className="mb-5 border-b border-white/[0.08] pb-4"><h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>{subtitle && <p className="mt-1 text-xs text-white/50">{subtitle}</p>}</div>
        {children}
    </motion.div>
);

const InfoField = ({ label, value, mono = false, copyId, copiedId, onCopy, span2 = false, explorerUrl }: any) => (
    <div className={`rounded-xl border border-white/[0.1] bg-white/[0.04] p-3 ${span2 ? 'sm:col-span-2' : ''}`}>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</div>
        <div className={`mt-1.5 break-all text-sm text-white/90 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</div>
        {(onCopy || explorerUrl) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
                {onCopy && <MiniButton onClick={onCopy}>{copiedId === copyId ? '✓ Copied' : 'Copy'}</MiniButton>}
                {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer" className="rounded-md border border-white/[0.15] bg-white/10 px-2 py-0.5 text-[10px] text-white/60 transition hover:text-orange-300">Explorer ↗</a>}
            </div>
        )}
    </div>
);

const HashCell = ({ hash, copied, onCopy }: any) => (
    <div><div className="font-mono text-[11px] text-orange-200/70">{shortHash(hash, 10, 8)}</div><MiniButton onClick={onCopy} className="mt-1.5">{copied ? '✓' : 'Copy'}</MiniButton></div>
);

const HashRow = ({ value, copied, onCopy, explorerUrl }: any) => (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5">
        <span className="font-mono text-[11px] text-white/60 break-all">{value}</span>
        <div className="ml-3 flex flex-shrink-0 gap-1.5">
            <MiniButton onClick={onCopy}>{copied ? '✓' : 'Copy'}</MiniButton>
            {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer" className="rounded-md border border-white/[0.12] px-2 py-0.5 text-[10px] text-white/50 hover:text-orange-300">↗</a>}
        </div>
    </div>
);

const ReceiptTable = ({ receipts, copiedId, onCopy, showMerchant }: any) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-white/[0.1] text-[10px] uppercase tracking-[0.2em] text-white/40">
                <th className="pb-3 pr-6 font-bold">Invoice</th><th className="pb-3 pr-6 font-bold">Receipt Hash</th>
                {showMerchant && <th className="pb-3 pr-6 font-bold">Merchant</th>}
                <th className="pb-3 pr-6 font-bold">Token</th><th className="pb-3 font-bold">Amount</th>
            </tr></thead>
            <tbody>{receipts.map((r: any) => (
                <tr key={r.receiptHash} className="border-b border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                    <td className="py-3 pr-6"><HashCell hash={r.invoiceHash} copied={copiedId === `ri-${r.receiptHash}`} onCopy={() => onCopy(r.invoiceHash, `ri-${r.receiptHash}`)} /></td>
                    <td className="py-3 pr-6"><HashCell hash={r.receiptHash} copied={copiedId === `rh-${r.receiptHash}`} onCopy={() => onCopy(r.receiptHash, `rh-${r.receiptHash}`)} /></td>
                    {showMerchant && <td className="py-3 pr-6"><HashCell hash={r.merchant} copied={copiedId === `rm-${r.receiptHash}`} onCopy={() => onCopy(r.merchant, `rm-${r.receiptHash}`)} /></td>}
                    <td className="py-3 pr-6 text-white/50">{r.tokenLabel}</td>
                    <td className="py-3 font-semibold text-white/80">{r.amountLabel}</td>
                </tr>
            ))}</tbody>
        </table>
    </div>
);

const ContentStat = ({ label, value }: any) => (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3">
        <span className="text-xs text-white/50">{label}</span><span className="text-lg font-bold text-white">{value}</span>
    </div>
);



const StatusBadge = ({ status }: any) => (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status === 'paid' ? 'bg-emerald-400/10 text-emerald-400' : status === 'pending' ? 'bg-amber-400/10 text-amber-400' : 'bg-white/[0.06] text-white/40'}`}>{status}</span>
);

const Chip = ({ label, color }: any) => (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${color === 'emerald' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-orange-400/10 text-orange-400'}`}>{label}</span>
);

const MiniButton = ({ onClick, children, className = '' }: any) => (
    <button type="button" onClick={onClick} className={`rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40 transition hover:border-orange-400/30 hover:text-orange-300/70 ${className}`}>{children}</button>
);

const SpinnerIcon = () => (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
);

const JsonIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 12l-2 2 2 2M15 12l2 2-2 2" /></svg>
);

const KeyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l3 3" /></svg>
);

function shortHash(value: string, left = 10, right = 8): string {
    if (!value) return '—';
    if (value.length <= left + right + 3) return value;
    return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export default AuditVerifyPage;