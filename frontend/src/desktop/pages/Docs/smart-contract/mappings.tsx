import { Database } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoicesMappingExample = `// Core contract mapping #1
// Key: invoice_hash (a field element — the BHP256 sum)
// Value: InvoiceData struct (fully public on-chain)

mapping invoices: field => InvoiceData;

// Written by: create_invoice, create_invoice_usdcx,
//             create_invoice_usad, create_invoice_any
//   → invoices.set(invoice_hash, invoice_data)
//
// Read by: pay_invoice, pay_invoice_usdcx, pay_invoice_usad,
//          pay_donation, pay_donation_usdcx, pay_donation_usad,
//          settle_invoice, get_invoice_status
//   → let invoice_data: InvoiceData = invoices.get(stored_hash);
//
// Updated by: pay_invoice (for Standard type only, status 0→1)
//             pay_invoice_usdcx (same)
//             pay_invoice_usad (same)
//             settle_invoice (forces status 1 regardless of type)
//
// NOTE: All reads and writes happen inside 'final' blocks.
// Transitions cannot read mappings — only finalize/async can.`;

const saltToInvoiceMappingExample = `// Core contract mapping #2
// Key: salt (the raw random field used when creating the invoice)
// Value: invoice_hash (a field element — the BHP256 sum)

mapping salt_to_invoice: field => field;

// Written by: create_invoice, create_invoice_usdcx,
//             create_invoice_usad, create_invoice_any
//   → salt_to_invoice.set(salt, invoice_hash)
//
// Read by: ALL 6 pay_* functions and settle_invoice
//   → let stored_hash: field = salt_to_invoice.get(salt);
//
// Purpose:
//   Payment transitions receive 'salt' as a private parameter but need
//   to verify the invoice hash against what was stored on-chain.
//   The mapping bridges: salt → stored invoice_hash
//
//   The transition recomputes:
//     let invoice_hash = hash(merchant) + hash(amount) + hash(salt);
//   Then asserts:
//     assert_eq(invoice_hash, stored_hash);
//
//   This proves the payer knows the correct combination of merchant,
//   amount, and salt — the zero-knowledge payment validation.`;

const cardLookupMappingExample = `// Wallet program mapping
// Key: card_number_hash (BHP256 hash of card material)
// Value: CardLookupData struct (public)

mapping card_lookup: field => CardLookupData;

// Written by: create_card_profile
//   → card_lookup.set(card_number_hash, lookup_data)
//     where lookup_data = { main_owner: caller, card_status: 0u8, profile_version }
//
// Read + Updated by: set_card_status
//   → let current_lookup: CardLookupData = card_lookup.get(card_number_hash);
//     assert_eq(caller, current_lookup.main_owner);  // ownership check
//   → card_lookup.set(card_number_hash, updated_lookup);
//
// NOTE: card_status validation inside set_card_status:
//   if next_status != 0u8 {
//       assert_eq(next_status, 1u8);  // only 0 or 1 are valid
//   }`;

const finalBlockPatternExample = `// All mapping operations in NullPay happen inside 'final' blocks.
// This is an Aleo/Leo architectural requirement.
//
// 'final' blocks (also called async finalizers) run AFTER the ZK proof
// is verified and the transition output records are committed.
// They have access to:
//   - block.height  (current chain height)
//   - mapping reads (invoices.get, salt_to_invoice.get, card_lookup.get)
//   - mapping writes (invoices.set, card_lookup.set)
//
// Example from create_invoice:
fn create_invoice(...) -> (Invoice, public field, Final) {
    // ZK transition body: computes the hash, creates the record
    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
    let invoice_record: Invoice = Invoice { ... };
    
    return (
        invoice_record,
        invoice_hash,
        final {
            // On-chain finalize: writes mapping state
            let expiry_height: u32 = expiry_hours != 0u32 
                ? block.height + (expiry_hours * 360u32) 
                : 0u32;
            invoices.set(invoice_hash, invoice_data);
            salt_to_invoice.set(salt, invoice_hash);
        }
    );
}`;

