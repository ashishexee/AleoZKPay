import { Hash, Lock, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const hashDerivationExample = `// === Invoice Hash Derivation ===
// Used in: create_invoice, create_invoice_usdcx,
//          create_invoice_usad, create_invoice_any
// Also recomputed in every pay_* function for validation.

// Inputs:
//   merchant: address  (private)
//   amount:   u64/u128 (private)
//   salt:     field    (private)

let merchant_field: field = merchant as field;
let amount_field: field   = amount as field;

let merchant_hash: field = BHP256::hash_to_field(merchant_field);
let amount_hash:   field = BHP256::hash_to_field(amount_field);
let salt_hash:     field = BHP256::hash_to_field(salt);

// The invoice hash is the arithmetic SUM of three BHP256 hashes.
// NOT a nested hash — a field element addition.
let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

// This hash is:
//   - Returned publicly as the second output of the transition
//   - Stored in invoices mapping (keyed by invoice_hash)
//   - Also stored in salt_to_invoice (keyed by salt, value = invoice_hash)
//   - Recomputed identically in every pay_* finalizer for assert_eq`;

const receiptHashExample = `// === Receipt Hash Derivation (Standard payments) ===
// Used in: pay_invoice, pay_invoice_usdcx, pay_invoice_usad

// Inputs:
//   payment_secret: field (private — known only to payer at time of payment)
//   salt: field (private — same salt used when creating the invoice)

let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

// BHP256::commit_to_field is a Pedersen-like vector commitment:
//   commit(message, randomness) → field
//
// This produces a unique, binding, and hiding commitment:
//   - Binding: two different (payment_secret, salt) pairs cannot produce the same hash
//   - Hiding: the commitment reveals nothing about payment_secret or salt alone
//
// Both PayerReceipt and MerchantReceipt receive the SAME receipt_hash,
// enabling cross-party reconciliation without revealing the secret.`;

const donationReceiptHashExample = `// === Receipt Hash Derivation (Donation payments) ===
// Used in: pay_donation, pay_donation_usdcx, pay_donation_usad
// More complex because the amount is variable and must be committed.

// Inputs:
//   amount_to_donate: u64/u128 (the actual donated amount — private)
//   payment_secret:   field    (private)
//   token_type:       u8       (tied to the pay_donation variant)
//   salt:             field    (private)

// For pay_donation (Credits):
let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
let token_hash: field = BHP256::hash_to_field(0u8 as field); // 0 = Credits
let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);

// For pay_donation_usdcx:
let token_hash: field = BHP256::hash_to_field(1u8 as field); // 1 = USDCx
// combined_secret = payment_secret + hash(amount) + hash(1u8)
// receipt_hash = commit(combined_secret, scalar(salt))

// For pay_donation_usad:
let token_hash: field = BHP256::hash_to_field(2u8 as field); // 2 = USAD
// combined_secret = payment_secret + hash(amount) + hash(2u8)

// Key insight: donation receipt_hash binds the token type and actual donated
// amount into the commitment, making each donation uniquely traceable
// by both payer and merchant — even though the amount was freely chosen.`;

const donationAmountHashExample = `// === Donation Invoice: amount 0 convention ===
// When creating a donation invoice, amount is 0 (the "any amount" signal).
// When PAYING a donation, amount_to_donate is the real amount.
//
// This creates a deliberate asymmetry:
//   create_invoice_any(amount = 0u128, ...) → hash uses hash(0 as field)
//   pay_donation(..., amount_to_donate = 50)  → hash uses hash(0u64 as field)
//
// From pay_donation source:
let amount_field: field = 0u64 as field; // Always 0 for donation invoices
let merchant_hash:  field = BHP256::hash_to_field(merchant_field);
let amount_hash:    field = BHP256::hash_to_field(amount_field);
let salt_hash:      field = BHP256::hash_to_field(salt);
let invoice_hash:   field = merchant_hash + amount_hash + salt_hash;
// This recomputes the SAME hash as create_invoice_any with amount=0,
// ensuring the salt_to_invoice assertion passes even though the donated
// amount was unknown at invoice creation time.`;

export const cryptographySection: DocsSection = {
    id: 'sc-cryptography',
    group: 'Contract Layout',
    label: 'Cryptography',
    eyebrow: 'Smart Contract',
    title: 'BHP256 hashing and commitments',
    summary:
        'NullPay uses Aleo\'s native BHP256 primitives for all on-chain cryptographic operations. Invoice hashes are additive sums of three BHP256 hashes. Payment receipts use BHP256 Pedersen-style commitments. Donation payments extend the commitment scheme to bind variable amounts and token types.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                {[
                    {
                        icon: Hash,
                        title: 'BHP256::hash_to_field',
                        desc: 'Maps any input to a deterministic 254-bit field element. Used three times per invoice: once for merchant, once for amount, once for salt.',
                        color: 'text-orange-300',
                    },
                    {
                        icon: Lock,
                        title: 'BHP256::commit_to_field',
                        desc: 'A hiding and binding commitment. Takes a message field and a scalar randomness. Produces the receipt_hash that both payer and merchant receive.',
                        color: 'text-blue-300',
                    },
                    {
                        icon: Zap,
                        title: 'BHP256::hash_to_scalar',
                        desc: 'Maps the salt to a scalar field element, which is used as the commitment randomness in commit_to_field. The salt bridges both hash and scalar domains.',
                        color: 'text-emerald-300',
                    },
                ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <Icon className={`mb-3 h-5 w-5 ${color}`} />
                        <p className="mb-2 text-sm font-bold text-white">{title}</p>
                        <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                    </div>
                ))}
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Invoice hash derivation</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The invoice hash is <strong className="text-white">not</strong> a standard nested hash — it is the arithmetic sum of three independent BHP256 hashes in the field. This is the exact same computation run at creation time <em>and</em> inside every payment finalizer.
                </p>
                <CodeBlock title="Invoice hash computation (Leo)" language="leo" code={hashDerivationExample} />

                <GlassCard className="mt-4 p-5">
                    <p className="mb-3 text-sm font-bold text-white">Why arithmetic sum instead of a nested hash?</p>
                    <p className="text-xs leading-relaxed text-gray-400">
                        An additive sum of precomputed hashes is cheaper in terms of Leo constraint count than a single nested BHP256 hash over concatenated inputs. Each individual BHP256 call is a fixed-size operation. The sum is a single field addition — one constraint. The result is still collision-resistant in practice because BHP256 is modeled as a random oracle, making independent collisions across all three components simultaneously computationally infeasible.
                    </p>
                </GlassCard>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Receipt hash — standard payment commitment</h3>
                <CodeBlock title="receipt_hash derivation (pay_invoice variants)" language="leo" code={receiptHashExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Receipt hash — donation payment commitment</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Donation payments use a more complex commitment that binds the actual donated amount and the token type, even though neither was committed to at invoice creation time.
                </p>
                <CodeBlock title="receipt_hash for donation (pay_donation variants)" language="leo" code={donationReceiptHashExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The amount-zero convention for donations</h3>
                <CodeBlock title="Donation amount handling" language="leo" code={donationAmountHashExample} />
                <Callout title="Why donations use amount=0 in the hash" tone="blue">
                    Because donation invoices accept any amount chosen by the payer, the invoice hash must be derivable at creation time when the future donated amount is unknown. Using <code className="rounded bg-white/10 px-1.5 py-0.5">0</code> as the amount in the hash derivation is the convention — all three <code className="rounded bg-white/10 px-1.5 py-0.5">pay_donation*</code> functions hardcode <code className="rounded bg-white/10 px-1.5 py-0.5">0u64 as field</code> when recomputing the invoice hash, so the <code className="rounded bg-white/10 px-1.5 py-0.5">assert_eq</code> in the finalizer always passes. The actual donated amount only appears in the receipt hash.
                </Callout>
            </GlassCard>
        </div>
    ),
};
