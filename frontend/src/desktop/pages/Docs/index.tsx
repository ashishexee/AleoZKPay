import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { DocsChatbot } from '../../../shared/components/DocsChatbot';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp } from '../../../shared/utils/animations';
import { sectionContentByTab } from './sections';
import { docsTabs } from './tabs';
import type { DocsSection, DocsTab } from './types';

const SectionContent = ({ section }: { section: DocsSection }) => (
    <motion.div
        key={section.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="space-y-5"
    >
        <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{section.eyebrow}</p>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{section.title}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-gray-400 md:text-base">{section.summary}</p>
        </div>
        {section.content}
    </motion.div>
);

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
    }, [searchParams]);

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

    const groupedSections = activeSections.reduce<Record<string, DocsSection[]>>((acc, section) => {
        acc[section.group] = acc[section.group] ?? [];
        acc[section.group].push(section);
        return acc;
    }, {});

    const handleTabChange = (tabId: DocsTab['id']) => {
        setActiveTab(tabId);
        setActiveSection(sectionsByTab[tabId][0].id);
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
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">NullPay Docs</p>
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
                            {Object.entries(groupedSections).map(([groupName, groupSections]) => (
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
                            ))}
                        </GlassCard>
                    </motion.aside>

                    <motion.main variants={fadeInUp} className="min-w-0 max-w-4xl">
                        <AnimatePresence mode="wait" initial={false}>
                            <SectionContent section={selectedSection} />
                        </AnimatePresence>
                    </motion.main>
                </div>
            </motion.div>

            <DocsChatbot mode="docs" />
        </motion.div>
    );
};

export default Docs;
