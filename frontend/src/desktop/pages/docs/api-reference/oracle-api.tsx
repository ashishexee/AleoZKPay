import { TrendingUp, Clock, Lock, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const oracleEndpoints = `// ─── Oracle API ────────────────────────────────────────────────
// Base: /api/oracle

// GET /api/oracle/quote — Get a signed conversion quote
// Query params:
//   from_token: 'Credits' | 'USDCx' | 'USAD'
//   to_token:   'Credits' | 'USDCx' | 'USAD'
//   amount:     number (in micro-units for the from_token)
//
// Response: {
//   from_token: string,
//   to_token: string,
//   original_amount_micro: u64,
//   converted_amount_micro: u64,
//   quote_hash: field,
//   oracle_signature: signature,
//   expires_at: u32,    // block-height deadline (~30 blocks)
//   rate: number         // conversion rate (informational)
// }
//
// Behavior:
// - CREDITS/USD price fetched live from Provable API (60s cache)
// - Stablecoins (USDCx, USAD) pegged to $1.00
// - BHP256 hash of OracleQuote struct is signed by ORACLE_PRIVATE_KEY
// - Signature verified on-chain in wallet program finalizer`;

const quoteExample = `// Example: GET /api/oracle/quote?from_token=Credits&to_token=USDCx&amount=10000000
// Response:
{
  "from_token": "Credits",
  "to_token": "USDCx",
  "original_amount_micro": 10000000,
  "converted_amount_micro": 12500000,
  "quote_hash": "5231847562938475619283475619283745619283475619283field",
  "oracle_signature": "sign1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq...",
  "expires_at": 4592000,
  "rate": 0.8
}

// Interpretation: At the current exchange rate, 10,000,000 micro-Credits
// converts to 12,500,000 micro-USDCx. The quote expires at block 4,592,000
// (~30 blocks from now). The signature is verified by the wallet program.`;

const oracleQuoteStruct = `// The OracleQuote struct (from zk_pay_proofs_privacy_wallet_v6.aleo):
struct OracleQuote {
    original_amount_micro: u64,    // Invoice amount in base token micros
    converted_amount_micro: u64,   // Payer amount in their token micros
    from_token_type: u8,           // 0=Credits, 1=USDCx, 2=USAD
    to_token_type: u8,             // 0=Credits, 1=USDCx, 2=USAD
    expires_at: u32                // Block height after which quote is invalid
}

// The signature is over BHP256::hash_to_field(OracleQuote)
// This means all 5 fields are committed — any tampering breaks the signature`;

export const oracleApiSection: DocsSection = {
    id: 'api-oracle',
    group: 'Endpoints',
    label: 'Oracle',
    eyebrow: 'API Reference',
    title: 'Oracle API — Signed cross-token conversion quotes',
    summary: 'The Oracle endpoint provides cryptographically signed conversion quotes for "Pay with Any Token" functionality. Quotes are BHP256-hashed and signed, then verified on-chain by the wallet smart contract.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard icon={TrendingUp} title="Live Price Feed" description="CREDITS/USD price fetched live from Provable API. Stablecoins pegged to $1.00." />
                <MetricCard icon={Lock} title="BHP256 Signed" description="Entire OracleQuote struct is hashed and signed. Signature verified on-chain." />
                <MetricCard icon={Clock} title="Block Expiry" description="Every quote includes expires_at field. ~30 blocks (~5 min) validity window." />
                <MetricCard icon={Shield} title="Tamper Proof" description="Changing any field invalidates the signature. Transaction reverts on mismatch." />
            </div>

            <CodeBlock title="Oracle API endpoint" language="text" code={oracleEndpoints} />
            <CodeBlock title="Quote request/response" language="json" code={quoteExample} />
            <CodeBlock title="OracleQuote struct (Leo)" language="leo" code={oracleQuoteStruct} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Token type mapping</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">String</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Type Code</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Precision</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Price Source</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-orange-300">Credits</td><td className="px-4 py-3 font-mono text-xs">0u8</td><td className="px-4 py-3 text-sm">6 decimal</td><td className="px-4 py-3 text-sm text-gray-400">Provable API (live, 60s cache)</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-orange-300">USDCx</td><td className="px-4 py-3 font-mono text-xs">1u8</td><td className="px-4 py-3 text-sm">6 decimal</td><td className="px-4 py-3 text-sm text-gray-400">Fixed peg: $1.00 USD</td></tr>
                            <tr><td className="px-4 py-3 font-mono text-xs text-orange-300">USAD</td><td className="px-4 py-3 font-mono text-xs">2u8</td><td className="px-4 py-3 text-sm">6 decimal</td><td className="px-4 py-3 text-sm text-gray-400">Fixed peg: $1.00 USD</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="Client usage" tone="blue">
                The frontend payment hooks call the Oracle when the payer's selected token differs from the invoice's base currency.
                The returned signature is passed as an input to the corresponding wallet program transition (e.g.,
                <code className="rounded bg-white/10 px-1.5 py-0.5">pay_invoice_credits_via_usdcx</code>).
                If tokens match, Oracle conversion is skipped entirely and the standard payment path is used.
            </Callout>
        </div>
    ),
};
