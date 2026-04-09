import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, X } from 'lucide-react';
import { CARD_PIN_LENGTH } from '../../utils/card-input-limits';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
                <Input
                    label="Card Number"
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => onCardNumberChange(formatCardNumber(e.target.value))}
                    placeholder="4123 4567 8910 1112"
                    className={`text-center font-mono ${compact ? 'tracking-[0.18em] text-base h-12' : 'tracking-[0.22em]'}`}
                />
                <Button
                    variant="primary"
                    onClick={onOpenOverlay}
                    disabled={!canOpenOverlay}
                    className={`w-full ${compact ? 'h-12 text-base' : 'h-14 text-lg'}`}
                    glow
                >
                    Continue
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
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => {
                                if (!isProcessing) onCloseOverlay();
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.18 }}
                            className={`relative z-10 w-full ${compact ? 'max-w-md' : 'max-w-2xl'}`}
                        >
                            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.08),_transparent_28%)]" />
                                <div className={`relative ${compact ? 'p-5' : 'p-6'}`}>
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/70">
                                            Secure Checkout
                                        </p>
                                        <h3 className="text-xl font-semibold tracking-tight text-white">
                                            Enter PIN and Secret
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onCloseOverlay}
                                        disabled={isProcessing}
                                        className="rounded-full border border-white/10 bg-white/5 p-2.5 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Close card overlay"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 space-y-5">
                                        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            <Input
                                                label="PIN"
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={CARD_PIN_LENGTH}
                                                value={cardPin}
                                                onChange={(e) => onCardPinChange(e.target.value.replace(/\D/g, '').slice(0, CARD_PIN_LENGTH))}
                                                placeholder="6-digit PIN"
                                                className={`text-center tracking-[0.3em] ${compact ? 'text-base h-12' : 'h-14 text-lg'}`}
                                            />
                                            <Input
                                                label="Secret"
                                                type="password"
                                                value={cardSecret}
                                                onChange={(e) => onCardSecretChange(e.target.value)}
                                                placeholder="Card secret"
                                                className={`text-center ${compact ? 'text-base h-12' : 'h-14 text-lg'}`}
                                            />
                                        </div>

                                        {error && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center gap-3"
                                            >
                                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                {error}
                                            </motion.div>
                                        )}

                                        <Button
                                            variant="primary"
                                            onClick={onSubmit}
                                            disabled={submitDisabled}
                                            className={`w-full ${compact ? 'h-12 text-base' : 'h-16 text-xl font-bold'}`}
                                            glow
                                        >
                                            {isProcessing ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="h-5 w-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                                                    Processing...
                                                </div>
                                            ) : (
                                                `Pay ${amountLabel}`
                                            )}
                                        </Button>
                                    </div>

                                    {hasLogs && (
                                        <div className="rounded-[28px] border border-white/10 bg-black/45 p-5">
                                            <div className="flex items-center gap-2 mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
                                                <Terminal className="h-4 w-4 text-emerald-400" />
                                                Transaction Logs
                                            </div>
                                            <div className={`space-y-2 overflow-y-auto pr-1 ${compact ? 'max-h-40' : 'max-h-[240px]'}`}>
                                                {statusLog.map((line, index) => {
                                                    const isErrorLine = line.startsWith('ERROR:');
                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            key={`${line}-${index}`}
                                                            className={`rounded-xl border px-4 py-3 font-mono text-xs leading-relaxed ${
                                                                isErrorLine
                                                                    ? 'border-rose-500/20 bg-rose-500/[0.08]'
                                                                    : 'border-white/5 bg-white/[0.02]'
                                                            }`}
                                                        >
                                                            <span className={isErrorLine ? 'text-rose-200' : 'text-gray-300'}>
                                                                {line.replace(/^ERROR:\s*/, '')}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