export const mappingsSection: DocsSection = {
    id: 'sc-mappings',
    group: 'Contract Layout',
    label: 'Mappings',
    eyebrow: 'Smart Contract',
    title: 'Mappings — on-chain public state',
    summary:
        'NullPay uses three mappings across its two programs: invoices and salt_to_invoice in the core program, and card_lookup in the wallet program. All mapping reads and writes happen exclusively inside "final" (async finalizer) blocks — not in the ZK transition body itself.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { program: 'v26 — Core', name: 'invoices', key: 'field', val: 'InvoiceData', color: 'text-orange-300' },
                    { program: 'v26 — Core', name: 'salt_to_invoice', key: 'field', val: 'field', color: 'text-orange-300' },
                    { program: 'v1 — Wallet', name: 'card_lookup', key: 'field', val: 'CardLookupData', color: 'text-blue-300' },
                ].map(({ program, name, key, val, color }) => (
                    <div key={name} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className={`mb-2 text-[10px] font-black uppercase tracking-widest ${color}`}>{program}</p>
                        <code className="mb-1 block text-sm font-bold text-white">{name}</code>
                        <p className="text-xs text-gray-400"><span className="text-orange-300">{key}</span> → <span className="text-emerald-300">{val}</span></p>
                    </div>
                ))}
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v26.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">mapping invoices</h3>
                    <p className="mt-1 text-sm text-gray-400">The primary invoice state store. Public — anyone with the invoice hash can read the full <code className="rounded bg-white/5 px-1.5 py-0.5">InvoiceData</code>.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="invoices: field => InvoiceData" language="leo" code={invoicesMappingExample} />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">Status mutation behaviour</p>
                            <p className="text-xs leading-relaxed text-gray-400">
                                Standard invoices (<code className="rounded bg-white/5 px-1 py-0.5">invoice_type == 0u8</code>) have their <code className="rounded bg-white/5 px-1 py-0.5">status</code> flipped from <code className="rounded bg-white/5 px-1 py-0.5">0u8</code> to <code className="rounded bg-white/5 px-1 py-0.5">1u8</code> inside the pay_invoice finalizer. Multi-pay (<code className="rounded bg-white/5 px-1 py-0.5">1u8</code>) and donation (<code className="rounded bg-white/5 px-1 py-0.5">2u8</code>) invoices are never set to settled — they remain open and can receive repeated payments.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">settle_invoice override</p>
                            <p className="text-xs leading-relaxed text-gray-400">
                                The <code className="rounded bg-white/5 px-1 py-0.5">settle_invoice</code> transition allows the merchant to manually flip <code className="rounded bg-white/5 px-1 py-0.5">status</code> to <code className="rounded bg-white/5 px-1 py-0.5">1u8</code> for any invoice type — bypassing the payment transition. This is a merchant-only operation — the finalizer asserts the recomputed hash matches the stored one, proving <code className="rounded bg-white/5 px-1 py-0.5">self.caller</code> knows the salt and amount.
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v26.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">mapping salt_to_invoice</h3>
                    <p className="mt-1 text-sm text-gray-400">The salt→hash bridge. Enables payment validation without exposing the hash directly in the transaction inputs.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="salt_to_invoice: field => field" language="leo" code={saltToInvoiceMappingExample} />
                    <Callout title="Why this mapping is the core security primitive" tone="orange">
                        The <code className="rounded bg-white/10 px-1.5 py-0.5">salt_to_invoice</code> mapping is what allows NullPay's payment proofs to be sound. Because the payer passes <code className="rounded bg-white/10 px-1.5 py-0.5">salt</code> as a private input, and the finalizer independently fetches the on-chain <code className="rounded bg-white/10 px-1.5 py-0.5">invoice_hash</code> from this mapping and asserts equality with the recomputed hash, the proof guarantees the payer knows the exact (merchant, amount, salt) triple — without revealing any of them publicly.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">zk_pay_proofs_privacy_wallet_v1.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">mapping card_lookup</h3>
                    <p className="mt-1 text-sm text-gray-400">Minimal public state for the gift card system. Keyed by a BHP256 hash of card material, not the card number itself.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="card_lookup: field => CardLookupData" language="leo" code={cardLookupMappingExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The finalizer pattern</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Understanding Aleo's <code className="rounded bg-white/5 px-1.5 py-0.5">final</code> block pattern is critical for reading any NullPay contract logic correctly. All mapping state — reads and writes — happen asynchronously after the ZK proof is verified.
                </p>
                <CodeBlock title="final block pattern" language="leo" code={finalBlockPatternExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">Available inside transitions</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                            <li>• Private inputs/outputs</li>
                            <li>• Record field access</li>
                            <li>• BHP256 hash computations</li>
                            <li>• Arithmetic and assertions</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-300">Available only inside final blocks</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">block.height</code> access</li>
                            <li>• Mapping reads (<code className="rounded bg-white/5 px-1 py-0.5">.get()</code>)</li>
                            <li>• Mapping writes (<code className="rounded bg-white/5 px-1 py-0.5">.set()</code>)</li>
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">assert_eq()</code> on mapping results</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
