import React from 'react';
import { motion } from 'framer-motion';

type Props = {
    open: boolean;
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
};

export const ConfirmModal: React.FC<Props> = ({ open, title, description, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onClose, loading }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                role="dialog"
                aria-modal="true"
            >
                {title && <h3 className="text-lg font-bold text-white mb-2">{title}</h3>}
                <p className="text-sm text-gray-300 mb-6">{description}</p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/8 text-sm"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm shadow-lg disabled:opacity-60"
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmModal;
