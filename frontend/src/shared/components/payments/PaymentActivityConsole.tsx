import { Terminal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentMethod = 'wallet' | 'card' | 'giftcard';

interface PaymentActivityConsoleProps {
    method: PaymentMethod;
    statusLog: string[];
    error?: string | null;
    compact?: boolean;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
    wallet: 'Wallet Activity',
    card: 'NullPay Card Activity',
    giftcard: 'Gift Card Activity',
};

const prettifyLogLine = (line: string) => line.replace(/^ERROR:\s*/, '').trim();

export const PaymentActivityConsole = ({
    method,
    statusLog,
    error,
    compact = false,
}: PaymentActivityConsoleProps) => {
    // Filter out initializing and technical noise as requested
    const filteredLog = statusLog.filter(line => {
        const lower = line.toLowerCase();
        return !lower.includes('initializing') && !lower.includes('verifying invoice');
    });

    const entries = error && !filteredLog.some((line) => line === `ERROR: ${error}`)
        ? [...filteredLog, `ERROR: ${error}`]
        : filteredLog;

    if (entries.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden mt-6"
        >
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-3">
                <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                    <div className="relative">
                        <Terminal className="h-3.5 w-3.5" />
                        <span className="absolute -top-1 -right-1 block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    </div>
                    {METHOD_LABELS[method]}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                    </div>
                </div>
            </div>

            <div className={`p-2 ${compact ? 'max-h-32' : 'max-h-56'} overflow-y-auto custom-scrollbar bg-black/20`}>
                <div className="flex flex-col">
                    <AnimatePresence initial={false}>
                        {entries.map((line, index) => {
                            const isErrorLine = line.startsWith('ERROR:');
                            const isLast = index === entries.length - 1;
                            
                            return (
                                <motion.div
                                    key={`${line}-${index}`}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: isLast ? 0.1 : 0 }}
                                    className={`flex items-start gap-4 px-5 py-2.5 font-mono text-[13px] leading-relaxed transition-colors ${
                                        isErrorLine ? 'text-red-400/90' : isLast ? 'text-white' : 'text-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center mt-1">
                                        {isErrorLine ? (
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                        ) : (
                                            <span className={`text-[11px] font-black ${isLast ? 'text-orange-500' : 'text-white/20'}`}>
                                                {isLast && !isErrorLine ? 'λ' : '›'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="flex-1">
                                        {prettifyLogLine(line)}
                                        {isLast && !isErrorLine && (
                                            <motion.span
                                                animate={{ opacity: [1, 0] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                                className="inline-block w-1.5 h-3.5 ml-2 bg-orange-500 align-middle"
                                            />
                                        )}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Glossy overlay effect */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        </motion.div>
    );
};
