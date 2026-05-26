import { Terminal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';

type PaymentMethod = 'wallet' | 'card' | 'giftcard';

interface PaymentActivityConsoleProps {
    method: PaymentMethod;
    statusLog: string[];
    error?: string | null;
    compact?: boolean;
    title?: string;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
    wallet: 'Wallet Activity',
    card: 'NullPay Card Activity',
    giftcard: 'Gift Card Activity',
};

const TIMESTAMP_REGEX = /^\[(\d{1,2}:\d{2}:\d{2}(?:\s?[AP]M)?)\]\s*(.*)$/i;

const prettifyLogLine = (line: string) => line.replace(/^ERROR:\s*/, '').trim();

const formatTime = () => new Date().toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

export const PaymentActivityConsole = ({
    method,
    statusLog,
    error,
    compact = false,
    title,
}: PaymentActivityConsoleProps) => {
    const timestampsRef = useRef<Map<number, string>>(new Map());
    const scrollRef = useRef<HTMLDivElement>(null);

    const getTimestamp = (index: number) => {
        if (!timestampsRef.current.has(index)) {
            timestampsRef.current.set(index, formatTime());
        }
        return timestampsRef.current.get(index)!;
    };

    // Filter out initializing and technical noise
    const filteredLog = statusLog.filter((line) => {
        const lower = line.toLowerCase();
        return !lower.includes('initializing') && !lower.includes('verifying invoice');
    });

    const entries =
        error && !filteredLog.some((line) => line === `ERROR: ${error}`)
            ? [...filteredLog, `ERROR: ${error}`]
            : filteredLog;

    useEffect(() => {
        if (entries.length > 0) {
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [entries.length]);

    if (entries.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden mt-6"
        >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <Terminal className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
                        {title || METHOD_LABELS[method]}
                    </span>
                </div>
            </div>

            <div className={`p-1 ${compact ? 'max-h-32' : 'max-h-56'} overflow-y-auto custom-scrollbar`}>
                <div className="flex flex-col gap-0.5">
                    <AnimatePresence initial={false}>
                        {entries.map((line, index) => {
                            const isErrorLine = line.startsWith('ERROR:');
                            const isLast = index === entries.length - 1;

                            // Check if log already has a timestamp like [10:42:05 AM]
                            const timestampMatch = line.match(TIMESTAMP_REGEX);
                            const displayTimestamp = timestampMatch
                                ? timestampMatch[1]
                                : getTimestamp(index);
                            const displayMessage = timestampMatch
                                ? prettifyLogLine(timestampMatch[2])
                                : prettifyLogLine(line);

                            return (
                                <motion.div
                                    key={`${line}-${index}`}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: isLast ? 0.1 : 0 }}
                                    className={`flex items-start gap-3 px-4 py-2 text-[13px] leading-relaxed ${
                                        isErrorLine
                                            ? 'text-red-400/90'
                                            : isLast
                                              ? 'text-white'
                                              : 'text-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mt-1 shrink-0">
                                        {isErrorLine ? (
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                        ) : (
                                            <span
                                                className={`block h-1.5 w-1.5 rounded-full ${
                                                    isLast && !isErrorLine
                                                        ? 'bg-orange-500 animate-pulse'
                                                        : 'bg-gray-600'
                                                }`}
                                            />
                                        )}
                                        <span className="text-[10px] text-gray-600 font-medium tabular-nums">
                                            {displayTimestamp}
                                        </span>
                                    </div>
                                    <span className="flex-1">{displayMessage}</span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={scrollRef} />
                </div>
            </div>
        </motion.div>
    );
};
