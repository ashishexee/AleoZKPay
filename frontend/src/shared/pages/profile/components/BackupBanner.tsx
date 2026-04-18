import React from 'react';
import { motion } from 'framer-motion';
import { useBurnerActions } from '../../../hooks/profile/useBurnerActions';
import ConfirmModal from '../../../components/modals/ConfirmModal';

export const BackupBanner: React.FC = () => {
    const a = useBurnerActions();

    if (a.hasOnChainRecord || a.fetchedFromChain || !a.address || a.burnerAddress) {
        return null; 
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-100">Backup your Password On-Chain</h3>
                    <p className="text-xs text-blue-200/70 mt-0.5">
                        Ensure you never lose access to your platform data or burner wallet. Backing up securely stores your encrypted password on the Aleo blockchain.
                    </p>
                </div>
            </div>
            
            <button 
                onClick={() => { a.setShowBackupModal(true); }}
                disabled={a.isBackingUp}
                className="px-5 py-2 whitespace-nowrap bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all text-sm shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
                {a.isBackingUp ? 'Backing up...' : 'Backup Now'}
            </button>

            <ConfirmModal
                open={a.showBackupModal}
                title="Backup Password On-Chain"
                description={"This will save an encrypted backup of your password on the Aleo blockchain. A network fee will be applied. Continue?"}
                confirmLabel="Backup"
                cancelLabel="Cancel"
                loading={a.isBackingUp}
                onConfirm={() => { a.handleBackupRecord(); }}
                onClose={() => a.setShowBackupModal(false)}
            />
        </motion.div>
    );
};
