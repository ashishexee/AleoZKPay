import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PayerNotesModalProps {
    notes: string[] | null;
    onClose: () => void;
}

export const PayerNotesModal: React.FC<PayerNotesModalProps> = ({ notes, onClose }) => {
    return (
        <AnimatePresence>
            {notes && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Payer Notes</h3>
                                <p className="text-sm text-gray-400 mt-1">{notes.length} note{notes.length > 1 ? 's' : ''} attached to this invoice</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 py-6">
                            <div className="space-y-4 px-6">
                                {notes.map((note, idx) => (
                                    <div 
                                        key={idx}
                                        className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Note #{idx + 1}</span>
                                        </div>
                                        <p className="text-base text-gray-300 leading-relaxed italic">"{note}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-white/[0.02] border-t border-white/[0.05] flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-bold rounded-xl transition-all border border-white/5 active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
