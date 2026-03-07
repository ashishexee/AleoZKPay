import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';

interface BurnerWalletSettingsProps {
    itemVariants: any;
    transactions: any[];
}

export const BurnerWalletSettings: React.FC<BurnerWalletSettingsProps> = ({ itemVariants }) => {
    const { address } = useWallet();
    const { burnerAddress, encryptedBurnerKey, decryptedBurnerKey, setDecryptedBurnerKey, refreshProfile } = useBurnerWallet();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateBurner = async () => {
        if (!address) { setError("Wallet not connected."); return; }
        try {
            setIsGenerating(true);
            setError(null);
            const newPrivateKey = new PrivateKey();
            const newAddress = newPrivateKey.to_address().to_string();
            const rawPrivateKeyStr = newPrivateKey.to_string();
            const encryptedKey = btoa(rawPrivateKeyStr);
            const { updateUserProfile } = await import('../../services/api');
            await updateUserProfile(address, newAddress, encryptedKey);
            setDecryptedBurnerKey(rawPrivateKeyStr);
            await refreshProfile();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to generate Burner Wallet.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnlockBurner = async () => {
        if (!encryptedBurnerKey) return;
        try {
            setIsDecrypting(true);
            setError(null);
            const decryptedKey = atob(encryptedBurnerKey);
            try {
                PrivateKey.from_string(decryptedKey);
            } catch (e) {
                throw new Error("Decoded key is invalid. The stored key may be corrupted.");
            }
            setDecryptedBurnerKey(decryptedKey);
        } catch (err: any) {
            console.error("Unlock failed", err);
            setError(err.message || "Failed to unlock Burner Wallet key.");
        } finally {
            setIsDecrypting(false);
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
        <GlassCard variants={itemVariants} className="p-5 mb-8 border border-neon-primary/20 bg-neon-primary/5">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Privacy Burner Wallet
            </h2>
            <p className="text-gray-500 text-xs mb-4">
                Receive payments privately via an ephemeral wallet. Your true address stays hidden from payers.
            </p>

            {error && (
                <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                    {error}
                </div>
            )}

            {!burnerAddress ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/20 rounded-xl bg-black/20 text-center">
                    <h3 className="text-sm font-semibold text-white mb-1">No Burner Wallet Found</h3>
                    <p className="text-xs text-gray-400 mb-4 max-w-sm">
                        Generate one to enable enhanced privacy for your invoices.
                    </p>
                    <button
                        onClick={handleGenerateBurner}
                        disabled={isGenerating}
                        className="px-5 py-1.5 bg-gradient-to-r from-neon-primary to-neon-accent hover:opacity-90 text-black font-bold rounded-lg transition-all disabled:opacity-50 text-sm"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Burner Wallet'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Address + Status Row */}
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

                    {/* Action Row */}
                    {!decryptedBurnerKey ? (
                        <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-xl flex items-center justify-between gap-3">
                            <p className="text-xs text-orange-200/80">Unlock to export your burner key.</p>
                            <button
                                onClick={handleUnlockBurner}
                                disabled={isDecrypting}
                                className="px-4 py-1.5 shrink-0 bg-transparent border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 font-bold rounded-lg transition-all text-xs disabled:opacity-50"
                            >
                                {isDecrypting ? 'Decrypting...' : 'Unlock'}
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 border border-neon-primary/20 bg-neon-primary/5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-gray-400">
                                Copy your burner private key and import it into <strong className="text-white">Shield Wallet</strong> to manage & transfer your private tokens to your main wallet.
                            </p>
                            <button
                                onClick={handleCopyKey}
                                className="px-4 py-1.5 shrink-0 bg-neon-primary hover:bg-neon-accent text-black font-bold rounded-lg transition-all text-xs shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:scale-105"
                            >
                                {copied ? '✓ Copied!' : 'Copy Private Key'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </GlassCard>
    );
};
