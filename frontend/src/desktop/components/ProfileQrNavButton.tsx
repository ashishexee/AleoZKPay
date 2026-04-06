import { useEffect, useRef, useState } from 'react';
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
                setSettingsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
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
                    <div className="w-[320px] rounded-[30px] border border-white/10 bg-black/80 p-4 backdrop-blur-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">Profile QR</p>
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

            <div ref={settingsRef} className="relative">
                <button
                    type="button"
                    onClick={() => setSettingsOpen((open) => !open)}
                    aria-expanded={settingsOpen}
                    aria-label="Fee settings"
                    className={`flex h-[50px] w-[50px] items-center justify-center rounded-full border text-white/70 backdrop-blur-[24px] transition-all duration-300 ${settingsOpen
                        ? 'border-orange-400/35 bg-orange-500/12 text-orange-100'
                        : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                        }`}
                >
                    <Settings2 className="h-4 w-4" />
                </button>

                {settingsOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-[248px] rounded-[22px] border border-white/10 bg-black/84 p-3 backdrop-blur-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Transaction Fees</p>
                                <p className="text-sm font-semibold text-white">Auto estimate</p>
                            </div>

                            <div className="mt-3 flex items-center justify-between rounded-[16px] border border-white/10 bg-black/30 px-3 py-3">
                                <div className="pr-3">
                                    <p className="text-sm font-medium text-white">Use estimation</p>
                                    <p className="mt-1 text-xs leading-relaxed text-white/45">
                                        Turn off to always use {(FIXED_FEE_MICROCREDITS / 1_000_000).toFixed(2)} credits.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleFeeModeChange(feeMode === 'estimate' ? 'fixed' : 'estimate')}
                                    aria-pressed={feeMode === 'estimate'}
                                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all ${feeMode === 'estimate'
                                        ? 'border-orange-300/40 bg-orange-400/20'
                                        : 'border-white/10 bg-white/[0.06]'
                                        }`}
                                >
                                    <span
                                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-all ${feeMode === 'estimate'
                                            ? 'translate-x-6 bg-gradient-to-br from-orange-300 to-amber-200 text-black'
                                            : 'translate-x-1 bg-white text-black'
                                            }`}
                                    >
                                        <Sparkles className="h-3 w-3" />
                                    </span>
                                </button>
                            </div>

                            <p className="mt-3 text-[11px] text-white/38">
                                {feeMode === 'estimate'
                                    ? 'Currently using live fee estimation with buffer.'
                                    : `Currently using fixed ${(FIXED_FEE_MICROCREDITS / 1_000_000).toFixed(2)} credits.`}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileQrNavButton;
