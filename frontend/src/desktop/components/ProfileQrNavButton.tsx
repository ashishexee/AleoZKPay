import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { ArrowUpRight, Copy, LoaderCircle, Settings2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBurnerWallet } from '../../shared/hooks/BurnerWalletProvider';
import { useProfileQR } from '../../shared/hooks/useProfileQR';
import { FEE_PREFERENCE_EVENT, FIXED_FEE_MICROCREDITS, FeePreferenceMode, getFeePreferenceMode, setFeePreferenceMode } from '../../shared/utils/feePreference';

const ProfileQrNavButton = () => {
    const { address } = useWallet();
    const { burnerAddress } = useBurnerWallet();
    const { initialized, loading, status, mainHash, mainSalt, burnerHash, burnerSalt } = useProfileQR();
    const [walletMode, setWalletMode] = useState<'main' | 'burner'>('main');
    const [feeMode, setFeeMode] = useState<FeePreferenceMode>(() => getFeePreferenceMode());
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const settingsCloseTimeoutRef = useRef<number | null>(null);

    const hasBurnerWallet = !!burnerAddress;

    useEffect(() => {
        if (!hasBurnerWallet && walletMode === 'burner') {
            setWalletMode('main');
        }
    }, [hasBurnerWallet, walletMode]);

    useEffect(() => {
        const syncFeeMode = () => setFeeMode(getFeePreferenceMode());
        const handleCustomEvent = (event: Event) => {
            const customEvent = event as CustomEvent<FeePreferenceMode>;
            if (customEvent.detail === 'estimate' || customEvent.detail === 'fixed') {
                setFeeMode(customEvent.detail);
                return;
            }
            syncFeeMode();
        };

        window.addEventListener('storage', syncFeeMode);
        window.addEventListener(FEE_PREFERENCE_EVENT, handleCustomEvent as EventListener);

        return () => {
            window.removeEventListener('storage', syncFeeMode);
            window.removeEventListener(FEE_PREFERENCE_EVENT, handleCustomEvent as EventListener);
        };
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!settingsRef.current) return;
            if (!settingsRef.current.contains(event.target as Node)) {
                if (settingsCloseTimeoutRef.current !== null) {
                    window.clearTimeout(settingsCloseTimeoutRef.current);
                    settingsCloseTimeoutRef.current = null;
                }
                setSettingsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        return () => {
            if (settingsCloseTimeoutRef.current !== null) {
                window.clearTimeout(settingsCloseTimeoutRef.current);
            }
        };
    }, []);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const activeHash = walletMode === 'burner' ? burnerHash : mainHash;
    const activeSalt = walletMode === 'burner' ? burnerSalt : mainSalt;
    const activeAddress = walletMode === 'burner' ? burnerAddress : address;
    const paymentLink = activeHash
        ? activeSalt && activeAddress
            ? `${baseUrl}/pay?merchant=${activeAddress}&salt=${activeSalt}&hash=${activeHash}`
            : `${baseUrl}/pay?hash=${activeHash}`
        : '';

    const handleCopy = async () => {
        if (!paymentLink) {
            toast.error(address ? 'Initialize your Profile QR first.' : 'Connect your wallet first.');
            return;
        }

        try {
            await navigator.clipboard.writeText(paymentLink);
            toast.success('Profile QR link copied.');
        } catch (error) {
            console.error('Failed to copy profile QR link', error);
            toast.error('Could not copy the QR link.');
        }
    };

    const handleFeeModeChange = (mode: FeePreferenceMode) => {
        setFeePreferenceMode(mode);
        setFeeMode(mode);
        toast.success(
            mode === 'estimate'
                ? 'Dynamic fee estimation enabled.'
                : `Fixed fee mode enabled at ${(FIXED_FEE_MICROCREDITS / 1_000_000).toFixed(2)} credits.`
        );
    };

    const openSettings = () => {
        if (settingsCloseTimeoutRef.current !== null) {
            window.clearTimeout(settingsCloseTimeoutRef.current);
            settingsCloseTimeoutRef.current = null;
        }
        setSettingsOpen(true);
    };

    const closeSettingsSoon = () => {
        if (settingsCloseTimeoutRef.current !== null) {
            window.clearTimeout(settingsCloseTimeoutRef.current);
        }
        settingsCloseTimeoutRef.current = window.setTimeout(() => {
            setSettingsOpen(false);
            settingsCloseTimeoutRef.current = null;
        }, 140);
    };

    const renderContent = () => {
        if (!address) {
            return (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
                    <p className="text-sm font-semibold text-white">Connect your wallet to show your QR.</p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                        Once connected, other users will be able to scan or copy your payment link from here.
                    </p>
                </div>
            );
        }

        if (loading && !initialized) {
            return (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/10 text-orange-300">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">Preparing your Profile QR</p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                        {status || 'Please wait while we load your permanent payment link.'}
                    </p>
                </div>
            );
        }

        if (!initialized || !paymentLink) {
            return (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
                    <p className="text-sm font-semibold text-white">
                        {walletMode === 'burner' ? 'Your burner QR is not ready yet.' : 'Your Profile QR is not ready yet.'}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                        {walletMode === 'burner' && !hasBurnerWallet
                            ? 'Set up your burner wallet first, then you will be able to share its private QR from here.'
                            : 'Open the dedicated QR page to initialize it, then it will appear here for quick sharing.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="rounded-[22px] bg-white p-4 shadow-[0_18px_40px_rgba(255,255,255,0.08)]">
                    <QRCodeSVG value={paymentLink} size={180} level="H" includeMargin={false} className="h-auto w-full" />
                </div>
                <p className="mt-4 text-center text-xs leading-relaxed text-white/55">
                    {walletMode === 'burner'
                        ? 'Scan to pay your burner wallet privately, or copy the link and share it anywhere.'
                        : 'Scan to pay your profile directly, or copy the link and share it anywhere.'}
                </p>
            </div>
        );
    };

    return (
        <div className="ml-2 flex items-center gap-4">
            <div className="relative group">
                <button
                    type="button"
                    className="flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white/75 backdrop-blur-[24px] transition-all duration-300 hover:bg-white/[0.09] hover:text-white group-hover:border-white/20 group-focus-visible:border-white/20"
                    aria-label="Show profile QR"
                >
                    QR
                </button>

                <div className="pointer-events-none absolute right-0 top-full z-50 pt-3 opacity-0 invisible translate-y-2 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="w-[320px] rounded-[30px] border border-white/10 bg-[#0A0A0A]/95 p-4 backdrop-blur-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="mt-2 text-lg font-bold tracking-tight text-white">Share your payment QR</h3>
                            </div>
                            <Link
                                to="/profile-qr"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                aria-label="Open Profile QR page"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="mb-4 flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                            <button
                                type="button"
                                onClick={() => setWalletMode('main')}
                                className={`flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${walletMode === 'main'
                                    ? 'bg-white text-black'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Main
                            </button>
                            <button
                                type="button"
                                onClick={() => hasBurnerWallet && setWalletMode('burner')}
                                disabled={!hasBurnerWallet}
                                className={`flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${walletMode === 'burner'
                                    ? 'bg-gradient-to-r from-orange-400 to-amber-300 text-black'
                                    : 'text-white/50 hover:text-white'
                                    } ${!hasBurnerWallet ? 'cursor-not-allowed opacity-40 hover:text-white/50' : ''}`}
                            >
                                Burner
                            </button>
                        </div>

                        {renderContent()}

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleCopy}
                                disabled={!paymentLink}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/35"
                            >
                                <Copy className="h-4 w-4" />
                                Copy Link
                            </button>
                            <Link
                                to="/profile-qr"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/20 bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                            >
                                Expand
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div
                ref={settingsRef}
                className="relative"
                onMouseEnter={openSettings}
                onMouseLeave={closeSettingsSoon}
            >
                <button
                    type="button"
                    onClick={() => {
                        if (settingsOpen) {
                            if (settingsCloseTimeoutRef.current !== null) {
                                window.clearTimeout(settingsCloseTimeoutRef.current);
                                settingsCloseTimeoutRef.current = null;
                            }
                            setSettingsOpen(false);
                            return;
                        }
                        openSettings();
                    }}
                    aria-expanded={settingsOpen}
                    aria-label="Fee settings"
                    className={`flex h-[50px] w-[50px] items-center justify-center rounded-full border text-white/70 backdrop-blur-[24px] transition-all duration-300 ${settingsOpen
                        ? 'border-orange-400/35 bg-orange-500/12 text-orange-100'
                        : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                        }`}
                >
                    <Settings2 className="h-4 w-4" />
                </button>

                <AnimatePresence>
                    {settingsOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                            transition={{
                                duration: 0.45,
                                ease: [0.16, 1, 0.3, 1], // fluid easeOutQuart
                            }}
                            className="absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#0A0A0A]/95 p-1.5 backdrop-blur-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] origin-top-right"
                        >
                            <div className="rounded-[20px] bg-white/[0.03] p-4">
                                <div className="space-y-4 text-left">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-[17px] font-semibold tracking-[-0.02em] text-white">Use Estimation</p>
                                            <p className="mt-1.5 text-[13px] leading-6 text-white/70">
                                                Match fees to current network conditions.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleFeeModeChange(feeMode === 'estimate' ? 'fixed' : 'estimate')}
                                            aria-pressed={feeMode === 'estimate'}
                                            className={`group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 border border-white/5 ${feeMode === 'estimate'
                                                ? 'bg-orange-500/20'
                                                : 'bg-white/5'
                                                }`}
                                        >
                                            <span
                                                className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 shadow-lg ${feeMode === 'estimate'
                                                    ? 'translate-x-6 bg-gradient-to-br from-orange-400 to-amber-200 text-black'
                                                    : 'translate-x-1 bg-white/20 text-white/40'
                                                    }`}
                                            >
                                                <Sparkles className={`h-2.5 w-2.5 transition-transform duration-300 ${feeMode === 'estimate' ? 'scale-110' : 'scale-90 opacity-50 text-white/0'}`} />
                                            </span>
                                        </button>
                                    </div>

                                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5">
                                        <p className="text-[12px] leading-5 text-white/60">
                                            {feeMode === 'estimate'
                                                ? 'Live fee estimation is active with a safety buffer.'
                                                : `Fixed fee: ${(FIXED_FEE_MICROCREDITS / 1_000_000).toFixed(2)} credits per transaction.`}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[15px] font-semibold text-white">Register Complaint / Feedback</p>
                                                <p className="mt-1 text-[12px] leading-5 text-white/60">
                                                    Open the support page to send your issue or product feedback and receive a confirmation email.
                                                </p>
                                            </div>
                                            <Link
                                                to="/support-feedback"
                                                onClick={() => setSettingsOpen(false)}
                                                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                            >
                                                Open
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProfileQrNavButton;
