import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronUp, ChevronLeft, ChevronRight, ArrowUpRight, BookOpen, Menu, X as XIcon, ClipboardCopy, Bot, FileText, Hash } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DocsChatbot } from '../../../shared/components/docs/DocsChatbot';
import { pageVariants, staggerContainer, fadeInUp } from '../../../shared/utils/core/animations';
import { loadSectionsForTab, loadAllSections, getTabForSectionId } from './sections';
import { docsTabs } from './tabs';
import type { DocsSection, DocsTab } from './types';
import type { ReactNode } from 'react';

/* ── Text Extraction from ReactNode ─────────────────────────── */
const extractText = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (typeof node === 'object' && node !== null && 'props' in node) {
        const el = node as { props?: { children?: ReactNode } };
        return extractText(el.props?.children);
    }
    return '';
};

type SearchResult = {
    tabId: DocsTab['id'];
    tabLabel: string;
    section: DocsSection;
    snippet: string;
    matchCount: number;
};

const buildSearchIndexForSections = (sections: DocsSection[]): Map<string, string> => {
    const index = new Map<string, string>();
    for (const s of sections) {
        const text = [
            s.title,
            s.summary,
            s.eyebrow,
            s.label,
            s.group,
            extractText(s.content),
        ].join(' ').toLowerCase();
        index.set(s.id, text);
    }
    return index;
};

// getTabForSectionId is imported from sections.ts

const getSnippet = (text: string, query: string, radius = 80): string => {
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

const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-orange-400/30 text-orange-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
};

