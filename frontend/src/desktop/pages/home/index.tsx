import { motion, useScroll, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Lock, Globe, Eye, EyeOff, FileText, Layers, Coins, KeyRound, ExternalLink, Binary, Fingerprint, Cpu } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import DottedGlobe from './components/DottedGlobe';
import { AnimatedBanner } from './components/AnimatedBanner';
import { RedditMarquee } from './components/RedditMarquee';
import { FlashlightEffect } from './components/FlashlightEffect';
import { useShieldAvailability } from '../../../shared/hooks/wallet/useShieldAvailability';

const SHIELD_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.provable.shieldmobile';
const SHIELD_APP_STORE_URL = 'https://apps.apple.com/us/app/shield-aleo-wallet/id6757471699';

/* ─── EASING & VARIANTS ─────────────────────────────────────────── */
const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: easePremium } }
};

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
            className={`absolute -inset-[1px] rounded-2xl opacity-100 transition-all duration-700 blur-sm ${glowColor}`}
        />

        <div className="relative p-6 lg:p-7 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-white/[0.12] transition-all duration-700 h-full overflow-hidden">
            {/* Top shimmer line */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${accentColor} to-transparent opacity-100 transition-opacity duration-700`} />

            {/* Corner glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${glowColor} opacity-100 transition-opacity duration-700 blur-3xl`} />

            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.15] flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-500`}>
                <Icon className={`w-5 h-5 ${accentColor.replace('/50', '').replace('/40', '')}`} />
            </div>

            <h3 className="text-[15px] font-bold mb-2.5 text-white tracking-tight transition-colors">{title}</h3>
            <p className="text-white/50 text-[13px] leading-relaxed transition-colors duration-500">{desc}</p>
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
    const mobileGridMask = 'radial-gradient(180px circle at 50% 42%, black 0%, transparent 100%)';

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

            <motion.div
                className="absolute inset-0 pointer-events-none opacity-[0.24] md:hidden"
                animate={{ backgroundPosition: ['0px 0px', '64px 64px'] }}
                transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
                style={{
                    backgroundImage: 'linear-gradient(to right, #f97316 1px, transparent 1px), linear-gradient(to bottom, #f97316 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: mobileGridMask,
                    WebkitMaskImage: mobileGridMask,
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
    const { shouldShowMobileDashboard } = useShieldAvailability();
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
                    <section className="relative flex min-h-[80vh] items-start md:items-center overflow-hidden">

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
                        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pt-6 md:pt-36 pb-12">
                            <motion.div
                                variants={staggerSlow}
                                initial="hidden"
                                animate="show"
                                className="mx-auto flex max-w-6xl flex-col items-center gap-10 md:gap-10"
                            >
                                <motion.div variants={fadeInUp} className="mb-16 flex w-full items-center justify-start gap-3 px-1 py-1 md:hidden">
                                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.18)]">
                                        <div className="h-3.5 w-3.5 rotate-45 border-2 border-black" />
                                    </div>
                                    <span className="text-xl font-black tracking-tight text-white">NullPay</span>
                                </motion.div>

                                <div className="relative flex w-full justify-center overflow-visible">
                                    <div className="relative z-20 flex max-w-4xl flex-col items-center text-center md:items-center md:text-center">
                                        {/* Main headline */}
                                        <motion.div variants={fadeInUp} className="relative z-20">
                                            <h1 className="text-[3.3rem] font-black leading-[0.9] tracking-[-0.06em] text-reveal sm:text-[3.9rem] md:text-7xl lg:text-[5rem] xl:text-[5.8rem]">
                                                <span className="block text-white">Pay Privately.</span>
                                                <span className="block mt-1 md:mt-0">
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-400 drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]">Nullify</span>
                                                    {' '}
                                                    <span className="text-stroke">the Trace.</span>
                                                </span>
                                            </h1>
                                        </motion.div>

                                        <motion.p
                                            variants={fadeInUp}
                                            className="max-w-2xl pt-6 text-xl font-light leading-relaxed tracking-wide text-white/40 md:text-2xl lg:text-[1.35rem]"
                                        >
                                            Private Aleo payments with zero-knowledge proofs.
                                            Protect your <span className="text-white/80 font-medium border-b border-orange-500/30">identity</span> and <span className="text-white/80 font-medium border-b border-orange-500/30">holdings</span>.
                                        </motion.p>

                                        {/* CTAs */}
                                        <motion.div
                                            variants={fadeInUp}
                                            className="flex flex-col items-center justify-center gap-4 pt-6"
                                        >
                                            {shouldShowMobileDashboard ? (
                                                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
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
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="flex flex-row flex-wrap items-center justify-center gap-3">
                                                        <a
                                                            href={SHIELD_PLAY_STORE_URL}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group inline-flex items-center gap-3 bg-[#060606] border border-white/[0.08] hover:border-orange-500/40 hover:bg-[#111] transition-all rounded-xl px-5 py-3 shadow-2xl overflow-hidden relative cursor-pointer min-w-[180px]"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M5 3.5V20.5C5 21.05 5.51 21.41 6 21.14L19.45 12.64C19.9 12.35 19.9 11.65 19.45 11.36L6 2.86C5.51 2.59 5 2.95 5 3.5Z" fill="url(#hero-play-grad)" />
                                                                <defs>
                                                                    <linearGradient id="hero-play-grad" x1="5" y1="3" x2="20" y2="12" gradientUnits="userSpaceOnUse">
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

                                                        <a
                                                            href={SHIELD_APP_STORE_URL}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group inline-flex items-center gap-3 bg-[#060606] border border-white/[0.08] hover:border-orange-500/40 hover:bg-[#111] transition-all rounded-xl px-5 py-3 shadow-2xl overflow-hidden relative cursor-pointer min-w-[180px]"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97C14.32,22,13.89,21.18,12.37,21.18C10.84,21.18,10.37,21.95,9.1,22C7.79,22.05,6.8,20.68,5.96,19.47C4.25,17,2.94,12.45,4.7,9.39C5.57,7.87,7.13,6.91,8.82,6.88C10.1,6.86,11.32,7.75,12.11,7.75C12.89,7.75,14.37,6.68,15.92,6.84C16.57,6.87,18.39,7.1,19.56,8.82C19.47,8.88,17.39,10.1,17.41,12.63C17.44,15.65,20.06,16.66,20.09,16.67C20.06,16.74,19.67,18.11,18.71,19.5M13,3.5C13.73,2.67,14.94,2.04,15.94,2C16.07,3.17,15.6,4.35,14.9,5.19C14.21,6.04,13.07,6.7,11.95,6.61C11.8,5.46,12.36,4.26,13,3.5Z" fill="url(#hero-apple-grad)" />
                                                                <defs>
                                                                    <linearGradient id="hero-apple-grad" x1="5" y1="3" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                                                                        <stop stopColor="#FFFFFF" />
                                                                        <stop offset="1" stopColor="#A1A1AA" />
                                                                    </linearGradient>
                                                                </defs>
                                                            </svg>
                                                            <div className="flex flex-col text-left relative z-10">
                                                                <span className="text-[9px] uppercase tracking-wider text-white/50 font-medium leading-[1]">Download on the</span>
                                                                <span className="text-[15px] font-semibold text-white leading-tight mt-[2px]">App Store</span>
                                                            </div>
                                                        </a>
                                                    </div>

                                                    <p className="text-center text-sm text-white/45 max-w-sm leading-relaxed">
                                                        Download Shield Wallet to use NullPay on mobile.
                                                    </p>
                                                </div>
                                            )}
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
                                    <div className="absolute -inset-[1px] rounded-2xl opacity-100 transition-all duration-700 blur-sm bg-orange-500/10" />
                                    <div className="relative p-8 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-orange-500/20 transition-all duration-700 h-full overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent opacity-100 transition-opacity duration-700" />
                                        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-orange-500/8 blur-3xl opacity-100 transition-opacity duration-700" />
                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                <Shield className="w-6 h-6 text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold mb-3 text-white tracking-tight">Zero-Knowledge Invoices</h3>
                                                <p className="text-white/50 text-sm leading-relaxed max-w-lg">
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
                                    <div className="absolute -inset-[1px] rounded-2xl opacity-100 transition-all duration-700 blur-sm bg-cyan-500/8" />
                                    <div className="relative p-8 rounded-2xl bg-[#080808]/80 backdrop-blur-sm border border-cyan-500/15 transition-all duration-700 h-full overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-100 transition-opacity duration-700" />
                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
                                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                    <KeyRound className="w-6 h-6 text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold mb-3 text-white tracking-tight">AES-256 Encrypted Metadata</h3>
                                                    <p className="text-white/50 text-sm leading-relaxed max-w-lg">
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
                    {/* WORKS WITH EVERYTHING                  */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-12 md:py-16 px-6 md:px-12 lg:px-24 relative overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] bg-orange-500/[0.02] rounded-full blur-[200px]" />
                        </div>

                        <motion.div
                            variants={staggerSlow}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-100px' }}
                            className="max-w-7xl mx-auto relative"
                        >
                            {/* Center Branding */}
                            <motion.div variants={fadeInUp} className="text-center mb-10">
                                <SectionLabel color="text-orange-400/60">Ecosystem</SectionLabel>
                                <div className="mt-8 mb-4 flex flex-col items-center gap-5 md:gap-4">
                                    {/* NullPay in the Space × OpenClaw */}
                                    <div className="grid w-full max-w-5xl mx-auto items-center gap-3 md:gap-8 group/eco grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
                                        <div className="flex items-center justify-center md:justify-end gap-3">
                                            <img src="/assets/nullpay_logo.png" alt="NullPay" className="w-10 md:w-16 h-10 md:h-16 object-contain" />
                                            <h2 className="text-[2.1rem] leading-none md:text-4xl lg:text-5xl font-black tracking-[-0.05em] text-white text-center md:text-left">
                                                NullPay
                                            </h2>
                                        </div>
                                        <motion.div
                                            className="flex items-center justify-center mx-1 md:mx-4 py-1 md:py-0"
                                            initial={{ rotate: 0 }}
                                            whileHover={{ rotate: 15 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        >
                                            <svg className="w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)] transition-all duration-700 group-hover/eco:rotate-[15deg]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="cross-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#fcd34d" />
                                                        <stop offset="50%" stopColor="#f97316" />
                                                        <stop offset="100%" stopColor="#fbbf24" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M6 6L18 18M6 18L18 6" stroke="url(#cross-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </motion.div>
                                        <div className="flex items-center justify-center md:justify-start gap-3 cursor-default">
                                            <img src="/assets/openclaw.svg" alt="OpenClaw" className="w-10 md:w-16 h-10 md:h-16 object-contain" />
                                            <h2 className="text-[2.1rem] leading-none md:text-4xl lg:text-5xl font-black tracking-[-0.05em] text-white text-center md:text-left">OpenClaw</h2>
                                        </div>
                                    </div>
                                    <p className="text-white/30 text-sm md:text-base max-w-[20rem] md:max-w-2xl leading-relaxed font-light text-center">
                                        NullPay MCP powers seamless private payments inside every tool you already love — from messaging apps to AI assistants.
                                    </p>
                                </div>
                            </motion.div>

                            {/* Apps Grid — Row 1 */}
                            <motion.div variants={fadeInUp} className="mt-8">
                                <div className="flex flex-wrap justify-center gap-3">
                                    {[
                                        { name: 'WhatsApp', color: '#25D366', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M11.999 2C6.477 2 2 6.484 2 12.017c0 1.99.564 3.846 1.544 5.419L2 22l4.654-1.518C8.197 21.47 10.047 22 12.001 22c5.522 0 9.999-4.484 9.999-10.017C21.998 6.48 17.52 2 11.999 2z" /></svg> },
                                        { name: 'Telegram', color: '#2AABEE', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg> },
                                        { name: 'Discord', color: '#5865F2', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.09.12 18.12.143 18.14a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg> },
                                        { name: 'Slack', color: '#4A154B', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg> },
                                        { name: 'Signal', color: '#3A76F0', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4a8 8 0 1 1 0 16A8 8 0 0 1 12 4zm-.5 3.5v5.207l3.646 3.647-1.06 1.06-3.94-3.94A.5.5 0 0 1 10 13V7.5h1.5z" /></svg> },
                                        { name: 'iMessage', color: '#34C759', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.383 0 0 4.975 0 11.111c0 3.497 1.744 6.615 4.472 8.652V24l4.086-2.242C9.635 21.967 10.8 22.222 12 22.222c6.617 0 12-4.975 12-11.111S18.617 0 12 0z" /></svg> },
                                    ].map(({ name, color, icon }) => (
                                        <div
                                            key={name}
                                            className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#080808] border border-white/[0.07] hover:border-orange-500/30 hover:bg-[#0f0f0f] hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all duration-300 cursor-default"
                                        >
                                            <span style={{ color }} className="transition-transform group-hover:scale-110 duration-300">{icon}</span>
                                            <span className="text-sm font-medium text-white/60 group-hover:text-white/90 transition-colors">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* MCP + AI Tools Banner */}
                            <motion.div variants={fadeInUp} className="mt-10">
                                <div className="relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-white/[0.03] via-[#080808]/80 to-[#080808] border border-white/[0.07] hover:border-orange-500/20 transition-all duration-700 overflow-hidden group">
                                    {/* Animated top shimmer */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    {/* Background glow */}
                                    <div className="absolute -top-24 right-0 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

                                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 relative z-10">
                                        <div className="max-w-lg">
                                            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-3">
                                                Works Seamlessly with{' '}
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-400">
                                                    AI Assistants
                                                </span>
                                            </h3>
                                            <p className="text-white/35 text-sm leading-relaxed font-light mb-4">
                                                The NullPay MCP lets AI agents create invoices, verify payments, and settle transactions — all with zero-knowledge privacy.
                                                <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-amber-500 font-medium tracking-wide">
                                                    Compatible with any tool that supports the stdio MCP package.
                                                </span>
                                            </p>

                                        </div>

                                        <div className="flex items-center gap-6 md:gap-10 shrink-0 px-4">
                                            {[
                                                { name: 'Antigravity', img: '/assets/antigravity.svg' },
                                                { name: 'Claude', img: '/assets/claude.svg' },
                                                { name: 'Codex', img: '/assets/codex.svg' },
                                                { name: 'Cursor', img: '/assets/cursor-ide.png' },
                                            ].map(({ name, img }, i) => (
                                                <motion.div
                                                    key={name}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    whileInView={{ opacity: 1, scale: 1 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                                                    whileHover={{ scale: 1.15 }}
                                                    title={name}
                                                    className="cursor-default"
                                                >
                                                    <img
                                                        src={img}
                                                        alt={name}
                                                        className={`w-10 h-10 md:w-12 md:h-12 object-contain transition-all duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.3)] ${name === 'Cursor' ? 'scale-[1.2]' : ''}`}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
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

                                    <div className="pt-3 pb-2 flex flex-wrap gap-4">
                                        <a
                                            href="https://play.google.com/store/apps/details?id=com.provable.shieldmobile"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex items-center gap-3 bg-[#060606] border border-white/[0.08] hover:border-orange-500/40 hover:bg-[#111] transition-all rounded-xl px-5 py-2.5 shadow-2xl overflow-hidden relative cursor-pointer"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5 3.5V20.5C5 21.05 5.51 21.41 6 21.14L19.45 12.64C19.9 12.35 19.9 11.65 19.45 11.36L6 2.86C5.51 2.59 5 2.95 5 3.5Z" fill="url(#play-grad)" />
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

                                        <a
                                            href="https://apps.apple.com/us/app/shield-aleo-wallet/id6757471699"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex items-center gap-3 bg-[#060606] border border-white/[0.08] hover:border-orange-500/40 hover:bg-[#111] transition-all rounded-xl px-5 py-2.5 shadow-2xl overflow-hidden relative cursor-pointer"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] shrink-0 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97C14.32,22,13.89,21.18,12.37,21.18C10.84,21.18,10.37,21.95,9.1,22C7.79,22.05,6.8,20.68,5.96,19.47C4.25,17,2.94,12.45,4.7,9.39C5.57,7.87,7.13,6.91,8.82,6.88C10.1,6.86,11.32,7.75,12.11,7.75C12.89,7.75,14.37,6.68,15.92,6.84C16.57,6.87,18.39,7.1,19.56,8.82C19.47,8.88,17.39,10.1,17.41,12.63C17.44,15.65,20.06,16.66,20.09,16.67C20.06,16.74,19.67,18.11,18.71,19.5M13,3.5C13.73,2.67,14.94,2.04,15.94,2C16.07,3.17,15.6,4.35,14.9,5.19C14.21,6.04,13.07,6.7,11.95,6.61C11.8,5.46,12.36,4.26,13,3.5Z" fill="url(#apple-grad)" />
                                                <defs>
                                                    <linearGradient id="apple-grad" x1="5" y1="3" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                                                        <stop stopColor="#FFFFFF" />
                                                        <stop offset="1" stopColor="#A1A1AA" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="flex flex-col text-left relative z-10">
                                                <span className="text-[9px] uppercase tracking-wider text-white/50 font-medium leading-[1]">Download on the</span>
                                                <span className="text-[15px] font-semibold text-white leading-tight mt-[2px]">App Store</span>
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
