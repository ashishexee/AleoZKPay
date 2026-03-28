import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    FileCode2,
    Gift,
    Radio,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'nullpay_changelog_wave4';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35 } },
    exit: { opacity: 0, transition: { duration: 0.25 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 24 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring' as const, duration: 0.55, bounce: 0.18 }
    },
    exit: { opacity: 0, scale: 0.96, y: 18, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -16 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.06 + 0.18, duration: 0.36 }
    })
};

const codeClass =
    'text-[11px] text-orange-300/90 bg-orange-500/8 border border-orange-400/15 px-1.5 py-0.5 rounded-md font-mono';

const SectionCard = ({
    index,
    eyebrow,
    title,
    badge,
    accentClass,
    icon,
    glowClass,
    children,
}: {
    index: number;
    eyebrow: string;
    title: string;
    badge?: string;
    accentClass: string;
    icon: React.ReactNode;
    glowClass: string;
    children: React.ReactNode;
}) => (
    <motion.div
        custom={index}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="group relative overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 md:p-7 hover:border-white/[0.12] transition-colors duration-500"
    >
        <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-35 pointer-events-none transition-opacity duration-300 group-hover:opacity-50 ${glowClass}`} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_22%,transparent_78%,rgba(255,255,255,0.02))] pointer-events-none" />
        <div className="flex items-start gap-5">
            <div className="flex flex-col items-center gap-2.5 shrink-0">
                <div className={`mt-0.5 shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] ${accentClass}`}>
                    {icon}
                </div>
                <span className="text-[9px] font-black tracking-[0.3em] text-white/20 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                </span>
            </div>
            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
                        {eyebrow}
                    </span>
                    {badge && (
                        <span className="px-2 py-0.5 rounded-full border border-orange-400/20 bg-orange-500/10 text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
                            {badge}
                        </span>
                    )}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-3 tracking-tight leading-snug">{title}</h3>
                <div className="space-y-3 text-[13px] leading-[1.75] text-white/40">{children}</div>
            </div>
        </div>
    </motion.div>
);

export const ChangelogOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = (dontShowAgain: boolean) => {
        setIsVisible(false);
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans antialiased">
                    <motion.div
                        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => handleClose(false)}
                    />

                    <motion.div
                        className="relative w-full max-w-4xl bg-[#060606] border border-white/[0.08] rounded-3xl shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden flex flex-col max-h-[92vh]"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-orange-400/8 rounded-full blur-[130px] pointer-events-none opacity-70" />
                        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-white/6 rounded-full blur-[120px] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

                        <div className="p-8 pb-5 shrink-0 relative z-10">
                            <div className="flex items-center gap-2.5 mb-5">
                                <span className="px-3 py-1 bg-orange-500/10 border border-orange-400/20 rounded-full text-[9px] font-black text-orange-300 uppercase tracking-[0.28em]">
                                    Wave 4
                                </span>
                                <span className="text-white/15 text-xs">·</span>
                                <span className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.28em]">
                                    March 2026
                                </span>
                                <span className="text-white/15 text-xs">·</span>
                                <span className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.28em]">
                                    Platform Notes
                                </span>
                            </div>
                            <motion.h2
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.12 }}
                                className="text-3xl md:text-[2.6rem] font-black tracking-tight leading-[1.1] text-white"
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-400">
                                    NullPay
                                </span>
                                <br />
                                <span className="text-white/50 font-light text-2xl md:text-3xl tracking-normal">Expansion — Wave&nbsp;4</span>
                            </motion.h2>
                        </div>

                        <div className="p-8 pt-6 overflow-y-auto custom-scrollbar space-y-6 relative z-10 pr-6">
                            <SectionCard
                                index={0}
                                eyebrow="Encryption"
                                badge="Security"
                                accentClass="bg-emerald-400/10 border-emerald-300/20 text-emerald-200"
                                icon={<ShieldCheck className="w-5 h-5" />}
                                glowClass="bg-emerald-400/35"
                                title="100% User-Controlled Password Encryption"
                            >
                                <p>
                                    All sensitive data, including burner wallets, is now encrypted entirely client-side using a <b>password provided by you</b>. 
                                </p>
                                <ul className="text-xs text-gray-400 space-y-1.5 mt-2">
                                    <li>- Uses PBKDF2 key derivation and AES-GCM encryption.</li>
                                    <li>- The resulting encrypted payload is safely backed up on-chain as a private record.</li>
                                    <li>- NullPay never sees your raw keys or password.</li>
                                </ul>
                            </SectionCard>

                            <SectionCard
                                index={1}
                                eyebrow="AI & Tooling"
                                badge="New Package"
                                accentClass="bg-orange-400/10 border-orange-300/20 text-orange-200"
                                icon={<Bot className="w-5 h-5" />}
                                glowClass="bg-orange-400/35"
                                title="NullPay MCP Server & Context-Aware NullBot"
                            >
                                <p>
                                    We shipped the <span className={codeClass}>@nullpay/mcp</span> server, allowing AI clients to natively create invoices, inspect flows, and execute payments. 
                                </p>
                                <p>
                                    Meanwhile, the in-app <b>NullBot</b> now possesses route-specific context. On the dashboard, it acts as a live merchant copilot with access to your real-time balances and invoice metrics.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={2}
                                eyebrow="SDK + CLI"
                                badge="Expanded"
                                accentClass="bg-white/[0.05] border-white/10 text-white/85"
                                icon={<FileCode2 className="w-5 h-5" />}
                                glowClass="bg-white/20"
                                title="Powerful Invoice Manifests via nullpay.json"
                            >
                                <p>
                                    The <span className={codeClass}>@nullpay/node</span> SDK now handles local <span className={codeClass}>nullpay.json</span> manifests, making it easy to create hosted checkout sessions without hardcoding cryptographic IDs.
                                </p>
                                <p>
                                    The new <span className={codeClass}>@nullpay/cli</span> automates onboarding by generating salts, submitting invoices to the relayer, and writing the final manifest into your project.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={3}
                                eyebrow="Infrastructure"
                                badge="Delegated"
                                accentClass="bg-purple-400/10 border-purple-300/20 text-purple-200"
                                icon={<Sparkles className="w-5 h-5" />}
                                glowClass="bg-purple-400/25"
                                title="Delegated Proving & Fee Sponsorship"
                            >
                                <p>
                                    We introduced a backend-sponsored execution endpoint (<span className={codeClass}>/api/dps/sponsor-sweep</span>) to significantly reduce direct wallet dependency. 
                                </p>
                                <p>
                                    Users authorize the actions locally, but NullPay handles the proving and relays the fees. This powers frictionless gift card redemptions and burner sweeps while remaining strictly non-custodial.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={4}
                                eyebrow="Gift Cards"
                                badge="Full Flow"
                                accentClass="bg-pink-400/10 border-pink-300/20 text-pink-200"
                                icon={<Gift className="w-5 h-5" />}
                                glowClass="bg-pink-400/25"
                                title="A Complete Private Value-Transfer Ecosystem"
                            >
                                <p>
                                    Gift cards are now fully integrated. You can create them using Credits, USDCx, or USAD, scan them to reveal balances, and redeem them directly to your wallet.
                                </p>
                                <p>
                                    You can even pay standard or donation invoices <b>directly</b> using a loaded gift card, utilizing the sponsored DPS route for a seamless checkout.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={5}
                                eyebrow="Checkout"
                                badge="Realtime"
                                accentClass="bg-cyan-400/10 border-cyan-300/20 text-cyan-200"
                                icon={<Radio className="w-5 h-5" />}
                                glowClass="bg-cyan-400/20"
                                title="Zero-Config Realtime Hosted Checkout"
                            >
                                <p>
                                    Standard hosted invoices now surface live payment statuses immediately. 
                                </p>
                                <p>
                                    By combining Supabase realtime listeners with aggressive polling fallbacks, the checkout session auto-settles the moment a payment lands on-chain—no custom websocket servers required on your backend.
                                </p>
                            </SectionCard>
                        </div>

                        <div className="px-8 py-5 shrink-0 bg-[#060606]/80 flex items-center justify-between backdrop-blur-md relative z-10 gap-4">
                            <button
                                onClick={() => handleClose(false)}
                                className="text-[12px] text-white/30 hover:text-white/70 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white/[0.04] tracking-wide"
                            >
                                Remind me later
                            </button>

                            <button
                                onClick={() => handleClose(true)}
                                className="px-7 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white text-[13px] font-bold rounded-xl transition-all shadow-[0_0_24px_rgba(249,115,22,0.3)] hover:shadow-[0_0_36px_rgba(249,115,22,0.45)] hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 tracking-tight"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Got it, don't show again
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
