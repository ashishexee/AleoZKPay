import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface BackupModalProps {
    error: string | null;
    isBackingUp: boolean;
    backupSuccess: string;
    backupTxId: string | null;
    password: string;
    setPassword: (v: string) => void;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
    error, isBackingUp, backupSuccess, backupTxId, password, setPassword, showPassword, setShowPassword, onSubmit, onClose,
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <form onSubmit={onSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Backup</h3>
            <p className="text-sm text-gray-400 mb-6">Enter your password to securely backup your Burner Wallet credentials on-chain.</p>

            {error && (
                <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">{error}</div>
            )}

            {backupSuccess ? (
                <div className="mb-6 flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-green-400 font-bold mb-2 text-center text-sm">{backupSuccess}</p>
                    {backupTxId && (
                        <a href={`https://testnet.explorer.provable.com/transaction/${backupTxId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 font-mono bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors flex items-center gap-1.5">
                            View on Explorer
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}
                </div>
            ) : (
                <div className="relative mb-6">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-primary pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            )}

            <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">
                    {backupSuccess ? 'Close' : 'Cancel'}
                </button>
                {!backupSuccess && (
                    <button type="submit" disabled={isBackingUp || !password}
                        className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                        {isBackingUp ? 'Backing up...' : 'Confirm Backup'}
                    </button>
                )}
            </div>
        </form>
    </div>
);
