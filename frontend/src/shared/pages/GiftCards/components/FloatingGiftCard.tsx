import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingGiftCardProps {
    amounts?: { ALEO: string | number; USDCx: string | number; USAD: string | number };
    giftCode?: string;
    isInteractive?: boolean;
}

export const FloatingGiftCard: React.FC<FloatingGiftCardProps> = ({ amounts, giftCode, isInteractive = true }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current || !isInteractive) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        setRotateX(((y - centerY) / centerY) * -8);
        setRotateY(((x - centerX) / centerX) * 8);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    const hasValue = amounts && (Number(amounts.ALEO) > 0 || Number(amounts.USDCx) > 0 || Number(amounts.USAD) > 0);
    const nonZeroTokens = amounts
        ? (['ALEO', 'USDCx', 'USAD'] as const).filter(t => Number(amounts[t]) > 0)
        : [];

    return (
        <div className="relative w-full max-w-[380px] mx-auto" style={{ perspective: '1200px' }}>
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                animate={{
                    rotateX: isInteractive ? rotateX : [0, 1.5, -1.5, 0],
                    rotateY: isInteractive ? rotateY : [0, -2, 2, 0],
                    y: isInteractive ? 0 : [0, -4, 4, 0],
                }}
                transition={
                    isInteractive && (rotateX !== 0 || rotateY !== 0)
                        ? { type: 'spring', stiffness: 280, damping: 22 }
                        : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                }
                style={{ transformStyle: 'preserve-3d', aspectRatio: '1.586 / 1' }}
                className="relative w-full rounded-2xl overflow-hidden cursor-default select-none border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            >
                {/* Base layer */}
                <div className="absolute inset-0 bg-[#0d0d14]" />

                {/* Orange accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/60 via-amber-400/40 to-transparent z-20" />

                {/* Warm corner glow */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Thin diagonal highlight */}
                <div className="absolute top-0 right-[-20%] w-[60%] h-full bg-gradient-to-bl from-white/[0.04] to-transparent pointer-events-none" />

                {/* Fine grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* Card border */}
                <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

                {/* Content container */}
                <div className="relative h-full flex flex-col justify-between p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase mb-1">nullpay</p>
                            <p className="text-[9px] tracking-[0.18em] text-white/20 uppercase">Private Gift Card</p>
                        </div>
                        {/* Small tag icon */}
                        <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.5 1H10.5C10.776 1 11 1.224 11 1.5V5.5C11 5.633 10.947 5.76 10.854 5.854L5.354 11.354C4.963 11.744 4.33 11.744 3.94 11.354L0.646 8.06C0.256 7.67 0.256 7.037 0.646 6.646L6.146 1.146C6.24 1.053 6.367 1 6.5 1Z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
                                <circle cx="8.5" cy="3.5" r="0.75" fill="rgba(255,255,255,0.3)"/>
                            </svg>
                        </div>
                    </div>

                    {/* Body: value or code */}
                    <div>
                        {hasValue ? (
                            <div className="flex gap-6 items-end">
                                {nonZeroTokens.map(token => (
                                    <div key={token}>
                                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">{token}</p>
                                        <p className="text-2xl font-semibold text-white font-mono tracking-tight">
                                            {Number(amounts![token]).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : giftCode ? (
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Secret Code</p>
                                <p className="text-xs font-mono text-neon-primary/80 break-all leading-relaxed">
                                    {giftCode.substring(0, 20)}...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="h-1.5 w-20 bg-white/[0.06] rounded-full animate-pulse" />
                                <div className="h-5 w-32 bg-white/[0.06] rounded-full animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
