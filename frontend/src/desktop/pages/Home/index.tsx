import { motion, useScroll, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Lock, Globe, Eye, EyeOff, FileText, Layers, Coins, KeyRound, ExternalLink, Binary, Fingerprint, Cpu } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import DottedGlobe from './components/DottedGlobe';
import { AnimatedBanner } from './components/AnimatedBanner';
import { RedditMarquee } from './components/RedditMarquee';
import { FlashlightEffect } from './components/FlashlightEffect';

/* ─── EASING & VARIANTS ─────────────────────────────────────────── */
const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: easePremium } }
};

// const fadeInLeft = {
//     hidden: { opacity: 0, x: -40 },
//     show: { opacity: 1, x: 0, transition: { duration: 1, ease: easePremium } }
// };

const fadeInScale = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: easePremium } },
};

const staggerSlow = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

/* ─── GRAIN OVERLAY ─────────────────────────────────────────────── */
const GrainOverlay = () => (
    <div
        className="pointer-events-none fixed inset-0 z-[999] opacity-[0.032]"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
        }}
    />
);

/* ─── GLOW DIVIDER ──────────────────────────────────────────────── */
const GlowDivider = () => (
    <div className="relative w-full h-px overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent blur-[1px]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-2 bg-orange-500/10 rounded-full blur-xl" />
    </div>
);


/* ─── SECTION LABEL ─────────────────────────────────────────────── */
const SectionLabel = ({ children, color = 'text-white/40' }: { children: ReactNode; color?: string }) => (
    <motion.span
        className={`font-mono text-[10px] uppercase tracking-[0.35em] font-semibold ${color} inline-flex items-center gap-2`}
    >
        <span className="w-6 h-px bg-current opacity-40" />
        {children}
        <span className="w-6 h-px bg-current opacity-40" />
    </motion.span>
);

/* ─── BENTO FEATURE CARD ────────────────────────────────────────── */
const FeatureCard = ({
    icon: Icon,
    title,
    desc,
    accentColor,
    glowColor,
    className = '',
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    accentColor: string;
    glowColor: string;
    className?: string;
}) => (
    <motion.div variants={fadeInScale} className={`relative group ${className}`}>
        {/* Animated border glow */}
        <div
            className={`absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-sm ${glowColor}`}
        />

        <div className="relative p-6 lg:p-7 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-white/[0.06] group-hover:border-white/[0.12] transition-all duration-700 h-full overflow-hidden">
            {/* Top shimmer line */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${accentColor} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

            {/* Corner glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl`} />

            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-opacity-40 transition-all duration-500`}>
                <Icon className={`w-5 h-5 ${accentColor.replace('/50', '').replace('/40', '')}`} />
            </div>

            <h3 className="text-[15px] font-bold mb-2.5 text-white/90 tracking-tight group-hover:text-white transition-colors">{title}</h3>
            <p className="text-white/30 text-[13px] leading-relaxed group-hover:text-white/50 transition-colors duration-500">{desc}</p>
        </div>
    </motion.div>
);

/* ─── TRUST BADGE ROW ───────────────────────────────────────────── */
const TrustBar = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8, ease: easePremium }}
        className="flex flex-wrap items-center gap-3 md:gap-4 justify-center pt-6 mx-auto"
    >
        {[
            { label: '100% Private' },
            { label: 'ZK Native' },
            { label: 'Built on Aleo' },
            { label: 'Non-Custodial' },
        ].map(({ label }, i) => (
            <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + (i * 0.1), duration: 0.5, ease: easePremium }}
                className="group relative flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-orange-500/20 transition-all duration-500 backdrop-blur-xl cursor-default"
            >
                <span className="text-[10px] font-mono-syne tracking-[0.25em] text-white/40 group-hover:text-white transition-colors uppercase font-bold">{label}</span>
            </motion.div>
        ))}
    </motion.div>
);

