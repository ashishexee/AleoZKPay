import { Bot, Link2, Shield, Smartphone, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout, MetricCard } from '../ui';

export const overviewSection: DocsSection = {
    id: 'tb-overview',
    group: 'Introduction',
    label: 'Overview',
    eyebrow: 'Telegram Bot',
    title: 'NullPay Telegram Bot',
    summary:
        'A merchant-facing companion bot that brings wallet linking, invoice creation, dashboard monitoring, and real-time payment alerts into Telegram — without turning Telegram into a wallet or signing surface.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden border-white/[0.08] bg-white/[0.02] p-0">
                <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center border-b border-white/[0.08] bg-black/30 p-8 lg:border-b-0 lg:border-r">
                        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
                            <Bot className="h-14 w-14 text-blue-400" />
                        </div>
                    </div>
                    <div className="space-y-5 p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">Merchant Companion</p>
                        <p className="text-2xl font-bold leading-snug text-white">
                            Manage invoices and get payment alerts without leaving Telegram.
                        </p>
                        <p className="text-base leading-relaxed text-gray-300">
                            The NullPay Telegram Bot is a merchant-facing companion that sits on top of the main NullPay web app.
                            It helps merchants link their wallet once, create invoices quickly, inspect invoice status, and receive
                            payment updates — all without turning Telegram into a wallet or signing surface.
                        </p>
                        <p className="text-base leading-relaxed text-gray-400">
                            Sensitive wallet actions (paying invoices, signing transactions, decrypting records) still happen in the
                            browser where passwords and private keys stay local. Telegram handles the merchant workflow layer:
                            linking, creation, monitoring, and alerts.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Link2}
                    title="One-Time Linking"
                    description="Link your Aleo wallet to Telegram via a secure browser flow with signature verification. Once linked, the bot knows your merchant identity for all future commands."
                />
                <MetricCard
                    icon={Zap}
                    title="Inline Invoice Wizard"
                    description="Create standard, multipay, and donation invoices through a guided inline keyboard flow — no typing complex commands."
                />
                <MetricCard
                    icon={Shield}
                    title="Browser Security Boundary"
                    description="All sensitive operations (paying, signing, decrypting) redirect to the web app. Telegram never sees passwords or private keys."
                />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <MetricCard
                    icon={Smartphone}
                    title="Dashboard on Demand"
                    description="Type /dashboard to see total invoices, settled count, pending count, and paginated recent activity with explorer links."
                />
                <MetricCard
                    icon={Bot}
                    title="Realtime Alerts"
                    description="Get Telegram notifications the moment a payment is detected for your invoices. Deduplicated, filtered by merchant, toggleable."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">What the Bot Does vs. What the Browser Does</h3>
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
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Wallet Linking</td>
                                <td className="px-4 py-3 text-emerald-400">Initiate /verify</td>
                                <td className="px-4 py-3 text-emerald-400">Sign message + complete</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Invoice Creation</td>
                                <td className="px-4 py-3 text-emerald-400">Full inline wizard</td>
                                <td className="px-4 py-3 text-gray-500">—</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Invoice Lookup</td>
                                <td className="px-4 py-3 text-emerald-400">Hash lookup + list</td>
                                <td className="px-4 py-3 text-emerald-400">Detailed explorer view</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Payment</td>
                                <td className="px-4 py-3 text-gray-500">Redirects to browser</td>
                                <td className="px-4 py-3 text-emerald-400">Full checkout flow</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Dashboard</td>
                                <td className="px-4 py-3 text-emerald-400">Totals + paginated list</td>
                                <td className="px-4 py-3 text-emerald-400">Full merchant dashboard</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Signing / Decrypting</td>
                                <td className="px-4 py-3 text-red-400">Never</td>
                                <td className="px-4 py-3 text-emerald-400">Browser only</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-semibold text-white">Payment Alerts</td>
                                <td className="px-4 py-3 text-emerald-400">Realtime push</td>
                                <td className="px-4 py-3 text-emerald-400">In-app notifications</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="Bot Username" tone="blue">
                Find the bot at <span className="font-mono text-blue-300">@nullpay_private_bot</span> or open{' '}
                <a href="https://t.me/nullpay_private_bot" target="_blank" rel="noreferrer" className="text-blue-300 underline">
                    t.me/nullpay_private_bot
                </a>{' '}
                directly. Start with /start to see available commands and linking options.
            </Callout>
        </div>
    ),
};
