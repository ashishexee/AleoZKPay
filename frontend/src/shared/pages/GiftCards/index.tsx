import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Ticket } from 'lucide-react';
import { CreateGiftCard } from './components/CreateGiftCard';
import { RedeemGiftCard } from './components/RedeemGiftCard';

const tabs = [
    { id: 'create', label: 'Create Card', icon: Gift },
    { id: 'redeem', label: 'Redeem Code', icon: Ticket },
] as const;

export const GiftCardsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'create' | 'redeem'>('create');

    return (
        <div className="w-full max-w-2xl mx-auto px-4 pt-10 pb-20">
            {/* Page header */}
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center mb-12"
        >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                Private{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                    Gift Cards
                </span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
                Create zero-knowledge private gift cards or redeem one straight to your wallet — all on-chain.
            </p>
        </motion.div>

            {/* Tab bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-xl mb-6"
            >
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === id ? 'text-white' : 'text-white/30 hover:text-white/60'
                        }`}
                    >
                        {activeTab === id && (
                            <motion.div
                                layoutId="activeGiftTab"
                                className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-400/10 rounded-lg border border-orange-500/30"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <Icon className={`w-4 h-4 relative z-10 ${activeTab === id ? 'text-orange-400' : ''}`} />
                        <span className={`relative z-10 ${activeTab === id ? 'text-orange-300' : ''}`}>{label}</span>
                    </button>
                ))}
            </motion.div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
                >
                    <div className="p-6 md:p-8">
                        {activeTab === 'create' ? <CreateGiftCard /> : <RedeemGiftCard />}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default GiftCardsPage;
