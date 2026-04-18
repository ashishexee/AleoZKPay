import { GitBranch, Shield, Wallet, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const creditsTransferExample = `// credits.aleo::transfer_private
// Used by: pay_invoice, pay_donation
//
// Signature (external program call):
//   credits.aleo::transfer_private(
//       record:    credits.aleo::credits,  // Input Credits record (consumed)
//       recipient: address,                // Merchant address
//       amount:    u64                     // Amount in microcredits
//   ) -> (credits.aleo::credits, credits.aleo::credits)
//
// Output 1: Change record → back to payer (owner = payer's address)
// Output 2: Transfer record → to merchant (owner = merchant's address)
//
// How it's called in pay_invoice:
let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
    credits.aleo::transfer_private(pay_record, merchant, amount);
//
// r1 = payer's change (if amount < record.amount, r1 has the difference)
// r2 = merchant receives amount in a fresh credits record
//
// NO compliance record.
// NO Merkle proofs required.
// NO transfer_future.run() needed — credits finalizer runs automatically.`;

const creditsInvoiceCreation = `// create_invoice — Credits-specific details:
//
// amount type: u64 (not u128)
// token_type stored in InvoiceData: 0u8
// token_type stored in Invoice record: 0u8
//
// Hash derivation uses amount as u64 cast to field:
//   let amount_field: field = amount as field;
//   let amount_hash: field = BHP256::hash_to_field(amount_field);
//
// This is the ONLY creation function where amount stays u64 throughout.
// All other token creation functions accept u128 and cast to u64 for storage.`;

export const creditsSection: DocsSection = {
    id: 'sc-credits',
    group: 'Token Support',
    label: 'Credits',
    eyebrow: 'Token Support',
    title: 'Credits — native Aleo token payment path',
    summary:
        'Credits is the native Aleo token. NullPay\'s Credits payment path is the simplest: no Merkle proofs, no compliance records, no extra finalizer calls. It uses Aleo\'s built-in two-output private transfer. Amount is stored as u64 throughout.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    title="token_type = 0u8"
                    description="Credits invoices set token_type to 0 in both the Invoice record and the InvoiceData mapping struct."
                />
                <MetricCard
                    icon={Zap}
                    title="amount: u64"
                    description="Credits is the only token where the amount stays u64 throughout — both at creation and payment. No u128 involved."
                />
                <MetricCard
                    icon={GitBranch}
                    title="Two outputs"
                    description="transfer_private returns (change, payment) — two credits records. No ComplianceRecord. No proofs array required."
                />
                <MetricCard
                    icon={Shield}
                    title="No transfer_future"
                    description="Unlike stablecoins, Credits transfers do not return a Future that needs to be run. The finalizer is automatic."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Credits invoice creation</h3>
                <CodeBlock title="create_invoice — Credits details" language="leo" code={creditsInvoiceCreation} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Credits transfer — cross-program call</h3>
                <CodeBlock title="credits.aleo::transfer_private usage" language="leo" code={creditsTransferExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-2 text-sm font-bold text-white">Finalizer validation for Credits</p>
                    <p className="text-xs leading-relaxed text-gray-400">
                        In the finalizer of <code className="rounded bg-white/5 px-1 py-0.5">pay_invoice</code>, the token_type check is:
                    </p>
                    <pre className="mt-2 rounded bg-black/40 p-3 text-xs text-gray-300 font-mono">
{`if invoice_data.token_type != 3u8 {
    assert_eq(invoice_data.token_type, 0u8); // Credits
}`}
                    </pre>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                        The <code className="rounded bg-white/5 px-1 py-0.5">!= 3u8</code> guard allows ANY-token donation invoices to also be paid via the Credits path.
                    </p>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-5">
                    <p className="mb-2 text-sm font-bold text-white">Functions using Credits</p>
                    <ul className="space-y-1 text-xs text-gray-400">
                        <li><code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">create_invoice</code> — creation</li>
                        <li><code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">pay_invoice</code> — standard/multi-pay payment</li>
                        <li><code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">pay_donation</code> — donation payment</li>
                    </ul>
                </GlassCard>
                <GlassCard className="p-5">
                    <p className="mb-2 text-sm font-bold text-white">Token granularity</p>
                    <p className="text-xs leading-relaxed text-gray-400">
                        Aleo Credits uses <strong className="text-white">microcredits</strong> — 1 Credit = 1,000,000 microcredits. The <code className="rounded bg-white/5 px-1 py-0.5">amount</code> parameter in all Credits transitions is denominated in microcredits.
                    </p>
                </GlassCard>
            </div>

            <Callout title="Credits vs stablecoins for merchants" tone="orange">
                Credits are subject to market price fluctuation relative to fiat. For predictable pricing (e.g., $50 per month), use USDCx or USAD stablecoin invoices. For chain-native payments or ecosystem rewards, Credits are the natural choice.
            </Callout>
        </div>
    ),
};
