import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ReportOptions } from '../../../../utils/generateMerchantReportsPdf';

interface ReportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportType: 'audit' | 'credit';
    onDownload: (options: ReportOptions) => void;
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
};

export const ReportConfigModal: React.FC<ReportConfigModalProps> = ({
    isOpen,
    onClose,
    reportType,
    onDownload
}) => {
    const [filename, setFilename] = useState('');
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [savePreferences, setSavePreferences] = useState(true);

    useEffect(() => {
        if (isOpen) {
            // Reset filename on open
            setFilename('');
            // Load saved preferences if available
            const saved = localStorage.getItem(`nullpay_report_prefs_${reportType}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setOptions((prev) => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error('Failed to parse report preferences', e);
                }
            }
        }
    }, [isOpen, reportType]);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (savePreferences) {
            localStorage.setItem(`nullpay_report_prefs_${reportType}`, JSON.stringify(options));
        }
        
        onDownload({
            ...options,
            filename: filename.trim() ? (filename.endsWith('.html') ? filename : `${filename}.html`) : undefined
        });
        onClose();
    };

    const toggleOption = (key: keyof typeof DEFAULT_OPTIONS) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isAudit = reportType === 'audit';
    const bgGradientClass = 'from-orange-500/5 to-amber-500/5';
    const btnClass = 'bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]';
    const ringClass = 'focus:border-orange-500/50 focus:ring-orange-500/30';
    const saveToggleClass = 'bg-orange-500/20 border-orange-500 text-orange-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
            >
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientClass} pointer-events-none`} />

                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2 text-white">
                        Configure {reportType === 'audit' ? 'Audit' : 'Credit'} Report
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Customize the fields and details you want to include in the exported HTML report.
                    </p>

                    <div className="space-y-4">
                        {/* Filename */}
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

                        {/* Audit Field Toggles */}
                        {isAudit && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Include Sections</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
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
                        )}

                        {/* Credit Field Toggles */}
                        {!isAudit && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Include Sections</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    <ToggleField label="Invoice Memos" checked={!!options.includeMemo} onChange={() => toggleOption('includeMemo')} />
                                    <ToggleField label="Invoice Line Items" checked={!!options.includeLineItems} onChange={() => toggleOption('includeLineItems')} />
                                    <ToggleField label="Incoming Receipts" checked={!!options.includeIncomingReceipts} onChange={() => toggleOption('includeIncomingReceipts')} />
                                    <ToggleField label="Outgoing Receipts" checked={!!options.includeOutgoingReceipts} onChange={() => toggleOption('includeOutgoingReceipts')} />
                                </div>
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
                            onClick={handleDownload}
                            className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all ${btnClass}`}
                        >
                            Generate Report
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const ToggleField: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => {
    return (
        <label className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <span className="text-xs text-gray-200">{label}</span>
            <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-700'}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        </label>
    );
};
