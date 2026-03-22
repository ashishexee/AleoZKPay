import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Lock, Globe, Eye, EyeOff, FileText, Layers, Coins, KeyRound } from 'lucide-react';
import DottedGlobe from './components/DottedGlobe';
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

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.93, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.9, ease: easePremium } }
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

/* ─── ANIMATED GRADIENT BORDER CARD ────────────────────────────── */
const FeatureCard = ({
    icon: Icon,
    title,
    desc,
    colorClass,
    bgClass,
    borderClass,
    // delay = 0,
    float = false,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    delay?: number;
    float?: boolean;
}) => (
    <motion.div
        variants={scaleIn}
        className="relative group"
    >
        {/* Animated glow on hover */}
        <div className={`absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm ${bgClass}`} />

        <div className={`relative p-7 rounded-2xl bg-[#080808] border ${borderClass} group-hover:border-opacity-60 transition-all duration-500 overflow-hidden h-full`}>
            {/* Top shimmer line */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${colorClass.replace('text-', 'via-')} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Corner accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl ${bgClass}`} />

            <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center mb-6 border ${borderClass} group-hover:scale-110 transition-transform duration-500 ${float ? 'animate-float' : 'animate-float-delayed'}`}>
                <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <h3 className="text-base font-bold mb-3 text-white tracking-tight group-hover:text-white transition-colors">{title}</h3>
            <p className="text-white/35 text-sm leading-relaxed group-hover:text-white/55 transition-colors duration-500">{desc}</p>
        </div>
    </motion.div>
);

/* ─── TRUST BADGE ROW ───────────────────────────────────────────── */
const TrustBar = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8, ease: easePremium }}
        className="flex flex-wrap items-center gap-3 md:gap-4 justify-center lg:justify-start pt-6"
    >
        {[
            { label: '100% Private', colorClass: 'bg-white', shadowClass: 'shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
            { label: 'ZK Native', colorClass: 'bg-orange-500', shadowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.9)]' },
            { label: 'Built on Aleo', colorClass: 'bg-white', shadowClass: 'shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
            { label: 'Non-Custodial', colorClass: 'bg-white', shadowClass: 'shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
        ].map(({ label, colorClass, shadowClass }, i) => (
            <motion.div 
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + (i * 0.1), duration: 0.5, ease: easePremium }}
                className="group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/15 transition-all duration-300 backdrop-blur-md cursor-default"
            >
                <div className={`w-1.5 h-1.5 rounded-full ${colorClass} ${shadowClass} transition-transform duration-300 group-hover:scale-125`} />
                <span className="text-[11px] font-mono tracking-widest text-white/50 group-hover:text-white/80 transition-colors uppercase">{label}</span>
            </motion.div>
        ))}
    </motion.div>
);

