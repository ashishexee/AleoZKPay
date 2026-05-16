import { 
    Wallet, 
    ScrollText, 
    Send, 
    Network, 
    BarChart3, 
    Repeat, 
    CreditCard, 
    Gift, 
    ShieldCheck, 
    Zap,
    Lock
} from 'lucide-react';
import type { DocsSection } from '../types';
import { installMcpCommand } from '../examples';
import { CodeBlock, Callout } from '../ui';

export const mcpOverviewSection: DocsSection = {
    id: 'int-mcp',
    group: 'MCP',
    label: 'MCP Overview',
    eyebrow: 'Core Protocol',
    title: 'NullPay MCP Server Capabilities',
    summary:
        'The @nullpay/mcp package provides a secure, local bridge between AI models and your Aleo wallet. It allows models to generate ZK proofs and execute payments without ever exposing your private keys to the cloud.',
    content: (
        <div className="space-y-12">
            {/* Quick Install */}
            <section className="space-y-4">
                <CodeBlock title="Quick Install via NPX" language="bash" code={installMcpCommand} />
                <p className="text-gray-400 text-sm leading-relaxed">
                    The NullPay MCP server runs as a local <strong>stdio</strong> process. It handles encryption, wallet recovery, and ZK proof generation locally, communicating only the necessary transaction results to your AI client or terminal.
                </p>
            </section>

            {/* Feature Grid */}
            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Available Tools & Features</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Access & Identity */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">login</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Initializes sessions, validates passwords, and performs on-chain burner wallet recovery.
                        </p>
                    </div>

                    {/* Merchant Tools */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                            <ScrollText className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">create_invoice</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Generates standard, multipay, or donation invoices with optional itemized lists.
                        </p>
                    </div>

                    {/* Payer Tools */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Send className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">pay_invoice</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Resolves payment links or hashes and executes sponsored local ZK-proof transactions.
                        </p>
                    </div>

                    {/* Transaction History */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Network className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">get_transaction_info</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Lists recent activity and fetches enriched invoice data using private record lookup.
                        </p>
                    </div>

                    {/* Card Payments */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">pay_with_card</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Allows payments using 16-digit NullPay cards and Card Secrets without exposing keys.
                        </p>
                    </div>

                    {/* Gift Cards */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            <Gift className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">pay_with_giftcard</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Redeems gift credits to pay any invoice hash or payment link anonymously.
                        </p>
                    </div>

                    {/* Analytics */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">get_analytics</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Aggregates recent ZK-payouts and merchant earnings into a spending timeline.
                        </p>
                    </div>

                    {/* Funds Management */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <Repeat className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">sweep_funds</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Securely transfers all spendable private records to a cold destination address.
                        </p>
                    </div>

                    {/* Maintenance */}
                    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">check_burner_balance</h3>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Fast lookup for available private records in the actively authorized burner wallet.
                        </p>
                    </div>
                </div>
            </section>

            {/* Architecture Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Security & Relaying</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-orange-300">On-Device Proofing</h3>
                        <p className="text-sm text-gray-400 leading-relaxed font-light">
                            When an AI model suggests a payment via <code className="text-white">pay_invoice</code>, the MCP server uses your local private key to generate the required Aleo ZK transitions. This proof is then safely sent to the NullPay backend for propagation to the Aleo network.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-blue-300">Burner Wallet Model</h3>
                        <p className="text-sm text-gray-400 leading-relaxed font-light">
                            The MCP server encourages the use of <b>Burner Wallets</b> for automated agent workflows. This provides a sandbox for AI-driven transactions without needing to authorize your main cold-storage wallet for every interaction.
                        </p>
                    </div>
                </div>
                <Callout title="Privacy First" tone="emerald">
                    Only your public address and encrypted session metadata are shared with the backend. Your 46-word seed or APrivateKey remains strictly on your machine.
                </Callout>
            </section>
        </div>
    ),
};
