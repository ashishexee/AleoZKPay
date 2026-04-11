import { ArrowRight, CheckCircle, ShieldCheck, Zap, Shield, Globe } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const payInvoiceExample = `/**
 * CORE PAYMENT: pay_invoice
 * Token: Aleo Credits
 * 
 * This is the high-bandwidth transition where the actual 
 * transfer of value happens under a Zero-Knowledge proof.
 */

fn pay_invoice(
    pay_record:      credits.aleo::credits, // record to spend
    merchant:        address,               // merchant receiver
    public payer_owner: address,            // public payer id
    amount:          u64,                   // private amount
    salt:            field,                 // link to invoice
    private payment_secret: field,          // entropy for receipts
    private payer_note: field,              // encrypted local note
    private merchant_note: field,           // encrypted merchant note
    public message:  field                  // public on-chain string
) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final)

/**
 * THE 4-RECEIPT STRATEGY:
 * 1. Change: credits record back to the payer (private).
 * 2. Payment: credits record to the merchant (private).
 * 3. Payer Receipt: proof of payment for the buyer (private record).
 * 4. Merchant Receipt: transaction details for the seller (private record).
 */`;

const stablecoinDifferencesExample = `/**
 * STABLECOIN VARIANT: pay_invoice_usdcx
 * 
 * Stablecoins on Aleo (like USDCx) require Merkle proofs 
 * for compliance. The NullPay contract integrates these 
 * requirements directly into the payment transition.
 */

fn pay_invoice_usdcx(
    // ... basic params ...
    private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2]
) -> (..., Final) {
    // Cross-program call to the stablecoin contract
    let (compliance, t1, t2, future) = 
        test_usdcx_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);
    
    return (..., final {
        future.run(); // Executes the stablecoin's on-chain finalize logic
        // ... NullPay validation logic ...
    });
}`;

export const paymentFunctionsSection: DocsSection = {
    id: 'sc-payments',
    group: 'Contract Functions',
    label: 'Payment Transitions',
    eyebrow: 'Smart Contract',
    title: 'Payment Transitions — The ZK Value Transfer',
    summary:
        'Payment transitions are the heartbeat of the NullPay protocol. They unify token transfers with invoice validation and private receipt generation into an atomic, zero-knowledge operation.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-lg font-bold text-white">Atomic Settlement</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Every payment is atomic. If the token transfer succeeds but the invoice validation (e.g., wrong amount or expired hash) fails in the finalizer, the <b>entire transaction reverts</b>. Funds never leave the buyer's wallet unless all business rules are met.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">Private Reciepts</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        NullPay generates private records for both the buyer and seller. These records contain the <code className="text-white/80">payer_note</code> and <code className="text-white/80">merchant_note</code>. Because they are private records, their content is invisible to the public and even to Aleo nodes—only the record owners can decrypt them.
                    </p>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Transition: pay_invoice</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The primary transition for Aleo Credits. It handles the 1:1 mapping of cash-to-commitment verification.
                    </p>
                    <CodeBlock title="Credits Payment Signature" language="leo" code={payInvoiceExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Compliance Layer: Stablecoins</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        When paying with USDCx or USAD, the transition acts as a proxy for the underlying stablecoin contract, passing through the required Merkle proofs and executing the remote finalizer.
                    </p>
                    <CodeBlock title="Stablecoin Compliance Integration" language="leo" code={stablecoinDifferencesExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The 5-Step Integrity Check</h3>
                <div className="space-y-4">
                    {[
                        { title: 'Hash Resolution', desc: 'The contract fetches the committed invoice hash from the salt_to_invoice mapping.' },
                        { title: 'BHP256 Verification', desc: 'The recomputed hash of (merchant + amount + salt) must exactly match the stored commitment.' },
                        { title: 'Status Guard', desc: 'The invoice MUST be in the "Open" (0u8) state. Settled invoices reject all payments.' },
                        { title: 'Currency Locking', desc: 'If the merchant requested USDCx, the Credits payment transition will revert in the finalizer.' },
                        { title: 'Expiry Validation', desc: 'The current block.height must be less than or equal to the invoice expiry (if set).' },
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-4 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-mono text-[10px]">{i + 1}</div>
                            <div>
                                <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="Public vs. Private Inputs" tone="blue">
                Notice that <code className="text-white/80">payer_owner</code> is <b>PUBLIC</b>. This mean the payer's address is etched into the transaction. For true privacy, the NullPay frontend automatically uses a <b>Burner Wallet</b> to mask the connection between the buyer's main assets and the merchant's pool.
            </Callout>
        </div>
    ),
};