/* ═══════════════════════════════════════════════════════════════ */
const Home = () => {
    return (
        <FlashlightEffect>
            <GrainOverlay />

            {/* Google Font injection */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

                .font-display { font-family: 'Space Grotesk', sans-serif; }
                .font-mono-syne { font-family: 'Space Grotesk', monospace; }

                .text-stroke {
                    -webkit-text-stroke: 1.5px rgba(255,255,255,0.25);
                    color: transparent;
                }

                .text-stroke-orange {
                    -webkit-text-stroke: 1.5px rgba(249,115,22,0.5);
                    color: transparent;
                }

                .enter-bliss-button {
                    position: relative;
                    border-radius: 9999px;
                    background: linear-gradient(135deg, #f97316, #ea6700);
                    overflow: hidden;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    box-shadow: 0 0 0 0 rgba(249,115,22,0);
                }
                .enter-bliss-button::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .enter-bliss-button:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 0 40px 8px rgba(249,115,22,0.35), 0 20px 40px -10px rgba(249,115,22,0.3);
                }
                .enter-bliss-button:hover::before { opacity: 1; }

                .glowing-border-card {
                    background: linear-gradient(#080808, #080808) padding-box,
                                linear-gradient(135deg, rgba(249,115,22,0.3), rgba(255,255,255,0.05), rgba(249,115,22,0.1)) border-box;
                    border: 1px solid transparent;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 5s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 6s ease-in-out infinite 1s; }

                @keyframes scan {
                    0% { top: -2px; }
                    100% { top: 100%; }
                }
                .scanline {
                    position: absolute;
                    left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(249,115,22,0.15), transparent);
                    animation: scan 6s linear infinite;
                    pointer-events: none;
                }

                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .shimmer-text {
                    background: linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.4) 80%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 4s linear infinite;
                }

                @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes orbit-r { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

                .pulse-slow { animation: pulse 4s ease-in-out infinite; }

                /* Card hover glow pulse */
                @keyframes glow-pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>

            <div
                className="min-h-screen bg-[#030303] text-white relative font-display w-full overflow-x-hidden"
            >
                <main className="relative z-10 w-full overflow-hidden">

                    {/* ══════════════════════════════════════ */}
                    {/* HERO                                  */}
                    {/* ══════════════════════════════════════ */}
                    <section className="relative min-h-[92vh] flex items-center overflow-hidden">

                        {/* Scanline effect */}
                        <div className="scanline z-20" />

                        {/* Background: Animated grid */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <motion.div
                                className="absolute inset-0 opacity-[0.035]"
                                animate={{ backgroundPosition: ['0px 0px', '64px 64px'] }}
                                transition={{ duration: 20, ease: 'linear', repeat: Infinity }}
                                style={{
                                    backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                                    backgroundSize: '64px 64px',
                                    maskImage: 'radial-gradient(ellipse 70% 80% at 25% 50%, #000 10%, transparent 100%)',
                                }}
                            />

                            {/* Aurora blobs */}
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

                        {/* Globe */}
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                            <DottedGlobe />
                        </div>

                        {/* Hero content */}
                        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pt-24 pb-12">
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="flex flex-col space-y-7 text-center lg:text-left max-w-2xl"
                            >

                                {/* Main headline */}
                                <motion.div variants={fadeInUp} className="relative z-20">
                                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05]">
                                        <span className="text-white">Pay Privately.</span>
                                        <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-400 drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]">Nullify</span>
                                        {' '}
                                        <span className="text-stroke">the Trace.</span>
                                    </h1>
                                </motion.div>

                                <motion.p 
                                    variants={fadeInUp} 
                                    className="text-lg md:text-xl text-white/50 max-w-xl font-light leading-relaxed tracking-wide pt-2"
                                >
                                    A decentralized privacy protocol on Aleo. Create and settle invoices without ever exposing your{' '}
                                    <span className="text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">wallet balance</span>
                                    {' '}or{' '}
                                    <span className="text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">transaction history</span>
                                    {' '}to the public.
                                </motion.p>

                                {/* CTAs */}
                                <motion.div
                                    variants={fadeInUp}
                                    className="flex flex-col sm:flex-row items-center gap-5 pt-6 justify-center lg:justify-start"
                                >
                                    <Link
                                        to="/explorer"
                                        className="enter-bliss-button group inline-flex items-center justify-center gap-3 px-8 py-4 text-white min-w-[200px]"
                                    >
                                        <span className="font-bold text-base relative z-10 tracking-tight">Get Started</span>
                                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    <Link
                                        to="/docs"
                                        className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-transparent overflow-hidden min-w-[200px]"
                                    >
                                        <div className="absolute inset-0 border border-white/20 rounded-full group-hover:border-white/40 transition-colors duration-500" />
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-500" />
                                        <span className="font-semibold text-base text-white/50 group-hover:text-white transition-colors tracking-tight relative z-10">Documentation</span>
                                    </Link>
                                </motion.div>

                                <TrustBar />
                            </motion.div>
                        </div>

                        {/* Bottom fade */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030303] to-transparent z-10 pointer-events-none" />
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* THE PROBLEM                           */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 px-6 md:px-12 lg:px-24">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            className="max-w-5xl mx-auto"
                        >
                            <div className="text-center mb-12">
                                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">The Problem</span>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-[-0.03em] mt-5 leading-tight">
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
                            <RedditMarquee />
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* WHAT IS NULLPAY — FEATURE BENTO       */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Section background glow */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] bg-orange-500/3 rounded-full blur-[120px]" />
                        </div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-80px' }}
                            className="max-w-7xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-orange-400/70 font-semibold">The Solution</span>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-[-0.03em] mt-5">
                                                    What is{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">
                                        NullPay?
                                    </span>
                                </h2>
                                <p className="text-white/35 text-base mt-5 max-w-2xl mx-auto leading-relaxed font-light">
                                    A decentralized invoice and payment protocol that breaks the link between sender and receiver.
                                    Create invoices, collect payments, and settle — all without exposing who paid whom, or how much.
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { icon: Shield,   title: 'Zero-Knowledge Invoices',   desc: 'Invoice details are hashed on-chain using BHP256 cryptography. Only the hash is public — merchant address, amount, and metadata remain completely private.',  colorClass: 'text-orange-400', bgClass: 'bg-orange-500/8', borderClass: 'border-orange-500/15', float: true  },
                                    { icon: EyeOff,   title: 'Untraceable Payments',      desc: "Payments use Aleo's private transfer function. The sender's identity is never revealed on-chain. No one can trace who paid the invoice.",                       colorClass: 'text-cyan-400',   bgClass: 'bg-cyan-500/8',   borderClass: 'border-cyan-500/15',   float: false },
                                    { icon: Layers,   title: 'Dual-Record System',        desc: 'Every payment atomically generates two encrypted receipts — a PayerReceipt and MerchantReceipt. Both parties get proof without public exposure.',              colorClass: 'text-violet-400', bgClass: 'bg-violet-500/8', borderClass: 'border-violet-500/15', float: true  },
                                    { icon: Coins,    title: 'Multi-Asset Support',       desc: 'Pay with Aleo Credits or USDCx (private stablecoin). Merchants choose which assets to accept. Full atomic swap execution for stablecoins.',                   colorClass: 'text-emerald-400',bgClass: 'bg-emerald-500/8',borderClass: 'border-emerald-500/15',float: false },
                                    { icon: FileText, title: 'Flexible Invoice Types',    desc: 'Standard invoices for one-time payments, Multi-Pay invoices for crowdfunding campaigns, and Donation invoices with open-ended amounts.',                       colorClass: 'text-orange-400', bgClass: 'bg-orange-500/8', borderClass: 'border-orange-500/15', float: true  },
                                    { icon: KeyRound, title: 'Encrypted Metadata',        desc: "Off-chain data is encrypted with AES-256. We don't store amounts or memos. Even if our database were compromised, your financial data stays safe.",             colorClass: 'text-cyan-400',   bgClass: 'bg-cyan-500/8',   borderClass: 'border-cyan-500/15',   float: false },
                                ].map((f, i) => (
                                    <FeatureCard key={i} {...f} delay={i * 0.1} />
                                ))}
                            </div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* MOBILE SUITE                          */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden bg-gradient-to-b from-transparent via-orange-500/[0.02] to-transparent">
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
                                    <div className="absolute top-1/4 -right-4 z-20 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.08)] backdrop-blur-sm animate-float">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="font-mono-syne text-[9px] text-white/50 tracking-widest uppercase">ZK Proof</span>
                                        </div>
                                        <p className="font-black text-white text-sm mt-0.5">Verified ✓</p>
                                    </div>
                                    <div className="absolute bottom-1/3 -left-4 z-20 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.06)] backdrop-blur-sm animate-float-delayed">
                                        <p className="font-mono-syne text-[9px] text-white/40 tracking-widest uppercase">Sender</p>
                                        <p className="font-black text-cyan-400 text-sm">0x••••••••</p>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#030303] via-transparent to-transparent z-10" />

                                    <motion.div
                                        animate={{ y: [0, -18, 0], rotate: [0, 1.5, 0] }}
                                        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                                        className="relative z-0"
                                    >
                                        <img
                                            src="/assets/nullpay_mobile01-left.png"
                                            alt="NullPay Mobile"
                                            className="w-full max-w-[420px] h-auto drop-shadow-[0_30px_80px_rgba(249,115,22,0.12)]"
                                        />
                                    </motion.div>
                                </div>

                                {/* Text */}
                                <div className="order-1 lg:order-2 space-y-8">
                                    <div>
                                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-orange-400/70 font-semibold">Mobile Suite</span>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mt-5 tracking-[-0.03em] leading-tight text-white">
                                                    Privacy in Your{' '}
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Pocket</span>
                                        </h2>
                                    </div>

                                    <p className="text-white/40 text-sm leading-loose max-w-xl font-light">
                                        Take absolute financial privacy wherever you go. NullPay V1 Mobile is now live, bringing the power of zero-knowledge cryptography to your smartphone.
                                    </p>

                                    <div className="flex items-center gap-6 py-4 border-y border-white/[0.06]">
                                        {[
                                            { value: '100%', label: 'Private' },
                                            { value: '<2s', label: 'Proof Time' },
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
                                                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${color.replace('text-','via-')}/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
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
                    <section className="py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Giant backdrop text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                            <span className="text-[20vw] font-black text-white/[0.015] tracking-tighter leading-none whitespace-nowrap">
                                PRIVATE
                            </span>
                        </div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-80px' }}
                            className="max-w-6xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-20">
                                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold">How It Works</span>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-[-0.03em] mt-5">
                                                    Three Steps{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">to Privacy</span>
                                </h2>
                                <p className="text-white/35 text-base mt-4 max-w-xl mx-auto font-light leading-relaxed">
                                    From invoice creation to private settlement — the entire flow is designed around zero-knowledge.
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
                                {/* Connector line */}
                                <div className="hidden md:block absolute top-[68px] left-[16.66%] right-[16.66%] h-px">
                                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent blur-[1px]" />
                                </div>

                                {[
                                    { step: '01', title: 'Create Invoice', desc: 'Merchant enters amount, token type, and invoice type. A random salt is generated and the details are hashed using BHP256. Only the hash is stored on-chain.', icon: FileText },
                                    { step: '02', title: 'Share Payment Link', desc: "The merchant shares a payment link containing the salt. The payer's client verifies the on-chain hash, confirming the invoice is authentic and unmodified.", icon: Globe },
                                    { step: '03', title: 'Private Settlement', desc: "The payer executes a private transfer. Funds move to the merchant without revealing the payer's identity. Both parties receive encrypted receipts atomically.", icon: Lock },
                                ].map((s, i) => (
                                    <motion.div key={i} variants={fadeInUp}>
                                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-[#080808] border border-white/[0.06] hover:border-orange-500/25 hover:bg-[#0c0c0c] transition-all duration-500 group h-full relative overflow-hidden">
                                            {/* Large backdrop step number */}
                                            <span className="absolute bottom-4 right-4 font-black text-[80px] leading-none text-white/[0.03] group-hover:text-white/[0.06] transition-colors select-none">
                                                {s.step}
                                            </span>

                                            {/* Step circle */}
                                            <div className="w-14 h-14 rounded-full border border-white/10 group-hover:border-orange-500/40 bg-white/[0.03] group-hover:bg-orange-500/10 flex items-center justify-center mb-5 transition-all duration-500 relative z-10">
                                                <span className="font-mono-syne text-sm font-bold text-white/40 group-hover:text-orange-400 transition-colors">{s.step}</span>
                                            </div>

                                            <s.icon className="w-5 h-5 text-white/25 mb-4 group-hover:text-orange-400 transition-colors duration-300 relative z-10" />
                                            <h3 className="text-lg font-bold text-white mb-3 tracking-tight relative z-10">{s.title}</h3>
                                            <p className="text-white/35 text-sm leading-relaxed group-hover:text-white/55 transition-colors duration-500 relative z-10">{s.desc}</p>
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
                    <section className="py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9 }}
                            className="max-w-6xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                                {/* Text */}
                                <div className="space-y-7">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/8 border border-orange-500/20">
                                                <Layers className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="font-mono-syne text-[10px] font-bold tracking-[0.25em] text-orange-400 uppercase">Architecture</span>
                                            </div>
                                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-[-0.03em] leading-tight">
                                                Powered by{' '}
                                        <span className="text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]">Aleo</span>
                                    </h2>
                                    <p className="text-white/40 font-light leading-loose text-base">
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
                                    <div className="relative w-full aspect-square max-w-[340px]">
                                        {/* Outer ring */}
                                        <div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                border: '1px solid',
                                                borderColor: 'rgba(249,115,22,0.2)',
                                                animation: 'orbit 22s linear infinite',
                                                boxShadow: 'inset 0 0 60px rgba(249,115,22,0.03)',
                                            }}
                                        >
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                                        </div>

                                        {/* Middle ring */}
                                        <div
                                            className="absolute inset-8 rounded-full border-dashed"
                                            style={{
                                                border: '1px dashed rgba(34,211,238,0.2)',
                                                animation: 'orbit-r 16s linear infinite',
                                            }}
                                        >
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
                                        </div>

                                        {/* Inner ring */}
                                        <div
                                            className="absolute inset-16 rounded-full"
                                            style={{
                                                border: '1px solid rgba(249,115,22,0.3)',
                                                animation: 'orbit 10s linear infinite',
                                            }}
                                        >
                                            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
                                        </div>

                                        {/* Center core */}
                                        <div className="absolute inset-[90px] rounded-full bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent backdrop-blur-xl flex items-center justify-center border border-orange-500/20 shadow-[0_0_60px_rgba(249,115,22,0.15),inset_0_0_30px_rgba(249,115,22,0.05)]">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Zap className="w-7 h-7 text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.7)]" />
                                                <span className="font-mono-syne text-[9px] font-bold tracking-[0.3em] uppercase text-orange-400/70">ZK Native</span>
                                            </div>
                                        </div>

                                        {/* Background glow */}
                                        <div className="absolute inset-0 rounded-full bg-orange-500/5 blur-3xl scale-75 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    <GlowDivider />

                    {/* ══════════════════════════════════════ */}
                    {/* COMPARISON                            */}
                    {/* ══════════════════════════════════════ */}
                    <section className="py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Backdrop text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                            <span className="text-[18vw] font-black text-white/[0.015] tracking-tighter leading-none">
                                ZERO
                            </span>
                        </div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: '-80px' }}
                            className="max-w-6xl mx-auto relative"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                                <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-white/35 font-semibold">Why NullPay</span>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-[-0.03em] mt-5">
                                                    Privacy is{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Not Optional</span>
                                </h2>
                                <p className="text-white/35 text-base mt-4 max-w-xl mx-auto font-light">
                                    See how NullPay fundamentally differs from traditional blockchain payments.
                                </p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                                {/* Traditional */}
                                <div className="p-8 rounded-2xl bg-[#080808] border border-white/[0.05] relative overflow-hidden">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                            <Eye className="w-4 h-4 text-white/25" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white/40 tracking-tight uppercase">Traditional Payments</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            'Wallet balance visible to everyone',
                                            'Full transaction history exposed',
                                            'Receiver knows sender identity',
                                            'Single public account model',
                                            'No privacy without mixers',
                                            'Payment amounts are public',
                                        ].map((item) => (
                                            <div key={item} className="flex items-center gap-3 text-sm text-white/25">
                                                <span className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center shrink-0 text-[9px] text-white/20">✕</span>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* VS badge */}
                                <div className="flex items-center justify-center">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                                        <span className="font-mono-syne text-[10px] font-bold text-white/30 tracking-wider">VS</span>
                                    </div>
                                </div>

                                {/* NullPay */}
                                <div className="glowing-border-card p-8 rounded-2xl relative overflow-hidden group hover:shadow-[0_0_60px_rgba(249,115,22,0.1)] transition-shadow duration-700">
                                    {/* Glow overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/8 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

                                    <div className="flex items-center gap-3 mb-8 relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                                            <EyeOff className="w-4 h-4 text-orange-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white tracking-tight uppercase">NullPay Protocol</h3>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        {[
                                            'Balance hidden via encrypted records',
                                            'Transactions are private by default',
                                            'Sender identity is never revealed',
                                            'Dual-record receipt system',
                                            'Native ZK — no mixers needed',
                                            'Amounts encrypted on-chain',
                                        ].map((item) => (
                                            <div key={item} className="flex items-center gap-3 text-sm text-white/60 group-hover:text-white/75 transition-colors">
                                                <span className="w-4 h-4 rounded-full border border-orange-500/40 bg-orange-500/10 flex items-center justify-center shrink-0 text-[9px] text-orange-400">✓</span>
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
                    <section className="py-36 px-6 md:px-12 lg:px-24 relative overflow-hidden">

                        {/* Radial halo */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-[120px]" />
                            <div className="absolute w-[300px] h-[300px] rounded-full bg-orange-500/8 blur-[80px]" />
                        </div>

                        {/* Concentric rings */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            {[600, 460, 320].map((size, i) => (
                                <div
                                    key={size}
                                    className="absolute rounded-full border border-orange-500/20"
                                    style={{ width: size, height: size, opacity: 1 - i * 0.25 }}
                                />
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.9 }}
                            className="max-w-4xl mx-auto text-center relative"
                        >
                            <span className="font-mono-syne text-[10px] uppercase tracking-[0.3em] text-orange-400/60 font-semibold">Get Started</span>

                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-[-0.03em] mt-6 mb-6 leading-tight">
                                Ready to{' '}
                                <br />
                                <span className="text-orange-500 drop-shadow-[0_0_50px_rgba(249,115,22,0.5)]">Go Private?</span>
                            </h2>

                            <p className="text-white/35 text-base mb-12 max-w-xl mx-auto leading-loose font-light">
                                Join the movement toward a future where financial privacy is the default.
                                Start creating private invoices and accepting untraceable payments today.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/create"
                                    className="enter-bliss-button inline-flex items-center justify-center gap-3 px-10 py-5 text-white"
                                >
                                    <span className="font-bold text-base relative z-10 tracking-tight">Create Your First Invoice</span>
                                    <ArrowRight className="w-4 h-4 relative z-10" />
                                </Link>
                            </div>

                            <div className="mt-20">
                                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-orange-500/5 border border-orange-500/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 animate-pulse" />
                                    <span className="font-mono-syne text-[10px] tracking-[0.3em] uppercase text-orange-500/50">
                                        Building the Private Economy on Aleo
                                    </span>
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