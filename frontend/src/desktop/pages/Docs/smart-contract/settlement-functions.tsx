import { Download, Eye, Lock, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const settleInvoiceExample = `// Transition: settle_invoice
// Purpose: Merchant-initiated manual settlement (no payment).
// Use case: Off-chain payments, refunds, or admin closure.
//
// Unlike pay_invoice, this does NOT call any token transfer.
// It only updates the invoices mapping status to 1 (Settled).

fn settle_invoice(
    public salt:     field,  // The invoice salt (public — caller must know it)
    private amount:  u64     // The invoice amount (private — must match original)
) -> Final

// self.caller must be the original merchant.
// The transition recomputes invoice_hash from self.caller + amount + salt,
// then asserts it matches the stored hash.

// Inside the 'final' block:
let merchant_field: field = self.caller as field;
let amount_field:   field = amount as field;

let merchant_hash: field = BHP256::hash_to_field(merchant_field);
let amount_hash:   field = BHP256::hash_to_field(amount_field);
let salt_hash:     field = BHP256::hash_to_field(salt);

let calculated_hash: field = merchant_hash + amount_hash + salt_hash;

// Proof: only the original merchant with the correct amount and salt can produce
// a calculated_hash that matches the stored hash:
let stored_hash: field = salt_to_invoice.get(salt);
assert_eq(calculated_hash, stored_hash);

// Force-settle: works for ANY invoice type (standard, multi-pay, donation)
invoices.set(stored_hash, InvoiceData { status: 1u8, ...rest });`;

const getInvoiceStatusExample = `// Transition: get_invoice_status
// Purpose: Read-only invoice status check (on-chain view).
// Returns nothing — the data is accessible via the mapping.

fn get_invoice_status(
    public invoice_hash: field  // The hash to look up
) -> Final

// Inside 'final':
let invoice_data: InvoiceData = invoices.get(invoice_hash);
// The data is accessible on-chain but the transition has no output.
// In practice, this is called by off-chain tools and the NullPay backend
// to verify invoice state before completing a checkout session.

// Note: This transition just proves the hash exists in the mapping.
// To read the actual InvoiceData off-chain, use the Aleo SDK or
// the NullPay backend API endpoint: GET /checkout/sessions/{id}`;

const walletFunctionsExample = `// ─── Wallet program functions ──────────────────────────────────────────
// Program: zk_pay_proofs_privacy_wallet_v3.aleo

// 1. backup_password
//    Stores an encrypted password fragment as a private record.
//    The burner key fields (pk_part_1..10) are all 0field.
//    Returns BurnerWalletRecord (with burner_address = self.caller).

fn backup_password(
    private password_part: field  // Encrypted password fragment
) -> BurnerWalletRecord

// 2. backup_burner_wallet
//    Stores both password AND burner private key (split into 10 fields).
//    Returns a BurnerWalletRecord with all 10 pk_part fields populated.

fn backup_burner_wallet(
    private burner_address: address,
    private password_part:  field,
    private pk_part_1:      field,
    // ... pk_part_2 through pk_part_10 ...
    private pk_part_10:     field
) -> BurnerWalletRecord

// 3. create_card_profile
//    Creates a CardProfileRecord and writes to card_lookup mapping.
//    All sensitive data is AES-256 encrypted off-chain before submission.

fn create_card_profile(
    private card_number_hash:       field,
    public  profile_version:        u8,
    private encrypted_card_number:  [field; 6],
    private encrypted_card_address: [field; 10],
    private encrypted_label:        [field; 10],
    private encrypted_hint:         [field; 8]
) -> (CardProfileRecord, Final)

// 4. set_card_status
//    Toggle a card between Active (0) and Inactive (1).
//    Asserts self.caller == card_lookup[card_number_hash].main_owner.

fn set_card_status(
    public card_number_hash: field,
    public next_status:      u8      // 0 or 1 only
) -> Final

// 5. create_gift_card_record
//    Mints a GiftCardRecord with an encrypted private key.
//    Owner = self.caller. No mapping state written.

fn create_gift_card_record(
    private gift_card_address: address,
    private gift_private_key:  [field; 8],
    private label:             field
) -> GiftCardRecord`;

export const settlementFunctionsSection: DocsSection = {
    id: 'sc-settlement',
    group: 'Functions',
    label: 'Settlement & Wallet',
    eyebrow: 'Smart Contract',
    title: 'Settlement transitions and wallet helpers',
    summary:
        'The core program has two settlement and read functions: settle_invoice (merchant-initiated manual closure) and get_invoice_status (read-only on-chain status check). The wallet program adds five helper functions for password backup, burner wallet backup, card profiles, card status control, and gift card minting.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v27.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">settle_invoice</h3>
                    <p className="mt-1 text-sm text-gray-400">Merchant-only manual settlement. No token transfer. Proves merchant identity by recomputing the hash from <code className="rounded bg-white/5 px-1.5 py-0.5">self.caller</code>.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="settle_invoice — full transition" language="leo" code={settleInvoiceExample} />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">When to use settle_invoice</p>
                            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-400">
                                <li>• Off-chain payment was received (bank transfer, etc.)</li>
                                <li>• Merchant wants to force-close a Campaign invoice</li>
                                <li>• Admin operations requiring manual settlement</li>
                            </ul>
                        </div>
                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                            <p className="mb-1 text-sm font-bold text-orange-300">Difference from pay_invoice</p>
                            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-400">
                                <li>• No token transfer — no credits, no stablecoin movement</li>
                                <li>• Uses <code className="rounded bg-white/5 px-1 py-0.5">self.caller</code> as merchant proof instead of a parameter</li>
                                <li>• Works on all invoice types (including multi-pay and donation)</li>
                                <li>• <code className="rounded bg-white/5 px-1 py-0.5">salt</code> is a public input (necessary so finalizer can call <code className="rounded bg-white/5 px-1 py-0.5">.get(salt)</code>)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v27.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">get_invoice_status</h3>
                    <p className="mt-1 text-sm text-gray-400">Read-only on-chain lookup. Verifies a hash exists in the invoices mapping.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="get_invoice_status" language="leo" code={getInvoiceStatusExample} />
                    <Callout title="Backend uses the API, not this transition directly" tone="blue">
                        In the NullPay integration, the Node SDK backend calls <code className="rounded bg-white/10 px-1.5 py-0.5">sessions.retrieve(id)</code> which hits the NullPay backend API. The backend watches for settled transactions via Aleo node events — you don't need to call this transition manually in production flows.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">zk_pay_proofs_privacy_wallet_v3.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">All five wallet helper functions</h3>
                    <p className="mt-1 text-sm text-gray-400">Backup, card profile management, and gift card minting in the wallet program.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Wallet program — all 5 functions" language="leo" code={walletFunctionsExample} />
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[
                            {
                                fn: 'backup_password',
                                note: 'Password-only backup. All pk_part fields are 0field. Quick way to back up just the platform password without exposing the burner key.',
                            },
                            {
                                fn: 'backup_burner_wallet',
                                note: 'Full burner key backup. Splits the private key across 10 field elements. Encryption must be applied off-chain before submission.',
                            },
                            {
                                fn: 'create_card_profile',
                                note: 'Creates the card profile + writes card_lookup mapping. All sensitive card data is encrypted (AES-256) before the transition is called.',
                            },
                            {
                                fn: 'set_card_status',
                                note: 'Ownership-gated toggle. Asserts self.caller == card_lookup[hash].main_owner before allowing status change to 0 (active) or 1 (inactive).',
                            },
                            {
                                fn: 'create_gift_card_record',
                                note: 'Mints a GiftCardRecord with an encrypted private key. No on-chain mapping is written — gift card state is fully private.',
                            },
                        ].map(({ fn, note }) => (
                            <div key={fn} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                                <code className="mb-2 block text-xs font-bold text-blue-300">{fn}</code>
                                <p className="text-xs leading-relaxed text-gray-400">{note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Download className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Recovery flow — how the backup works</h3>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The backup system stores an encrypted private key as a private <code className="rounded bg-white/5 px-1.5 py-0.5">BurnerWalletRecord</code> on the Aleo network. Because it is a private record, only the owner (the main wallet address) can scan the Aleo blockchain to find it. Recovery involves:
                </p>
                <div className="grid gap-3 md:grid-cols-4">
                    {[
                        { step: '01', desc: 'Scan Aleo for BurnerWalletRecord owned by main address' },
                        { step: '02', desc: 'Decrypt the password_part with a local passphrase to recover the encryption key' },
                        { step: '03', desc: 'Use the encryption key to decrypt pk_part_1 through pk_part_10' },
                        { step: '04', desc: 'Reconstruct and import the burner private key into the wallet' },
                    ].map(({ step, desc }) => (
                        <div key={step} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <span className="mb-2 block font-mono text-[11px] font-black text-gray-600">{step}</span>
                            <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    ),
};
