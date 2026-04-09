import { GitBranch, ShieldCheck, Wallet, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const usadTransferSignature = `// test_usad_stablecoin.aleo::transfer_private
// Used by: pay_invoice_usad, pay_donation_usad
//
// Identical call pattern to USDCx. Only the program address differs.
//
//   test_usad_stablecoin.aleo::transfer_private(
//       recipient: address,
//       amount:    u128,
//       record:    test_usad_stablecoin.aleo::Token,
//       proofs:    [test_usad_stablecoin.aleo::MerkleProof; 2]
//   ) -> (
//       test_usad_stablecoin.aleo::ComplianceRecord,
//       test_usad_stablecoin.aleo::Token,   // change
//       test_usad_stablecoin.aleo::Token,   // payment
//       Final                                // transfer_future (must .run())
//   )
//
// How it's called in pay_invoice_usad:
let (compliance_record, transfer_output_1, transfer_output_2, transfer_future) =
    test_usad_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);`;

const usadVsUsdcxExample = `// ─── USAD vs USDCx: what is actually different ───────────────────────
//
// 1. Program address
//    USDCx: test_usdcx_stablecoin.aleo
//    USAD:  test_usad_stablecoin.aleo
//
// 2. token_type value
//    USDCx: 1u8
//    USAD:  2u8
//
// 3. Token record type in transitions
//    USDCx: test_usdcx_stablecoin.aleo::Token
//    USAD:  test_usad_stablecoin.aleo::Token
//
// 4. MerkleProof array element type
//    USDCx: [test_usdcx_stablecoin.aleo::MerkleProof; 2]
//    USAD:  [test_usad_stablecoin.aleo::MerkleProof; 2]
//
// 5. ComplianceRecord type
//    USDCx: test_usdcx_stablecoin.aleo::ComplianceRecord
//    USAD:  test_usad_stablecoin.aleo::ComplianceRecord
//
// Everything else — signature shape, finalizer flow, amount types,
// hash derivation, status mutation behaviour — is identical.
//
// In the finalizer token_type assertion:
//    USDCx: assert_eq(invoice_data.token_type, 1u8);
//    USAD:  assert_eq(invoice_data.token_type, 2u8);`;

const usadDonationReceiptHash = `// pay_donation_usad receipt_hash computation
// (USAD-specific token_hash value)
//
// From the Leo source:
let token_hash: field = BHP256::hash_to_field(2u8 as field);  // 2u8 = USAD
let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);
//
// Compare to pay_donation_usdcx:
// let token_hash: field = BHP256::hash_to_field(1u8 as field);  // 1u8 = USDCx
//
// The token_hash ensures that a USAD donation and a USDCx donation to the
// same invoice produce different receipt_hashes even if the payment amounts
// and secrets are identical — preventing cross-token receipt confusion.`;

export const usadSection: DocsSection = {
    id: 'sc-usad',
    group: 'Token Support',
    label: 'USAD',
    eyebrow: 'Token Support',
    title: 'USAD — private stablecoin payment path',
    summary:
        'USAD is the second private USD-pegged stablecoin on Aleo supported by NullPay. Its payment path is architecturally identical to USDCx — same Merkle proof requirement, same ComplianceRecord output, same finalizer pattern — with a different program address (token_type = 2u8) and USAD-specific token record types.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    title="token_type = 2u8"
                    description="USAD invoices set token_type to 2 in both the Invoice record and InvoiceData struct."
                />
                <MetricCard
                    icon={Zap}
                    title="amount: u128"
                    description="Same as USDCx — u128 at the transition level, cast to u64 for Invoice record storage."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Merkle proofs required"
                    description="Requires [test_usad_stablecoin.aleo::MerkleProof; 2] — same structural requirement as USDCx."
                />
                <MetricCard
                    icon={GitBranch}
                    title="Identical to USDCx pattern"
                    description="Same ComplianceRecord output, same transfer_future.run() requirement, different program address and type namespaces."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">USAD vs USDCx — what exactly differs</h3>
                <CodeBlock title="USAD vs USDCx: contract-level differences" language="text" code={usadVsUsdcxExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">USAD transfer call</h3>
                <CodeBlock title="test_usad_stablecoin.aleo::transfer_private" language="leo" code={usadTransferSignature} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">USAD donation receipt hash</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The USAD donation path differs from USDCx donation only in the token_hash value baked into the receipt commitment:
                </p>
                <CodeBlock title="pay_donation_usad — receipt_hash (USAD-specific)" language="leo" code={usadDonationReceiptHash} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">USAD functions in NullPay</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            fn: 'create_invoice_usad',
                            desc: 'Creates a USAD invoice. token_type = 2u8. Structurally identical to create_invoice_usdcx.',
                        },
                        {
                            fn: 'pay_invoice_usad',
                            desc: 'Fixed-amount USAD payment. Same 6-step finalizer as pay_invoice_usdcx but asserts token_type == 2u8.',
                        },
                        {
                            fn: 'pay_donation_usad',
                            desc: 'Open-amount USAD donation. token_hash = hash(2u8) in receipt derivation. Never settles the invoice.',
                        },
                    ].map(({ fn, desc }) => (
                        <div key={fn} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <code className="mb-2 block text-xs font-bold text-orange-300">{fn}</code>
                            <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="Choosing between USDCx and USAD" tone="blue">
                Both USDCx and USAD are private USD-denominated stablecoins on Aleo's test network. NullPay supports both so merchants can serve users holding either token. For production use, check which stablecoin has the most liquidity on the network at the time of deployment. The integration code for both is identical — just change the <code className="rounded bg-white/10 px-1.5 py-0.5">currency</code> field in your session creation call.
            </Callout>
        </div>
    ),
};
