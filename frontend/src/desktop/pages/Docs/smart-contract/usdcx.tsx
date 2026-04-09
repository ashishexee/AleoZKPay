import { GitBranch, ShieldCheck, Wallet, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const usdcxTransferSignature = `// test_usdcx_stablecoin.aleo::transfer_private
// Used by: pay_invoice_usdcx, pay_donation_usdcx
//
// Signature (external program call):
//   test_usdcx_stablecoin.aleo::transfer_private(
//       recipient: address,
//       amount:    u128,                                  // USDCx amount (u128 precision)
//       record:    test_usdcx_stablecoin.aleo::Token,    // Input Token record (consumed)
//       proofs:    [test_usdcx_stablecoin.aleo::MerkleProof; 2]  // Compliance proofs
//   ) -> (
//       ComplianceRecord,  // Compliance record (private, owner = recipient or compliance party)
//       Token,             // Change token → back to payer
//       Token,             // Transfer token → to merchant
//       Final              // The stablecoin program's own async finalizer
//   )
//
// How it's called in pay_invoice_usdcx:
let (compliance_record, transfer_output_1, transfer_output_2, transfer_future) =
    test_usdcx_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);
//
// transfer_output_1 = change token → payer
// transfer_output_2 = payment token → merchant
// compliance_record = regulatory/compliance proof record
// transfer_future   = MUST be run in the local finalizer`;

const usdcxFinalizer = `// pay_invoice_usdcx — finalizer block (only the stablecoin-specific parts):

final {
    // Step 1: Execute the stablecoin program's own finalizer
    transfer_future.run();  // ← This is the CRITICAL difference vs Credits
    
    // Steps 2-7 are identical to pay_invoice finalizer:
    let stored_hash: field = salt_to_invoice.get(salt);
    assert_eq(invoice_hash, stored_hash);
    
    let invoice_data: InvoiceData = invoices.get(stored_hash);
    if invoice_data.token_type != 3u8 {
        assert_eq(invoice_data.token_type, 1u8);  // ← USDCx = 1u8
    }
    
    if invoice_data.expiry_height != 0u32 {
        assert(block.height <= invoice_data.expiry_height);
    }
    
    assert_eq(invoice_data.status, 0u8);
    
    if invoice_data.invoice_type == 0u8 {
        invoices.set(stored_hash, InvoiceData { status: 1u8, ...rest });
    }
}`;

export const usdcxSection: DocsSection = {
    id: 'sc-usdcx',
    group: 'Token Support',
    label: 'USDCx',
    eyebrow: 'Token Support',
    title: 'USDCx — private stablecoin payment path',
    summary:
        'USDCx is a private USD-pegged stablecoin on Aleo. Its payment path is more complex than Credits: it requires a Merkle proof compliance array, returns a ComplianceRecord alongside token outputs, and requires calling transfer_future.run() in the finalizer. Amount uses u128 for decimal precision.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    title="token_type = 1u8"
                    description="USDCx invoices set token_type to 1 in both the Invoice record and InvoiceData struct."
                />
                <MetricCard
                    icon={Zap}
                    title="amount: u128"
                    description="USDCx uses u128 for amounts. Stored in the Invoice record as u64 (safe cast for typical stablecoin amounts)."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Merkle proofs required"
                    description="Every USDCx transfer requires [MerkleProof; 2] — a 2-element array of compliance proofs from the stablecoin program."
                />
                <MetricCard
                    icon={GitBranch}
                    title="3+1 outputs"
                    description="Returns change token, transfer token, ComplianceRecord, and a Final future that must be executed explicitly."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Transfer signature and outputs</h3>
                <CodeBlock title="test_usdcx_stablecoin.aleo::transfer_private" language="leo" code={usdcxTransferSignature} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Finalizer — stablecoin-specific differences</h3>
                <CodeBlock title="pay_invoice_usdcx finalizer (USDCx-specific parts)" language="leo" code={usdcxFinalizer} />
                <Callout title="transfer_future.run() must be first" tone="orange">
                    The stablecoin program's finalizer (<code className="rounded bg-white/10 px-1.5 py-0.5">transfer_future.run()</code>) must be called at the start of the enclosing finalizer. If it fails, the entire transaction rolls back. This ensures the stablecoin transfer state is always consistent with NullPay's invoice mapping state.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">USDCx functions in NullPay</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            fn: 'create_invoice_usdcx',
                            desc: 'Creates a USDCx-denominated invoice. token_type = 1u8. amount accepts u128 but stores as u64 in the record.',
                        },
                        {
                            fn: 'pay_invoice_usdcx',
                            desc: 'Fixed-amount USDCx payment. Validates Standard or Multi-pay invoice. Settles Standard invoices on success.',
                        },
                        {
                            fn: 'pay_donation_usdcx',
                            desc: 'Open-amount USDCx donation. Only accepts Donation invoices (invoice_type == 2). Never settles invoice — stays Open.',
                        },
                    ].map(({ fn, desc }) => (
                        <div key={fn} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <code className="mb-2 block text-xs font-bold text-orange-300">{fn}</code>
                            <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="ComplianceRecord — who owns it?" tone="blue">
                The <code className="rounded bg-white/10 px-1.5 py-0.5">ComplianceRecord</code> returned by the USDCx stablecoin transfer is a private record defined by the <code className="rounded bg-white/10 px-1.5 py-0.5">test_usdcx_stablecoin.aleo</code> program, not by NullPay. Its owner is determined by the stablecoin program's internal logic. NullPay receives it as a return value and passes it through as a transition output. The record is not used internally by NullPay's payment logic.
            </Callout>
        </div>
    ),
};
