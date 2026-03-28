import { useRef } from 'react';
import { motion } from 'framer-motion';

interface GiftCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const GiftCodeInput = ({
    value,
    onChange,
    placeholder = 'Paste gift-... code',
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
        <div
            style={{
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: value ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '4px',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                boxShadow: value ? '0 0 20px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Inner glow when focused */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '14px',
                    background: value
                        ? 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 60%)'
                        : 'none',
                    pointerEvents: 'none',
                    transition: 'all 0.3s ease',
                }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px' }}>
                {/* Gift icon */}
                <div style={{ flexShrink: 0, color: value ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.2)', transition: 'color 0.3s ease' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                </div>

                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: value ? 'rgba(245,158,11,0.9)' : 'rgba(255,255,255,0.7)',
                        fontFamily: '"Courier New", Courier, monospace',
                        fontSize: '13px',
                        letterSpacing: '0.05em',
                        padding: '10px 4px',
                        width: '100%',
                        caretColor: '#F59E0B',
                    }}
                    className="placeholder-gray-600"
                />

                {/* Paste button */}
                {!value ? (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePaste}
                        disabled={disabled}
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '8px',
                            color: 'rgba(245,158,11,0.8)',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        Paste
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onChange('')}
                        disabled={disabled}
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.3)',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </motion.button>
                )}
            </div>

            {/* Bottom label */}
            {value && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '0 16px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#F59E0B',
                        boxShadow: '0 0 6px rgba(245,158,11,0.6)',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontSize: '10px',
                        color: 'rgba(245,158,11,0.6)',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                    }}>
                        Gift code ready
                    </span>
                </motion.div>
            )}
        </div>
    );
};
