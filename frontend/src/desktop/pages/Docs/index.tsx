import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DocsChatbot } from '../../../shared/components/docs/DocsChatbot';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../../../shared/utils/core/animations';
import { sectionContentByTab } from './sections';
import { docsTabs } from './tabs';
import type { DocsSection, DocsTab } from './types';

const SectionContent = ({ section, activeTab }: { section: DocsSection; activeTab: DocsTab['id'] }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (typeof window === 'undefined' || !navigator?.clipboard) return;
        try {
            const url = `${window.location.origin}${window.location.pathname}?tab=${activeTab}&section=${section.id}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-5"
        >
            <div className="flex items-start justify-between gap-6">
                <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{section.eyebrow}</p>
                    <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
                        {section.title}
                    </h2>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-gray-400 md:text-base">{section.summary}</p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 rounded-md bg-white/6 px-3 py-1 text-sm font-medium text-white hover:bg-white/10"
                        aria-label="Copy link to section"
                    >
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                </div>
            </div>

            {section.content}
        </motion.div>
    );
};

const getTabForSection = (sectionId: string | null): DocsTab['id'] | null => {
    if (!sectionId) return null;

    const matchingTab = docsTabs.find((tab) =>
        sectionContentByTab[tab.id].some((section) => section.id === sectionId)
    );

    return matchingTab?.id ?? null;
};

const resolveTabAndSection = (searchParams: URLSearchParams) => {
    const requestedTab = searchParams.get('tab');
    const requestedSection = searchParams.get('section');
    const fallbackTab = getTabForSection(requestedSection) ?? 'getting-started';
    const activeTab = docsTabs.some((tab) => tab.id === requestedTab)
        ? (requestedTab as DocsTab['id'])
        : fallbackTab;
    const sections = sectionContentByTab[activeTab];
    const activeSection = sections.some((section) => section.id === requestedSection)
        ? (requestedSection as string)
        : sections[0].id;

    return { activeTab, activeSection };
};

const Docs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const sectionsByTab = useMemo(() => sectionContentByTab, []);
    const initialState = resolveTabAndSection(searchParams);
    const [activeTab, setActiveTab] = useState<DocsTab['id']>(initialState.activeTab);
    const [activeSection, setActiveSection] = useState(initialState.activeSection);

    const activeSections = sectionsByTab[activeTab];
    const selectedSection = activeSections.find((section) => section.id === activeSection) ?? activeSections[0];

    useEffect(() => {
        const resolvedState = resolveTabAndSection(searchParams);

        if (resolvedState.activeTab !== activeTab) {
            setActiveTab(resolvedState.activeTab);
        }

        if (resolvedState.activeSection !== activeSection) {
            setActiveSection(resolvedState.activeSection);
        }
    }, [searchParams]); // eslint-disable-line

    useEffect(() => {
        if (searchParams.get('tab') === activeTab && searchParams.get('section') === activeSection) {
            return;
        }

        setSearchParams(
            {
                tab: activeTab,
                section: activeSection,
            },
            { replace: true }
        );
    }, [activeTab, activeSection, searchParams, setSearchParams]);

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
        return Object.entries(groupedSections).reduce((acc, [groupName, groupSections]) => {
            const matches = groupSections.filter((section) => {
                return (
                    section.label.toLowerCase().includes(q) ||
                    (section.summary && section.summary.toLowerCase().includes(q)) ||
                    section.id.toLowerCase().includes(q)
                );
            });
            if (matches.length) acc[groupName] = matches;
            return acc;
        }, {} as Record<string, DocsSection[]>);
    }, [groupedSections, searchQuery]);

    useEffect(() => {
        const allFiltered = Object.values(filteredGroups).flat();
        if (allFiltered.length === 0) return;
        const exists = allFiltered.some((s) => s.id === activeSection);
        if (!exists) {
            setActiveSection(allFiltered[0].id);
        }
    }, [filteredGroups]); // eslint-disable-line

    const handleTabChange = (tabId: DocsTab['id']) => {
        setActiveTab(tabId);
        setActiveSection(sectionsByTab[tabId][0].id);
        setSearchQuery('');
    };

    const handleSectionChange = (sectionId: string) => {
        setActiveSection(sectionId);
    };

    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-15">
                <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-white/5 blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] h-[30%] w-[30%] rounded-full bg-zinc-800/20 blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] h-[35%] w-[35%] rounded-full bg-white/5 blur-[120px] animate-pulse-slow" />
            </div>

            <div className="absolute top-[-150px] left-1/2 z-0 flex h-[800px] w-screen -translate-x-1/2 justify-center overflow-hidden pointer-events-none">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="h-full w-full object-cover opacity-20 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                    }}
                />
            </div>

            <motion.div
                initial="hidden"
                animate="show"
                variants={staggerContainer}
                className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-10"
            >
                <motion.div variants={fadeInUp} className="mb-8 border-b border-white/10 pb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Technical <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Documentation</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
                        Docs organized by product surface: onboarding, contract design, SDK usage, AI-client integrations, and system architecture.
                    </p>
                </motion.div>

                <motion.div
                    variants={fadeInUp}
                    className="sticky top-24 z-50 mb-8 border-b border-white/[0.08] bg-black/70 py-3 backdrop-blur-xl"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {docsTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = tab.id === activeTab;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white text-black'
                                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}

                        <div className="ml-4 flex flex-1 min-w-[220px] max-w-md items-center">
                            <div className="relative w-full group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-400/80 transition-all duration-300 pointer-events-none">
                                    <Search className="h-4 w-4" strokeWidth={2.5} />
                                </div>
                                <input
                                    ref={inputRef}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search docs and sections..."
                                    className="w-full rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] pl-10 pr-10 py-[9px] text-sm text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:border-orange-400/40 focus:ring-4 focus:ring-orange-400/10 hover:bg-white/[0.06] hover:border-white/20"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            inputRef.current?.focus();
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="mt-3 text-sm text-gray-500"
                        >
                            {docsTabs.find((tab) => tab.id === activeTab)?.blurb}
                        </motion.p>
                    </AnimatePresence>
                </motion.div>

                <div className="grid gap-10 xl:grid-cols-[220px_minmax(0,1fr)]">
                    <motion.aside variants={fadeInUp} className="xl:sticky xl:top-44 xl:self-start">
                        <GlassCard className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                            {Object.keys(filteredGroups).length === 0 ? (
                                <p className="text-sm text-gray-500">No docs match "{searchQuery}"</p>
                            ) : (
                                Object.entries(filteredGroups).map(([groupName, groupSections]) => (
                                    <div key={groupName} className="mb-6 last:mb-0">
                                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">{groupName}</p>
                                        <div className="space-y-1">
                                            {groupSections.map((section) => {
                                                const isActive = section.id === selectedSection.id;
                                                return (
                                                    <button
                                                        key={section.id}
                                                        onClick={() => handleSectionChange(section.id)}
                                                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all ${
                                                            isActive
                                                                ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                                                                : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
                                                        }`}
                                                    >
                                                        {section.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </GlassCard>
                    </motion.aside>

                    <motion.main variants={fadeInUp} className="min-w-0 max-w-4xl">
                        <AnimatePresence mode="wait" initial={false}>
                            <SectionContent section={selectedSection} activeTab={activeTab} />
                        </AnimatePresence>
                    </motion.main>
                </div>
            </motion.div>

            <DocsChatbot mode="docs" />
        </motion.div>
    );
};

export default Docs;
