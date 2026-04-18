import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    CreditCard,
    FileCode2,
    Gift,
    Radio,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'nullpay_changelog_wave5';

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
                                        Wave 5
                                    </span>
                                <span className="text-white/15 text-xs">·</span>
                                <span className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.28em]">
                                    April 2026
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
                                <span className="text-white/50 font-light text-2xl md:text-3xl tracking-normal">Expansion — Wave&nbsp;5</span>
                            </motion.h2>
                        </div>

                        <div className="p-8 pt-6 overflow-y-auto custom-scrollbar space-y-6 relative z-10 pr-6">
                            <SectionCard
                                index={0}
                                eyebrow="AI Distribution"
                                badge="Priority"
                                accentClass="bg-orange-400/10 border-orange-300/20 text-orange-200"
                                icon={<Bot className="w-5 h-5" />}
                                glowClass="bg-orange-400/35"
                                title="OpenClaw rollout and wider MCP coverage"
                            >
                                <p>
                                    NullPay can now be exposed through <b>OpenClaw</b>, which means the MCP server is no longer limited to IDEs and desktop assistants. Through OpenClaw, NullPay can be reached from WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and other connected chat surfaces.
                                </p>
                                <p>
                                    We also expanded the MCP setup guides and client coverage for <span className={codeClass}>Antigravity</span>, <span className={codeClass}>Codex</span>, <span className={codeClass}>Cursor</span>, and other stdio-compatible environments so the same invoice and payment tooling can run consistently across local AI workflows.
                                </p>
                                <p>
                                    In practice, this turns NullPay into a transport-agnostic payment assistant: the core tools stay local, but the interface can now live in IDEs, web copilots, or messaging channels.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={1}
                                eyebrow="Price Integrity"
                                badge="Oracle + ZK"
                                accentClass="bg-emerald-400/10 border-emerald-300/20 text-emerald-200"
                                icon={<ShieldCheck className="w-5 h-5" />}
                                glowClass="bg-emerald-400/35"
                                title="Live oracle conversion secured with on-chain proofs"
                            >
                                <p>
                                    Standard and multipay flows now support <b>live oracle conversion</b> when the payer wants to use a different token from the invoice base token. The frontend fetches signed quotes, applies the expected converted amount, and routes the transaction into the cross-token payment functions.
                                </p>
                                <p>
                                    For stablecoin paths, NullPay also generates the required compliance/freeze-list proofs locally and passes them into the on-chain call. This means the quote, the converted amount, and the proof-backed settlement path are all verified inside the final Aleo execution rather than trusted as an off-chain number.
                                </p>
                                <p>
                                    The result is a much stronger anti-tamper conversion model: users see live conversion, but merchants still settle through the same contract-enforced invariants.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={2}
                                eyebrow="Card Rail"
                                badge="New Flow"
                                accentClass="bg-white/[0.05] border-white/10 text-white/85"
                                icon={<CreditCard className="w-5 h-5" />}
                                glowClass="bg-white/20"
                                title="NullPay Card with PIN + secret based checkout"
                            >
                                <p>
                                    We added the <b>NullPay Card</b> system: a private card profile backed by encrypted key material, card limits, on-chain card profile records, and a dedicated card payment path that works without requiring the payer to connect a wallet at checkout time.
                                </p>
                                <p>
                                    Card access is unlocked locally using a <span className={codeClass}>PIN</span> and a longer <span className={codeClass}>card secret</span>. Top-ups still come from the main wallet, but payments can be executed from the card’s own private balance through the relayer-backed card authorization flow.
                                </p>
                                <p>
                                    This wave also added card-specific balance scanning, transfer-all to main wallet, deletion flow updates, per-token caps, local refresh scanning, and the card payment UI on both the direct pay route and hosted checkout.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={3}
                                eyebrow="Messaging"
                                badge="Bot"
                                accentClass="bg-cyan-400/10 border-cyan-300/20 text-cyan-200"
                                icon={<Radio className="w-5 h-5" />}
                                glowClass="bg-cyan-400/20"
                                title="Telegram bot for dashboard, invoice, pay, and notifications"
                            >
                                <p>
                                    The backend now boots a full <b>Telegram bot</b> with handlers for secure merchant linking, dashboard summaries, invoice lookup, payment links, gift card shortcuts, webapp deep links, and notification preferences.
                                </p>
                                <p>
                                    This is not just a notification bot. It acts as an actual merchant control surface: recent invoices, verification, browser handoff flows, and alert management are now available directly inside Telegram.
                                </p>
                                <p>
                                    Behind the scenes, the notification worker and handler split lets the bot stay responsive while still pushing payment-state updates when merchant activity changes.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={4}
                                eyebrow="Checkout"
                                badge="Fee Mode"
                                accentClass="bg-amber-400/10 border-amber-300/20 text-amber-200"
                                icon={<FileCode2 className="w-5 h-5" />}
                                glowClass="bg-amber-400/25"
                                title="Fixed fee stays default, with optional fee estimation"
                            >
                                <p>
                                    Previously, shielded payments used a <b>fixed fee</b> only. Now users can also turn on <b>fee estimation</b> and switch between the two modes depending on how they want the flow to behave.
                                </p>
                                <p>
                                    Fee estimation is <b>off by default</b>, so fixed fee remains the default path out of the box. When estimation is enabled, the shield wallet popup can take a bit longer to appear because the app first works out the fee more precisely.
                                </p>
                                <p>
                                    If the user prefers faster execution, they can keep using the fixed fee mode. If they want a more dynamic fee path, they can toggle estimation on when needed.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={5}
                                eyebrow="Merchant Operations"
                                badge="Dashboard"
                                accentClass="bg-purple-400/10 border-purple-300/20 text-purple-200"
                                icon={<Sparkles className="w-5 h-5" />}
                                glowClass="bg-purple-400/25"
                                title="Sharper dashboard metrics, search, analytics, and audit tooling"
                            >
                                <p>
                                    Merchant dashboards were cleaned up substantially in this wave. Earnings are displayed more clearly, invoice search now reaches across invoice hash, salt, memo, merchant notes, and invoice title, and the timeline view now supports day, week, and month ranges for payment tracking.
                                </p>
                                <p>
                                    We also added <b>selective disclosure</b> for credits and formal audit export flows, plus a separate auditor verification center so third parties can cryptographically verify audit bundles instead of trusting screenshots or manually edited spreadsheets.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={6}
                                eyebrow="Payments & Utility"
                                badge="Expanded"
                                accentClass="bg-pink-400/10 border-pink-300/20 text-pink-200"
                                icon={<Gift className="w-5 h-5" />}
                                glowClass="bg-pink-400/25"
                                title="Batch pay, gift card history, notes everywhere, and smarter NullBot"
                            >
                                <p>
                                    This wave also expanded the day-to-day payment surface: notes were added to both pay and checkout routes, gift cards now keep stronger visible history, invoice titles were introduced, and batch payments landed through the burner-wallet execution model.
                                </p>
                                <p>
                                    The batch page supports contract-centered invoice handling while the actual execution is driven through the burner implementation, giving merchants a practical high-throughput way to process many payouts.
                                </p>
                                <p>
                                    Finally, <b>NullBot</b> is now more useful as an action layer: it can help create invoices, initiate invoice payments, and support standard, multipay, and donation flows using the same browser-integrated tooling that powers the rest of the app.
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
