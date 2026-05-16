import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, ArrowUpRight, Bot, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../../utils/core/animations';
import { Callout, CodeBlock, MetricCard } from '../../../desktop/pages/docs/ui';

/* ── Types ───────────────────────────────────────────────── */
type TBSection = {
    id: string;
    group: string;
    label: string;
    eyebrow: string;
    title: string;
    summary: string;
    content: React.ReactNode;
};

/* ── Data ─────────────────────────────────────────────────── */
const BOT_USERNAME = '@nullpay_private_bot';
const BOT_LINK = 'https://t.me/nullpay_private_bot';

const sections: TBSection[] = [
    {
        id: 'tb-overview',
        group: 'Introduction',
        label: 'Overview',
        eyebrow: 'Telegram Bot',
        title: 'NullPay Telegram Bot',
        summary: 'A merchant-facing companion bot for wallet linking, invoice creation, dashboard monitoring, and real-time payment alerts.',
        content: (
            <div className="space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                    <MetricCard icon={MessageCircle} title="Merchant Companion" description="Link your wallet once, then create invoices, check status, and get payment alerts — all inside Telegram." />
                    <MetricCard icon={Bot} title="Inline Wizard" description="Create standard, multipay, and donation invoices through a guided inline keyboard flow. No complex commands needed." />
                    <MetricCard icon={Copy} title="Browser Boundary" description="Sensitive actions (paying, signing, decrypting) redirect to the web app. Telegram never sees passwords or private keys." />
                </div>

                <GlassCard className="p-6">
                    <h3 className="mb-5 text-xl font-bold text-white">What the Bot Does vs. the Browser</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.08]">
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Capability</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Telegram Bot</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Web App</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-300">
                                {[
                                    ['Wallet Linking', 'Initiate / verify', 'Sign message + complete'],
                                    ['Invoice Creation', 'Full inline wizard', '—'],
                                    ['Invoice Lookup', 'Hash lookup + list', 'Detailed explorer view'],
                                    ['Payment', 'Redirects to browser', 'Full checkout flow'],
                                    ['Dashboard', 'Totals + paginated list', 'Full merchant dashboard'],
                                    ['Signing / Decrypting', 'Never', 'Browser only'],
                                    ['Payment Alerts', 'Realtime push', 'In-app notifications'],
                                ].map(([cap, tg, web]) => (
                                    <tr key={cap} className="border-b border-white/[0.04]">
                                        <td className="px-4 py-3 font-semibold text-white">{cap}</td>
                                        <td className="px-4 py-3 text-emerald-400">{tg}</td>
                                        <td className="px-4 py-3 text-gray-400">{web}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                <Callout title="Get Started" tone="blue">
                    Find the bot at <span className="font-mono text-orange-300">@nullpay_private_bot</span> or open{' '}
                    <a href={BOT_LINK} target="_blank" rel="noreferrer" className="text-orange-300 underline">t.me/nullpay_private_bot</a>.
                    Send /start to see available commands and linking options.
                </Callout>
            </div>
        ),
    },
    {
        id: 'tb-linking',
        group: 'Wallet Linking',
        label: 'Wallet Linking',
        eyebrow: 'Setup',
        title: 'Wallet Linking Flow',
        summary: 'Link your Aleo wallet to Telegram via a secure browser flow with signature verification. One-time setup, persistent across sessions.',
        content: (
            <div className="space-y-6">
                <div className="space-y-6">
                    {[
                        { title: '1. Session Creation', body: 'Merchant runs /start or /link in Telegram. The backend creates a short-lived link session with telegram_id, chat_id, nonce, and expiry.' },
                        { title: '2. Browser Redirect', body: 'Bot opens the /telegram/link page in the browser, reusing the same wallet-connect stack as the main app.' },
                        { title: '3. Password Gate', body: 'User connects their Aleo wallet and creates/unlocks their NullPay password before linking can complete.' },
                        { title: '4. Signature Verification', body: 'User signs a message containing Telegram session metadata. Backend verifies the Aleo signature and marks the session consumed.' },
                        { title: '5. Automatic Return', body: 'After success, the site redirects back to Telegram and the bot sends a confirmation message automatically.' },
                    ].map((item) => (
                        <div key={item.title} className="relative pl-8 border-l-2 border-orange-400/30">
                            <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-orange-400 border-4 border-black" />
                            <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
                        </div>
                    ))}
                </div>

                <CodeBlock title="Signed Message Purpose" language="text" code="Link your wallet to the NullPay Telegram Bot" />

                <Callout title="Security Note" tone="emerald">
                    The link session expires after a short time and can only be consumed once. The Telegram ID is hashed (SHA-256) and sensitive fields are AES-encrypted before storage. Even if the database is compromised, raw Telegram IDs cannot be recovered without the encryption key.
                </Callout>
            </div>
        ),
    },
    {
        id: 'tb-commands',
        group: 'Commands',
        label: 'Command Reference',
        eyebrow: 'Commands',
        title: 'Merchant Command Surface',
        summary: 'Complete reference for all 10 bot commands: from wallet linking and invoice creation to dashboard access and payment alerts.',
        content: (
            <div className="space-y-6">
                <GlassCard className="overflow-hidden p-0 border-white/[0.06]">
                    <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Available Commands</p>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                        {[
                            { cmd: '/start', desc: 'Shows the bot intro, capability summary, and quick action buttons.' },
                            { cmd: '/link', desc: 'Creates a one-time secure linking session and opens the browser flow.' },
                            { cmd: '/dashboard', desc: 'Displays invoice totals, status counts, and paginated recent invoice activity.' },
                            { cmd: '/create', desc: 'Starts the guided invoice wizard for standard, multipay, and donation invoices.' },
                            { cmd: '/invoice <hash>', desc: 'Returns DB-backed invoice details, creation time, and payment transaction IDs.' },
                            { cmd: '/invoices', desc: 'Lists recent invoices for the linked merchant with browser shortcuts.' },
                            { cmd: '/pay <hash>', desc: 'Opens the correct browser route when payment must continue on the website.' },
                            { cmd: '/notifications', desc: 'Lets the merchant turn Telegram payment alerts on or off.' },
                            { cmd: '/webapp', desc: 'Opens browser shortcuts for profile, invoice creation, gift cards, and developer tools.' },
                            { cmd: '/unlink', desc: 'Removes the currently linked merchant wallet from the Telegram account.' },
                        ].map((item) => (
                            <div key={item.cmd} className="flex flex-col md:flex-row md:items-start gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                                <code className="text-orange-300 text-sm font-mono min-w-[180px] shrink-0">{item.cmd}</code>
                                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="mb-4 text-xl font-bold text-white">Dashboard Behavior</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            'Invoice totals, settled count, and pending count come from the database.',
                            'Only the latest 5 invoices are shown per page, with page buttons at the bottom.',
                            'Invoice hashes, creation transaction IDs, and payment transaction IDs are copy-friendly.',
                            'Explorer links open the Aleo testnet transaction directly from Telegram.',
                        ].map((item) => (
                            <div key={item} className="bg-black/40 p-5 rounded-xl border border-white/5">
                                <p className="text-sm text-gray-400 leading-relaxed">{item}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        ),
    },
    {
        id: 'tb-invoice-wizard',
        group: 'Commands',
        label: 'Invoice Wizard',
        eyebrow: 'Creation',
        title: 'Inline Invoice Creation',
        summary: 'Step-by-step inline keyboard wizard for creating standard, multipay, and donation invoices directly from Telegram.',
        content: (
            <div className="space-y-6">
                <div className="space-y-6">
                    {[
                        { title: '1. Type Selection', body: 'Choose Standard (single payment), Multipay (multiple allowed), or Donation (open amount). Each type changes the required fields and validation rules.' },
                        { title: '2. Token Selection', body: 'Select CREDITS, USDCx, USAD, or ANY (let the payer choose). Oracle conversion is available when "Allow Other Tokens" is selected.' },
                        { title: '3. Amount & Details', body: 'Enter the target amount, invoice title, and optional memo. For donations, the amount becomes a suggested minimum.' },
                        { title: '4. Confirmation', body: 'Review the invoice details inline. Confirming triggers the relayer to create the invoice on-chain via the smart contract.' },
                        { title: '5. Receipt', body: 'After on-chain confirmation, the bot returns the invoice hash, explorer link, and a browser shortcut for sharing the payment link.' },
                    ].map((item) => (
                        <div key={item.title} className="relative pl-8 border-l-2 border-orange-400/30">
                            <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-orange-400 border-4 border-black" />
                            <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
                        </div>
                    ))}
                </div>

                <Callout title="No Private Key in Telegram" tone="emerald">
                    The invoice creation wizard in Telegram only collects parameters and sends them to the backend relayer. The actual on-chain transaction (and the merchant private key needed to sign it) happens server-side. The merchant never types or exposes their private key inside Telegram.
                </Callout>
            </div>
        ),
    },
    {
        id: 'tb-alerts',
        group: 'Notifications',
        label: 'Payment Alerts',
        eyebrow: 'Notifications',
        title: 'Realtime Payment Alerts',
        summary: 'Get instant Telegram notifications when payments are detected for your invoices. Deduplicated, filtered by merchant, and toggleable.',
        content: (
            <div className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                    <MetricCard icon={Copy} title="Payment Detected" description="Alert sent when payment_tx_ids grows and a new transaction is observed for one of your invoices." />
                    <MetricCard icon={Copy} title="Settled Follow-up" description="A settled status update follows without duplicating the original payment-received notification." />
                    <MetricCard icon={Copy} title="Merchant Filter" description="Alerts are filtered by the linked merchant hash so you only receive your own invoice activity." />
                    <MetricCard icon={Copy} title="Toggle Support" description="Notifications are enabled by default but can be switched on or off with /notifications." />
                </div>

                <Callout title="How It Works" tone="blue">
                    The notification worker subscribes to invoice updates via Supabase Realtime. When a payment transaction ID is added to an invoice row, the worker checks which merchant owns that invoice, looks up their linked Telegram chat ID, and sends a formatted alert. Each alert is deduplicated using the telegram_notification_deliveries table so restarts or reprocessing do not spam the merchant.
                </Callout>
            </div>
        ),
    },
    {
        id: 'tb-security',
        group: 'Security',
        label: 'Security Boundary',
        eyebrow: 'Security',
        title: 'Browser-Only Security Model',
        summary: 'Telegram is never used as the execution surface for sensitive wallet flows. All decryption, password use, and transaction signing stay in the browser.',
        content: (
            <div className="space-y-6">
                <p className="text-base leading-relaxed text-gray-300">
                    NullPay keeps decryption, password use, and signing in the browser so the security model stays aligned with the rest of the app. Telegram handles the workflow layer (linking, creation, monitoring, alerts) but never sees private keys, passwords, or decrypted records.
                </p>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[
                        'Paying invoices',
                        'Gift card creation, redemption, and payment',
                        'Burner wallet management',
                        'Card wallet management',
                        'Private balance scans',
                        'Receipt verification against private records',
                        'Wallet record decryption',
                        'Sensitive transaction signing',
                    ].map((item) => (
                        <div key={item} className="bg-black/40 p-5 rounded-xl border border-red-500/10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-red-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Browser Only</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">{item}</p>
                        </div>
                    ))}
                </div>

                <GlassCard className="p-6">
                    <h3 className="mb-4 text-xl font-bold text-white">Encryption Model</h3>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
                        <p><span className="font-semibold text-white">Telegram ID Hashing:</span> SHA-256 hashes of Telegram IDs are stored for lookup and correlation. The raw ID is never stored in plain text.</p>
                        <p><span className="font-semibold text-white">AES-256-GCM:</span> Sensitive fields (telegram_id, chat_id, username) are encrypted at rest using AES-256-GCM with a key derived from the backend master key.</p>
                        <p><span className="font-semibold text-white">Webhook Secret:</span> The Telegram webhook endpoint validates the x-telegram-bot-api-secret-token header to ensure only Telegram can push updates.</p>
                    </div>
                </GlassCard>
            </div>
        ),
    },
];

/* ── Text Extraction ────────────────────────────────────────── */
const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (typeof node === 'object' && node !== null && 'props' in node) {
        return extractText((node as { props?: { children?: React.ReactNode } }).props?.children);
    }
    return '';
};

const buildSearchIndex = (sections: TBSection[]): Map<string, string> => {
    const index = new Map<string, string>();
    for (const s of sections) {
        const text = [s.title, s.summary, s.eyebrow, s.label, s.group, extractText(s.content)].join(' ').toLowerCase();
        index.set(s.id, text);
    }
    return index;
};

const getSnippet = (text: string, query: string, radius = 60): string => {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return text.slice(0, radius * 2);
    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + query.length + radius);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
};

/* ── Components ───────────────────────────────────────────── */
const SectionHeader = ({ section }: { section: TBSection }) => (
    <div className="mb-8">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-orange-400 mb-2">{section.eyebrow}</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">{section.title}</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-400">{section.summary}</p>
    </div>
);

const SectionNav = ({ sections, currentIndex, onNavigate }: { sections: TBSection[]; currentIndex: number; onNavigate: (id: string) => void }) => {
    const prev = sections[currentIndex - 1];
    const next = sections[currentIndex + 1];
    return (
        <div className="mt-16 grid gap-3 md:grid-cols-2 border-t border-white/[0.05] pt-8">
            {prev ? (
                <button onClick={() => onNavigate(prev.id)} className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 text-left hover:bg-white/[0.03] hover:border-white/[0.1] transition-all">
                    <ChevronLeft className="h-4 w-4 shrink-0 text-gray-600 group-hover:text-orange-400 transition-colors" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-0.5">Previous</p>
                        <p className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors truncate">{prev.label}</p>
                    </div>
                </button>
            ) : <div />}
            {next ? (
                <button onClick={() => onNavigate(next.id)} className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 text-right flex-row-reverse hover:bg-white/[0.03] hover:border-white/[0.1] transition-all">
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 group-hover:text-orange-400 transition-colors" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-0.5">Next</p>
                        <p className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors truncate">{next.label}</p>
                    </div>
                </button>
            ) : <div />}
        </div>
    );
};

/* ── Search Overlay ─────────────────────────────────────────── */
const SearchOverlay = ({ query, onQueryChange, searchIndex, sections, onClose, onNavigate }: {
    query: string;
    onQueryChange: (q: string) => void;
    searchIndex: Map<string, string>;
    sections: TBSection[];
    onClose: () => void;
    onNavigate: (id: string) => void;
}) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return sections
            .map((s) => ({ section: s, text: searchIndex.get(s.id) ?? '' }))
            .filter((r) => r.text.includes(q))
            .map((r) => ({ ...r, snippet: getSnippet(r.text, q, 60), matchCount: r.text.split(q).length - 1 }))
            .slice(0, 20);
    }, [query, searchIndex, sections]);

    useEffect(() => { setSelectedIdx(0); }, [query]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && results[selectedIdx]) { e.preventDefault(); onNavigate(results[selectedIdx].section.id); onClose(); }
            else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [results, selectedIdx, onNavigate, onClose]);

    useEffect(() => {
        const el = listRef.current?.querySelector('[data-sa="true"]');
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    return (
        <div className="fixed inset-0 z-[300] flex flex-col items-center pt-[15vh] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 w-full max-w-[640px] flex flex-col max-h-[70vh]"
            >
                <div className="flex items-center gap-3 rounded-t-xl border border-white/[0.08] bg-[#0c0c0e]/95 px-4 py-4 backdrop-blur-xl">
                    <Search className="h-5 w-5 text-orange-400 shrink-0" strokeWidth={2.5} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Search Telegram Bot docs..."
                        className="flex-1 bg-transparent text-[16px] text-white placeholder-gray-500 outline-none"
                    />
                    <button onClick={onClose} className="shrink-0 rounded border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors">ESC</button>
                </div>

                <div className="rounded-b-xl border border-t-0 border-white/[0.08] bg-[#0c0c0e]/95 shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden flex flex-col">
                    {results.length === 0 && query.trim() ? (
                        <div className="p-10 text-center">
                            <p className="text-[14px] text-gray-500">No results for <span className="text-gray-300 font-medium">"{query}"</span></p>
                        </div>
                    ) : (
                        <div ref={listRef} className="overflow-y-auto scrollbar-thin py-2">
                            {results.map((r, i) => (
                                <button
                                    key={r.section.id}
                                    data-sa={i === selectedIdx}
                                    onClick={() => { onNavigate(r.section.id); onClose(); }}
                                    onMouseEnter={() => setSelectedIdx(i)}
                                    className={`w-full text-left px-4 py-3 transition-colors ${i === selectedIdx ? 'bg-orange-400/[0.08]' : 'hover:bg-white/[0.03]'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <MessageCircle className="h-4 w-4 shrink-0 text-gray-500 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[14px] font-medium text-gray-200">{r.section.label}</p>
                                            <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mt-1">{r.snippet}</p>
                                        </div>
                                        {r.matchCount > 1 && <span className="shrink-0 text-[10px] font-mono text-gray-600 bg-white/[0.03] rounded px-1.5 py-0.5">{r.matchCount}×</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-white/[0.04] px-4 py-2.5 flex items-center gap-5 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1.5"><kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate</span>
                        <span className="flex items-center gap-1.5"><kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> open</span>
                        <span className="flex items-center gap-1.5"><kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">esc</kbd> close</span>
                        {results.length > 0 && <span className="ml-auto text-gray-700">{results.length} result{results.length !== 1 ? 's' : ''}</span>}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ── Main Page ────────────────────────────────────────────── */
export default function TelegramBotPage() {
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState(sections[0].id);
    const [usernameCopied, setUsernameCopied] = useState(false);

    const searchIndex = useMemo(() => buildSearchIndex(sections), []);
    const selectedSection = sections.find((s) => s.id === activeSection) ?? sections[0];
    const currentIndex = sections.findIndex((s) => s.id === activeSection);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSearchFocused(true); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const handleCopyUsername = async () => {
        await navigator.clipboard.writeText(BOT_USERNAME);
        setUsernameCopied(true);
        setTimeout(() => setUsernameCopied(false), 1500);
    };

    const handleSectionChange = (id: string) => {
        setActiveSection(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <motion.div className="page-container relative min-h-screen" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <motion.div initial="hidden" animate="show" variants={staggerContainer} className="relative z-10">
                {/* Hero */}
                <motion.div variants={fadeInUp} className="border-b border-white/[0.05]">
                    <div className="mx-auto max-w-7xl px-6 pt-12 pb-8 text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Bot className="h-5 w-5 text-orange-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Telegram Integration</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            NullPay <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">Telegram Bot</span>
                        </h1>
                        <p className="mt-2 mx-auto max-w-xl text-[15px] text-gray-400">
                            Wallet linking, invoice creation, dashboard monitoring, and real-time payment alerts in Telegram.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <button
                                onClick={handleCopyUsername}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium border transition-all ${usernameCopied ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'}`}
                            >
                                {usernameCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span className="font-mono">{BOT_USERNAME}</span>
                            </button>
                            <a
                                href={BOT_LINK}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.05] hover:text-gray-200 transition-all"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open in Telegram
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Sticky Tab Bar */}
                <motion.div variants={fadeInUp} className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/90 backdrop-blur-xl">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none -mx-1.5">
                            {sections.map((section) => {
                                const isActive = section.id === activeSection;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionChange(section.id)}
                                        className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <span className="truncate max-w-[140px]">{section.label}</span>
                                        {isActive && (
                                            <motion.div layoutId="tbTabIndicator" className="absolute bottom-0 left-2 right-2 h-[2px] bg-orange-400 rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                                        )}
                                    </button>
                                );
                            })}

                            <div className="ml-auto flex items-center py-2">
                                <button
                                    onClick={() => setSearchFocused(true)}
                                    className="relative group w-[180px] md:w-[220px] rounded-lg bg-white/[0.03] border border-white/[0.06] pl-8 pr-8 py-[7px] text-left text-[13px] text-gray-500 transition-all hover:bg-white/[0.05] hover:border-white/[0.1]"
                                >
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-orange-400 transition-colors pointer-events-none">
                                        <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </div>
                                    Search...
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center">
                                        <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1 py-0.5 text-[9px] font-mono text-gray-600">⌘K</kbd>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content — full width, no sidebar */}
                <div className="mx-auto max-w-6xl px-6 py-8">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={selectedSection.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <SectionHeader section={selectedSection} />
                                <button
                                    onClick={async () => {
                                        const url = `${window.location.origin}${window.location.pathname}#${selectedSection.id}`;
                                        await navigator.clipboard?.writeText(url);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300 transition-all shrink-0 mt-1"
                                >
                                    <ArrowUpRight className="h-3 w-3" />
                                    Share
                                </button>
                            </div>
                            {selectedSection.content}
                            <SectionNav sections={sections} currentIndex={currentIndex} onNavigate={handleSectionChange} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Search Overlay */}
            <AnimatePresence>
                {searchFocused && (
                    <SearchOverlay
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        searchIndex={searchIndex}
                        sections={sections}
                        onClose={() => { setSearchFocused(false); setSearchQuery(''); }}
                        onNavigate={handleSectionChange}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
