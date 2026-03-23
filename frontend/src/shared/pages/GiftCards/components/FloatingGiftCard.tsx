import React, { useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface FloatingGiftCardProps {
    amounts?: { ALEO: string | number; USDCx: string | number; USAD: string | number };
    giftCode?: string;
    isInteractive?: boolean;
}

/* ── token accent colors ── */
const TOKEN_CONFIG = {
    ALEO:  { label: 'Credits',  color: '#F59E0B', glow: 'rgba(245,158,11,0.35)',  bg: 'rgba(245,158,11,0.07)'  },
    USDCx: { label: 'USDCx',   color: '#60a5fa', glow: 'rgba(96,165,250,0.35)', bg: 'rgba(96,165,250,0.07)' },
    USAD:  { label: 'USAD',    color: '#f59e0b', glow: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.07)' },
} as const;

export const FloatingGiftCard: React.FC<FloatingGiftCardProps> = ({
    amounts,
    giftCode,
    isInteractive = true,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    /* ── spring-based tilt ── */
    const rawX = useSpring(0, { stiffness: 300, damping: 25 });
    const rawY = useSpring(0, { stiffness: 300, damping: 25 });
    const rotateX = useTransform(rawX, v => v);
    const rotateY = useTransform(rawY, v => v);

    /* ── holographic shimmer position ── */
    const [shimmerPos, setShimmerPos] = useState({ x: 50, y: 50 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current || !isInteractive) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        rawX.set(((y - cy) / cy) * -10);
        rawY.set(((x - cx) / cx) * 12);
        setShimmerPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    };

    const handleMouseLeave = () => {
        rawX.set(0);
        rawY.set(0);
        setShimmerPos({ x: 50, y: 50 });
        setIsHovered(false);
    };

    const hasValue = amounts && (
        Number(amounts.ALEO) > 0 || Number(amounts.USDCx) > 0 || Number(amounts.USAD) > 0
    );
    const nonZeroTokens = amounts
        ? (['ALEO', 'USDCx', 'USAD'] as const).filter(t => Number(amounts[t]) > 0)
        : [];

    /* ── idle float animation ── */
    const idleVariants = {
        float: {
            y: [0, -6, 0],
            rotateZ: [0, 0.4, -0.4, 0],
            transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        },
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
                .gift-card-wrap * { font-family: 'Space Grotesk', sans-serif; }
            `}</style>

            <div
                className="gift-card-wrap relative w-full max-w-[400px] mx-auto"
                style={{ perspective: '1400px' }}
            >
                {/* ── outer glow halo ── */}
                <div
                    className="absolute inset-[-12px] rounded-3xl pointer-events-none transition-opacity duration-700"
                    style={{
                        background: `radial-gradient(ellipse at ${shimmerPos.x}% ${shimmerPos.y}%, rgba(245,158,11,0.08) 0%, transparent 60%)`,
                        opacity: isHovered ? 1 : 0.3,
                        filter: 'blur(16px)',
                    }}
                />

                <motion.div
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={() => setIsHovered(true)}
                    variants={!isInteractive ? idleVariants : undefined}
                    animate={!isInteractive ? 'float' : undefined}
                    style={{
                        rotateX: isInteractive ? rotateX : 0,
                        rotateY: isInteractive ? rotateY : 0,
                        transformStyle: 'preserve-3d',
                        aspectRatio: '1.586 / 1',
                    }}
                    className="relative w-full rounded-2xl cursor-default select-none"
                >
                    {/* ════════════════════════════
                        BASE: deep dark metal, ultra-subtle
                    ═════════════════════════════ */}
                    <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, #111116 0%, #08080a 50%, #0a0a0f 100%)',
                        }}
                    />

                    {/* ── soft glass reflection ── */}
                    <div
                        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
                        style={{
                            opacity: isHovered ? 0.4 : 0.15,
                            background: `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
                            mixBlendMode: 'plus-lighter',
                        }}
                    />

                    {/* ── ultra-fine noise texture ── */}
                    <div
                        className="absolute inset-0 rounded-2xl opacity-[0.02] pointer-events-none mix-blend-overlay"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                        }}
                    />

                    {/* ── edge border (subtle) ── */}
                    <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                            boxShadow: `
                                inset 0 0 0 1px rgba(255,255,255,0.04),
                                inset 0 1px 0 rgba(255,255,255,0.08),
                                0 20px 40px rgba(0,0,0,0.5)
                            `,
                        }}
                    />

                    {/* ── top gold accent line (minimal) ── */}
                    <div
                        className="absolute top-0 left-10 right-10 h-[1px] rounded-full pointer-events-none z-20 opacity-60"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5) 50%, transparent)',
                        }}
                    />

                    {/* ════════════════════════════
                        CONTENT
                    ═════════════════════════════ */}
                    <div className="relative h-full flex flex-col justify-between p-6 z-10" style={{ transformStyle: 'preserve-3d' }}>

                        {/* ── TOP ROW ── */}
                        <div className="flex items-start justify-between">
                            {/* wordmark */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span
                                        className="text-sm font-bold tracking-tight"
                                        style={{ color: 'rgba(245,158,11,0.9)' }}
                                    >
                                        NullPay
                                    </span>
                                </div>
                                <p
                                    className="text-[8px] font-medium tracking-[0.2em] uppercase"
                                    style={{ color: 'rgba(255,255,255,0.15)' }}
                                >
                                    Private Gift Card
                                </p>
                            </div>

                            {/* tag icon */}
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(4px)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                }}
                            >
                                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                                    <path d="M6.5 1H10.5C10.776 1 11 1.224 11 1.5V5.5C11 5.633 10.947 5.76 10.854 5.854L5.354 11.354C4.963 11.744 4.33 11.744 3.94 11.354L0.646 8.06C0.256 7.67 0.256 7.037 0.646 6.646L6.146 1.146C6.24 1.053 6.367 1 6.5 1Z"
                                        stroke="rgba(245,158,11,0.4)" strokeWidth="1" fill="none" />
                                    <circle cx="8.5" cy="3.5" r="0.75" fill="rgba(245,158,11,0.5)" />
                                </svg>
                            </div>
                        </div>

                        {/* ── CHIP ── */}
                        <div
                            className="w-10 h-8 rounded-md self-start"
                            style={{
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.5) 0%, rgba(251,191,36,0.3) 40%, rgba(245,158,11,0.4) 100%)',
                                border: '1px solid rgba(251,191,36,0.25)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.4)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* chip contacts */}
                            <div className="absolute inset-1 grid grid-cols-2 gap-0.5 opacity-60">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="rounded-sm" style={{ background: 'rgba(180,130,0,0.5)', height: '4px' }} />
                                ))}
                            </div>
                        </div>

                        {/* ── BODY: refined balance display ── */}
                        <div>
                            {hasValue ? (
                                <div className="flex gap-10 items-end flex-wrap">
                                    {nonZeroTokens.map(token => {
                                        const cfg = TOKEN_CONFIG[token];
                                        return (
                                            <div key={token} className="group relative">
                                                <div className="flex items-center gap-1.5 mb-2 transition-opacity group-hover:opacity-100 opacity-60">
                                                    <div className="w-1 h-1 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                                                    <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-white/40">
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <p
                                                    className="text-3xl font-bold tracking-tighter text-white leading-none"
                                                    style={{
                                                        textShadow: `0 4px 12px ${cfg.glow}`,
                                                    }}
                                                >
                                                    {Number(amounts![token]).toFixed(2)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : giftCode ? (
                                <div>
                                    <div
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md mb-2"
                                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                                    >
                                        <div className="w-1 h-1 rounded-full" style={{ background: '#F59E0B', boxShadow: '0 0 4px #F59E0B' }} />
                                        <span className="text-[8px] font-medium tracking-[0.2em] uppercase" style={{ color: 'rgba(245,158,11,0.7)' }}>
                                            Secret Code
                                        </span>
                                    </div>
                                    <p
                                        className="text-xs font-medium break-all leading-relaxed"
                                        style={{ color: 'rgba(245,158,11,0.6)', fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        {giftCode.substring(0, 22)}
                                        <span style={{ color: 'rgba(245,158,11,0.3)' }}>···</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="h-2 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                    <div className="h-6 w-28 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s ease-in-out infinite' }} />
                                </div>
                            )}
                        </div>

                        {/* ── BOTTOM ROW ── */}
                        <div className="flex items-end justify-between">
                            <div className="opacity-10">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B', boxShadow: '0 0 4px #F59E0B' }} />
                                    <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        ZK PROOFED
                                    </span>
                                </div>
                            </div>

                            {/* Subtle concentric circle mark removed for purity, or just extremely faint */}
                        </div>

                    </div>

                    {/* ── bottom edge accent ── */}
                    <div
                        className="absolute bottom-0 left-8 right-8 h-[1px] rounded-full pointer-events-none"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)',
                        }}
                    />

                </motion.div>
            </div>
        </>
    );
};