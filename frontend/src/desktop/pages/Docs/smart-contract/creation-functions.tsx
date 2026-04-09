import { Plus } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const createInvoiceExample = `// Transition: create_invoice
// Token: Credits (token_type = 0u8)
// Creates an Invoice record + writes invoices + salt_to_invoice mappings.

fn create_invoice(
    private merchant:      address, // The merchant's Aleo address
    private amount:        u64,     // Amount in Credits microunits
    private salt:          field,   // Random field — must be unique per invoice
    private memo:          field,   // BHP256-packed string (max ~31 chars)
    public  expiry_hours:  u32,     // 0 = no expiry; otherwise blocks = hours * 360
    public  invoice_type:  u8,      // 0=Standard, 1=Multi Pay, 2=Donation
    public  wallet_type:   u8       // 0=Main Wallet, 1=Burner Wallet
) -> (Invoice, public field, Final)

// Outputs:
//   Invoice record  → sent to merchant (private)
//   field           → invoice_hash (public! appears in the transaction)
//   Final           → async finalizer (writes mappings)

// IMPORTANT: invoice_hash is PUBLIC output.
// Anyone watching the chain can see the hash, but NOT the merchant,
// amount, or salt — those are all private inputs.`;

const createInvoiceUsdcxExample = `// Transition: create_invoice_usdcx
// Token: USDCx (token_type = 1u8)
// Nearly identical to create_invoice except:
//   - amount is u128 (USDCx uses 6 decimal places → larger numbers)
//   - The Invoice record stores amount as u64 (cast from u128)
//   - token_type = 1u8

fn create_invoice_usdcx(
    private merchant:      address,
    private amount:        u128,    // u128 for USDCx precision
    private salt:          field,
    private memo:          field,
    public  expiry_hours:  u32,
    public  invoice_type:  u8,
    public  wallet_type:   u8
) -> (Invoice, public field, Final)

// Note inside the transition:
//   let amount_u64: u64 = amount as u64;  // safe cast — see records docs
//   invoice_record.amount = amount_u64;   // stored as u64 for display uniformity
//   invoice_record.token_type = 1u8;      // hardcoded`;

const createInvoiceAnyExample = `// Transition: create_invoice_any
// Token: ANY (token_type = 3u8)
// Used ONLY for Donation invoices where the payer picks the token.
//
// Identical signature to create_invoice_usdcx (u128 amount input)
// except token_type is hardcoded to 3u8.
//
// Convention: The CLI and platform always pass amount = 0 for ANY-token
// donation invoices, since the hash uses hash(0) to stay invariant
// across all pay_donation* payment paths.

fn create_invoice_any(
    private merchant:      address,
    private amount:        u128,   // Platform convention: always 0 for ANY-token donations
    private salt:          field,
    private memo:          field,
    public  expiry_hours:  u32,
    public  invoice_type:  u8,     // Platform convention: always 2 (Donation) for ANY
    public  wallet_type:   u8
) -> (Invoice, public field, Final)`;

const creationSummaryTable = `// Creation function → token_type → amount input type
//
// create_invoice        → 0 (Credits) → u64
// create_invoice_usdcx  → 1 (USDCx)   → u128
// create_invoice_usad   → 2 (USAD)    → u128
// create_invoice_any    → 3 (ANY)      → u128 (always 0 by convention)
//
// All four produce:
//   ✓ An Invoice record (private → merchant)
//   ✓ A public invoice_hash field output
//   ✓ An async finalizer that writes:
//       invoices.set(invoice_hash, invoice_data)
//       salt_to_invoice.set(salt, invoice_hash)`;

export const creationFunctionsSection: DocsSection = {
    id: 'sc-creation',
    group: 'Functions',
    label: 'Invoice Creation',
    eyebrow: 'Smart Contract',
    title: 'Invoice creation transitions',
    summary:
        'NullPay has four invoice creation transitions — one per token type. All four share the same hash derivation algorithm and mapping write pattern. The differences are the amount type (u64 vs u128), the hardcoded token_type value, and the calling convention for the amount parameter.',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Plus className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">The four creation functions</h3>
                </div>
                <CodeBlock title="Creation function → token_type map" language="text" code={creationSummaryTable} />
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-orange-300">create_invoice</code>
                    <p className="mt-1 text-sm text-gray-400">Credits-denominated invoice. Base reference — all other creation functions mirror this structure.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="create_invoice signature + outputs" language="leo" code={createInvoiceExample} />
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {[
                            { param: 'merchant (private)', desc: 'The Aleo address that will receive the payment. Hashed with BHP256 as part of the invoice_hash derivation. Never appears in public transaction outputs.' },
                            { param: 'salt (private)', desc: 'A randomly generated field element. Must be unique per invoice. Stored in the Invoice record AND written to salt_to_invoice mapping. Reused during payment to prove knowledge of the invoice.' },
                            { param: 'expiry_hours (public)', desc: 'Public input. Zero means no expiry. Non-zero is multiplied by 360 blocks/hour and added to the current block.height in the finalizer. Visible on-chain.' },
                        ].map(({ param, desc }) => (
                            <div key={param} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                                <code className="mb-2 block text-xs font-bold text-orange-300">{param}</code>
                                <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-blue-300">create_invoice_usdcx</code>
                    <p className="mt-1 text-sm text-gray-400">USDCx stablecoin invoice. Uses u128 for amount to support 6-decimal precision.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="create_invoice_usdcx signature" language="leo" code={createInvoiceUsdcxExample} />
                    <Callout title="u128 → u64 cast" tone="blue">
                        The transition accepts <code className="rounded bg-white/10 px-1.5 py-0.5">u128</code> but casts it to <code className="rounded bg-white/10 px-1.5 py-0.5">u64</code> before storing in the Invoice record. For hash derivation, the raw u128 is used. This means the hash was derived from the full u128 but the record's <code className="rounded bg-white/10 px-1.5 py-0.5">amount</code> field shows the u64-cast value. For typical USDCx amounts (e.g. 50 USDCx = 50_000_000 units), u64 is more than sufficient.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-emerald-300">create_invoice_any</code>
                    <p className="mt-1 text-sm text-gray-400">ANY-token donation invoice. Payer picks token at payment time. Amount at creation is always 0 by convention.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="create_invoice_any signature" language="leo" code={createInvoiceAnyExample} />
                    <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">ANY token enforces invoice_type = 2 (Donation)</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            The contract does not enforce on-chain that <code className="rounded bg-white/5 px-1 py-0.5">invoice_type</code> must be 2 when <code className="rounded bg-white/5 px-1 py-0.5">token_type</code> is 3 — this is a platform-level convention enforced by the CLI and SDK. In the payment finalizers, token-type-3 invoices bypass the <code className="rounded bg-white/5 px-1 py-0.5">assert_eq(invoice_data.token_type, ...)</code> assertion by checking <code className="rounded bg-white/5 px-1 py-0.5">if invoice_data.token_type != 3u8 {"{"} assert_eq(...) {"}"}</code> — effectively allowing any pay_* function to settle a token_type=3 invoice.
                        </p>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
