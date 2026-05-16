import { Shield, Zap, Clock, Lock, TrendingUp } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { oracleQuoteLeoCode } from '../examples';

const oracleBackendFlowExample = `// GET /api/oracle/quote?from_token=Credits&to_token=USDCx&amount=10000000
// Backend Oracle controller:

// 1. Fetch live CREDITS/USD price from Provable API (cached 60s)
// 2. Stablecoins (USDCx, USAD) are pegged to $1.00
// 3. Compute converted_amount based on the ratio
// 4. Hash the OracleQuote struct using BHP256
// 5. Sign the hash with the ORACLE_PRIVATE_KEY
// 6. Return the quote with signature and expiry

// Response:
{
  "from_token": "Credits",
  "to_token": "USDCx", 
  "original_amount_micro": 10000000,
  "converted_amount_micro": 12500000,
  "quote_hash": "523...field",
  "oracle_signature": "sign1...",
  "expires_at": 4592000,
  "rate": 0.8
}`;

export const oracleSection: DocsSection = {
    id: 'sc-oracle',
    group: 'Advanced Features',
    label: 'Oracle Conversion',
    eyebrow: 'Smart Contract',
    title: 'Oracle-Backed Cross-Token Payments',
    summary:
        'The NullPay Oracle enables "Pay with Any Token" functionality — payers can settle invoices using their preferred token (Credits, USDCx, or USAD) regardless of the invoice\'s base currency. Every conversion quote is cryptographically signed by the backend and verified on-chain by the smart contract.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={TrendingUp}
                    title="Live Price Feed"
                    description="CREDITS price is fetched live from the Provable API with 60-second caching. Stablecoins are pegged to $1.00 USD."
                />
                <MetricCard
                    icon={Lock}
                    title="Signed Quotes"
                    description="Every conversion quote is signed by the backend Oracle using its private key and hashed with BHP256."
                />
                <MetricCard
                    icon={Shield}
                    title="On-Chain Verification"
                    description="The smart contract independently reconstructs and verifies the signature. Tampered rates revert the transaction."
                />
                <MetricCard
                    icon={Clock}
                    title="Block-Height Expiry"
                    description="Every quote is valid for ~30 blocks (~5 minutes). Expired quotes are rejected to prevent price-lag exploitation."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Architecture: Three Pillars of Price Integrity</h3>
                <div className="space-y-4">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            <h4 className="text-sm font-bold text-white">Pillar 1: Live Price Feed</h4>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The backend Oracle route (<code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">/api/oracle</code>) 
                            fetches the current CREDITS/USD price from the Provable Explorer API. The result is cached for 60 seconds to balance freshness 
                            against API rate limits. Stablecoins (USDCx, USAD) are treated as $1.00 USD pegged — no price feed needed.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Lock className="h-4 w-4 text-blue-400" />
                            <h4 className="text-sm font-bold text-white">Pillar 2: Signed OracleQuote</h4>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The backend hashes the entire <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">OracleQuote</code> struct 
                            (original_amount, converted_amount, from_token_type, to_token_type, expires_at) using BHP256, then signs the hash 
                            with the <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">ORACLE_PRIVATE_KEY</code>. 
                            The signature covers the complete quote — modifying any field will produce a signature mismatch detected by the contract.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="h-4 w-4 text-emerald-400" />
                            <h4 className="text-sm font-bold text-white">Pillar 3: On-Chain Signature Verification</h4>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            In the wallet contract finalizer, the OracleQuote is reconstructed from the transition inputs, re-hashed, 
                            and verified against the signature using <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">signature::verify(oracle_sig, trusted_oracle, quote_hash)</code>.
                            If verification fails, the transaction reverts. The oracle address is stored in an admin-only mapping 
                            (<code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">oracle_address</code>) that can only be updated by the contract admin.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">End-to-End Oracle Workflow</h3>
                <div className="space-y-4">
                    {[
                        { step: '1', title: 'Detection', desc: 'The payment frontend detects if the payer\'s selected token differs from the invoice\'s base currency. If they match, Oracle conversion is skipped entirely.' },
                        { step: '2', title: 'Quote Fetch', desc: 'Frontend calls GET /api/oracle/quote passing from_token, to_token, and the amount in micro-units. Backend returns the signed OracleQuote.' },
                        { step: '3', title: 'Backend Signing', desc: 'Backend fetches live USD rates, computes conversion, constructs OracleQuote struct, BHP256 hashes it, and signs with ORACLE_PRIVATE_KEY.' },
                        { step: '4', title: 'Transaction Routing', desc: 'The transaction is routed to the wallet program (v6) using a specific cross-token conversion function like pay_invoice_credits_via_usdcx.' },
                        { step: '5', title: 'Smart Contract Assertions', desc: 'Contract reconstructs OracleQuote, re-hashes, verifies signature against trusted oracle address, and asserts block.height <= expires_at.' },
                    ].map(({ step, title, desc }) => (
                        <div key={step} className="flex items-start gap-4 rounded-lg border border-white/[0.04] bg-white/[0.01] p-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-mono text-xs font-bold">{step}</div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <CodeBlock title="OracleQuote struct (Leo)" language="leo" code={oracleQuoteLeoCode} />

            <CodeBlock title="Oracle API endpoint" language="js" code={oracleBackendFlowExample} />

            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">Supported Cross-Token Pairs</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The wallet program (v6) contains six dedicated cross-token payment transitions. Each transition handles one specific conversion direction:
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Transition</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Invoice Base</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Payer Uses</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Token Types</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_credits_via_usdcx</td>
                                <td className="px-4 py-3 text-sm">Credits</td>
                                <td className="px-4 py-3 text-sm">USDCx</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">0u8 → 1u8</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_credits_via_usad</td>
                                <td className="px-4 py-3 text-sm">Credits</td>
                                <td className="px-4 py-3 text-sm">USAD</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">0u8 → 2u8</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_usdcx_via_credits</td>
                                <td className="px-4 py-3 text-sm">USDCx</td>
                                <td className="px-4 py-3 text-sm">Credits</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">1u8 → 0u8</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_usdcx_via_usad</td>
                                <td className="px-4 py-3 text-sm">USDCx</td>
                                <td className="px-4 py-3 text-sm">USAD</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">1u8 → 2u8</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_usad_via_credits</td>
                                <td className="px-4 py-3 text-sm">USAD</td>
                                <td className="px-4 py-3 text-sm">Credits</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">2u8 → 0u8</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-mono text-xs text-orange-300">pay_invoice_usad_via_usdcx</td>
                                <td className="px-4 py-3 text-sm">USAD</td>
                                <td className="px-4 py-3 text-sm">USDCx</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">2u8 → 1u8</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Security Guarantees</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">Tamper Proof</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Because the BHP256 signature is over the entire struct (including amounts and tokens), 
                            changing even 1 micro-token or switching a token ID will produce a signature mismatch 
                            and the transaction will revert.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">No Replays</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Direction is encoded in the quote hash. A signature for Credits → USDCx cannot be 
                            reused to pay a Credits → USAD transition. Each conversion direction has its own 
                            dedicated transition function.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">Trust Anchor</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            The on-chain protocol only trusts the address stored in the <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">oracle_address</code> 
                            mapping (key 0u8). This address is managed exclusively via the admin-only 
                            <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">set_oracle_address</code> transition.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Privacy Note" tone="orange">
                While the Oracle knows the amount being converted (it needs to compute the rate), the identity of the 
                payer and merchant remains encapsulated within the standard NullPay ZK-proofs. The Oracle only provides 
                the price integrity layer for the swap. Neither the Oracle nor any observer can determine who is paying 
                or receiving the converted amount.
            </Callout>

            <Callout title="Admin: Setting the Oracle Address" tone="blue">
                The oracle address is managed through the wallet program's <code className="rounded bg-white/10 px-1.5 py-0.5">set_oracle_address</code> 
                transition, which is gated by <code className="rounded bg-white/10 px-1.5 py-0.5">assert_eq(self.caller, admin_address)</code>. 
                Only the contract admin (same address as the constructor @admin) can rotate the oracle key, preventing unauthorized 
                quote signers from injecting manipulated rates into the protocol.
            </Callout>
        </div>
    ),
};
