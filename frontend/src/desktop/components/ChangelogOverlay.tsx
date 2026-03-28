import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    Boxes,
    CreditCard,
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
                                eyebrow="MCP Server"
                                badge="New Package"
                                accentClass="bg-orange-400/10 border-orange-300/20 text-orange-200"
                                icon={<Bot className="w-5 h-5" />}
                                glowClass="bg-orange-400/35"
                                title="NullPay MCP brings invoice creation, payment, and wallet workflows into AI-native tooling"
                            >
                                <p>
                                    We now ship an installable MCP server package at <span className={codeClass}>@nullpay/mcp</span>.
                                    Its purpose is simple: let an AI client create invoices, inspect merchant flows, and execute
                                    supported payment actions without the developer building a custom bridge around NullPay first.
                                </p>
                                <p>
                                    Installation is intentionally lightweight. The package can be added with{' '}
                                    <span className={codeClass}>npm install @nullpay/mcp</span>, then mounted inside an MCP client
                                    with a small config that points to the backend URL and the shared secret used for backend auth.
                                    The server is built for stdio transport, so it fits naturally into desktop agent environments.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2 font-bold">
                                        Why It Is Useful
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- AI agents can create standard, multi-pay, and donation invoices through NullPay without manual dashboard clicks.</li>
                                        <li>- The MCP server keeps sensitive key handling on the server side instead of leaking raw wallet material back into model output.</li>
                                        <li>- It reuses the existing backend, relayer, and DPS sponsorship stack, so conversational flows inherit the same production payment rails.</li>
                                        <li>- It supports the same merchant-oriented flows the app already exposes: invoice creation, wallet login context, record-backed lookup, and sponsored execution.</li>
                                    </ul>
                                </div>
                                <p>
                                    The practical use cases are broad: internal merchant copilots, support tooling, command-center
                                    style payment ops, conversational invoice setup, and developer assistants that can bridge from
                                    "create this invoice for me" directly into a live NullPay object instead of returning instructions only.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={1}
                                eyebrow="SDK + CLI"
                                badge="Expanded"
                                accentClass="bg-white/[0.05] border-white/10 text-white/85"
                                icon={<FileCode2 className="w-5 h-5" />}
                                glowClass="bg-white/20"
                                title="The Node SDK, CLI onboarding flow, and nullpay.json manifest now cover much more of the merchant lifecycle"
                            >
                                <p>
                                    The server-side SDK at <span className={codeClass}>@nullpay/node</span> is no longer just a thin checkout
                                    wrapper. It now loads local invoice manifests, resolves invoice shortcuts by name or index,
                                    creates hosted checkout sessions, retrieves session status, and verifies webhook signatures with
                                    HMAC-SHA256 helpers.
                                </p>
                                <p>
                                    The biggest structural improvement is <span className={codeClass}>nullpay.json</span>. This file stores
                                    merchant address context plus pre-generated invoice entries containing the invoice name, type,
                                    amount, currency, hash, and salt. That means a backend can create checkout sessions by saying
                                    "use invoice X" instead of manually hardcoding cryptographic invoice identifiers in application code.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300 mb-2 font-bold">
                                        What The SDK Improvements Enable
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- Automatic nullpay.json discovery with optional projectRoot and configPath overrides for deterministic serverless usage.</li>
                                        <li>- Invoice shorthand through <span className={codeClass}>nullpay_invoice_name</span> or index-based lookup.</li>
                                        <li>- Fallback invoice pre-generation if hash and salt are not already supplied.</li>
                                        <li>- Session creation for standard, multi-pay, and donation checkout flows.</li>
                                        <li>- Webhook verification and event parsing as first-class SDK helpers.</li>
                                    </ul>
                                </div>
                                <p>
                                    The CLI command <span className={codeClass}>npx @nullpay/cli@1.0.1 sdk onboard</span> complements this by
                                    generating salts, submitting invoices to the relayer, polling the on-chain mapping resolution,
                                    and finally writing the <span className={codeClass}>nullpay.json</span> file into the project.
                                </p>
                                <p>
                                    Invoice flexibility is broader now too. Donations can be configured for <span className={codeClass}>ANY</span>,
                                    which means the same donation invoice can accept Credits, USDCx, or USAD. Multipay and donation
                                    flows fit naturally into the manifest model, and standard invoices keep their own hosted session
                                    route for merchant checkouts. On top of that, variable amount support exists where it matters:
                                    donation sessions can remain open-ended, and standard invoice line-item flows still preserve a
                                    one-time settlement model for commerce use cases.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={2}
                                eyebrow="Delegated Proving"
                                badge="Infrastructure"
                                accentClass="bg-orange-400/10 border-orange-300/20 text-orange-200"
                                icon={<ShieldCheck className="w-5 h-5" />}
                                glowClass="bg-white/20"
                                title="Delegated proving, record scanning, and fee sponsorship reduce wallet dependency without making the system custodial"
                            >
                                <p>
                                    NullPay now leans much harder into Provable infrastructure. The repo includes a backend DPS path,
                                    a backend-sponsored execution endpoint, and a record-scanner-based flow used by gift cards,
                                    burner sweeps, and sponsored payment execution. This is important because it reduces the need
                                    to rely on Shield Wallet for every proof-heavy interaction.
                                </p>
                                <p>
                                    The model is: the user still authorizes the action or supplies the execution authorization, but
                                    NullPay can relay the proving and fee path. The backend endpoint{' '}
                                    <span className={codeClass}>/api/dps/sponsor-sweep</span> takes a user-built execution authorization,
                                    attaches relayer fee sponsorship on the backend, and submits the secure payload to the Provable
                                    DPS path. That means the action remains user-authorized while the fee can be covered by NullPay.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-purple-300 mb-2 font-bold">
                                        Why This Matters
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- Users can complete selected execution flows even when they do not want to depend on direct wallet broadcast for the final fee path.</li>
                                        <li>- Proof generation stays local where appropriate, while the backend can sponsor supported executions.</li>
                                        <li>- Record scanning via Provable endpoints helps locate balances and spendable records for private assets without manual wallet browsing.</li>
                                        <li>- The relayer fee authorization keeps the flow sponsored, not custodial: the relayer pays fees, but the user-supplied execution authorization stays intact.</li>
                                    </ul>
                                </div>
                                <p>
                                    This same stack is reused across multiple product surfaces. The SDK fallback setup path uses the
                                    relayer for invoice creation. Burner sweeps use sponsored execution. Gift-card redeem and direct
                                    gift-card checkout use scanner plus DPS. The result is a more durable "NullPay execution layer"
                                    instead of a single wallet-dependent frontend path.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={3}
                                eyebrow="NullBot"
                                badge="Integrated"
                                accentClass="bg-white/[0.05] border-white/10 text-white/85"
                                icon={<Sparkles className="w-5 h-5" />}
                                glowClass="bg-orange-400/25"
                                title="NullBot now lives inside the dashboard, developer portal, and docs, each with route-specific context"
                            >
                                <p>
                                    NullBot is no longer a generic floating assistant bolted onto one screen. It is now integrated
                                    into multiple surfaces with different context payloads and different product jobs.
                                </p>
                                <p>
                                    On the dashboard page, the assistant receives a structured merchant context object including
                                    balances, invoice summaries, main and burner wallet stats, merchant receipts, payer receipts,
                                    and invoice metadata. That turns it into a real merchant copilot that can answer questions
                                    about live operating data instead of only reciting product docs.
                                </p>
                                <p>
                                    On the developer and docs pages, NullBot is mounted through the shared docs assistant component
                                    and switches modes between <span className={codeClass}>docs</span> and{' '}
                                    <span className={codeClass}>developer</span>. In those modes it can guide SDK installation,
                                    webhook handling, checkout session behavior, and developer portal questions with route-aware context.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 mb-2 font-bold">
                                        NullBot Surface Breakdown
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- Dashboard: live merchant assistant for invoices, balances, receipts, and settlement visibility.</li>
                                        <li>- Developer page: integration copilot for secret keys, session creation, webhooks, and SDK onboarding.</li>
                                        <li>- Docs page: documentation assistant for APIs, contract explanations, supported tokens, and flow walkthroughs.</li>
                                    </ul>
                                </div>
                                <p>
                                    The key point is that the assistant is not one static prompt. Each placement is wired to a different
                                    data layer, which makes the product feel more like a guided operating environment than a static app.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={4}
                                eyebrow="Gift Cards"
                                badge="Full Flow"
                                accentClass="bg-orange-400/10 border-orange-300/20 text-orange-200"
                                icon={<Gift className="w-5 h-5" />}
                                glowClass="bg-orange-400/25"
                                title="Gift cards now cover creation, balance scanning, redemption, and invoice payment paths"
                            >
                                <p>
                                    Gift cards are no longer just a novelty asset. They form a complete private value-transfer flow.
                                    A card can be created with Credits, USDCx, or USAD, encoded into a generated gift code, scanned
                                    later for balances, redeemed into a connected wallet, or used directly to pay an invoice.
                                </p>
                                <p>
                                    Creation works by generating a fresh private key locally, deriving a new address from it, and
                                    funding that address with one or more private asset transfers. The final gift code is a hex-encoded
                                    wrapper around the generated private key material, prefixed with <span className={codeClass}>gift-</span>.
                                </p>
                                <p>
                                    Redemption uses the scanner flow to discover the card's private balances, lets the user choose a
                                    token and amount, builds a local authorization for <span className={codeClass}>transfer_private</span>,
                                    then submits through the sponsored backend execution path so NullPay can cover the fee on supported
                                    redeem actions.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-pink-300 mb-2 font-bold">
                                        Gift Card Payment Modes
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- Create a card by funding a newly generated private address with one or more supported tokens.</li>
                                        <li>- Scan the card later and reveal its balances through the scratch-style redeem interface.</li>
                                        <li>- Redeem the value into your own connected wallet if you want to convert the gift card into spendable private funds under your account.</li>
                                        <li>- Pay an invoice directly from the gift card by scanning records, building local proofs, and sending the execution through the sponsored DPS route.</li>
                                    </ul>
                                </div>
                                <p>
                                    There is even a graceful partial-balance path for non-donation invoice payments. If a gift card
                                    has some value but not enough to cover the invoice in one record, the checkout flow prompts the
                                    user to redeem the available balance to wallet first, then continue from the regular wallet path.
                                    That makes gift cards usable both as a closed-value product and as a bridge into normal NullPay payments.
                                </p>
                            </SectionCard>

                            <SectionCard
                                index={5}
                                eyebrow="Hosted Checkout"
                                badge="Realtime"
                                accentClass="bg-white/[0.05] border-white/10 text-white/85"
                                icon={<Radio className="w-5 h-5" />}
                                glowClass="bg-white/20"
                                title="Standard hosted invoices now surface live payment status without any extra merchant-side wiring"
                            >
                                <p>
                                    For standard invoice checkout, live status is now part of the default hosted session lifecycle.
                                    Once a merchant creates a checkout session, the NullPay checkout page loads that session, listens
                                    for payment-intent updates, and automatically transitions into settled state when the payment lands.
                                </p>
                                <p>
                                    The implementation uses two layers together: Supabase realtime updates on the{' '}
                                    <span className={codeClass}>payment_intents</span> table and a polling fallback to the checkout session API.
                                    This means merchants do not need to build an extra websocket server or custom status monitor just to
                                    know when a standard hosted invoice has been paid.
                                </p>
                                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 mt-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-300 mb-2 font-bold">
                                        What Happens Automatically
                                    </p>
                                    <ul className="text-xs text-gray-400 space-y-1.5">
                                        <li>- The server creates the checkout session and returns a checkout_url.</li>
                                        <li>- The hosted checkout page loads the session, invoice details, and allowed payment path.</li>
                                        <li>- On successful standard payment, the frontend updates both the invoice record and checkout session state.</li>
                                        <li>- Realtime listeners and polling fallback detect settlement and trigger the success redirect automatically.</li>
                                        <li>- The merchant backend can then verify the final session status or webhook delivery without building a separate live monitor.</li>
                                    </ul>
                                </div>
                                <p>
                                    The important nuance is that this "live status by default" is strongest in the standard hosted
                                    checkout path, where one session maps cleanly to one commerce settlement outcome. That keeps the
                                    merchant experience simple: create the session, send the user to checkout, and NullPay handles the
                                    payment-state feedback loop end to end.
                                </p>
                            </SectionCard>

                            <motion.div
                                custom={6}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-white flex items-center justify-center">
                                        <Boxes className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-2">At A Glance</p>
                                        <h3 className="text-xl font-bold text-white mb-4">What this release changes for merchants and developers</h3>
                                        <div className="grid md:grid-cols-3 gap-3">
                                            <div className="rounded-2xl border border-orange-300/15 bg-orange-400/8 p-4">
                                                <div className="flex items-center gap-2 text-orange-200 mb-2">
                                                    <Bot className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">AI-ready</span>
                                                </div>
                                                <p className="text-xs leading-6 text-white/65">
                                                    MCP and NullBot make NullPay easier to operate through natural-language workflows.
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                <div className="flex items-center gap-2 text-white/80 mb-2">
                                                    <CreditCard className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">Payment depth</span>
                                                </div>
                                                <p className="text-xs leading-6 text-white/65">
                                                    Gift cards, sponsored execution, and flexible invoice manifests expand how value moves through NullPay.
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                <div className="flex items-center gap-2 text-white/80 mb-2">
                                                    <Radio className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">Better UX</span>
                                                </div>
                                                <p className="text-xs leading-6 text-white/65">
                                                    Realtime checkout settlement and richer platform tooling reduce friction for both merchants and payers.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
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
