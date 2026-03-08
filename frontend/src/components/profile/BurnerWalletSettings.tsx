import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import { Eye, EyeOff } from 'lucide-react';
import { encryptWithPassword, decryptWithPassword, stringToFieldChunks } from '../../utils/crypto';
import { PROGRAM_ID } from '../../utils/aleo-utils';

interface BurnerWalletSettingsProps {
    itemVariants: any;
    transactions: any[];
}

export const BurnerWalletSettings: React.FC<BurnerWalletSettingsProps> = ({ itemVariants }) => {
    const { address, executeTransaction } = useWallet();
    const { burnerAddress, encryptedBurnerKey, decryptedBurnerKey, setDecryptedBurnerKey, refreshProfile, fetchedFromChain, hasOnChainRecord, setHasOnChainRecord } = useBurnerWallet();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    const handleGenerateBurner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) { setError("Wallet not connected."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        
        try {
            setIsGenerating(true);
            setError(null);
            
            const newPrivateKey = new PrivateKey();
            const newAddress = newPrivateKey.to_address().to_string();
            const rawPrivateKeyStr = newPrivateKey.to_string();
            
            // Client-side encryption with user password
            const encryptedKeyPayload = await encryptWithPassword(rawPrivateKeyStr, password);
            
            // Sync with central DB
            const { updateUserProfile } = await import('../../services/api');
            await updateUserProfile(address, newAddress, encryptedKeyPayload);
            
            setDecryptedBurnerKey(rawPrivateKeyStr);
            await refreshProfile();
            setShowGenerateModal(false);
            setPassword('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to generate Burner Wallet.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnlockBurner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!encryptedBurnerKey) return;
        if (!password) { setError("Password required."); return; }

        try {
            setIsDecrypting(true);
            setError(null);
            
            // Client-side decryption using provided password
            const decryptedKey = await decryptWithPassword(encryptedBurnerKey, password);
            
            try {
                // Verify it's a valid key
                PrivateKey.from_string(decryptedKey);
            } catch (e) {
                throw new Error("Invalid decryption result. Please check your password.");
            }
            
            setDecryptedBurnerKey(decryptedKey);
            setShowUnlockModal(false);
            setPassword('');
        } catch (err: any) {
            console.error("Unlock failed", err);
            setError("Incorrect password or corrupted data.");
        } finally {
            setIsDecrypting(false);
        }
    };

    const handleBackupRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!decryptedBurnerKey || !burnerAddress || !password || !encryptedBurnerKey || !executeTransaction) {
            setError("Wallet must be unlocked and connected, and password must be entered.");
            return;
        }

        try {
            setIsBackingUp(true);
            setError(null);

            const passField = stringToFieldChunks(password, 1, 15)[0];
            const payloadFields = stringToFieldChunks(encryptedBurnerKey, 10, 15);
            
            const inputs = [
                burnerAddress, // burner_address
                passField,  // password_part
                ...payloadFields // pk_part_1 to pk_part_10
            ];
            
            const fee = 500_000;
            await executeTransaction({
                program: PROGRAM_ID,
                function: 'backup_burner_wallet',
                inputs: inputs,
                fee: fee
            });
            
            // Transaction submitted to wallet
            setShowBackupModal(false);
            setPassword('');
            setHasOnChainRecord(true);
        } catch (err: any) {
            console.error("Backup failed", err);
            setError(err.message || "Failed to trigger backup transaction.");
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleCopyKey = () => {
        if (!decryptedBurnerKey) return;
        navigator.clipboard.writeText(decryptedBurnerKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!address) return null;

    return (
        <>
        <GlassCard variants={itemVariants} className="p-5 mb-8 border border-neon-primary/20 bg-neon-primary/5">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Privacy Burner Wallet
            </h2>
            <p className="text-gray-500 text-xs mb-4">
                Receive payments privately via an ephemeral wallet. Your private key is encrypted client-side with your password.
            </p>

            {error && (
                <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">
                    {error}
                </div>
            )}

            {!burnerAddress ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/20 rounded-xl bg-black/20 text-center">
                    <h3 className="text-sm font-semibold text-white mb-1">No Burner Wallet Found</h3>
                    <p className="text-xs text-gray-400 mb-4 max-w-sm">
                        Generate one to enable enhanced privacy. Your key will be secured with a password only you know.
                    </p>
                    <button
                        onClick={() => { setError(null); setPassword(''); setShowGenerateModal(true); }}
                        className="px-5 py-1.5 bg-gradient-to-r from-neon-primary to-neon-accent hover:opacity-90 text-black font-bold rounded-lg transition-all text-sm"
                    >
                        Generate Burner Wallet
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                        <div className="flex-1 overflow-hidden">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Burner Address</label>
                            <div className="text-xs text-white font-mono truncate" title={burnerAddress}>
                                {burnerAddress}
                            </div>
                        </div>
                        <div className="shrink-0">
                            {decryptedBurnerKey ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                                    Unlocked
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold border border-orange-500/20">
                                    <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                                    Locked
                                </span>
                            )}
                        </div>
                    </div>

                    {!decryptedBurnerKey ? (
                        <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-xl flex items-center justify-between gap-3">
                            <p className="text-xs text-orange-200/80">Unlock with your password to view the private key.</p>
                            <button
                                onClick={() => { setError(null); setPassword(''); setShowUnlockModal(true); }}
                                className="px-4 py-1.5 shrink-0 bg-transparent border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 font-bold rounded-lg transition-all text-xs"
                            >
                                Unlock Key
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 border border-neon-primary/20 bg-neon-primary/5 rounded-xl flex flex-col gap-3">
                            {fetchedFromChain && (
                                <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                    <span className="text-blue-400 text-[11px] font-bold">Password and Private Key securely fetched from on-chain records.</span>
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                                <p className="text-xs text-gray-400">
                                    Copy your burner private key and import it into <strong className="text-white">Shield Wallet</strong>.
                                </p>
                                <div className="flex gap-2 shrink-0">
                                {!(fetchedFromChain || hasOnChainRecord) && (
                                    <button
                                        onClick={() => { setError(null); setPassword(''); setShowBackupModal(true); }}
                                        className="px-4 py-1.5 bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold rounded-lg transition-all text-xs"
                                    >
                                        Backup as Record (Optional)
                                    </button>
                                )}
                                <button
                                    onClick={handleCopyKey}
                                    className="px-4 py-1.5 bg-neon-primary hover:bg-neon-accent text-black font-bold rounded-lg transition-all text-xs shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:scale-105"
                                >
                                    {copied ? '✓ Copied!' : 'Copy Private Key'}
                                </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </GlassCard>

        {/* GENERATE MODAL */}
        {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <form onSubmit={handleGenerateBurner} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold text-white mb-2">Secure Burner Wallet</h3>
                        <p className="text-sm text-gray-400 mb-6">Create a password to encrypt your private key. NullPay cannot recover this password.</p>
                        
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? "text" : "password"}
                                autoFocus
                                placeholder="Encryption Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-primary pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isGenerating || password.length < 6} className="flex-1 py-3 bg-neon-primary text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                                {isGenerating ? 'Securing...' : 'Generate'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* UNLOCK MODAL */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <form onSubmit={handleUnlockBurner} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold text-white mb-2">Unlock Burner Key</h3>
                        <p className="text-sm text-gray-400 mb-6">Enter your password to decrypt and view your burner wallet private key.</p>
                        
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? "text" : "password"}
                                autoFocus
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-primary pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowUnlockModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isDecrypting || !password} className="flex-1 py-3 bg-orange-500 text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                                {isDecrypting ? 'Decrypting...' : 'Unlock'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* BACKUP MODAL */}
            {showBackupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <form onSubmit={handleBackupRecord} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold text-white mb-2">Confirm Backup</h3>
                        <p className="text-sm text-gray-400 mb-6">Enter your password to securely backup your Burner Wallet credentials on-chain.</p>
                        
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? "text" : "password"}
                                autoFocus
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-primary pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowBackupModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isBackingUp || !password} className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                                {isBackingUp ? 'Backing up...' : 'Confirm Backup'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};
