import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePayment } from '../../hooks/usePayment';
import type { PaymentStep } from '../../hooks/usePayment';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import GlassCard from '../../components/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PROGRAM_ID } from '../../utils/aleo-utils';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MobilePaymentPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const hasParams = searchParams.get('merchant') && searchParams.get('amount') && searchParams.get('salt');
    const [manualLink, setManualLink] = useState('');

    const {
        step,
        status,
        loading,
        error,
        invoice,
        txId,
        handleConnect,
        payInvoice,
        convertPublicToPrivate,
        programId,

        paymentSecret
    } = usePayment();

    const { address } = useWallet();
    const isProcess = loading;

    const handlePay = async () => {
        if (step === 'CONVERT') {
            await convertPublicToPrivate();
        } else {
            await payInvoice();
        }
    };

    const processPaymentLink = (rawValue: string) => {
        if (!rawValue) return;
        try {
            console.log("Processing Value:", rawValue);
            let urlObj;
            try {
                urlObj = new URL(rawValue);
            } catch {
                if (rawValue.startsWith('http')) {
                    return;
                }
                urlObj = new URL(rawValue, window.location.origin);
            }

            if (urlObj.searchParams.get('merchant') && urlObj.searchParams.get('amount') && urlObj.searchParams.get('salt')) {
                navigate(`/pay${urlObj.search}`);
            } else {
                console.warn("Invalid NullPay Link");
            }
        } catch (e) {
            console.error("Link Parse Error", e);
        }
    };

    const handleScan = (result: any) => {
        if (result) {
            const rawValue = result[0]?.rawValue || result?.rawValue || result;
            processPaymentLink(rawValue);
        }
    };

    const handleManualSubmit = () => {
        processPaymentLink(manualLink);
    };

    const steps: { key: PaymentStep; label: string }[] = [
        { key: 'CONNECT', label: '1. Connect' },
        { key: 'VERIFY', label: '2. Verify' },
        { key: 'PAY', label: '3. Pay' },
    ];

    const isMultiPay = programId === PROGRAM_ID;

    // RENDER SCANNER IF NO PARAMS
    if (!hasParams) {
        return (
            <div className="page-container flex flex-col items-center justify-center min-h-[0vh] pt-2">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold mb-2 tracking-tighter text-white">
                            Scan <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Null-Invoice</span>
                        </h1>
                        <p className="text-sm text-gray-400">Point your camera at a NullPay QR Code</p>
                    </div>

                    <GlassCard className="p-1 overflow-hidden relative aspect-square bg-black/50 border-neon-primary/30 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
                        {/* Scanner Overlay UI */}
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-neon-primary rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-neon-primary rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-neon-primary rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-neon-primary rounded-br-xl" />
                            {/* Scanning line animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-neon-primary/50 shadow-[0_0_10px_#00f3ff] animate-scan-y opacity-50" />
                        </div>

                        <div className="w-full h-full rounded-xl overflow-hidden">
                            <Scanner
                                onScan={handleScan}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                                }}

                            />
                        </div>
                    </GlassCard>

                    <div className="flex items-center w-full gap-2 mt-6 mb-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs text-gray-500 font-medium uppercase">OR</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="w-full space-y-3">
                        <Input
                            placeholder="Paste NullPay Link"
                            value={manualLink}
                            onChange={(e) => setManualLink(e.target.value)}
                        />
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleManualSubmit}
                            disabled={!manualLink}
                        >
                            Open Payment Link
                        </Button>
                    </div>

                </motion.div>
            </div>
        );
    }

    return (
        <div className="page-container flex flex-col items-center justify-start min-h-screen pt-0">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                {/* STATUS HEADER */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold mb-4 tracking-tighter text-white">
                        {step === 'SUCCESS' ? 'Null-Payment' : step === 'ALREADY_PAID' ? 'Null-Invoice' : 'Make'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{step === 'SUCCESS' ? 'Successful' : step === 'ALREADY_PAID' ? 'Paid' : 'Null-Payment'}</span>
                    </h1>

                    {invoice && !error && (
                        <div className="inline-flex items-center gap-2 bg-neon-primary/10 px-4 py-2 rounded-full border border-neon-primary/20 shadow-[0_0_15px_rgba(0,243,255,0.15)]">
                            <span className="text-sm font-bold text-neon-primary tracking-wide uppercase">
                                Verified On-Chain
                            </span>
                        </div>
                    )}
                </div>

                <GlassCard variant="heavy" className="p-6 relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="flex justify-between mb-8 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-0" />
                        {steps.map((s, index) => {
                            let isActive = s.key === step ||
                                (step === 'CONVERT' && s.key === 'PAY') ||
                                ((step === 'SUCCESS' || step === 'ALREADY_PAID') && s.key === 'PAY') ||
                                (steps.findIndex(x => x.key === step) > index);

                            return (
                                <div key={s.key} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                                        ? 'bg-neon-primary border-neon-primary text-black shadow-[0_0_10px_rgba(0,243,255,0.5)]'
                                        : 'bg-black border-gray-700 text-gray-500'
                                        }`}>
                                        {isActive ? (
                                            <div className="w-2 h-2 bg-black rounded-full" />
                                        ) : (
                                            <span className="text-[10px] font-bold">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors ${isActive ? 'text-neon-primary' : 'text-gray-600'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* INVOICE DETAILS */}
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 mb-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Merchant</span>
                            <span className="font-mono text-white text-xs bg-white/5 px-2 py-1 rounded">
                                {invoice?.merchant ? `${invoice.merchant.slice(0, 10)}...${invoice.merchant.slice(-5)}` : 'Loading...'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Amount</span>
                            <span className="text-xl font-bold text-white tracking-tight">{invoice?.amount || '0'} <span className="text-xs text-gray-500 font-normal">Credits</span></span>
                        </div>
                        {invoice?.memo && (
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Memo</span>
                                <span className="text-gray-300 text-sm">{invoice.memo}</span>
                            </div>
                        )}

                        {/* MULTI PAY EXTRA INPUTS */}
                        {isMultiPay && step !== 'SUCCESS' && step !== 'CONNECT' && (
                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-neon-primary uppercase tracking-widest block mb-1">Your Payment Secret</span>
                                    <div className="bg-neon-primary/10 border border-neon-primary/20 p-2 rounded-lg break-all font-mono text-xs text-neon-primary relative hover:bg-neon-primary/20 transition-colors cursor-copy" onClick={() => paymentSecret && navigator.clipboard.writeText(paymentSecret)}>
                                        {paymentSecret || 'Generating...'}
                                        <div className="absolute top-1 right-2 text-[10px] opacity-70">COPY</div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Save this secret! You'll need it to prove payment to the merchant.
                                    </p>
                                </div>

                            </div>
                        )}

                    </div>

                    {/* ACTION AREA */}
                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                                <p className="text-white text-xs font-medium">{error}</p>
                            </div>
                        )}

                        {status && !status.startsWith('at1') && !error && step !== 'ALREADY_PAID' && step !== 'SUCCESS' && (
                            <div className="text-center p-3 bg-neon-primary/10 rounded-xl border border-neon-primary/20">
                                <p className="text-neon-primary text-xs font-mono animate-pulse">{status}</p>
                            </div>
                        )}

                        {(step === 'SUCCESS' || step === 'ALREADY_PAID') ? (
                            <div className="text-center space-y-4">
                                <p className="text-gray-400 text-sm">
                                    {step === 'ALREADY_PAID'
                                        ? 'This invoice has already been settled on-chain.'
                                        : 'The transaction has been settled on-chain.'}
                                </p>
                                {isMultiPay && paymentSecret && (
                                    <div className="bg-black/40 border border-neon-primary/30 p-4 rounded-xl text-left">
                                        <p className="text-xs text-neon-primary uppercase font-bold mb-1">Your Receipt Secret</p>
                                        <p className="font-mono text-white text-xs break-all">{paymentSecret}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Share with merchant to verify contribution.</p>
                                    </div>
                                )}
                                {txId && (
                                    <Button
                                        variant="primary"
                                        onClick={() => window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank')}
                                    >
                                        View Transaction
                                    </Button>
                                )}
                            </div>
                        ) : step === 'CONNECT' ? (
                            <div className="flex flex-col gap-3">
                                <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!h-12 [&>button]:!rounded-xl [&>button]:!font-bold [&>button]:!bg-neon-primary [&>button]:!text-black hover:[&>button]:!bg-neon-accent [&>button]:!transition-colors">
                                    <WalletMultiButton className="!w-full !justify-center" />
                                </div>
                                {address && (
                                    <Button variant="secondary" onClick={handleConnect}>
                                        Continue with Connected Wallet
                                    </Button>
                                )}
                            </div>
                        ) : step === 'VERIFY' ? (
                            <Button variant="primary" onClick={handleConnect} className="w-full">
                                Verify Hash & Records
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handlePay}
                                disabled={isProcess}
                                className="w-full"
                                glow
                            >
                                {isProcess ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : step === 'CONVERT' ? (
                                    'Convert Public to Private'
                                ) : (
                                    `Pay ${invoice?.amount} Credits`
                                )}
                            </Button>
                        )}
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default MobilePaymentPage;
