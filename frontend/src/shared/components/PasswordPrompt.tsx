import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from './ui/GlassCard';
import { useBurnerWallet } from '../hooks/wallet/BurnerWalletProvider';
import { encryptWithPassword, decryptWithPassword } from '../utils/crypto';
import { getUtf8ByteLength, LEO_PASSWORD_BACKUP_MAX_BYTES } from '../utils/leo-input-limits';
import { updateUserProfile } from '../services/api';

export const PasswordPrompt: React.FC = () => {
    const { address } = useWallet();
    const { hasProfile, userProfileMainAddress, setAppPassword, setIsUnlocked, refreshProfile } = useBurnerWallet();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isNewUser = hasProfile === false; // null means loading, false means definitely no profile
    const needsPasswordUpgrade = Boolean(hasProfile && !userProfileMainAddress);
    const isCreatingPassword = isNewUser || needsPasswordUpgrade;
    const passwordBytes = getUtf8ByteLength(password);
    const passwordTooLong = isCreatingPassword && passwordBytes > LEO_PASSWORD_BACKUP_MAX_BYTES;
    const passwordReason = isCreatingPassword
        ? 'We use your password to derive a client-side encryption key for your private platform data before it is stored.'
        : 'We ask for your password to decrypt your already-encrypted private platform data locally in this browser.';
    const details = isCreatingPassword
        ? [
            'Your password never acts as a wallet seed or private key. It is only used to locally encrypt private app data in your browser.',
            'NullPay uses that encrypted layer to protect things like your private platform profile, burner wallet data, and card metadata before storing them.',
            'Without the password, the stored data stays unreadable, which helps protect you if someone only gets database access.',
            `For on-chain password backup compatibility, setup passwords should stay within ${LEO_PASSWORD_BACKUP_MAX_BYTES} bytes.`
        ]
        : [
            'Your private app data was already encrypted earlier with your password, so we need it again to unlock that data locally in this browser.',
            'This unlock step lets NullPay restore protected items like burner wallet details, encrypted profile data, and card-related private metadata.',
            'The password is not used to sign blockchain transactions by itself. It is there to open your encrypted app layer.'
        ];

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
            if (passwordTooLong) {
                toast.error(`Password is too large for the Leo backup field. Keep it within ${LEO_PASSWORD_BACKUP_MAX_BYTES} bytes.`);
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
            <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
                <div className="fixed inset-0 pointer-events-none opacity-70">
                    <img
                        src="/assets/aleo_globe.png"
                        alt="Aleo Globe"
                        className="h-full w-full object-cover mix-blend-screen"
                        style={{
                            maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)'
                        }}
                    />
                </div>
                <div className="relative z-10 w-10 h-10 rounded-full border-2 border-orange-400/20 border-t-orange-400 animate-spin" />
            </div>
        );
    }

    // Edge case handling for old users without a password
    if (needsPasswordUpgrade) {
        return (
            <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-10">
                <div className="fixed inset-0 pointer-events-none opacity-70">
                    <img
                        src="/assets/aleo_globe.png"
                        alt="Aleo Globe"
                        className="h-full w-full object-cover mix-blend-screen"
                        style={{
                            maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)'
                        }}
                    />
                </div>
                <div className="fixed top-[10%] left-[10%] h-40 w-40 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />
                <div className="fixed bottom-[5%] right-[12%] h-36 w-36 rounded-full bg-amber-400/10 blur-[100px] pointer-events-none" />
                <div className="relative z-10 w-full max-w-md space-y-5">
                    <GlassCard className="w-full border border-orange-400/15 bg-[#080808]/85 p-8 text-center shadow-[0_0_60px_rgba(249,115,22,0.08)]">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/10 text-orange-300">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-orange-300/80">Security Upgrade</p>
                        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">
                            Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-500">Required</span>
                        </h2>
                        <p className="mb-6 text-sm leading-relaxed text-white/60">
                            Your account is from an older version of NullPay and now needs a password to protect private app data.
                        </p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!address || password.length < 6) {
                                toast.error("Password must be at least 6 characters");
                                return;
                            }
                            if (passwordTooLong) {
                                toast.error(`Password is too large for the Leo backup field. Keep it within ${LEO_PASSWORD_BACKUP_MAX_BYTES} bytes.`);
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
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="New Secure Password"
                                    className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 pr-12 text-center text-white outline-none transition-colors focus:border-orange-400/50 ${passwordTooLong ? 'border-red-500/60' : 'border-white/10'}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/45 transition-colors hover:text-orange-300"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className={`text-left text-xs leading-relaxed ${passwordTooLong ? 'text-red-400' : 'text-white/55'}`}>
                                Setup passwords should fit one Leo backup field: {passwordBytes}/{LEO_PASSWORD_BACKUP_MAX_BYTES} bytes. Regular letters usually count as 1 byte.
                            </p>
                            <button
                                type="submit"
                                disabled={loading || passwordTooLong}
                                className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 py-3 font-bold text-black shadow-[0_10px_35px_rgba(249,115,22,0.22)] transition-all hover:brightness-110 disabled:opacity-50"
                            >
                                {loading ? 'Securing...' : 'Set Password'}
                            </button>
                        </form>
                    </GlassCard>

                    <div className="rounded-3xl border border-orange-400/12 bg-[#080808]/72 px-5 py-5 backdrop-blur-sm">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Why This Matters</div>
                        <p className="mb-3 text-sm leading-relaxed text-white/70">{passwordReason}</p>
                        <div className="space-y-2.5">
                            {details.map((detail) => (
                                <div key={detail} className="flex items-start gap-3 text-sm leading-relaxed text-white/55">
                                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-300" />
                                    <p>{detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-10">
            <div className="fixed inset-0 pointer-events-none opacity-70">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="h-full w-full object-cover mix-blend-screen"
                    style={{
                        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>
            <div className="fixed top-[12%] left-[10%] h-40 w-40 rounded-full bg-orange-500/10 blur-[110px] pointer-events-none" />
            <div className="fixed bottom-[4%] right-[10%] h-36 w-36 rounded-full bg-amber-400/10 blur-[100px] pointer-events-none" />
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 w-full max-w-md space-y-5"
                >
                    <GlassCard className="border border-orange-400/15 bg-[#080808]/88 p-8 shadow-[0_0_60px_rgba(249,115,22,0.08)]">
                        <div className="text-center mb-8">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/10">
                                <svg className="w-8 h-8 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-orange-300/80">Privacy Unlock</p>
                            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                                {isNewUser ? 'Create Password' : 'Enter Password'}
                            </h2>
                            <p className="text-sm text-white/60">
                                {isNewUser
                                    ? <>Set up a secure password to encrypt your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-500">private platform data</span>.</>
                                    : <>Unlock your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-500">private platform data</span> to continue.</>}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 pr-12 text-white outline-none transition-colors focus:border-orange-400/50 ${passwordTooLong ? 'border-red-500/60' : 'border-white/10'}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/45 transition-colors hover:text-orange-300"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {isNewUser && (
                                <p className={`-mt-1 text-xs leading-relaxed ${passwordTooLong ? 'text-red-400' : 'text-white/55'}`}>
                                    Setup passwords should fit one Leo backup field: {passwordBytes}/{LEO_PASSWORD_BACKUP_MAX_BYTES} bytes. Regular letters usually count as 1 byte.
                                </p>
                            )}

                            {isNewUser && (
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-white outline-none transition-colors focus:border-orange-400/50"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/45 transition-colors hover:text-orange-300"
                                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !password || (isNewUser && !confirmPassword) || passwordTooLong}
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 py-3 font-bold text-black shadow-[0_10px_35px_rgba(249,115,22,0.22)] transition-all hover:brightness-110 disabled:opacity-50"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                                {isNewUser ? 'Secure Account' : 'Unlock Access'}
                            </button>
                        </form>
                    </GlassCard>

                    <div className="rounded-3xl border border-orange-400/12 bg-[#080808]/72 px-5 py-5 backdrop-blur-sm">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Why We Ask</div>
                        <p className="mb-3 text-sm leading-relaxed text-white/72">{passwordReason}</p>
                        <div className="space-y-2.5">
                            {details.map((detail) => (
                                <div key={detail} className="flex items-start gap-3 text-sm leading-relaxed text-white/55">
                                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-300" />
                                    <p>{detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
