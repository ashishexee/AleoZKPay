import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, X, CreditCard, Lock, Key } from 'lucide-react';
import { CARD_PIN_LENGTH } from '../../utils/card-input-limits';
import { Button } from '../ui/Button';
import { GlassInput } from '../ui/GlassInput';

interface NullPayCardPaymentPanelProps {
    amountLabel: string;
    cardNumber: string;
    cardPin: string;
    cardSecret: string;
    isOpen: boolean;
    isProcessing: boolean;
    statusLog: string[];
    error?: string | null;
    compact?: boolean;
    onCardNumberChange: (value: string) => void;
    onCardPinChange: (value: string) => void;
    onCardSecretChange: (value: string) => void;
    onOpenOverlay: () => void;
    onCloseOverlay: () => void;
    onSubmit: () => void;
    submitDisabled: boolean;
}

const formatCardNumber = (value: string) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

export const NullPayCardPaymentPanel = ({
    amountLabel,
    cardNumber,
    cardPin,
    cardSecret,
    isOpen,
    isProcessing,
    statusLog,
    error,
    compact = false,
    onCardNumberChange,
    onCardPinChange,
    onCardSecretChange,
    onOpenOverlay,
    onCloseOverlay,
    onSubmit,
    submitDisabled
}: NullPayCardPaymentPanelProps) => {
    const cardDigits = cardNumber.replace(/\D/g, '');
    const canOpenOverlay = cardDigits.length === 16 && !isProcessing;
    const hasLogs = statusLog.length > 0 || Boolean(error);

    return (
        <>
            <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Card Number</label>
                    <GlassInput
                        variant="bw"
                        type="text"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => onCardNumberChange(formatCardNumber(e.target.value))}
                        placeholder="4123 4567 8910 1112"
                        className={`text-center font-mono ${compact ? 'tracking-[0.18em] text-base h-12' : 'tracking-[0.22em]'}`}
                        icon={<CreditCard className="h-4 w-4" />}
                    />
                </div>
                <Button
                    variant="bw"
                    onClick={onOpenOverlay}
                    disabled={!canOpenOverlay}
                    className={`w-full ${compact ? 'h-12 text-base' : 'h-14 text-lg'} shadow-xl shadow-white/5`}
                >
                    Continue to Secure Entry
                </Button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => {
                                if (!isProcessing) onCloseOverlay();
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={`relative z-10 w-full ${compact ? 'max-w-md' : 'max-w-xl'}`}
                        >
                            <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-[#050505] shadow-[0_40px_120px_rgba(0,0,0,1)]">
                                {/* Subtle Monochrome Background Detail */}
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_40%)]" />
                                
                                <div className={`relative ${compact ? 'p-6' : 'p-8'}`}>
                                    <div className="mb-8 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                                Zero-Knowledge Entry
                                            </p>
                                            <h3 className="text-2xl font-light tracking-tight text-white">
                                                Identity <span className="font-bold">Verification</span>
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onCloseOverlay}
                                            disabled={isProcessing}
                                            className="rounded-full border border-white/5 bg-white/5 p-2 text-gray-500 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Card PIN</label>
                                                <GlassInput
                                                    variant="bw"
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={CARD_PIN_LENGTH}
                                                    value={cardPin}
                                                    onChange={(e) => onCardPinChange(e.target.value.replace(/\D/g, '').slice(0, CARD_PIN_LENGTH))}
                                                    placeholder="······"
                                                    className={`text-center tracking-[0.5em] ${compact ? 'text-lg h-12' : 'h-16 text-xl'}`}
                                                    icon={<Lock className="h-4 w-4" />}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Private Secret</label>
                                                <GlassInput
                                                    variant="bw"
                                                    type="password"
                                                    value={cardSecret}
                                                    onChange={(e) => onCardSecretChange(e.target.value)}
                                                    placeholder="Enter your card secret"
                                                    className={`text-center ${compact ? 'text-base h-12' : 'h-16 text-lg'}`}
                                                    icon={<Key className="h-4 w-4" />}
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 flex items-center gap-3"
                                            >
                                                <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
                                                {error}
                                            </motion.div>
                                        )}

                                        <Button
                                            variant="bw"
                                            onClick={onSubmit}
                                            disabled={submitDisabled}
                                            className={`w-full ${compact ? 'h-14 text-lg' : 'h-16 text-xl font-bold'} shadow-2xl shadow-white/5 mt-2`}
                                        >
                                            {isProcessing ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                                                    Processing...
                                                </div>
                                            ) : (
                                                `Complete ${amountLabel} Payment`
                                            )}
                                        </Button>
                                    </div>

                                    {hasLogs && (
                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-600">
                                                <Terminal className="h-3.5 w-3.5" />
                                                Live Ledger Updates
                                            </div>
                                            <div className={`space-y-2 overflow-y-auto pr-2 custom-scrollbar ${compact ? 'max-h-32' : 'max-h-48'}`}>
                                                {statusLog.map((line, index) => {
                                                    const isErrorLine = line.startsWith('ERROR:');
                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            key={`${line}-${index}`}
                                                            className={`rounded-xl border px-4 py-3 font-mono text-[10px] leading-relaxed transition-colors border-white/5 bg-white/[0.02] ${isErrorLine ? 'text-gray-400' : 'text-gray-500'}`}
                                                        >
                                                            <span className="opacity-50 mr-2 text-white">›</span>
                                                            {line.replace(/^ERROR:\s*/, '')}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
