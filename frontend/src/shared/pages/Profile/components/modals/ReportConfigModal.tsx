import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ReportOptions } from '../../../../types/receipt';

export interface GeneratedAuditAssets {
    html: string;
    htmlFilename: string;
    packageJson: string;
    packageFilename: string;
    auditKey: string;
    auditKeyFilename: string;
}

interface ReportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportType: 'audit' | 'credit';
    onDownload: (options: ReportOptions) => Promise<GeneratedAuditAssets | void> | GeneratedAuditAssets | void;
}

const DEFAULT_OPTIONS: Omit<ReportOptions, 'filename'> = {
    includeMerchantAddress: true,
    includeBurnerAddress: true,
    includeMemo: true,
    includeLineItems: true,
    includeBalanceSnapshot: true,
    includeIncomingReceipts: true,
    includeOutgoingReceipts: true,
    includeInvoiceAppendices: true,
    auditPerspective: 'both',
};

function triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export const ReportConfigModal: React.FC<ReportConfigModalProps> = ({
    isOpen,
    onClose,
    reportType,
    onDownload
}) => {
    const [filename, setFilename] = useState('');
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [savePreferences, setSavePreferences] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAudit, setGeneratedAudit] = useState<GeneratedAuditAssets | null>(null);
    const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        if (!isOpen) return;
        setFilename('');
        setGeneratedAudit(null);
        setCopyState('idle');
        setIsGenerating(false);
        const saved = localStorage.getItem(`nullpay_report_prefs_${reportType}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setOptions((prev) => ({ ...prev, ...parsed }));
            } catch (error) {
                console.error('Failed to parse report preferences', error);
            }
        }
    }, [isOpen, reportType]);

    if (!isOpen) return null;

    const isAudit = reportType === 'audit';
    const bgGradientClass = 'from-orange-500/5 to-amber-500/5';
    const btnClass = 'bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]';
    const ringClass = 'focus:border-orange-500/50 focus:ring-orange-500/30';
    const saveToggleClass = 'bg-orange-500/20 border-orange-500 text-orange-400';

    const finalFilename = filename.trim() ? (filename.endsWith('.html') ? filename : `${filename}.html`) : undefined;

    const handleGenerate = async () => {
        if (savePreferences) {
            localStorage.setItem(`nullpay_report_prefs_${reportType}`, JSON.stringify(options));
        }

        setIsGenerating(true);
        try {
            const result = await onDownload({
                ...options,
                filename: finalFilename
            });

            if (isAudit && result) {
                setGeneratedAudit(result);
                return;
            }

            onClose();
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleOption = (key: keyof typeof DEFAULT_OPTIONS) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const copyAuditKey = async () => {
        if (!generatedAudit) return;
        await navigator.clipboard.writeText(generatedAudit.auditKey);
        setCopyState('copied');
        window.setTimeout(() => setCopyState('idle'), 1400);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 pb-4 pt-28 sm:pt-32">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative mx-auto w-full max-w-5xl max-h-[calc(100vh-8rem)] overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientClass} pointer-events-none`} />

                <div className="relative z-10">
                    {!generatedAudit ? (
                        <>
                            <h2 className="text-2xl font-bold mb-2 text-white">
                                Configure {reportType === 'audit' ? 'Audit' : 'Credit'} Report
                            </h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Customize the fields and details you want to include in the exported {reportType === 'audit' ? 'audit bundle and HTML report' : 'HTML report'}.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Filename (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder={`NullPay_${reportType === 'audit' ? 'Audit' : 'Credit'}_Report_...`}
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${ringClass}`}
                                    />
                                </div>

                                {isAudit && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Audit Perspective</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <RoleOption label="Merchant" desc="Earnings review" active={options.auditPerspective === 'merchant'} onClick={() => setOptions(prev => ({ ...prev, auditPerspective: 'merchant' }))} />
                                                <RoleOption label="Payer" desc="Outgoing receipts" active={options.auditPerspective === 'payer'} onClick={() => setOptions(prev => ({ ...prev, auditPerspective: 'payer' }))} />
                                                <RoleOption label="Both" desc="Full evidence" active={options.auditPerspective === 'both'} onClick={() => setOptions(prev => ({ ...prev, auditPerspective: 'both' }))} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Include Sections</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <ToggleField label="Main Address" checked={!!options.includeMerchantAddress} onChange={() => toggleOption('includeMerchantAddress')} />
                                                <ToggleField label="Burner Address" checked={!!options.includeBurnerAddress} onChange={() => toggleOption('includeBurnerAddress')} />
                                                <ToggleField label="Invoice Memos" checked={!!options.includeMemo} onChange={() => toggleOption('includeMemo')} />
                                                <ToggleField label="Invoice Line Items" checked={!!options.includeLineItems} onChange={() => toggleOption('includeLineItems')} />
                                                <ToggleField label="Balance Snapshot" checked={!!options.includeBalanceSnapshot} onChange={() => toggleOption('includeBalanceSnapshot')} />
                                                <ToggleField label="Incoming Receipts" checked={!!options.includeIncomingReceipts} onChange={() => toggleOption('includeIncomingReceipts')} />
                                                <ToggleField label="Outgoing Receipts" checked={!!options.includeOutgoingReceipts} onChange={() => toggleOption('includeOutgoingReceipts')} />
                                                <ToggleField label="Invoice Appendices" checked={!!options.includeInvoiceAppendices} onChange={() => toggleOption('includeInvoiceAppendices')} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isAudit && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ToggleField label="Invoice Memos" checked={!!options.includeMemo} onChange={() => toggleOption('includeMemo')} />
                                        <ToggleField label="Invoice Line Items" checked={!!options.includeLineItems} onChange={() => toggleOption('includeLineItems')} />
                                        <ToggleField label="Incoming Receipts" checked={!!options.includeIncomingReceipts} onChange={() => toggleOption('includeIncomingReceipts')} />
                                        <ToggleField label="Outgoing Receipts" checked={!!options.includeOutgoingReceipts} onChange={() => toggleOption('includeOutgoingReceipts')} />
                                    </div>
                                )}

                                <div className="mt-4 flex items-center">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={savePreferences}
                                            onChange={(e) => setSavePreferences(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mr-3 ${savePreferences ? saveToggleClass : 'border-white/20'}`}>
                                            {savePreferences && (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-300 pointer-events-none">Save preferences for next time</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
                                >
                                    {isGenerating ? 'Waiting For Signature...' : 'Generate Report'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold mb-2 text-white">Audit Bundle Ready</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                The wallet signature is complete. Download the report assets below or copy the audit key now.
                            </p>

                            <div className="space-y-4">
                                <ActionRow
                                    title="Download the HTML report here"
                                    description={generatedAudit.htmlFilename}
                                    actionLabel="Download HTML"
                                    onAction={() => triggerDownload(generatedAudit.html, generatedAudit.htmlFilename, 'text/html;charset=utf-8')}
                                />
                                <ActionRow
                                    title="Download the encrypted JSON"
                                    description={generatedAudit.packageFilename}
                                    actionLabel="Download JSON"
                                    onAction={() => triggerDownload(generatedAudit.packageJson, generatedAudit.packageFilename, 'application/json;charset=utf-8')}
                                />
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-sm font-semibold text-white">Copy this audit key or download it</div>
                                    <div className="mt-2 break-all rounded-xl bg-black/40 px-3 py-3 font-mono text-xs text-cyan-100">
                                        {generatedAudit.auditKey}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={copyAuditKey}
                                            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                                        >
                                            {copyState === 'copied' ? 'Copied' : 'Copy Audit Key'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => triggerDownload(`${generatedAudit.auditKey}\n`, generatedAudit.auditKeyFilename, 'text/plain;charset=utf-8')}
                                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                        >
                                            Download Audit Key
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => setGeneratedAudit(null)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={onClose}
                                    className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all ${btnClass}`}
                                >
                                    Done
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const ToggleField: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
        <span className="text-xs text-gray-200">{label}</span>
        <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-700'}`}>
            <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0'}`} />
        </div>
        <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
    </label>
);

const RoleOption: React.FC<{ label: string; desc: string; active: boolean; onClick: () => void }> = ({ label, desc, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-orange-400/50 bg-orange-500/15 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
    >
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-1 text-xs leading-5 text-gray-400">{desc}</div>
    </button>
);

const ActionRow: React.FC<{ title: string; description: string; actionLabel: string; onAction: () => void }> = ({ title, description, actionLabel, onAction }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs text-gray-500">{description}</div>
        <button
            type="button"
            onClick={onAction}
            className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
            {actionLabel}
        </button>
    </div>
);
