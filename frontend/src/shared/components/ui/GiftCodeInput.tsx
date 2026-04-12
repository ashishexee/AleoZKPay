import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from './GlassInput';

interface GiftCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const GiftCodeInput = ({
    value,
    onChange,
    placeholder = 'Paste gift code here...',
    disabled = false,
}: GiftCodeInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            onChange(text.trim());
            inputRef.current?.focus();
        } catch {
            inputRef.current?.focus();
        }
    };

    return (
        <GlassInput
            ref={inputRef}
            variant="bw"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
            }
            rightElement={
                <AnimatePresence mode="wait">
                    {!value ? (
                        <motion.button
                            key="paste"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePaste}
                            disabled={disabled}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-50"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                            Paste
                        </motion.button>
                    ) : (
                        <motion.button
                            key="clear"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onChange('')}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </motion.button>
                    )}
                </AnimatePresence>
            }
            showStatus={Boolean(value)}
            statusElement={
                <>
                    <div className="h-1 w-1 rounded-full bg-white/50" />
                    <span className="text-[10px] text-white/50 italic">
                        Valid gift card code
                    </span>
                </>
            }
        />
    );
};

