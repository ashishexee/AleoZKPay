import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Shimmer } from '../../../components/ui/Shimmer';

interface StatsCardsProps {
    merchantStats: {
        mainCredits: string;
        mainUSDCx: string;
        mainUSAD: string;
        burnerCredits: string;
        burnerUSDCx: string;
        burnerUSAD: string;
        invoices: number;
        settled: number;
        pending: number;
        totalPayments: number;
        settlementRate: string;
        averagePaymentsPerInvoice: string;
        mainPaymentShare: string;
        burnerPaymentShare: string;
        averageInvoiceAmountCredits: string;
        averageInvoiceAmountUSDCx: string;
        averageInvoiceAmountUSAD: string;
        mainInvoiceShare: string;
        burnerInvoiceShare: string;
        multipayParticipationRate: string;
        multipayInvoiceCount: number;
        engagedMultipayInvoices: number;
    };
    loadingReceipts: boolean;
    loadingCreated: boolean;

    loadingBurner: boolean;
    itemVariants: any;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ merchantStats, loadingReceipts, loadingCreated, loadingBurner, itemVariants }) => {
    const volumeLoading = loadingReceipts || loadingBurner;
    const invoiceLoading = loadingCreated || loadingBurner;

    return (
        <motion.div variants={itemVariants} className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4">
                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 xl:col-span-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Main Volume</span>
                    {volumeLoading ? (
                        <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainCredits}</span>
                                <span className="text-[10px] font-normal text-gray-500 uppercase">Credits</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainUSDCx}</span>
                                <span className="text-[10px] font-normal text-purple-400 uppercase">USDCx</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainUSAD}</span>
                                <span className="text-[10px] font-normal text-amber-400 uppercase">USAD</span>
                            </div>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 relative overflow-hidden xl:col-span-3">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-bold uppercase tracking-widest mb-3 block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">Burner Volume</span>
                    {volumeLoading ? (
                        <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerCredits}</span>
                                <span className="text-[10px] font-normal text-gray-500 uppercase">Credits</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerUSDCx}</span>
                                <span className="text-[10px] font-normal text-purple-400 uppercase">USDCx</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerUSAD}</span>
                                <span className="text-[10px] font-normal text-amber-400 uppercase">USAD</span>
                            </div>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 xl:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                    ) : (
                        <h2 className="text-3xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 xl:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Pending</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                    ) : (
                        <h2 className="text-3xl font-bold text-yellow-400 tracking-tighter">{merchantStats.pending}</h2>
                    )}
                </GlassCard>
                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 xl:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Settled</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                    ) : (
                        <h2 className="text-3xl font-bold text-green-400 tracking-tighter">{merchantStats.settled}</h2>
                    )}
                </GlassCard>
            </div>

            <div className="grid grid-cols-4 gap-4 w-full">
                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Settlement Rate</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-20 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-cyan-300 tracking-tighter">{merchantStats.settlementRate}%</h2>
                            <p className="text-xs text-gray-500">Settled invoices out of total created invoices</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Payments Received</span>
                    {volumeLoading ? (
                        <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-orange-300 tracking-tighter">{merchantStats.totalPayments}</h2>
                            <p className="text-xs text-gray-500">Unique merchant-visible receipts across main and burner wallets</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Avg Payments / Invoice</span>
                    {volumeLoading ? (
                        <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-violet-300 tracking-tighter">{merchantStats.averagePaymentsPerInvoice}</h2>
                            <p className="text-xs text-gray-500">Useful for spotting donation and multi-pay repeat activity</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Payment Split</span>
                    {volumeLoading ? (
                        <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Main</p>
                                    <p className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainPaymentShare}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/80">Burner</p>
                                    <p className="text-2xl font-bold text-orange-300 tracking-tighter">{merchantStats.burnerPaymentShare}%</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Share of received payments by wallet path</p>
                        </div>
                    )}
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Avg Invoice Amount</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-16 w-32 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.averageInvoiceAmountCredits}</span>
                                <span className="text-[10px] font-normal text-gray-500 uppercase">Credits</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.averageInvoiceAmountUSDCx}</span>
                                <span className="text-[10px] font-normal text-purple-400 uppercase">USDCx</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.averageInvoiceAmountUSAD}</span>
                                <span className="text-[10px] font-normal text-amber-400 uppercase">USAD</span>
                            </div>
                            <p className="text-xs text-gray-500">Average amount for non-donation invoices by token</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Invoice Creation Split</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Main</p>
                                    <p className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainInvoiceShare}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/80">Burner</p>
                                    <p className="text-2xl font-bold text-orange-300 tracking-tighter">{merchantStats.burnerInvoiceShare}%</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Share of created invoices by wallet path</p>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Multi-Pay Participation</span>
                    {invoiceLoading ? (
                        <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                    ) : (
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-fuchsia-300 tracking-tighter">{merchantStats.multipayParticipationRate}%</h2>
                            <p className="text-xs text-gray-500">{merchantStats.engagedMultipayInvoices} of {merchantStats.multipayInvoiceCount} multi-pay invoices received 2+ payments</p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </motion.div>
    );
};
