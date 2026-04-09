import { ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const payInvoiceExample = `// Transition: pay_invoice
// Token: Credits
// Standard payment — validates hash, executes transfer, creates receipts,
// and marks Standard invoices as settled.

fn pay_invoice(
    pay_record:      credits.aleo::credits, // The payer's Credits record (consumed)
    merchant:        address,               // Merchant's Aleo address (private)
    public payer_owner: address,            // Payer's address (public! on-chain)
    amount:          u64,                   // Must match invoice amount (private)
    salt:            field,                 // Invoice salt (private)
    private payment_secret: field,          // Payer-generated random field (private)
    private payer_note: field,              // Payer note (max ~31 chars, private)
    private merchant_note: field,           // Merchant note (max ~31 chars, private)
    public message:  field                  // Public message (on-chain)
) -> (
    credits.aleo::credits,   // Change record back to payer
    credits.aleo::credits,   // Transfer record to merchant
    PayerReceipt,            // Private receipt for payer
    MerchantReceipt,         // Private receipt for merchant
    Final                    // Async finalizer
)

// Cross-program call inside the transition body:
let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
    credits.aleo::transfer_private(pay_record, merchant, amount);
// r1 = change back to payer's address
// r2 = payment to merchant

// Inside the 'final' block:
//   1. salt_to_invoice.get(salt) → get stored hash
//   2. assert_eq(invoice_hash, stored_hash)   → proves payer knows correct salt+merchant+amount
//   3. invoices.get(stored_hash) → get InvoiceData
//   4. if token_type != 3u8: assert_eq(token_type, 0u8)  → Credits check
//   5. if expiry_height != 0: assert(block.height <= expiry_height)
//   6. assert_eq(status, 0u8)  → must still be Open
//   7. if invoice_type == 0u8: invoices.set(hash, { status: 1u8, ... })  → settle Standard`;

const payInvoiceUsdcxExample = `// Transition: pay_invoice_usdcx
// Token: USDCx (test_usdcx_stablecoin.aleo)
//
// Key differences vs pay_invoice:
//   - pay_record is a test_usdcx_stablecoin.aleo::Token (not credits)
//   - amount is u128 (not u64)
//   - requires extra param: proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2]
//   - Stablecoin transfer returns 4 values instead of 2

fn pay_invoice_usdcx(
    pay_record:         test_usdcx_stablecoin.aleo::Token,
    merchant:           address,
    public payer_owner: address,
    amount:             u128,
    salt:               field,
    private payment_secret: field,
    private payer_note:     field,
    private merchant_note:  field,
    public message:         field,
    private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2]  // ← Compliance proofs
) -> (
    test_usdcx_stablecoin.aleo::Token,           // Change token
    test_usdcx_stablecoin.aleo::Token,           // Transfer token
    test_usdcx_stablecoin.aleo::ComplianceRecord, // Compliance record
    PayerReceipt,
    MerchantReceipt,
    Final
)

// Cross-program call:
let (compliance_record, transfer_output_1, transfer_output_2, transfer_future) =
    test_usdcx_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);

// Inside 'final':
//   transfer_future.run();   // ← MUST be called to execute the stablecoin program's finalizer
//   ... same assertions as pay_invoice but token_type check uses 1u8 ...`;

const payDonationExample = `// Transition: pay_donation
// Token: Credits
// Donation payment — no fixed amount, payer decides how much.
//
// Key differences vs pay_invoice:
//   - No 'amount' param — replaced by 'amount_to_donate: u64'
//   - The finalizer does NOT flip status to 1 (donations stay open)
//   - The finalizer asserts invoice_type == 2 (only Donation invoices)
//   - The receipt_hash uses a more complex derivation (see Cryptography section)

fn pay_donation(
    pay_record:              credits.aleo::credits,
    merchant:                address,
    public payer_owner:      address,
    amount_to_donate:        u64,        // Chosen freely by the payer
    salt:                    field,
    private payment_secret:  field,
    private payer_note:      field,
    private merchant_note:   field,
    public message:          field
) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final)

// Donation-specific finalizer assertions:
//   if invoice_data.token_type != 3u8 {
//       assert_eq(invoice_data.token_type, 0u8);  // Credits-only or ANY
//   }
//   assert_eq(invoice_data.invoice_type, 2u8);    // MUST be Donation
//   assert_eq(invoice_data.status, 0u8);          // Must be open (never settles)
//   if expiry_height != 0u32 {
//       assert(block.height <= expiry_height);
//   }
// ← Notice: NO status update. Donation invoices remain Open forever.`;

const paymentValidationFlow = `// === Payment Validation Flow (all pay_* functions) ===
// This 5-step pattern runs in the finalizer of every pay_* transition.

// Step 1: Retrieve the expected hash from the salt
let stored_hash: field = salt_to_invoice.get(salt);

// Step 2: Assert the recomputed hash matches
// (proves payer knows the correct merchant + amount + salt triple)
assert_eq(invoice_hash, stored_hash);

// Step 3: Retrieve the InvoiceData
let invoice_data: InvoiceData = invoices.get(stored_hash);

// Step 4: Token type check
// (ANY-token invoices skip this — the 'if' guard allows any token)
if invoice_data.token_type != 3u8 {
    assert_eq(invoice_data.token_type, EXPECTED_TOKEN_TYPE);
}

// Step 5: Expiry check
if invoice_data.expiry_height != 0u32 {
    assert(block.height <= invoice_data.expiry_height);
}

// Step 6: Status check (invoice must be Open)
assert_eq(invoice_data.status, 0u8);

// Step 7: Settlement (Standard invoices only)
// Multi-pay (1) and Donation (2) skip this block
if invoice_data.invoice_type == 0u8 {
    invoices.set(stored_hash, InvoiceData { status: 1u8, ...rest });
}`;

export const paymentFunctionsSection: DocsSection = {
    id: 'sc-payments',
    group: 'Functions',
    label: 'Payment Transitions',
    eyebrow: 'Smart Contract',
    title: 'Payment transitions — the six pay_* functions',
    summary:
        'NullPay has six payment transitions: pay_invoice, pay_invoice_usdcx, pay_invoice_usad for fixed-amount payments, and pay_donation, pay_donation_usdcx, pay_donation_usad for open-amount donations. All six share the same five-step finalizer validation pattern.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { fn: 'pay_invoice', token: 'Credits', type: 'Standard/Multi-pay' },
                    { fn: 'pay_invoice_usdcx', token: 'USDCx', type: 'Standard/Multi-pay' },
                    { fn: 'pay_invoice_usad', token: 'USAD', type: 'Standard/Multi-pay' },
                    { fn: 'pay_donation', token: 'Credits', type: 'Donation only' },
                    { fn: 'pay_donation_usdcx', token: 'USDCx', type: 'Donation only' },
                    { fn: 'pay_donation_usad', token: 'USAD', type: 'Donation only' },
                ].map(({ fn, token, type }) => (
                    <div key={fn} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <code className="mb-1 block text-xs font-bold text-orange-300">{fn}</code>
                        <p className="text-[10px] text-gray-400">Token: <span className="text-white">{token}</span></p>
                        <p className="text-[10px] text-gray-400">Accepts: <span className="text-emerald-300">{type}</span></p>
                    </div>
                ))}
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Universal payment validation flow</h3>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    All six payment functions execute this exact same finalizer pattern — the only differences are the expected token_type value and whether the status is updated afterward (invoices only, not donations).
                </p>
                <CodeBlock title="Payment validation — finalizer pattern" language="leo" code={paymentValidationFlow} />
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-orange-300">pay_invoice</code>
                    <p className="mt-1 text-sm text-gray-400">Credits fixed-amount payment. The base reference for all payment transitions.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="pay_invoice — full signature and flow" language="leo" code={payInvoiceExample} />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">payer_owner is public</p>
                            <p className="text-xs leading-relaxed text-gray-400">The payer's address is a <strong>public</strong> input. It appears in the transaction on-chain. To pay without linking a known address, use the burner wallet — a fresh address with no on-chain history.</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">Two credit outputs</p>
                            <p className="text-xs leading-relaxed text-gray-400">Credits uses Aleo's native two-output split: the first output is the change record back to the payer, the second is the payment to the merchant. Both are private records.</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-blue-300">pay_invoice_usdcx / pay_invoice_usad</code>
                    <p className="mt-1 text-sm text-gray-400">Stablecoin payments. Require Merkle proof compliance array. Emit an extra ComplianceRecord.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="pay_invoice_usdcx — signature and differences" language="leo" code={payInvoiceUsdcxExample} />
                    <Callout title="transfer_future.run() is mandatory" tone="orange">
                        For stablecoin payments, the cross-program call returns a <code className="rounded bg-white/10 px-1.5 py-0.5">Final</code> value called <code className="rounded bg-white/10 px-1.5 py-0.5">transfer_future</code>. The finalizer <strong>must</strong> call <code className="rounded bg-white/10 px-1.5 py-0.5">transfer_future.run()</code> to execute the stablecoin program's own finalizer. Omitting this would leave the stablecoin transfer state inconsistent.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <code className="text-xs font-bold text-emerald-300">pay_donation / pay_donation_usdcx / pay_donation_usad</code>
                    <p className="mt-1 text-sm text-gray-400">Open-amount donation payments. Invoice stays Open permanently — no settlement state change.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="pay_donation — signature and donation-specific behaviour" language="leo" code={payDonationExample} />
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {[
                            {
                                label: 'assert amount_to_donate > 0',
                                desc: 'Donations must be a positive amount. The contract asserts this at the top of the transition. A zero-donate call is rejected.',
                            },
                            {
                                label: 'assert invoice_type == 2',
                                desc: 'Only invoices created as Donation type can be paid via pay_donation. Paying a Standard or Multi-pay invoice through pay_donation will fail the finalizer assertion.',
                            },
                            {
                                label: 'No status update',
                                desc: 'Donation invoices are eternal — their status never changes to 1 (Settled). The same invoice can receive unlimited payments from unlimited donors.',
                            },
                        ].map(({ label, desc }) => (
                            <div key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                                    <code className="text-xs font-bold text-emerald-300">{label}</code>
                                </div>
                                <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ArrowRight className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">ANY token: how cross-token payments work</h3>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    When an invoice has <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">token_type = 3u8</code> (ANY), the finalizer bypasses the token-type assertion. This means:
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                    {['pay_donation (Credits)', 'pay_donation_usdcx (USDCx)', 'pay_donation_usad (USAD)'].map(fn => (
                        <div key={fn} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <code className="text-xs font-bold text-emerald-300">{fn}</code>
                            <p className="mt-1 text-xs text-gray-400">✓ Can settle any ANY-token donation invoice</p>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                    The check in the finalizer: <code className="rounded bg-white/5 px-1.5 py-0.5">if invoice_data.token_type != 3u8 {'{'} assert_eq(invoice_data.token_type, EXPECTED); {'}'}</code> — skips the assertion for token_type = 3, allowing any pay_donation_* variant to go through.
                </p>
            </GlassCard>
        </div>
    ),
};
