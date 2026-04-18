import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
    completeTelegramLinkSession,
    fetchTelegramLinkSession,
} from '../../services/api';
import { CompleteTelegramLinkSessionResponse, TelegramLinkSession } from '../../types/common';
import { useBurnerWallet } from '../../hooks/wallet/BurnerWalletProvider';
import { PasswordPrompt } from '../../components/auth/PasswordPrompt';
import { encryptWithPassword } from '../../utils/core/crypto';

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

export default function TelegramLinkPage() {
    const [searchParams] = useSearchParams();
    const { address, wallet } = useWallet();
    const { isUnlocked, isAutoUnlocking, appPassword } = useBurnerWallet();
    const [session, setSession] = useState<TelegramLinkSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [telegramWebUrl, setTelegramWebUrl] = useState<string | null>(null);

    const token = searchParams.get('token') || '';

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!token) {
                setError('Missing Telegram link token.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const nextSession = await fetchTelegramLinkSession(token);
                if (!cancelled) {
                    if (nextSession.is_consumed) {
                        setError('This Telegram link has already been used. Start a fresh /link flow from Telegram.');
                        setLoading(false);
                        return;
                    }
                    if (nextSession.is_expired) {
                        setError('This Telegram link has expired. Start a fresh /link flow from Telegram.');
                        setLoading(false);
                        return;
                    }
                    setSession(nextSession);
                    setError(null);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load Telegram link session.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const expiryText = useMemo(() => {
        if (!session?.expires_at) return '';
        return new Date(session.expires_at).toLocaleString();
    }, [session?.expires_at]);

    const returnToTelegram = (linkResult?: CompleteTelegramLinkSessionResponse) => {
        const appUrl = linkResult?.telegram_app_url || null;
        const webUrl = linkResult?.telegram_web_url || telegramWebUrl || null;

        if (appUrl) {
            window.location.href = appUrl;
            if (webUrl) {
                window.setTimeout(() => {
                    window.location.href = webUrl;
                }, 900);
            }
            return;
        }

        if (webUrl) {
            window.location.href = webUrl;
        }
    };

    const handleLink = async () => {
        if (!token || !session) {
            setError('This Telegram link session is unavailable.');
            return;
        }

        if (!address) {
            toast.error('Connect your Aleo wallet first.');
            return;
        }

        if (!wallet?.adapter?.signMessage) {
            toast.error('This wallet does not expose message signing.');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const signatureResult = await wallet.adapter.signMessage(new TextEncoder().encode(session.message));
            const signatureBytes = signatureResult instanceof Uint8Array
                ? signatureResult
                : (signatureResult as any)?.signature;

            if (!signatureBytes) {
                throw new Error('The wallet did not return a usable signature.');
            }

            const clientCiphertext = appPassword
                ? await encryptWithPassword(address, appPassword)
                : undefined;

            const result = await completeTelegramLinkSession({
                token,
                aleo_address: address,
                signature_base64: toBase64(signatureBytes),
                aleo_address_client_ciphertext: clientCiphertext
            });

            setTelegramWebUrl(result.telegram_web_url || null);
            setSuccess(true);
            setRedirecting(Boolean(result.telegram_app_url || result.telegram_web_url));
            toast.success('Telegram wallet link completed.');

            if (result.telegram_app_url || result.telegram_web_url) {
                window.setTimeout(() => returnToTelegram(result), 700);
            }
        } catch (err: any) {
            const message = err.message || 'Failed to complete Telegram wallet link.';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!loading && !success && !error && address && isAutoUnlocking) {
        return (
            <div className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <p className="text-sm text-white/65">Checking your encrypted NullPay profile and on-chain backup records...</p>
                </div>
            </div>
        );
    }

    if (!loading && !success && !error && address && !isUnlocked) {
        return <PasswordPrompt />;
    }

    return (
        <div className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-xl">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="mb-6">
                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">NullPay Telegram Link</p>
                        <h1 className="mt-3 text-3xl font-black">Verify your merchant wallet</h1>
                        <p className="mt-3 text-sm leading-6 text-white/60">
                            This one-time browser step follows the same NullPay security flow as the rest of the app: connect your wallet, unlock or create your NullPay password, then sign a short link message so Telegram can show merchant invoice updates.
                        </p>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60">
                            Loading your Telegram link session...
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6 text-sm text-orange-100">
                            {error}
                        </div>
                    ) : success ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm text-emerald-50">
                                Your wallet is now linked to NullPay Telegram. {redirecting
                                    ? 'Taking you back to the bot now so you can continue with /dashboard or /create.'
                                    : 'Return to the bot and continue with /dashboard or /create.'}
                            </div>
                            <button
                                type="button"
                                onClick={() => returnToTelegram()}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                            >
                                Open Telegram Bot
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
                                <p className="font-semibold text-white">Session expires</p>
                                <p className="mt-2">{expiryText}</p>
                                <p className="mt-3 text-white/45">
                                    Message action: <span className="font-mono text-white/70">nullpay_telegram_link_v1</span>
                                </p>
                            </div>

                            <div className="flex justify-center">
                                <WalletMultiButton className="!bg-white !text-black !font-bold !rounded-2xl !h-12 !px-5" />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
                                <p className="font-semibold text-white">Connected wallet</p>
                                <p className="mt-2 break-all font-mono text-xs text-cyan-200/80">
                                    {address || 'Connect your Aleo wallet to continue.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleLink}
                                disabled={submitting || !address || !isUnlocked}
                                className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? 'Verifying Wallet...' : 'Sign and Link Telegram'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
