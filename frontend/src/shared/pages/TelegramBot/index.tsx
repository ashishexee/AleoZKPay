import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../../utils/core/animations';

const BOT_USERNAME = '@nullpay_private_bot';
const BOT_LINK = 'https://t.me/nullpay_private_bot';

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'linking', label: 'Wallet Linking' },
    { id: 'commands', label: 'Commands' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'security', label: 'Security Boundary' },
];

const commands = [
    { command: '/start', description: 'Shows the bot intro, capability summary, and quick action buttons.' },
    { command: '/link', description: 'Creates a one-time secure linking session and opens the browser flow.' },
    { command: '/dashboard', description: 'Displays invoice totals, status counts, and paginated recent invoice activity.' },
    { command: '/create', description: 'Starts the guided invoice wizard for standard, multipay, and donation invoices.' },
    { command: '/invoice <hash>', description: 'Returns DB-backed invoice details, creation time, and payment transaction IDs.' },
    { command: '/invoices', description: 'Lists recent invoices for the linked merchant with browser shortcuts.' },
    { command: '/pay <hash>', description: 'Opens the correct browser route when payment must continue on the website.' },
    { command: '/notifications', description: 'Lets the merchant turn Telegram payment alerts on or off.' },
    { command: '/webapp', description: 'Opens browser shortcuts for profile, invoice creation, gift cards, and developer tools.' },
    { command: '/unlink', description: 'Removes the currently linked merchant wallet from the Telegram account.' },
];

const browserOnly = [
    'Paying invoices',
    'Gift card creation, redemption, and payment',
    'Burner wallet management',
    'Card wallet management',
    'Private balance scans',
    'Receipt verification against private records',
    'Wallet record decryption',
    'Sensitive transaction signing'
];

const dashboardHighlights = [
    'Invoice totals, settled count, and pending count come from the database.',
    'Only the latest 5 invoices are shown per page, with page buttons at the bottom.',
    'Invoice hashes, creation transaction IDs, and payment transaction IDs are copy-friendly.',
    'Explorer links open the Aleo testnet transaction directly from Telegram.'
];

const CodeBlock = ({ title, code, language = 'text' }: { title: string; code: string; language?: string }) => (
    <div className="mt-6 mb-8 group">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-t-lg border-b-0">
            <span className="font-mono text-xs text-orange-300 font-bold uppercase tracking-wider">{title}</span>
            <span className="text-[10px] text-gray-500">{language.toUpperCase()}</span>
        </div>
        <pre className="p-4 bg-black/80 backdrop-blur-sm border border-white/10 rounded-b-lg overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-orange-400/30 transition-colors">
            <code>{code}</code>
        </pre>
    </div>
);

