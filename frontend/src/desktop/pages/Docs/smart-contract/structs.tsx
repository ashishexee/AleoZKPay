import { Database, Hash } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceDataStructExample = `// The only struct in the core payment program.
// Stored publicly in the 'invoices' mapping on-chain.
// Everything inside it is readable by anyone with the invoice hash.

struct InvoiceData {
    expiry_height: u32,    // Aleo block height after which invoice is invalid
                           // (0 = no expiry)
    status:        u8,     // 0 = Open, 1 = Settled/Paid
    invoice_type:  u8,     // 0 = Standard, 1 = Multi Pay, 2 = Donation
    token_type:    u8,     // 0 = Credits, 1 = USDCx, 2 = USAD, 3 = ANY
    wallet_type:   u8      // 0 = Main Wallet, 1 = Burner Wallet
}`;

const cardLookupStructExample = `// Stored in the wallets program's 'card_lookup' mapping.
// Keyed by the card_number_hash (a BHP256 hash of card material).
// Only public state — the encrypted card data stays in the private record.

struct CardLookupData {
    main_owner:      address,  // The Aleo address that created the card profile
    card_status:     u8,       // 0 = Active, 1 = Inactive
    profile_version: u8        // Version counter for profile upgrades
}`;

const expiryLogicExample = `// Expiry height calculation inside create_invoice (and variants):
//
// expiry_hours is passed as a public parameter.
// 1 hour ≈ 360 Aleo blocks (based on ~10s block time).
//
// If expiry_hours == 0 → no expiry (expiry_height stored as 0u32)
// If expiry_hours != 0 → expiry_height = block.height + (expiry_hours * 360)
//
// During payment validation (in the 'final' block), the assertion is:
//   if invoice_data.expiry_height != 0u32 {
//       assert(block.height <= invoice_data.expiry_height);
//   }
//
// Note: block.height is only available inside 'final' (on-chain async) blocks,
// NOT inside the transition body itself. This is why the expiry check
// is deferred to the finalizer.

let blocks_to_add: u32 = expiry_hours * 360u32;
let expiry_height: u32 = expiry_hours != 0u32 
    ? block.height + blocks_to_add 
    : 0u32;`;

export const structsSection: DocsSection = {
    id: 'sc-structs',
    group: 'Contract Layout',
    label: 'Structs',
    eyebrow: 'Smart Contract',
    title: 'Structs — public on-chain state shapes',
    summary:
        'NullPay uses two structs across its two programs. InvoiceData is the public on-chain state for every invoice, stored in the invoices mapping. CardLookupData is the minimal public lookup state for the card system, stored in card_lookup. Everything sensitive stays in private records.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v26.aleo</p>
                    <h3 className="mt-1 text-xl font-bold text-white">struct InvoiceData</h3>
                    <p className="mt-1 text-sm text-gray-400">Public struct stored in the <code className="rounded bg-white/5 px-1.5 py-0.5">invoices</code> mapping, keyed by the invoice hash.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="InvoiceData definition" language="leo" code={invoiceDataStructExample} />
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                field: 'expiry_height: u32',
                                vals: '0 = no expiry',
                                desc: 'Aleo block height after which the payment transition\'s finalizer will reject with a block.height assertion. Computed as block.height + (hours × 360) at creation time.',
                            },
                            {
                                field: 'status: u8',
                                vals: '0 = Open\n1 = Settled',
                                desc: 'The settlement state. Standard invoices flip to 1 after the first successful pay_invoice call. Multi-pay and Donation invoices remain at 0 indefinitely — they accept repeated payments.',
                            },
                            {
                                field: 'invoice_type: u8',
                                vals: '0 = Standard\n1 = Multi Pay\n2 = Donation',
                                desc: 'Determines which payment transitions are valid. Donation-type invoices bypass standard amount validation. Multi-pay invoices are never marked settled.',
                            },
                            {
                                field: 'token_type: u8',
                                vals: '0 = Credits\n1 = USDCx\n2 = USAD\n3 = ANY',
                                desc: 'Controls which pay_* transition is allowed. Token type 3 (ANY) is only valid for Donation invoices and allows any token\'s payment path to succeed.',
                            },
                        ].map(({ field, vals, desc }) => (
                            <div key={field} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                                <code className="mb-2 block text-xs font-bold text-orange-300">{field}</code>
                                <pre className="mb-2 text-[10px] font-black text-emerald-300 leading-relaxed">{vals}</pre>
                                <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">zk_pay_proofs_privacy_wallet_v1.aleo</p>
                    <h3 className="mt-1 text-xl font-bold text-white">struct CardLookupData</h3>
                    <p className="mt-1 text-sm text-gray-400">Public struct stored in the <code className="rounded bg-white/5 px-1.5 py-0.5">card_lookup</code> mapping, keyed by the card_number_hash.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="CardLookupData definition" language="leo" code={cardLookupStructExample} />
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {[
                            {
                                field: 'main_owner: address',
                                desc: 'The Aleo address of the caller who created the card profile via create_card_profile. Used to authenticate set_card_status calls — only the owner can toggle card status.',
                            },
                            {
                                field: 'card_status: u8',
                                vals: '0 = Active\n1 = Inactive',
                                desc: 'Whether the gift card is currently active. Toggled by set_card_status. Only valid values are 0 and 1 — the contract asserts this.',
                            },
                            {
                                field: 'profile_version: u8',
                                desc: 'A version counter stored at profile creation time. Passes through from create_card_profile unchanged. Useful for future upgrade paths where the profile layout changes.',
                            },
                        ].map(({ field, vals, desc }) => (
                            <div key={field} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                                <code className="mb-2 block text-xs font-bold text-blue-300">{field}</code>
                                {vals && <pre className="mb-2 text-[10px] font-black text-emerald-300 leading-relaxed">{vals}</pre>}
                                <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Hash className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Expiry height — how it is computed</h3>
                </div>
                <CodeBlock title="Expiry logic (inside create_invoice)" language="leo" code={expiryLogicExample} />
                <Callout title="Why expiry uses block.height, not block.timestamp" tone="blue">
                    Aleo Leo contracts can only access <code className="rounded bg-white/10 px-1.5 py-0.5">block.height</code> inside <code className="rounded bg-white/10 px-1.5 py-0.5">final</code> blocks (async finalizers), not wall-clock time. The conversion uses a 1-hour ≈ 360 blocks approximation. Zero expiry_height means the invoice never expires.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Public vs. private data</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">
                    Structs are <strong className="text-white">always public on-chain</strong>. Anyone who knows the invoice hash can query the <code className="rounded bg-white/5 px-1.5 py-0.5">invoices</code> mapping and read the <code className="rounded bg-white/5 px-1.5 py-0.5">InvoiceData</code>. This is intentional — the on-chain status must be readable for settlement verification. Sensitive information (amounts, merchant address, notes) is stored in <strong className="text-white">private records</strong>, not structs.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-emerald-300">In the struct (public)</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                            <li>• Expiry block height (a future block number)</li>
                            <li>• Status (0 or 1)</li>
                            <li>• Invoice type (0, 1, or 2)</li>
                            <li>• Token type (0, 1, 2, or 3)</li>
                            <li>• Wallet type (0 or 1)</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-red-300">In records (private)</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                            <li>• Merchant's Aleo address</li>
                            <li>• Exact payment amount</li>
                            <li>• The invoice salt</li>
                            <li>• Payer and merchant notes</li>
                            <li>• The receipt hash (payment proof)</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
