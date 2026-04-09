import { Key, Lock, Server, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const securityBoundariesSection: DocsSection = {
    id: 'gs-security',
    group: 'Security',
    label: 'Security Boundaries',
    eyebrow: 'Security',
    title: 'Security boundaries and best practices',
    summary:
        'NullPay is built around clear security boundaries. The merchant secret key lives in the backend. The wallet private key lives in the user\'s browser extension or a local MCP process. The webhook signature lives on the server. Crossing these boundaries is the most common integration mistake.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Key}
                    title="Secret key → Backend only"
                    description="NULLPAY_SECRET_KEY authenticates your merchant backend to the NullPay API. It must never be used or exposed in frontend code, browser contexts, or AI model prompts."
                />
                <MetricCard
                    icon={Lock}
                    title="Private key → Local only"
                    description="Your Aleo wallet private key is managed by the Shield extension (browser) or the MCP process (local terminal). It never leaves your machine."
                />
                <MetricCard
                    icon={Server}
                    title="Webhook signature → Server only"
                    description="Always verify the x-nullpay-signature header on the server side before fulfilling orders. Client-side verification is meaningless and bypassable."
                />
                <MetricCard
                    icon={Shield}
                    title="Session ID ≠ payment proof"
                    description="A session_id in the success_url query parameter is not proof of payment. A buyer can construct arbitrary URLs. Always verify status via sessions.retrieve()."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">The three security boundaries</h3>
                <div className="divide-y divide-white/[0.06]">
                    {[
                        {
                            boundary: 'Boundary 1: Merchant API key',
                            good: 'Store in environment variables on your backend server (e.g., process.env.NULLPAY_SECRET_KEY). Use it only inside server routes that create or retrieve sessions.',
                            bad: 'Hardcoding it in source code, passing it to the frontend, or logging it to the console. Never put it in a GitHub repo, a Slack message, or an AI conversation.',
                        },
                        {
                            boundary: 'Boundary 2: Aleo private key',
                            good: 'The Shield browser extension and the NullPay MCP server both keep the private key local. For MCP, pass it via the NULLPAY_MAIN_PRIVATE_KEY environment variable in the MCP server config — not in the chat prompt.',
                            bad: 'Sharing your private key in conversation with any AI client. The MCP architecture is specifically designed to avoid this — leverage it.',
                        },
                        {
                            boundary: 'Boundary 3: Webhook verification',
                            good: 'Call nullpay.webhooks.constructEvent(req.rawBody, signature) before processing any webhook payload. This validates the HMAC-SHA256 signature that NullPay sends with every event.',
                            bad: 'Skipping signature verification and trusting the raw POST body. Any attacker who knows your webhook URL could forge a SETTLED event and trigger fulfillment.',
                        },
                    ].map(({ boundary, good, bad }) => (
                        <div key={boundary} className="py-5">
                            <p className="mb-3 text-sm font-bold text-orange-300">{boundary}</p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">Do this</p>
                                    <p className="text-xs leading-relaxed text-gray-300">{good}</p>
                                </div>
                                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-red-300">Avoid this</p>
                                    <p className="text-xs leading-relaxed text-gray-300">{bad}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Privacy model</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    NullPay's privacy model is based on Aleo's zero-knowledge proof system, which allows transactions to be verified without revealing the participants or amounts. Specifically:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <p className="text-sm font-bold text-white">What NullPay hides</p>
                        <ul className="space-y-2 text-xs leading-relaxed text-gray-400">
                            <li>• Merchant's exact Aleo address in the payment context</li>
                            <li>• Invoice amounts on the public ledger</li>
                            <li>• Payer identity (who sent the payment)</li>
                            <li>• The token balance of both parties</li>
                            <li>• Relationship between payments and merchants</li>
                        </ul>
                    </div>
                    <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <p className="text-sm font-bold text-white">What is verifiable on-chain</p>
                        <ul className="space-y-2 text-xs leading-relaxed text-gray-400">
                            <li>• That a valid invoice hash was settled</li>
                            <li>• That the correct zero-knowledge proof was provided</li>
                            <li>• That the transaction was included in a block</li>
                            <li>• The transaction fee (in Credits)</li>
                            <li>• The program and transition name called</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Burner wallet and identity separation</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    For users who want maximum privacy as payers, NullPay's burner wallet support provides full identity separation:
                </p>
                <ul className="space-y-3 text-sm leading-relaxed text-gray-400">
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        The burner wallet is generated locally with no link to the main Aleo identity
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        Payments made from the burner wallet have no on-chain link to the main wallet
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        The burner private key can be backed up as an encrypted on-chain record using <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">backup_burner_wallet</code>
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        The NullPay MCP supports switching between main and burner wallet mid-session
                    </li>
                </ul>
            </GlassCard>

            <Callout title="Fee sponsoring and Shield wallet" tone="blue">
                NullPay supports a Shield Wallet flow where the NullPay backend can sponsor the transaction fee on behalf of the user. This means the user generates a proving request without signing the transaction locally — the backend handles sponsoring and broadcasting. This is an advanced flow intended for specific integration patterns.
            </Callout>

            <Callout title="AES-256 encrypted metadata" tone="orange">
                Invoice metadata (business context, line items, notes) can be encrypted with AES-256 before being stored alongside the session. This ensures that even if session metadata is logged or intercepted, the contents remain unreadable without the encryption key.
            </Callout>
        </div>
    ),
};