export default function TelegramBotPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [usernameCopied, setUsernameCopied] = useState(false);

    const handleCopyUsername = async () => {
        await navigator.clipboard.writeText(BOT_USERNAME);
        setUsernameCopied(true);
        window.setTimeout(() => setUsernameCopied(false), 1600);
    };

    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="w-full max-w-7xl mx-auto pt-12 pb-20 px-6 relative z-10"
            >
                <motion.div variants={fadeInUp} className="text-center mb-12 border-b border-white/10 pb-10 flex flex-col items-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        NullPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Telegram Bot</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-3xl leading-relaxed">
                        Telegram docs for the merchant companion: wallet linking, invoice creation, dashboard snapshots,
                        and real-time payment alerts.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleCopyUsername}
                                className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all group max-w-fit cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Copy className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
                                <code className="text-sm font-mono text-orange-300 font-medium">{BOT_USERNAME}</code>
                                <div className="flex items-center gap-2 ml-5 border-l border-white/5 pl-5">
                                    {usernameCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors w-[68px] inline-block">
                                        {usernameCopied ? 'Copied!' : 'Copy'}
                                    </span>
                                </div>
                            </button>

                            <a
                                href={BOT_LINK}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all group max-w-fit cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
                                <code className="text-sm font-mono text-orange-300 font-medium">{BOT_LINK}</code>
                                <div className="flex items-center gap-2 ml-5 border-l border-white/5 pl-5">
                                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors w-[68px] inline-block">
                                        Open
                                    </span>
                                </div>
                            </a>
                        </div>
                        <span className="text-[10px] text-orange-500/70 font-black uppercase tracking-[0.2em] text-center">
                            Copy the bot username or jump straight into Telegram.
                        </span>
                    </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-4 mb-12 sticky top-24 z-50 bg-black/50 backdrop-blur-xl p-4 rounded-full border border-white/5 max-w-6xl mx-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </motion.div>

                <div className="min-h-[600px]">
                    {activeTab === 'overview' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    What is the Telegram Bot?
                                </h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    NullPay Telegram Bot is a merchant-facing companion that sits on top of the main NullPay web app.
                                    It helps merchants link their wallet once, create invoices quickly, inspect invoice status, and receive
                                    payment updates without turning Telegram into a wallet or signing surface.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Merchant Companion</h3>
                                        <p className="text-sm text-gray-400">
                                            The bot focuses on lightweight merchant workflows: linking, creating invoices, looking up invoices,
                                            and monitoring activity.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Browser Security Boundary</h3>
                                        <p className="text-sm text-gray-400">
                                            Sensitive wallet actions still happen in the web app so passwords, decryption, and signatures stay local.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Database-Backed Views</h3>
                                        <p className="text-sm text-gray-400">
                                            Dashboard and invoice summaries are built from the indexed invoice rows already used by the frontend.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Realtime Notifications</h3>
                                        <p className="text-sm text-gray-400">
                                            Merchants receive payment alerts in Telegram when the invoice row gains a new payment transaction ID.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'linking' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Wallet Linking Flow
                                </h2>
                                <div className="space-y-8">
                                    {[
                                        {
                                            title: '1. Session Creation',
                                            body: 'The merchant uses /start or /link in Telegram. The backend creates a short-lived link session tied to telegram_id, chat_id, nonce, and expiry.'
                                        },
                                        {
                                            title: '2. Browser Redirect',
                                            body: 'The bot opens the dedicated /telegram/link page in the frontend, where the same wallet-connect stack is reused.'
                                        },
                                        {
                                            title: '3. NullPay Password Gate',
                                            body: 'The page requires the user to connect the Aleo wallet and then create or unlock the NullPay password before linking can complete.'
                                        },
                                        {
                                            title: '4. Signature Verification',
                                            body: 'The user signs a short message containing the Telegram session metadata. The backend verifies the Aleo signature and marks the link session consumed.'
                                        },
                                        {
                                            title: '5. Automatic Return',
                                            body: 'After success, the site redirects back toward the Telegram bot and the bot sends a confirmation message automatically, so the merchant does not need to run /link again.'
                                        }
                                    ].map((item) => (
                                        <div key={item.title} className="relative pl-8 border-l-2 border-orange-400/30">
                                            <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-orange-400 border-4 border-black" />
                                            <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                            <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Signed Message Purpose
                                </h2>
                                <CodeBlock
                                    title="Purpose String"
                                    language="text"
                                    code="Link your wallet to the NullPay Telegram Bot"
                                />
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'commands' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Merchant Command Surface
                                </h2>
                                <div className="space-y-4">
                                    {commands.map((item) => (
                                        <div key={item.command} className="flex flex-col md:flex-row md:items-start gap-4 py-4 border-b border-white/6 last:border-b-0">
                                            <code className="text-orange-300 text-sm font-mono min-w-[180px]">{item.command}</code>
                                            <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Dashboard Behavior
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {dashboardHighlights.map((item) => (
                                        <div key={item} className="bg-black/40 p-6 rounded-xl border border-white/5">
                                            <p className="text-sm text-gray-400 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'alerts' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Realtime Payment Alerts
                                </h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    The bot subscribes to invoice updates and sends Telegram alerts only to the merchant whose linked wallet
                                    matches the invoice row. Notifications are deduplicated so restarts do not spam the merchant with repeats.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Payment Detected</h3>
                                        <p className="text-sm text-gray-400">
                                            A new alert is sent when `payment_tx_ids` grows and a new transaction is observed for the invoice.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Settled Follow-up</h3>
                                        <p className="text-sm text-gray-400">
                                            A settled status update can follow without duplicating the original payment-received notification.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Merchant Filter</h3>
                                        <p className="text-sm text-gray-400">
                                            Alerts are filtered by the linked merchant hash so users only receive their own invoice activity.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                                        <h3 className="text-white font-bold mb-2">Toggle Support</h3>
                                        <p className="text-sm text-gray-400">
                                            Notifications are enabled by default but can be switched on or off inside Telegram.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                            <GlassCard className="p-10">
                                <h2 className="text-3xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    Why Some Flows Stay Browser-Only
                                </h2>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    Telegram is not used as the execution surface for sensitive wallet flows. NullPay keeps decryption,
                                    password use, and signing in the browser so the security model stays aligned with the rest of the app.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {browserOnly.map((item) => (
                                        <div key={item} className="bg-black/40 p-6 rounded-xl border border-white/5">
                                            <p className="text-sm text-gray-400 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
