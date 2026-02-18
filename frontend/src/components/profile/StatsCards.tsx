import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Shimmer } from '../ui/Shimmer';

interface StatsCardsProps {
    merchantStats: {
        creditsSales: number | string;
        usdcxSales: number | string;
        invoices: number;
        settled: number;
        pending: number;
    };
    loadingReceipts: boolean;
    loadingCreated: boolean;
    itemVariants: any;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ merchantStats, loadingReceipts, loadingCreated, itemVariants }) => {
    return (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Settled Volume</span>
                {loadingReceipts ? (
                    <Shimmer className="h-10 w-32 bg-white/5 rounded-md" />
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white tracking-tighter">{merchantStats.creditsSales}</span>
                            <span className="text-xs font-normal text-gray-500 uppercase">Credits</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white tracking-tighter">{merchantStats.usdcxSales}</span>
                            <span className="text-xs font-normal text-purple-400 uppercase">USDCx</span>
                        </div>
                    </div>
                )}
            </GlassCard>
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                {loadingCreated ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                )}
            </GlassCard>
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Pending</span>
                {loadingCreated ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-yellow-400 tracking-tighter">{merchantStats.pending}</h2>
                )}
            </GlassCard>
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Settled</span>
                {loadingCreated ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-green-400 tracking-tighter">{merchantStats.settled}</h2>
                )}
            </GlassCard>
        </motion.div>
    );
};
