import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import toast from 'react-hot-toast';
import { GlassCard } from './ui/GlassCard';
import { useBurnerWallet } from '../hooks/BurnerWalletProvider';
import { encryptWithPassword, decryptWithPassword } from '../utils/crypto';
import { updateUserProfile } from '../services/api';

export const PasswordPrompt: React.FC = () => {
    const { address } = useWallet();
    const { hasProfile, userProfileMainAddress, setAppPassword, setIsUnlocked, refreshProfile } = useBurnerWallet();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const isNewUser = hasProfile === false; // null means loading, false means definitely no profile

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;

        if (isNewUser) {
            if (password !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }
            if (password.length < 6) {
                toast.error("Password must be at least 6 characters");
                return;
            }

            setLoading(true);
            try {
                const encryptedCheck = await encryptWithPassword(address, password);
                await updateUserProfile(
                    address,
                    encryptedCheck
                );
                
                setAppPassword(password);
                setIsUnlocked(true);
                toast.success('Password set successfully!');
                await refreshProfile();
            } catch (err: any) {
                toast.error(err.message || "Failed to create password");
            } finally {
                setLoading(false);
            }
        } else {
            // Existing user, verify password
            if (!password) {
                toast.error("Please enter your password");
                return;
            }
            if (!userProfileMainAddress) {
                // If they have a profile but no password set (e.g. older account),
                // we should allow them to set one now.
                toast.error("Account needs a password setup. Please contact support or clear profile data.");
                return;
            }

            setLoading(true);
            try {
                const decryptedAddress = await decryptWithPassword(userProfileMainAddress, password);
                if (decryptedAddress === address) {
                    setAppPassword(password);
                    setIsUnlocked(true);
                    toast.success('Successfully unlocked!');
                } else {
                    toast.error('Incorrect password');
                }
            } catch (err) {
                toast.error('Incorrect password');
            } finally {
                setLoading(false);
            }
        }
    };

    if (hasProfile === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-neon-primary/30 border-t-neon-primary rounded-full animate-spin" />
            </div>
        );
    }

    // Edge case handling for old users without a password
    if (hasProfile && !userProfileMainAddress) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <GlassCard className="max-w-md w-full p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Update Required</h2>
                    <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                        Your account is from an older version of the platform and requires a secure password setup.
                        Please set a password below to secure your identity.
                    </p>
                    <form onSubmit={async (e) => {
                         e.preventDefault();
                         if (!address || password.length < 6) {
                             toast.error("Password must be at least 6 characters");
                             return;
                         }
                         setLoading(true);
                         try {
                              const encryptedCheck = await encryptWithPassword(address, password);
                              await updateUserProfile(address, encryptedCheck);
                              setAppPassword(password);
                              setIsUnlocked(true);
                              toast.success('Password updated successfully!');
                              await refreshProfile();
                         } catch (err: any) {
                              toast.error(err.message || "Failed to update profile");
                         } finally {
                              setLoading(false);
                         }
                    }} className="flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="New Secure Password"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-primary transition-colors text-center"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Securing...' : 'Set Password'}
                        </button>
                    </form>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <GlassCard className="p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <svg className="w-8 h-8 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isNewUser ? 'Create Password' : 'Enter Password'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {isNewUser 
                                    ? 'Setup a secure password to encrypt your private platform data.'
                                    : 'Unlock your private platform data to continue.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-primary transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />

                            {isNewUser && (
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-primary transition-colors"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            )}

                            <button
                                type="submit"
                                disabled={loading || !password || (isNewUser && !confirmPassword)}
                                className="w-full mt-2 py-3 rounded-lg bg-neon-primary text-black font-bold hover:bg-neon-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                                {isNewUser ? 'Secure Account' : 'Unlock Access'}
                            </button>
                        </form>
                    </GlassCard>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