/* ── Search Overlay ────────────────────────────────────────── */
const SearchOverlay = ({
    query,
    onQueryChange,
    onClose,
    onNavigate,
}: {
    query: string;
    onQueryChange: (q: string) => void;
    onClose: () => void;
    onNavigate: (tabId: DocsTab['id'], sectionId: string) => void;
}) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const overlayInputRef = useRef<HTMLInputElement>(null);
    const [allSections, setAllSections] = useState<DocsSection[]>([]);
    const [searchIndexAll, setSearchIndexAll] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (query.trim() && allSections.length === 0) {
            loadAllSections().then(sections => {
                setAllSections(sections);
                const idx = new Map<string, string>();
                for (const s of sections) {
                    const text = [s.title, s.summary, s.eyebrow, s.label, s.group, extractText(s.content)].join(' ').toLowerCase();
                    idx.set(s.id, text);
                }
                setSearchIndexAll(idx);
            });
        }
    }, [query, allSections.length]);

    const results = useMemo<SearchResult[]>(() => {
        if (!query.trim() || allSections.length === 0) return [];
        const q = query.toLowerCase();
        const out: SearchResult[] = [];
        for (const tab of docsTabs) {
            const sections = allSections.filter(s => getTabForSectionId(s.id) === tab.id);
            for (const section of sections) {
                const text = searchIndexAll.get(section.id) ?? '';
                if (!text.includes(q)) continue;
                const matchCount = text.split(q).length - 1;
                out.push({
                    tabId: tab.id,
                    tabLabel: tab.label,
                    section,
                    snippet: getSnippet(text, q, 80),
                    matchCount,
                });
            }
        }
        out.sort((a, b) => {
            if (a.tabId !== b.tabId) return 0;
            const tabSections = allSections.filter(s => getTabForSectionId(s.id) === a.tabId);
            const aIdx = tabSections.findIndex((s) => s.id === a.section.id);
            const bIdx = tabSections.findIndex((s) => s.id === b.section.id);
            return aIdx - bIdx;
        });
        return out.slice(0, 50);
    }, [query, allSections, searchIndexAll]);

    useEffect(() => { setSelectedIdx(0); }, [query]);

    useEffect(() => {
        overlayInputRef.current?.focus();
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && results[selectedIdx]) {
                e.preventDefault();
                onNavigate(results[selectedIdx].tabId, results[selectedIdx].section.id);
                onClose();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [results, selectedIdx, onNavigate, onClose]);

    useEffect(() => {
        if (!listRef.current) return;
        const active = listRef.current.querySelector('[data-search-active="true"]');
        active?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    return (
        <div className="fixed inset-0 z-[300] flex flex-col items-center pt-[15vh] px-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-[640px] flex flex-col max-h-[70vh]"
            >
                {/* Big Search Input */}
                <div className="flex items-center gap-3 rounded-t-xl border border-white/[0.08] bg-[#0c0c0e]/95 px-4 py-4 backdrop-blur-xl">
                    <Search className="h-5 w-5 text-orange-400 shrink-0" strokeWidth={2.5} />
                    <input
                        ref={overlayInputRef}
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Search documentation..."
                        className="flex-1 bg-transparent text-[16px] text-white placeholder-gray-500 outline-none"
                    />
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        ESC
                    </button>
                </div>

                {/* Results */}
                <div className="rounded-b-xl border border-t-0 border-white/[0.08] bg-[#0c0c0e]/95 shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden flex flex-col">
                    {results.length === 0 && query.trim() ? (
                        <div className="p-10 text-center">
                            <p className="text-[14px] text-gray-500">
                                No results for <span className="text-gray-300 font-medium">"{query}"</span>
                            </p>
                        </div>
                    ) : (
                        <div ref={listRef} className="overflow-y-auto scrollbar-thin py-2">
                            {(() => {
                                let lastTabId: string | null = null;
                                return results.map((r, i) => {
                                    const showTabHeader = r.tabId !== lastTabId;
                                    lastTabId = r.tabId;
                                    return (
                                        <div key={`${r.tabId}-${r.section.id}`}>
                                            {showTabHeader && (
                                                <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                                                    <Hash className="h-3.5 w-3.5 text-orange-400/70" />
                                                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-400/70">
                                                        {r.tabLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                data-search-active={i === selectedIdx}
                                                onClick={() => { onNavigate(r.tabId, r.section.id); onClose(); }}
                                                onMouseEnter={() => setSelectedIdx(i)}
                                                className={`w-full text-left px-4 py-3 transition-colors ${
                                                    i === selectedIdx
                                                        ? 'bg-orange-400/[0.08]'
                                                        : 'hover:bg-white/[0.03]'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <FileText className="h-4 w-4 shrink-0 text-gray-500 mt-0.5" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[14px] font-medium text-gray-200">
                                                            {highlightMatch(r.section.label, query)}
                                                        </p>
                                                        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mt-1">
                                                            {highlightMatch(r.snippet, query)}
                                                        </p>
                                                    </div>
                                                    {r.matchCount > 1 && (
                                                        <span className="shrink-0 text-[10px] font-mono text-gray-600 bg-white/[0.03] rounded px-1.5 py-0.5">
                                                            {r.matchCount}×
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-white/[0.04] px-4 py-2.5 flex items-center gap-5 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1.5">
                            <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                            open
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
                            close
                        </span>
                        {results.length > 0 && (
                            <span className="ml-auto text-gray-700">{results.length} result{results.length !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ── Reading Progress ─────────────────────────────────────── */
const ReadingProgress = () => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement;
            const scrollTop = doc.scrollTop || document.body.scrollTop;
            const scrollHeight = doc.scrollHeight - doc.clientHeight;
            setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
            <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-300"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
            />
        </div>
    );
};

/* ── Back to Top ──────────────────────────────────────────── */
const BackToTop = () => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 500);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/80 border border-white/[0.08] text-gray-400 hover:text-white hover:border-orange-500/30 transition-all backdrop-blur-md"
                    aria-label="Back to top"
                >
                    <ChevronUp className="h-4 w-4" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

/* ── Section Header ───────────────────────────────────────── */
const SectionHeader = ({ section }: { section: DocsSection }) => (
    <div className="mb-8">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-orange-400 mb-2">
            {section.eyebrow}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
            {section.title}
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-400">
            {section.summary}
        </p>
    </div>
);

/* ── Prev / Next Nav ──────────────────────────────────────── */
const SectionNav = ({
    sections,
    currentIndex,
    onNavigate,
}: {
    sections: DocsSection[];
    currentIndex: number;
    onNavigate: (id: string) => void;
}) => {
    const prev = sections[currentIndex - 1];
    const next = sections[currentIndex + 1];
    return (
        <div className="mt-16 grid gap-3 md:grid-cols-2 border-t border-white/[0.05] pt-8">
            {prev ? (
                <button
                    onClick={() => onNavigate(prev.id)}
                    className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 text-left hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
                >
                    <ChevronLeft className="h-4 w-4 shrink-0 text-gray-600 group-hover:text-orange-400 transition-colors" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-0.5">Previous</p>
                        <p className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors truncate">{prev.label}</p>
                    </div>
                </button>
            ) : <div />}
            {next ? (
                <button
                    onClick={() => onNavigate(next.id)}
                    className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 text-right flex-row-reverse hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
                >
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

const NULLPAY_AI_CONTEXT = {
    about: `NullPay is a privacy-first payment protocol built on Aleo (a zero-knowledge proof blockchain). It enables merchants to create invoices and accept payments without exposing transaction details on-chain. Invoice details are hashed with BHP256, payments run through private transfer paths, and both merchant and payer receive private receipts verified by zero-knowledge proofs. The platform includes: a hosted checkout UI, merchant backend (Node.js/Express), Node.js SDK (@nullpay/node), Python SDK (@nullpay/python), CLI onboarding tool (@nullpay/cli), MCP server for AI clients (@nullpay/mcp), and merchant dashboards.`,
    contracts: [
        'zk_pay_proofs_privacy_v29.aleo — Core payment contract (invoice creation, payment, settlement, Oracle quotes)',
        'zk_pay_proofs_privacy_wallet_v6.aleo — Wallet helper (burner backup, card profiles, gift cards, cross-token Oracle payments)',
    ],
    tokens: [
        'CREDITS — Aleo native token (gas)',
        'USDCx — Private stablecoin (Aleo token)',
        'USAD — Private stablecoin (Aleo token)',
    ],
    links: {
        website: 'https://nullpay.app',
        github: 'https://github.com/nullpay',
        aleoDocs: 'https://aleo.org/post/aleo-developer-documentation/',
        aleoSdk: 'https://github.com/AleoHQ/sdk',
        aleoWalletAdaptor: 'https://github.com/AleoHQ/aleo-wallet-adaptor',
        leoLanguage: 'https://leo-lang.org/',
        npmNode: 'https://www.npmjs.com/package/@nullpay/node',
        npmMcp: 'https://www.npmjs.com/package/@nullpay/mcp',
        npmCli: 'https://www.npmjs.com/package/@nullpay/cli',
        openclawDocs: 'https://docs.openclaw.ai/',
    },
};

const buildAIContext = (
    section: DocsSection,
    activeTab: DocsTab['id'],
    pageText: string,
    allTabs: DocsTab[],
    sectionsByTab: Record<string, DocsSection[]>,
) => {
    const origin = window.location.origin;
    const basePath = window.location.pathname;
    const tabLabel = allTabs.find((t) => t.id === activeTab)?.label ?? activeTab;
    const currentUrl = `${origin}${basePath}?tab=${activeTab}&section=${section.id}`;

    const docIndex = allTabs.map((tab) => {
        const sections = sectionsByTab[tab.id] ?? [];
        const sectionLines = sections.map((s) =>
            `  - ${s.label}: ${origin}${basePath}?tab=${tab.id}&section=${s.id}`
        );
        return [`## ${tab.label}`, ...sectionLines].join('\n');
    }).join('\n\n');

    const linksEntries = Object.entries(NULLPAY_AI_CONTEXT.links)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

    return [
        '# NullPay — AI Context Package',
        '',
        '## About NullPay',
        NULLPAY_AI_CONTEXT.about,
        '',
        '## Smart Contracts',
        ...NULLPAY_AI_CONTEXT.contracts.map((c) => `- ${c}`),
        '',
        '## Supported Tokens',
        ...NULLPAY_AI_CONTEXT.tokens.map((t) => `- ${t}`),
        '',
        '## Key External Links',
        linksEntries,
        '',
        '## Full Documentation Index',
        'Every section in the NullPay docs with its direct URL:',
        '',
        docIndex,
        '',
        '---',
        '',
        `## Current Page: ${section.title}`,
        `Tab: ${tabLabel} | Section: ${section.label} | Eyebrow: ${section.eyebrow}`,
        '',
        '### Summary',
        section.summary,
        '',
        '### Page Content',
        pageText.trim(),
        '',
        `Source: ${currentUrl}`,
    ].join('\n');
};

/* ── Section Content Wrapper ──────────────────────────────── */
const SectionContent = ({ section, activeTab, allSections, onNavigate }: {
    section: DocsSection;
    activeTab: DocsTab['id'];
    allSections: DocsSection[];
    onNavigate: (id: string) => void;
}) => {
    const [copied, setCopied] = useState(false);
    const [aiCopied, setAiCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleCopy = useCallback(async () => {
        if (!navigator?.clipboard) return;
        try {
            const url = `${window.location.origin}${window.location.pathname}?tab=${activeTab}&section=${section.id}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore
        }
    }, [activeTab, section.id]);

    const handleCopyForAI = useCallback(async () => {
        if (!navigator?.clipboard || !contentRef.current) return;
        try {
            const text = contentRef.current.innerText || '';
            const allSections = await loadAllSections();
            const sectionsByTabAll: Partial<Record<DocsTab['id'], DocsSection[]>> = {};
            for (const s of allSections) {
                const tabId = getTabForSectionId(s.id);
                if (tabId) {
                    if (!sectionsByTabAll[tabId]) sectionsByTabAll[tabId] = [];
                    sectionsByTabAll[tabId]!.push(s);
                }
            }
            const context = buildAIContext(section, activeTab, text, docsTabs, sectionsByTabAll as Record<DocsTab['id'], DocsSection[]>);
            await navigator.clipboard.writeText(context);
            setAiCopied(true);
            setTimeout(() => setAiCopied(false), 2000);
        } catch {
            // ignore
        }
    }, [activeTab, section]);

    const currentIndex = allSections.findIndex((s) => s.id === section.id);

    return (
        <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            <div className="flex items-start justify-between gap-4 mb-2">
                <SectionHeader section={section} />
                <div className="flex items-center gap-2 mt-1 shrink-0">
                    <button
                        onClick={handleCopyForAI}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                            aiCopied
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300'
                        }`}
                        aria-label="Copy page context for AI"
                    >
                        {aiCopied ? <ClipboardCopy className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        {aiCopied ? 'Copied for AI' : 'Copy for AI'}
                    </button>
                    <button
                        onClick={handleCopy}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                            copied
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300'
                        }`}
                        aria-label="Copy link to section"
                    >
                        <ArrowUpRight className="h-3 w-3" />
                        {copied ? 'Copied' : 'Share'}
                    </button>
                </div>
            </div>

            <div ref={contentRef}>
                {section.content}
            </div>

            <SectionNav
                sections={allSections}
                currentIndex={currentIndex}
                onNavigate={onNavigate}
            />
        </motion.div>
    );
};

/* ── Tab Resolvers ────────────────────────────────────────── */

const resolveTabAndSection = (searchParams: URLSearchParams) => {
    const requestedTab = searchParams.get('tab');
    const requestedSection = searchParams.get('section');
    const activeTab = (requestedTab && docsTabs.some((tab) => tab.id === requestedTab))
        ? (requestedTab as DocsTab['id'])
        : (requestedSection ? (getTabForSectionId(requestedSection) ?? 'getting-started') : 'getting-started');
    const activeSection = requestedSection || '';
    return { activeTab, activeSection };
};

/* ── Main Docs Page ───────────────────────────────────────── */
const Docs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const [sectionsByTab, setSectionsByTab] = useState<Partial<Record<DocsTab['id'], DocsSection[]>>>({});
    const initialState = resolveTabAndSection(searchParams);
    const [activeTab, setActiveTab] = useState<DocsTab['id']>(initialState.activeTab);
    const [activeSection, setActiveSection] = useState(initialState.activeSection);

    useEffect(() => {
        let cancelled = false;
        loadSectionsForTab(activeTab).then(sections => {
            if (cancelled) return;
            setSectionsByTab(prev => ({ ...prev, [activeTab]: sections }));
            if (activeSection && !sections.some(s => s.id === activeSection)) {
                setActiveSection(sections[0]?.id || '');
            }
        });
        return () => { cancelled = true; };
    }, [activeTab]);

    const activeSections = sectionsByTab[activeTab] || [];
    const selectedSection = activeSections.find((section) => section.id === activeSection) ?? activeSections[0];

    useEffect(() => {
        const resolvedState = resolveTabAndSection(searchParams);
        if (resolvedState.activeTab !== activeTab) setActiveTab(resolvedState.activeTab);
        if (resolvedState.activeSection !== activeSection) setActiveSection(resolvedState.activeSection);
    }, [searchParams]); // eslint-disable-line

    useEffect(() => {
        if (searchParams.get('tab') === activeTab && searchParams.get('section') === activeSection) return;
        setSearchParams({ tab: activeTab, section: activeSection }, { replace: true });
    }, [activeTab, activeSection, searchParams, setSearchParams]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSection]);

    const groupedSections = useMemo(() => {
        return activeSections.reduce<Record<string, DocsSection[]>>((acc, section) => {
            acc[section.group] = acc[section.group] ?? [];
            acc[section.group].push(section);
            return acc;
        }, {});
    }, [activeSections]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groupedSections;
        const q = searchQuery.toLowerCase();
        const idx = buildSearchIndexForSections(activeSections);
        return Object.entries(groupedSections).reduce((acc, [groupName, groupSections]) => {
            const matches = groupSections.filter((section) => {
                const labelText = section.label.toLowerCase();
                const summaryText = (section.summary ?? '').toLowerCase();
                const idText = section.id.toLowerCase();
                const contentText = idx.get(section.id) ?? '';
                return (
                    labelText.includes(q) ||
                    summaryText.includes(q) ||
                    idText.includes(q) ||
                    contentText.includes(q)
                );
            });
            if (matches.length) acc[groupName] = matches;
            return acc;
        }, {} as Record<string, DocsSection[]>);
    }, [groupedSections, searchQuery, activeSections]);

    useEffect(() => {
        const allFiltered = Object.values(filteredGroups).flat();
        if (allFiltered.length === 0) return;
        const exists = allFiltered.some((s) => s.id === activeSection);
        if (!exists) setActiveSection(allFiltered[0].id);
    }, [filteredGroups]); // eslint-disable-line

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setSearchFocused(true);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const flat = Object.values(filteredGroups).flat();
                const idx = flat.findIndex((s) => s.id === activeSection);
                if (idx === -1) return;
                if (e.key === 'ArrowLeft' && idx > 0) {
                    e.preventDefault();
                    setActiveSection(flat[idx - 1].id);
                }
                if (e.key === 'ArrowRight' && idx < flat.length - 1) {
                    e.preventDefault();
                    setActiveSection(flat[idx + 1].id);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [filteredGroups, activeSection]); // eslint-disable-line

    const handleTabChange = (tabId: DocsTab['id']) => {
        setActiveTab(tabId);
        setActiveSection('');
        setSearchQuery('');
    };

    const handleSectionChange = (sectionId: string) => {
        setActiveSection(sectionId);
        setMobileSidebarOpen(false);
    };

    const handleSearchNavigate = useCallback((tabId: DocsTab['id'], sectionId: string) => {
        setActiveTab(tabId);
        setActiveSection(sectionId);
        setSearchQuery('');
        setSearchFocused(false);
    }, []);

    const allSectionsFlat = useMemo(() => Object.values(filteredGroups).flat(), [filteredGroups]);

    /* ── Sidebar Content ──────────────────────────────────── */
    const sidebarContent = (
        <nav className="space-y-6">
            {Object.keys(filteredGroups).length === 0 ? (
                <p className="text-[13px] text-gray-500 px-2">No results for &ldquo;{searchQuery}&rdquo;</p>
            ) : (
                Object.entries(filteredGroups).map(([groupName, groupSections]) => (
                    <div key={groupName}>
                        <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                            {groupName}
                        </p>
                        <div className="space-y-px">
                            {groupSections.map((section) => {
                                const isActive = section.id === selectedSection.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionChange(section.id)}
                                        className={`relative w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                                            isActive
                                                ? 'text-white bg-white/[0.06]'
                                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-orange-400" />
                                        )}
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </nav>
    );

    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <ReadingProgress />



            <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="relative z-10"
            >
                {/* ── Hero ─────────────────────────────────────────── */}
                <motion.div variants={fadeInUp} className="border-b border-white/[0.05]">
                    <div className="mx-auto max-w-7xl px-6 pt-12 pb-8 text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <BookOpen className="h-5 w-5 text-orange-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Documentation</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            NullPay{' '}
                            <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
                                Docs
                            </span>
                        </h1>
                        <p className="mt-2 mx-auto max-w-xl text-[15px] text-gray-400">
                            Smart contracts, SDKs, API reference, integrations, and architecture.
                        </p>
                    </div>
                </motion.div>

                {/* ── Tab Bar ──────────────────────────────────────── */}
                <motion.div
                    variants={fadeInUp}
                    className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/90 backdrop-blur-xl"
                >
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none -mx-1.5">
                            {docsTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = tab.id === activeTab;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors ${
                                            isActive
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {tab.label}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabIndicator"
                                                className="absolute bottom-0 left-2 right-2 h-[2px] bg-orange-400 rounded-full"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}

                            {/* Search inline */}
                            <div className="ml-auto flex items-center py-2">
                                <div className="relative group">
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-400 transition-colors pointer-events-none">
                                        <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </div>
                                    <button
                                        onClick={() => setSearchFocused(true)}
                                        className="w-[180px] md:w-[220px] rounded-lg bg-white/[0.03] border border-white/[0.06] pl-8 pr-8 py-[7px] text-left text-[13px] text-gray-500 transition-all hover:bg-white/[0.05] hover:border-white/[0.1]"
                                    >
                                        Search...
                                    </button>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center">
                                        <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1 py-0.5 text-[9px] font-mono text-gray-600">
                                            ⌘K
                                        </kbd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Body: Sidebar + Content ──────────────────────── */}
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex gap-0">
                        {/* Sidebar — desktop */}
                        <motion.aside
                            variants={fadeInUp}
                            className="hidden lg:block w-[220px] shrink-0 py-8 pr-6 border-r border-white/[0.04] sticky top-[52px] self-start max-h-[calc(100vh-52px)] overflow-y-auto scrollbar-thin"
                        >
                            {sidebarContent}

                            <div className="mt-8 pt-6 border-t border-white/[0.04]">
                                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 mb-3">Shortcuts</p>
                                <div className="space-y-2 px-2">
                                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                                        <span>Search</span>
                                        <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px]">⌘K</kbd>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                                        <span>Navigate</span>
                                        <div className="flex gap-1">
                                            <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px]">←</kbd>
                                            <kbd className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px]">→</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>

                        {/* Mobile sidebar toggle */}
                        <button
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="lg:hidden fixed bottom-6 left-6 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/80 border border-white/[0.08] text-gray-400 hover:text-white transition-all backdrop-blur-md"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="h-4 w-4" />
                        </button>

                        {/* Mobile sidebar overlay */}
                        <AnimatePresence>
                            {mobileSidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                                    onClick={() => setMobileSidebarOpen(false)}
                                >
                                    <motion.div
                                        initial={{ x: -280 }}
                                        animate={{ x: 0 }}
                                        exit={{ x: -280 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="w-[280px] h-full bg-[#0a0a0c] border-r border-white/[0.06] p-6 overflow-y-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Navigation</span>
                                            <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {sidebarContent}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Main Content ─────────────────────────────── */}
                        <motion.main
                            variants={fadeInUp}
                            className="flex-1 min-w-0 py-8 pl-0 lg:pl-10"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {selectedSection ? (
                                    <SectionContent
                                        key={selectedSection.id}
                                        section={selectedSection}
                                        activeTab={activeTab}
                                        allSections={allSectionsFlat}
                                        onNavigate={handleSectionChange}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.main>
                    </div>
                </div>
            </motion.div>

            <DocsChatbot mode="docs" />
            <BackToTop />

            <AnimatePresence>
                {searchFocused && (
                    <SearchOverlay
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        onClose={() => { setSearchFocused(false); setSearchQuery(''); }}
                        onNavigate={handleSearchNavigate}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Docs;
