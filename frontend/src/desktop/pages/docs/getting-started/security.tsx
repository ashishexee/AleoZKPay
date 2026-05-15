import { Key, Lock, Server, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
// (security examples defined locally)

const webhookVerificationExample = `// ALWAYS verify the webhook signature server-side
app.post('/api/webhook/nullpay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-nullpay-signature'];

  try {
    const event = nullpay.webhooks.constructEvent(req.body, signature);
    // event is now verified — safe to process
    console.log('Verified event:', event.status, event.id);
    res.json({ received: true });
  } catch (err) {
    // Signature invalid or tampered — reject immediately
    console.error('Webhook verification failed:', err.message);
    res.status(400).json({ error: 'Invalid signature' });
  }
});`;

export const securityBoundariesSection: DocsSection = {
    id: 'gs-security',
    group: 'Security',
    label: 'Security & Privacy',
    eyebrow: 'Security',
    title: 'Security boundaries and best practices',
    summary:
        'NullPay is built around clear security boundaries. The merchant secret key lives in the backend. The wallet private key lives in the user\'s browser extension or MCP process. The webhook signature lives on the server. Crossing these boundaries is the most common integration mistake. On-chain privacy is enforced by Aleo\'s ZK proofs.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Key}
                    title="Secret key → Backend only"
                    description="NULLPAY_SECRET_KEY authenticates your merchant backend to the NullPay API. Never expose it in frontend code, browser contexts, or AI model prompts."
                />
                <MetricCard
                    icon={Lock}
                    title="Private key → Local only"
                    description="Your Aleo wallet private key is managed by Shield (browser) or the MCP process (terminal). It never leaves your machine. Encrypted pass-through never reveals it."
                />
                <MetricCard
                    icon={Server}
                    title="Webhook signature → Server only"
                    description="Always verify x-nullpay-signature header server-side before fulfilling orders. Client-side verification is meaningless and trivially bypassable."
                />
                <MetricCard
                    icon={Shield}
                    title="Session ID ≠ payment proof"
                    description="A session_id in the success_url query is not proof of payment. A buyer can construct arbitrary URLs. Always verify status via sessions.retrieve()."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">The three security boundaries</h3>
                <div className="divide-y divide-white/[0.06]">
                    {[
                        {
                            boundary: 'Boundary 1: Merchant API key',
                            good: 'Store in environment variables on your backend server (e.g., process.env.NULLPAY_SECRET_KEY). Use it only inside server routes that create or retrieve sessions. Rotate via the merchant console if compromised.',
                            bad: 'Hardcoding it in source code, passing it to the frontend, or logging it to the console. Never put it in a GitHub repo, a Slack message, or an AI conversation. Keys prefixed with sk_test_ are for development; sk_live_ for production.',
                        },
                        {
                            boundary: 'Boundary 2: Aleo private key',
                            good: 'The Shield browser extension and the NullPay MCP server both keep the private key local. For MCP, pass it via the NULLPAY_MAIN_PRIVATE_KEY environment variable in the MCP server config — not in the chat prompt. The MCP process performs proof construction locally.',
                            bad: 'Sharing your private key in conversation with any AI client. The MCP architecture is specifically designed to avoid this — the model sees tool inputs and outputs but never the raw private key. Decrypted keys are never returned in tool output.',
                        },
                        {
                            boundary: 'Boundary 3: Webhook verification',
                            good: 'Call nullpay.webhooks.constructEvent(rawBody, signature) before processing any webhook payload. This validates the HMAC-SHA256 signature that NullPay sends with every event. Use express.raw() middleware for the webhook route specifically.',
                            bad: 'Skipping signature verification and trusting the raw POST body. Any attacker who knows your webhook URL could forge a SETTLED event and trigger fulfillment. The signature uses your secret key as the HMAC secret — only your backend and NullPay can produce valid signatures.',
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

            <CodeBlock title="Secure webhook endpoint (Express)" language="js" code={webhookVerificationExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">On-chain security model</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The NullPay smart contracts enforce security at the protocol level using Aleo's zero-knowledge proof system
                    and the BHP256 hash function. Every payment transition includes multiple assert checks that cannot be bypassed:
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Check</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Mechanism</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">What it prevents</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Hash integrity</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">assert_eq(computed_hash, stored_hash)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Payer cannot modify merchant, amount, or salt without invalidating the hash.</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Replay protection</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">receipt_hash = BHP256::commit_to_field(secret, salt_scalar)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Each payment produces a unique receipt hash. Duplicate payment secrets cannot replay without producing a different hash.</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Status guard</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">assert_eq(invoice_data.status, 0u8)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Standard invoices can only be paid once. Settlement autosets status to 1 (Settled).</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-semibold text-white">Expiry enforcement</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">assert(block.height &lt;= expiry_height)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Cannot pay expired invoices. Expiry is set at block.height + hours * 360 blocks.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-semibold text-white">Token validation</td>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">assert_eq(invoice_data.token_type, expected_type)</td>
                                <td className="px-4 py-3 text-sm text-gray-400">Cannot pay a Credits invoice using USDCx or vice versa (except ANY-type donations).</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Privacy model</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    NullPay's privacy model is based on Aleo's zero-knowledge proof system, which allows transactions to be verified without revealing participants or amounts. Combined with the hash-based invoice design, this creates a multi-layer privacy architecture:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <p className="text-sm font-bold text-white">What NullPay hides (on-chain)</p>
                        <ul className="space-y-2 text-xs leading-relaxed text-gray-400">
                            <li>• Merchant's exact Aleo address at payment time</li>
                            <li>• Invoice amounts on the public ledger</li>
                            <li>• Payer identity (who sent the payment)</li>
                            <li>• The token balance of both parties</li>
                            <li>• Relationship between payments and merchants</li>
                            <li>• Invoice title, memo, and commercial context</li>
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
                            <li>• The block height and timestamp of execution</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Off-chain encryption</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Invoice metadata stored in the NullPay backend (merchant addresses, payer info, notes) is encrypted using
                    AES-256-GCM before being persisted in Supabase:
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">AES-256-GCM</p>
                        <p className="text-xs leading-relaxed text-gray-400">Authenticated encryption providing both confidentiality and integrity. Encryption key is stored in the backend .env file, never exposed to clients.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Selective Disclosure</p>
                        <p className="text-xs leading-relaxed text-gray-400">Credits reporting supports selective disclosure — merchants can generate audit reports that reveal only the needed data for compliance without exposing their full payment history.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">HTTPS Required</p>
                        <p className="text-xs leading-relaxed text-gray-400">All production deployments must use HTTPS. The backend is configured with CORS for specific allowed origins. Credentials are transmitted only over encrypted channels.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Burner wallet and identity separation</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    For users who want maximum privacy as payers, NullPay's burner wallet support provides full identity separation backed by on-chain encryption:
                </p>
                <ul className="space-y-3 text-sm leading-relaxed text-gray-400">
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        The burner wallet is generated locally using crypto.getRandomValues() — no link to the main Aleo identity
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        Payments made from the burner wallet have zero on-chain correlation with the main wallet
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        The burner private key is encrypted and split across 10 field elements stored via <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">backup_burner_wallet</code>
                    </li>
                    <li className="flex gap-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                        NullPay MCP supports switching between main and burner wallet mid-session for anonymous agent operations
                    </li>
                </ul>
            </GlassCard>

            <Callout title="Fee sponsoring and Shield wallet" tone="blue">
                NullPay supports a Shield Wallet flow where the NullPay backend can sponsor the transaction fee on behalf
                of the user via the <code className="rounded bg-white/10 px-1.5 py-0.5">/api/dps/sponsor-sweep</code> endpoint.
                The user generates a proving request without signing the transaction locally — the backend handles sponsoring
                and broadcasting. This is an advanced flow intended for burner sweeps, gift card redeems, and delegated
                execution patterns.
            </Callout>

            <Callout title="Oracle signature trust model" tone="orange">
                The Oracle conversion system uses a cryptographic trust model: the backend signs each conversion quote with its
                private key. The smart contract reconstructs and verifies the signature on-chain using
                <code className="rounded bg-white/10 px-1.5 py-0.5">signature::verify(oracle_sig, trusted_oracle, quote_hash)</code>.
                The oracle address is stored in an admin-only mapping and can only be updated by the contract admin. If the
                signature or amount has been tampered with, the entire transaction reverts. Every quote also includes a
                block-height expiry of approximately 30 blocks (5 minutes) to prevent price lag exploitation.
            </Callout>
        </div>
    ),
};
