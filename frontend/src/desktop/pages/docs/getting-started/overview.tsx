import { Bot, GitBranch, Package, Shield, TerminalSquare, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { installNodeCommand, installCliCommand, installMcpCommand } from '../examples';

export const overviewSection: DocsSection = {
    id: 'gs-overview',
    group: 'Overview',
    label: 'Overview',
    eyebrow: 'Overview',
    title: 'What NullPay is',
    summary:
        'NullPay is a privacy-first payment protocol built on Aleo for merchants who want modern checkout tooling without giving up transaction privacy. The platform spans a smart contract, hosted checkout, merchant backend, Node/Python SDKs, CLI onboarding, an MCP server for AI clients, and merchant dashboards for live payment monitoring.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden border-white/[0.08] bg-white/[0.02] p-0">
                <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center border-b border-white/[0.08] bg-black/30 p-8 lg:border-b-0 lg:border-r">
                        <img src="/assets/nullpay_logo.png" alt="NullPay" className="h-28 w-28 object-contain" />
                    </div>
                    <div className="space-y-5 p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Privacy-First Payments on Aleo</p>
                        <p className="text-2xl font-bold leading-snug text-white">
                            Private checkout infrastructure for merchants, apps, and AI-native products.
                        </p>
                        <p className="text-base leading-relaxed text-gray-300">
                            NullPay lets merchants create invoices and accept payments without exposing the sensitive parts of
                            the commercial flow on-chain. Invoice details are hashed with BHP256, payments run through private
                            transfer paths, and both merchant and payer receive private receipts tied to the same settlement — all
                            verified by zero-knowledge proofs.
                        </p>
                        <p className="text-base leading-relaxed text-gray-400">
                            The product surface in this repo spans the full stack: frontend payment routes, a merchant
                            backend, installable Node and Python SDKs, CLI-generated invoice manifests, a hosted checkout page,
                            batch payment tooling, gift card infrastructure, and an MCP server so the same payment model can be
                            used inside AI clients like Claude, Codex, Cursor, and OpenClaw.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Privacy first"
                    description="Merchant address, invoice amount, and settlement context do not need to live as a plain public ledger trace. Hash-based invoice validation and zero-knowledge receipts are core to the design."
                />
                <MetricCard
                    icon={TerminalSquare}
                    title="Server-first developer flow"
                    description="Merchants integrate through backend routes, hosted checkout, SDK calls, nullpay.json manifests, and webhooks instead of piecing together low-level chain logic themselves."
                />
                <MetricCard
                    icon={Bot}
                    title="Agent ready"
                    description="NullPay MCP exposes invoice and payment actions to AI clients while keeping the private key local to the MCP process rather than in the model context."
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <GlassCard className="p-6">
                    <h3 className="mb-4 text-xl font-bold text-white">What ships in this repository</h3>
                    <div className="space-y-4 text-sm leading-relaxed text-gray-400">
                        <div className="flex items-start gap-3">
                            <Package className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <div>
                                <p><span className="font-semibold text-white">@nullpay/node</span> & <span className="font-semibold text-white">nullpay-python</span></p>
                                <p className="text-xs text-gray-500 mt-0.5">Backend SDKs for checkout session creation, session retrieval, and webhook verification.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <div>
                                <p><span className="font-semibold text-white">@nullpay/cli</span></p>
                                <p className="text-xs text-gray-500 mt-0.5">Interactive onboarding wizard that generates salts, creates invoices via the relayer, and writes nullpay.json to your project.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <div>
                                <p><span className="font-semibold text-white">@nullpay/mcp</span></p>
                                <p className="text-xs text-gray-500 mt-0.5">MCP server that exposes invoice creation, payment, and transaction inspection to AI clients.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <div>
                                <p><span className="font-semibold text-white">Two smart contracts</span></p>
                                <p className="text-xs text-gray-500 mt-0.5">zk_pay_proofs_privacy_v29.aleo (core invoice/payment) and zk_pay_proofs_privacy_wallet_v6.aleo (burner backup, card profiles, gift cards, oracle).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <div>
                                <p><span className="font-semibold text-white">Hosted checkout + payment pages</span></p>
                                <p className="text-xs text-gray-500 mt-0.5">Buyer-side payment completion, multi-token support, Oracle conversion, and post-payment verification.</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <Callout title="Mental model" tone="blue">
                    Think of NullPay as a merchant payment operating layer. The contract enforces invoice and payment rules,
                    the backend and SDK make integration usable for normal apps, the hosted checkout handles buyer UX, and
                    MCP extends the same system into conversational clients — all backed by Aleo's zero-knowledge cryptography.
                </Callout>
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">The NullPay Stack</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Layer</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Technology</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Purpose</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Frontend</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">React 18 + TypeScript + Tailwind CSS</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Desktop &amp; mobile responsive app with glassmorphism UI, Framer Motion animations, Shield wallet adapter, and hosted checkout.</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Smart Contracts</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">Leo (zk_pay v29 + wallet v6)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">BHP256 hash-based invoice validation, private token transfers, dual receipts, Oracle signature verification, burner backup.</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Backend</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">Node.js + Express</td>
                                <td className="px-4 py-3 text-sm text-gray-400">REST API, AES-256-GCM encryption, real-time events, relayer, DPS integration, Telegram bot, Oracle price feeds.</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">SDKs</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">@nullpay/node + nullpay-python + @nullpay/cli</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Checkout session management, webhook verification, invoice manifest handling, CLI onboarding wizard.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-semibold text-white">AI/Automation</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">@nullpay/mcp + OpenClaw + Telegram Bot</td>
                                <td className="px-4 py-3 text-sm text-gray-400">MCP server for AI clients, Telegram merchant controls, NullBot dashboard assistant.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-3">
                <CodeBlock title="Install Node SDK" language="bash" code={installNodeCommand} />
                <CodeBlock title="Run CLI onboarding" language="bash" code={installCliCommand} />
                <CodeBlock title="Install MCP server" language="bash" code={installMcpCommand} />
            </div>

            <Callout title="Quick Start" tone="emerald">
                The fastest way to integrate NullPay is backend-first: install the Node SDK, set your secret key,
                create a checkout session route, and redirect buyers to the hosted checkout page. Webhooks and
                CLI-generated manifests can be added later once the basic payment loop works.
            </Callout>
        </div>
    ),
};
