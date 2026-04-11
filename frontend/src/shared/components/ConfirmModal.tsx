import React from 'react';
import { motion } from 'framer-motion';

type Props = {
    open: boolean;
    title?: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
    tone?: 'default' | 'danger';
};

export const ConfirmModal: React.FC<Props> = ({ open, title, description, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onClose, loading, tone = 'default' }) => {
    if (!open) return null;

    const isDanger = tone === 'danger';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative w-full max-w-md mx-4 overflow-hidden rounded-3xl border p-6 shadow-2xl ${isDanger
                    ? 'bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_34%),linear-gradient(145deg,rgba(17,17,17,0.98),rgba(8,8,8,0.98))] border-red-500/20'
                    : 'bg-gray-900 border-white/10'
                    }`}
                role="dialog"
                aria-modal="true"
            >
                {isDanger && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />}
                {title && <h3 className="text-lg font-bold text-white mb-2">{title}</h3>}
                <div className="text-sm text-gray-300 mb-6">{description}</div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm border border-white/10"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-white font-semibold text-sm shadow-lg disabled:opacity-60 ${isDanger
                            ? 'bg-gradient-to-r from-red-500 to-orange-500'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmModal;