/* ═══════════════════════════════════════════════════════════════ */
const HeroGrid = () => {
    const mouseX = useMotionValue(-1000);
    const mouseY = useMotionValue(-1000);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const gridEl = document.getElementById('hero-grid');
            if (gridEl) {
                const { left, top } = gridEl.getBoundingClientRect();
                mouseX.set(e.clientX - left);
                mouseY.set(e.clientY - top);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div
            id="hero-grid"
            className="absolute inset-0 z-0 overflow-hidden bg-[#030303] pointer-events-none"
        >
            {/* Global faint background grid */}
            <motion.div
                className="absolute inset-0 opacity-20 pointer-events-none"
                animate={{ backgroundPosition: ['0px 0px', '64px 64px'] }}
                transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, #000 10%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 50%, #000 10%, transparent 100%)',
                }}
            />

            {/* Glowing active orange grid lines localized to cursor */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-[0.45]"
                animate={{ backgroundPosition: ['0px 0px', '64px 64px'] }}
                transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
                style={{
                    backgroundImage: 'linear-gradient(to right, #f97316 1px, transparent 1px), linear-gradient(to bottom, #f97316 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: useMotionTemplate`radial-gradient(180px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                    WebkitMaskImage: useMotionTemplate`radial-gradient(180px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                }}
            />



            {/* Aurora blobs */}
            <div className="pointer-events-none">
                <motion.div
                    animate={{ x: [0, 100, -60, 0], y: [0, -60, 80, 0], scale: [1, 1.15, 0.9, 1] }}
                    transition={{ duration: 28, ease: 'easeInOut', repeat: Infinity }}
                    className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] bg-orange-600/8 rounded-full blur-[180px]"
                />
                <motion.div
                    animate={{ x: [0, -80, 50, 0], y: [0, 80, -100, 0], scale: [1, 0.85, 1.2, 1] }}
                    transition={{ duration: 35, ease: 'easeInOut', repeat: Infinity, delay: 3 }}
                    className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-orange-500/6 rounded-full blur-[200px]"
                />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════ */
const Home = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <FlashlightEffect>
            <GrainOverlay />
            <motion.div className="scroll-progress" style={{ scaleX }} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

                :root {
                    --premium-amber: #f97316;
                    --premium-amber-glow: rgba(249, 115, 22, 0.45);
                    --premium-slate: #030303;
                    --glass-border: rgba(255, 255, 255, 0.08);
                    --glass-bg: rgba(255, 255, 255, 0.03);
                }

                @property --beam-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }

                .font-display { font-family: 'Space Grotesk', sans-serif; }
                .font-mono-syne { font-family: 'Space Grotesk', monospace; }

                .text-reveal {
                    mask-image: linear-gradient(to right, white, white 50%, transparent);
                    mask-size: 200% 100%;
                    mask-position: 100% 0;
                    animation: reveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }

                @keyframes reveal {
                    to { mask-position: 0% 0; }
                }

                .text-stroke {
                    -webkit-text-stroke: 1.5px rgba(255,255,255,0.1);
                    color: transparent;
                    transition: -webkit-text-stroke 0.5s ease;
                }
                .text-stroke:hover {
                    -webkit-text-stroke: 1.2px rgba(255,255,255,0.4);
                }

                .premium-button {
                    position: relative;
                    padding: 1rem 2rem;
                    border-radius: 9999px;
                    background: #111;
                    color: white;
                    font-weight: 600;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                    border: 1px solid var(--glass-border);
                }

                .premium-button:hover {
                    transform: translateY(-2px);
                    border-color: rgba(249, 115, 22, 0.5);
                    box-shadow: 0 0 25px rgba(249, 115, 22, 0.2);
                }

                .premium-button::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transform: translateX(-100%);
                    transition: transform 0.6s ease;
                }

                .premium-button:hover::after {
                    transform: translateX(100%);
                }

                .premium-button-primary {
                    background: var(--premium-amber);
                    border-color: var(--premium-amber);
                    box-shadow: 0 4px 20px rgba(249, 115, 22, 0.3);
                }

                .premium-button-primary:hover {
                    background: #fb923c;
                    box-shadow: 0 8px 30px rgba(249,115,22,0.5);
                }

                /* Border Beam Animation */
                .border-beam {
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: conic-gradient(from var(--beam-angle), transparent 70%, var(--premium-amber) 85%, transparent 100%);
                    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    mask-composite: exclude;
                    animation: beam-spin 4s linear infinite;
                    pointer-events: none;
                }

                @keyframes beam-spin {
                    from { --beam-angle: 0deg; }
                    to { --beam-angle: 360deg; }
                }

                /* Scroll Progress */
                .scroll-progress {
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: var(--premium-amber);
                    transform-origin: 0%;
                    z-index: 1000;
                    box-shadow: 0 0 10px var(--premium-amber);
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float 6s ease-in-out infinite; animation-delay: 3s; }

                @keyframes float-premium {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-12px) rotate(1deg); }
                }

                .animate-float-premium {
                    animation: float-premium 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                }

                @keyframes pulse-ring {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    50% { opacity: 0.3; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }

                @keyframes orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes orbit-r {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }

                .scanline {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, transparent 50%, rgba(249, 115, 22, 0.03) 51%, transparent 100%);
                    background-size: 100% 4px;
                    pointer-events: none;
                    animation: scan 8s linear infinite;
                    opacity: 0.3;
                }

                @keyframes scan {
                    from { background-position: 0 0; }
                    to { background-position: 0 100%; }
                }

                .aurora-blur {
                    filter: blur(120px) saturate(150%);
                    mix-blend-mode: screen;
                }
            `}</style>


            <div
                className="min-h-screen bg-[#030303] text-white relative font-display w-full overflow-x-hidden"
            >
                <main className="relative z-10 w-full overflow-hidden">

                    {/* ══════════════════════════════════════ */}
                    {/* HERO                                  */}
                    {/* ══════════════════════════════════════ */}
                    <section className="relative min-h-[80vh] flex items-center overflow-hidden">

                        {/* Scanline effect */}
                        <div className="scanline z-20" />

                        {/* Background: Animated grid */}
                        <HeroGrid />

                        <motion.div
                            variants={fadeInScale}
                            initial="hidden"
                            animate="show"
                            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                        >
                            <div className="absolute right-[-18rem] top-1/2 -translate-y-1/2 opacity-80 sm:right-[-12rem] md:right-[-12%] lg:right-[-8%] xl:right-[-4%]">
                              <DottedGlobe className="w-[26rem] max-w-none sm:w-[30rem] md:w-[34rem] lg:w-[38rem] xl:w-[42rem]" />
                            </div>
                        </motion.div>

                        {/* Hero content */}
                        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pt-36 pb-12">
                            <motion.div
                                variants={staggerSlow}
                                initial="hidden"
                                animate="show"
                                className="mx-auto flex max-w-6xl flex-col items-center gap-10"
                            >
                                <div className="relative flex w-full justify-center overflow-visible">
                                    <div className="relative z-20 flex max-w-4xl flex-col items-center text-center">
                                        {/* Main headline */}
                                        <motion.div variants={fadeInUp} className="relative z-20">
                                            <h1 className="text-5xl font-black leading-[0.92] tracking-tighter text-reveal md:text-7xl lg:text-[5rem] xl:text-[5.8rem]">
                                                <span className="text-white inline-block mb-1 md:mb-3">Pay Privately.</span>
                                                <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-400 drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]">Nullify</span>
                                                {' '}
                                                <span className="text-stroke">the Trace.</span>
                                            </h1>
                                        </motion.div>

                                        <motion.p
                                            variants={fadeInUp}
                                            className="max-w-2xl pt-6 text-xl font-light leading-relaxed tracking-wide text-white/40 md:text-2xl lg:text-[1.35rem]"
                                        >
                                            The ultimate privacy layer for Aleo. Settle invoices with zero-knowledge proofs.
                                            Protect your <span className="text-white/80 font-medium border-b border-orange-500/30">identity</span> and <span className="text-white/80 font-medium border-b border-orange-500/30">holdings</span> from the public eye.
                                        </motion.p>

                                        {/* CTAs */}
                                        <motion.div
                                            variants={fadeInUp}
                                            className="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row"
                                        >
                                            <Link
                                                to="/explorer"
                                                className="premium-button premium-button-primary group inline-flex min-w-[180px] items-center justify-center gap-2 px-6 py-3"
                                            >
                                                <span className="text-base relative z-10">Get Started</span>
                                                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                            </Link>

                                            <Link
                                                to="/docs"
                                                className="premium-button group inline-flex min-w-[180px] items-center justify-center gap-2 px-6 py-3"
                                            >
                                                <span className="text-base text-white/60 group-hover:text-white transition-colors relative z-10">Documentation</span>
                                                <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                                            </Link>
                                        </motion.div>
                                    </div>
                                </div>

                                <TrustBar />
                            </motion.div>

                        </div>

                        {/* Bottom fade */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030303] to-transparent z-10 pointer-events-none" />
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* ANIMATED BANNER                       */}
                    {/* ══════════════════════════════════════ */}
                    <AnimatedBanner />

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* THE PROBLEM                           */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-20 lg:py-24 px-6 md:px-12 lg:px-24">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            className="max-w-5xl mx-auto"
                        >
                            <div className="text-center mb-12">
                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">The Problem</span>
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-[-0.03em] mt-4 leading-tight">
                                    Public Ledgers{' '}
                                    <span
                                        className="text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.45)]"
                                        style={{ fontStyle: 'italic' }}
                                    >
                                        Expose You
                                    </span>
                                </h2>
                                <p className="text-white/35 text-base mt-4 max-w-xl mx-auto font-light tracking-wide leading-relaxed">
                                    Every transaction broadcasts your wallet balance, history, and habits to the entire world.
                                </p>
                            </div>
                        </motion.div>

                        {/* Full-bleed Marquee */}
                        <div className="mt-12 md:mt-16 overflow-hidden w-full">
                            <RedditMarquee />
                        </div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* WHAT IS NULLPAY — FEATURE BENTO       */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 md:py-36 px-6 md:px-12 lg:px-24 relative overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[90vw] h-[50vh] bg-orange-500/3 rounded-full blur-[150px]" />
                        </div>

                        {/* Large backdrop text */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none overflow-hidden">
                            <span className="text-[25vw] font-black text-white/[0.012] tracking-tighter leading-none whitespace-nowrap">
                                FEATURES
                            </span>
                        </div>

                        <motion.div
                            variants={staggerSlow}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-100px' }}
                            className="max-w-7xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-20">
                                <SectionLabel color="text-orange-400/60">The Solution</SectionLabel>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-[-0.04em] mt-6">
                                    What is{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-amber-400">
                                        NullPay?
                                    </span>
                                </h2>
                                <p className="text-white/30 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed font-light">
                                    A decentralized invoice and payment protocol that breaks the link between sender and receiver.
                                    Create invoices, collect payments, and settle — all without exposing who paid whom, or how much.
                                </p>
                            </motion.div>

                            {/* Bento Grid Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Large featured card — spans 2 columns */}
                                <motion.div variants={fadeInScale} className="lg:col-span-2 relative group">
                                    <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-sm bg-orange-500/10" />
                                    <div className="relative p-8 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-white/[0.06] group-hover:border-orange-500/20 transition-all duration-700 h-full overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-orange-500/8 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                <Shield className="w-6 h-6 text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold mb-3 text-white tracking-tight">Zero-Knowledge Invoices</h3>
                                                <p className="text-white/30 text-sm leading-relaxed max-w-lg">
                                                    Invoice details are hashed on-chain using BHP256 cryptography. Only the hash is public — merchant address, amount, and metadata remain completely private. No one can see what you're being billed for or how much you owe.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <FeatureCard
                                    icon={EyeOff}
                                    title="Untraceable Payments"
                                    desc="Payments use Aleo's private transfer function. The sender's identity is never revealed on-chain. No one can trace who paid the invoice."
                                    accentColor="via-cyan-400/50"
                                    glowColor="bg-cyan-500/10"
                                />

                                <FeatureCard
                                    icon={Layers}
                                    title="Dual-Record System"
                                    desc="Every payment atomically generates two encrypted receipts — a PayerReceipt and MerchantReceipt. Both parties get proof without public exposure."
                                    accentColor="via-violet-400/50"
                                    glowColor="bg-violet-500/10"
                                />

                                <FeatureCard
                                    icon={Coins}
                                    title="Multi-Asset Support"
                                    desc="Pay with Aleo Credits, USDCx, or USAD (private stablecoins). Merchants choose which assets to accept with full atomic swap execution."
                                    accentColor="via-emerald-400/50"
                                    glowColor="bg-emerald-500/10"
                                />

                                <FeatureCard
                                    icon={FileText}
                                    title="Flexible Invoice Types"
                                    desc="Standard invoices for one-time payments, Multi-Pay invoices for crowdfunding, and Donation invoices with open-ended amounts."
                                    accentColor="via-orange-400/50"
                                    glowColor="bg-orange-500/10"
                                />

                                {/* Large featured card — spans 3 columns (full width) */}
                                <motion.div variants={fadeInScale} className="lg:col-span-3 relative group">
                                    <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-sm bg-cyan-500/8" />
                                    <div className="relative p-8 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-white/[0.06] group-hover:border-cyan-500/15 transition-all duration-700 h-full overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
                                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                    <KeyRound className="w-6 h-6 text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold mb-3 text-white tracking-tight">AES-256 Encrypted Metadata</h3>
                                                    <p className="text-white/30 text-sm leading-relaxed max-w-lg">
                                                        Off-chain data is encrypted with AES-256. We don't store amounts or memos in plaintext. Even if our database were compromised, your financial data stays completely safe and unreadable.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 shrink-0">
                                                {[
                                                    { icon: Binary, label: 'BHP256' },
                                                    { icon: Fingerprint, label: 'AES-256' },
                                                    { icon: Cpu, label: 'ZK-SNARK' },
                                                ].map(({ icon: Ico, label }) => (
                                                    <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                        <Ico className="w-5 h-5 text-cyan-400/60" />
                                                        <span className="text-[9px] font-mono tracking-[0.15em] text-white/25 uppercase">{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* MOBILE SUITE                          */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-20 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden bg-gradient-to-b from-transparent via-orange-500/[0.02] to-transparent">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9 }}
                            className="max-w-6xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                {/* Phone mockup */}
                                <div className="order-2 lg:order-1 flex justify-center lg:justify-start relative">
                                    {/* Halo glow under phone */}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-16 bg-orange-500/20 rounded-full blur-3xl" />
                                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#030303] via-transparent to-transparent z-10" />

                                    <div className="relative z-0">
                                        <img
                                            src="/assets/nullpay_mobile01-left.png"
                                            alt="NullPay Mobile"
                                            className="w-full max-w-[420px] h-auto drop-shadow-[0_30px_80px_rgba(249,115,22,0.12)]"
                                        />
                                    </div>
                                </div>

                                {/* Text */}
                                <div className="order-1 lg:order-2 space-y-8">
                                    <div>
                                        <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-orange-400/70 font-semibold">Mobile Suite</span>
                                        <h2 className="text-xl md:text-2xl lg:text-3xl font-black mt-4 tracking-[-0.03em] leading-tight text-white">
                                            Privacy in Your{' '}
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Pocket</span>
                                        </h2>
                                    </div>

                                    <p className="text-white/40 text-xs md:text-sm leading-loose max-w-xl font-light">
                                        Take absolute financial privacy wherever you go. NullPay V1 Mobile is now live, bringing the power of zero-knowledge cryptography to your smartphone.
                                    </p>

                                    <div className="pt-3 pb-2">
                                        <a 
                                            href="https://play.google.com/store/apps/details?id=com.provable.shieldmobile" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="group inline-flex items-center gap-3 bg-[#060606] border border-white/[0.08] hover:border-orange-500/40 hover:bg-[#111] transition-all rounded-xl px-5 py-2.5 shadow-2xl overflow-hidden relative cursor-pointer"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5 3.5V20.5C5 21.05 5.51 21.41 6 21.14L19.45 12.64C19.9 12.35 19.9 11.65 19.45 11.36L6 2.86C5.51 2.59 5 2.95 5 3.5Z" fill="url(#play-grad)"/>
                                                <defs>
                                                    <linearGradient id="play-grad" x1="5" y1="3" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                                                        <stop stopColor="#4ADE80" />
                                                        <stop offset="0.5" stopColor="#3B82F6" />
                                                        <stop offset="1" stopColor="#EF4444" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="flex flex-col text-left relative z-10">
                                                <span className="text-[9px] uppercase tracking-wider text-white/50 font-medium leading-[1]">Get it on</span>
                                                <span className="text-[15px] font-semibold text-white leading-tight mt-[2px]">Google Play</span>
                                            </div>
                                        </a>
                                    </div>

                                    <div className="flex items-center gap-6 py-4 border-y border-white/[0.06]">
                                        {[
                                            { value: '100%', label: 'Private' },
                                            { value: 'AES-256', label: 'Encrypted' },
                                        ].map(({ value, label }) => (
                                            <div key={label} className="flex flex-col">
                                                <span className="font-black text-white text-lg tracking-tight">{value}</span>
                                                <span className="font-mono-syne text-[9px] uppercase tracking-[0.2em] text-white/30">{label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        {[
                                            {
                                                icon: Shield,
                                                title: 'Shield Wallet Beta',
                                                desc: 'Integrated with Shield Wallet for secure key management and private transactions.',
                                                color: 'text-orange-400',
                                                bg: 'bg-orange-500/8',
                                                border: 'border-orange-500/15',
                                                float: true,
                                            },
                                            {
                                                icon: Globe,
                                                title: 'Private QR Scan',
                                                desc: 'Scan invoice QR codes and settle payments privately at point-of-sale terminals.',
                                                color: 'text-cyan-400',
                                                bg: 'bg-cyan-500/8',
                                                border: 'border-cyan-500/15',
                                                float: false,
                                            },
                                        ].map(({ icon: Ico, title, desc, color, bg, border, float: f }) => (
                                            <div
                                                key={title}
                                                className={`p-5 rounded-2xl bg-[#080808] border ${border} hover:border-opacity-60 hover:shadow-[0_0_30px_rgba(249,115,22,0.06)] transition-all duration-500 group relative overflow-hidden`}
                                            >
                                                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${color.replace('text-', 'via-')}/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                                <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${f ? 'animate-float' : 'animate-float-delayed'}`}>
                                                    <Ico className={`w-4 h-4 ${color}`} />
                                                </div>
                                                <h4 className="font-bold text-white mb-2 text-sm tracking-tight">{title}</h4>
                                                <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.07]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                            <span className="font-mono-syne text-[9px] uppercase tracking-[0.2em] text-white/30">Performance optimized for mobile</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* HOW IT WORKS                          */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-20 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Giant backdrop text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                            <span className="text-[15vw] font-black text-white/[0.015] tracking-tighter leading-none whitespace-nowrap">
                                PRIVATE
                            </span>
                        </div>

                        <motion.div
                            variants={staggerSlow}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-80px' }}
                            className="max-w-6xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold">How It Works</span>
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-[-0.03em] mt-4">
                                    Three Steps{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">to Privacy</span>
                                </h2>
                                <p className="text-white/35 text-sm md:text-base mt-4 max-w-xl mx-auto font-light leading-relaxed">
                                    From invoice creation to private settlement — the entire flow is designed around zero-knowledge.
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                                {/* Animated Connection Line */}
                                <div className="hidden md:block absolute top-[68px] left-[10%] right-[10%] h-[2px] z-0">
                                    <div className="w-full h-full bg-white/[0.03]" />
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        whileInView={{ scaleX: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 2, ease: "easeInOut" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent origin-left blur-[1px]"
                                    />
                                </div>

                                {[
                                    { step: '01', title: 'Create Invoice', desc: 'Construct a private invoice. Details are hashed using BHP256, ensuring absolute data integrity without public exposure.', icon: FileText, delay: 0.1 },
                                    { step: '02', title: 'Share & Verify', desc: "Distribute a secure link. The payer's client validates the on-chain hash, ensuring the invoice is authentic and unmodified.", icon: Globe, delay: 0.3 },
                                    { step: '03', title: 'Zero-Knowledge Pay', desc: "Settle via private transfer. Funds move atomically while maintaining full anonymity for both parties.", icon: Lock, delay: 0.5 },
                                ].map((s, i) => (
                                    <motion.div
                                        key={i}
                                        variants={fadeInUp}
                                        initial="hidden"
                                        whileInView="show"
                                        viewport={{ once: true }}
                                        transition={{ delay: s.delay }}
                                    >
                                        <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-[#080808]/50 backdrop-blur-md border border-white/[0.05] hover:border-orange-500/30 transition-all duration-700 group h-full relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                            <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                <div className="absolute inset-0 rounded-2xl bg-orange-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                                                <s.icon className="w-5 h-5 text-white/40 group-hover:text-orange-400 transition-colors" />
                                            </div>

                                            <h3 className="text-lg font-bold text-white mb-3 tracking-tight relative z-10">{s.title}</h3>
                                            <p className="text-white/40 text-sm leading-relaxed font-light group-hover:text-white/60 transition-colors duration-500 relative z-10">{s.desc}</p>

                                            <div className="mt-6 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] relative z-10">
                                                <span className="font-mono-syne text-[9px] uppercase tracking-widest text-white/30 group-hover:text-orange-400/80 transition-colors">Phase {s.step}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* POWERED BY ALEO                       */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-20 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9 }}
                            className="max-w-6xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                {/* Text */}
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/8 border border-orange-500/20">
                                        <Layers className="w-3.5 h-3.5 text-orange-400" />
                                        <span className="font-mono-syne text-[10px] font-bold tracking-[0.25em] text-orange-400 uppercase">Architecture</span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-[-0.03em] leading-tight">
                                        Powered by{' '}
                                        <span className="text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]">Aleo</span>
                                    </h2>
                                    <p className="text-white/40 font-light leading-relaxed text-sm md:text-base">
                                        Aleo is a <strong className="text-white font-semibold">Layer-1 blockchain</strong> purpose-built for zero-knowledge applications. Unlike Ethereum or Solana where privacy is an afterthought, Aleo makes ZK-proofs a native, first-class feature.
                                    </p>
                                    <div className="space-y-3 pt-2">
                                        {[
                                            { label: 'Off-Chain Execution', desc: 'Smart contracts execute privately to generate proofs.' },
                                            { label: 'Encrypted Records', desc: 'Only the record owner can decrypt and view their data.' },
                                            { label: 'Shielded Transfers', desc: 'Private token movements with no public trace.' },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-orange-500/20 hover:bg-orange-500/3 transition-all duration-400 group">
                                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0 group-hover:shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-shadow" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-white mb-0.5 group-hover:text-orange-400 transition-colors">{item.label}</h4>
                                                    <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Upgraded Orbital Diagram */}
                                <div className="flex justify-center">
                                    <div className="relative w-full aspect-square max-w-[320px]">
                                        {/* Background Pulse Rings */}
                                        <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 border border-orange-500/10 rounded-full animate-[pulse-ring_4s_ease-out_infinite]" />
                                        <div className="absolute top-1/2 left-1/2 w-3/4 h-3/4 -translate-x-1/2 -translate-y-1/2 border border-orange-500/5 rounded-full animate-[pulse-ring_4s_ease-out_infinite_1s]" />

                                        {/* Outer ring - Blurred */}
                                        <div
                                            className="absolute inset-0 rounded-full opacity-40"
                                            style={{
                                                border: '1px solid rgba(249,115,22,0.1)',
                                                animation: 'orbit 28s linear infinite',
                                                filter: 'blur(1px)',
                                            }}
                                        >
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-400/30 blur-sm shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                                        </div>

                                        {/* Middle ring - Sharp */}
                                        <div
                                            className="absolute inset-8 rounded-full border-dashed"
                                            style={{
                                                border: '1px dashed rgba(255,255,255,0.1)',
                                                animation: 'orbit-r 22s linear infinite',
                                            }}
                                        >
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
                                            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                                        </div>

                                        {/* Inner ring - Sharpest */}
                                        <div
                                            className="absolute inset-16 rounded-full"
                                            style={{
                                                border: '1px solid rgba(249,115,22,0.3)',
                                                animation: 'orbit 15s linear infinite',
                                            }}
                                        >
                                            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                                        </div>

                                        {/* Center core - Premium Glass */}
                                        <div className="absolute inset-[85px] rounded-full bg-gradient-to-br from-orange-600/20 via-orange-500/5 to-transparent backdrop-blur-2xl flex items-center justify-center border border-orange-500/30 shadow-[0_0_60px_rgba(249,115,22,0.2),inset_0_0_30px_rgba(249,115,22,0.1)] group">
                                            <div className="absolute inset-0 rounded-full border-beam" />
                                            <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                <Zap className="w-7 h-7 text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] animate-pulse" />
                                                <span className="font-mono-syne text-[8px] font-black tracking-[0.3em] uppercase text-orange-400/90">CORE</span>
                                            </div>
                                        </div>

                                        {/* Background glow */}
                                        <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-[80px] scale-75 pointer-events-none" />
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* COMPARISON                            */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-20 lg:py-24 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Backdrop text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                            <span className="text-[14vw] font-black text-white/[0.015] tracking-tighter leading-none">
                                ZERO
                            </span>
                        </div>

                        <motion.div
                            variants={staggerSlow}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-80px' }}
                            className="max-w-6xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold">Why NullPay</span>
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-[-0.03em] mt-4">
                                    Privacy is{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Not Optional</span>
                                </h2>
                                <p className="text-white/35 text-sm md:text-base mt-4 max-w-xl mx-auto font-light">
                                    See how NullPay fundamentally differs from traditional blockchain payments.
                                </p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
                                {/* Traditional */}
                                <div className="p-8 lg:p-10 rounded-3xl bg-[#080808]/40 backdrop-blur-sm border border-white/[0.03] relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                            <Eye className="w-5 h-5 text-white/20" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white/30 tracking-[0.2em] uppercase">Public Chains</h3>
                                    </div>
                                    <div className="space-y-5">
                                        {[
                                            'Exposed Wallet Balances',
                                            'Trackable Transaction Graphs',
                                            'Deanonymized Identities',
                                            'Public Ledger Surveillance',
                                            'Zero Financial Autonomy',
                                            'Data Leaks by Default',
                                        ].map((item) => (
                                            <div key={item} className="flex items-center gap-4 text-sm text-white/20">
                                                <div className="w-5 h-5 rounded-full border border-white/5 flex items-center justify-center shrink-0 text-[10px] text-white/10">✕</div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* VS badge */}
                                <div className="flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center shrink-0 backdrop-blur-md shadow-2xl">
                                        <span className="font-mono-syne text-[10px] font-black text-white/20 tracking-wider">VS</span>
                                    </div>
                                </div>

                                {/* NullPay */}
                                <div className="relative p-10 rounded-3xl bg-[#080808]/80 backdrop-blur-xl border border-white/5 overflow-hidden group hover:border-orange-500/20 transition-all duration-700">
                                    <div className="border-beam opacity-40 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.05] via-transparent to-transparent pointer-events-none" />

                                    <div className="flex items-center gap-4 mb-10 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.15)] group-hover:scale-110 transition-transform">
                                            <EyeOff className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white/80 tracking-[0.2em] uppercase">NullPay Protocol</h3>
                                    </div>
                                    <div className="space-y-5 relative z-10">
                                        {[
                                            'Shielded Record Balances',
                                            'Zero-Knowledge Proofs',
                                            'Atomic Private Transfers',
                                            'Encrypted Metadata Layers',
                                            'Native Aleo Cryptography',
                                            'Absolute Financial Privacy',
                                        ].map((item) => (
                                            <div key={item} className="flex items-center gap-4 text-sm text-white/50 group-hover:text-white/80 transition-all duration-500 translate-x-0 group-hover:translate-x-1">
                                                <div className="w-5 h-5 rounded-full border border-orange-500/20 bg-orange-500/5 flex items-center justify-center shrink-0 text-[10px] text-orange-400">✓</div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* FINAL CTA                             */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 lg:py-32 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Radial halo or "Sunset" glow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent blur-[120px]" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-4xl mx-auto text-center relative z-10"
                        >
                            <span className="font-mono-syne text-[10px] uppercase tracking-[0.4em] text-orange-400/80 font-bold">The Final Frontier</span>

                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter mt-6 mb-6 leading-[1.1]">
                                Engineering <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Financial Freedom.</span>
                            </h2>

                            <p className="text-white/40 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed font-light">
                                Join the network where privacy is not a feature, but a fundamental right.
                                Secure your transactions with zero-knowledge technology.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link
                                    to="/explorer"
                                    className="premium-button premium-button-primary group inline-flex items-center justify-center gap-3 min-w-[220px] py-4"
                                >
                                    <span className="text-base font-bold">Enter the Explorer</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>

                                <Link
                                    to="/docs"
                                    className="premium-button group inline-flex items-center justify-center gap-3 min-w-[220px] py-4"
                                >
                                    <span className="text-base text-white/50 group-hover:text-white transition-colors">Read Documentation</span>
                                    <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                            </div>

                            <div className="mt-24 pt-10 border-t border-white/[0.03]">
                                <div className="flex flex-col items-center gap-4 opacity-40 hover:opacity-80 transition-opacity duration-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        <span className="font-mono-syne text-[9px] tracking-[0.5em] uppercase text-white/60">
                                            SECURED BY ALEO ZK-PROOF SYSTEMS
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>


                </main>
            </div>
        </FlashlightEffect>
    );
};

export default Home;
