import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Ticket } from 'lucide-react';
import { CreateGiftCard } from './components/CreateGiftCard';
import { RedeemGiftCard } from './components/RedeemGiftCard';
import { GlassCard } from '../../components/ui/GlassCard';

const tabs = [
    { id: 'create', label: 'Create Card', icon: Gift },
    { id: 'redeem', label: 'Redeem Code', icon: Ticket },
] as const;

export const GiftCardsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'create' | 'redeem'>('create');

    return (
        <div className="w-full max-w-2xl mx-auto px-4 pt-10 pb-20 relative min-h-screen">
            {/* Background blobs */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            {/* Aleo Globe background */}
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

            {/* Page header */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight !text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    Private{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        Gift Cards
                    </span>
                </h1>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
                    Create zero-knowledge private gift cards or redeem one straight to your wallet — all on-chain.
                </p>
                <div className="max-w-xl rounded-2xl border border-orange-400/20 bg-orange-500/10 px-5 py-4 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300 mb-2">
                        Sponsored By NullPay
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">
                        Redeeming a gift card and paying directly from a gift card use NullPay&apos;s relayer sponsorship flow. Proofs stay local, while NullPay can cover the network fee for supported redeem and gift-card checkout actions.
                    </p>
                </div>
            </motion.div>

            {/* Tab bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex gap-1 p-1.5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl mb-8 shadow-2xl relative z-20"
            >
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === id ? 'text-white' : 'text-white/30 hover:text-white/60'
                            }`}
                    >
                        {activeTab === id && (
                            <motion.div
                                layoutId="activeGiftTab"
                                 className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg"
                                 transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                             />
                         )}
                         <Icon className={`w-4 h-4 relative z-10 transition-colors ${activeTab === id ? 'text-orange-400' : 'text-white/40'}`} />
                         <span className={`relative z-10 font-medium transition-colors ${activeTab === id ? 'text-white' : 'text-white/30'}`}>{label}</span>
                    </button>
                ))}
            </motion.div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <GlassCard
                    key={activeTab}
                    variant="default"
                    hoverEffect={false}
                    className="overflow-hidden border-white/10 backdrop-blur-3xl bg-white/[0.02] shadow-2xl"
                >
                    <div className="p-6 md:p-8">
                        {activeTab === 'create' ? <CreateGiftCard /> : <RedeemGiftCard />}
                    </div>
                </GlassCard>
            </AnimatePresence>
        </div>
    );
};

export default GiftCardsPage;
