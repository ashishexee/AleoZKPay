import { Database, Hash, Key } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceRecordExample = `// Private record. Owner = Merchant.
// Created by: create_invoice, create_invoice_usdcx, 
//             create_invoice_usad, create_invoice_any

record Invoice {
    owner:        address,  // Always the merchant's Aleo address
    invoice_hash: field,    // BHP256 sum: hash(merchant) + hash(amount) + hash(salt)
    amount:       u64,      // Invoice amount (cast from u128 for stablecoin variants)
    token_type:   u8,       // 0=Credits, 1=USDCx, 2=USAD, 3=ANY
    invoice_type: u8,       // 0=Standard, 1=Multi Pay, 2=Donation (not 'any' here)
    salt:         field,    // Used to recompute hash during payment validation
    memo:         field,    // Encoded memo (BHP256 packed, max ~31 chars)
    wallet_type:  u8        // 0=Main Wallet, 1=Burner Wallet
}

// Important: 'amount' uses u64 even for USDCx/USAD which accept u128.
// The Leo contract casts: let amount_u64: u64 = amount as u64;
// This works because typical stablecoin amounts (e.g., 50 USDCx with 6 decimals
// = 50_000_000 units) fit well within u64's max (~1.8e19).`;

const payerReceiptExample = `// Private record. Owner = Payer.
// Created by: pay_invoice, pay_invoice_usdcx, pay_invoice_usad,
//             pay_donation, pay_donation_usdcx, pay_donation_usad

record PayerReceipt {
    owner:        address,  // The payer's Aleo address (passed as payer_owner param)
    merchant:     address,  // The merchant's Aleo address
    receipt_hash: field,    // BHP256::commit_to_field(payment_secret, salt_scalar)
                            // For donation: BHP256::commit_to_field(
                            //     payment_secret + hash(amount) + hash(token), salt_scalar
                            // )
    invoice_hash: field,    // The invoice being paid
    amount:       u64,      // Actual amount paid (for donation = amount_to_donate)
    token_type:   u8,       // 0=Credits, 1=USDCx, 2=USAD
    payer_note:   field,    // Private payer note (max ~31 chars)
    timestamp:    u64       // Always 0u64 — block.timestamp not available in transitions
}`;

const merchantReceiptExample = `// Private record. Owner = Merchant.
// Created alongside PayerReceipt, same receipt_hash (payment link).
// Created by all 6 pay_* functions.

record MerchantReceipt {
    owner:         address,  // The merchant's Aleo address
    receipt_hash:  field,    // Same value as PayerReceipt.receipt_hash
                             // Both parties can independently reconstruct this
                             // by re-deriving the BHP256 commitment
    invoice_hash:  field,    // The invoice that was paid
    amount:        u64,      // Amount received
    token_type:    u8,       // 0=Credits, 1=USDCx, 2=USAD
    merchant_note: field     // Private merchant-side note (max ~31 chars)
}`;

const burnerWalletRecordExample = `// Private record. Owner = Main wallet caller.
// Stores the encrypted burner private key split into 10 field parts.
// Created by: backup_burner_wallet (or backup_password for password-only)

record BurnerWalletRecord {
    owner:          address,  // The main wallet address (self.caller)
    burner_address: address,  // The burner wallet's Aleo address
    password_part:  field,    // Encrypted password fragment
    pk_part_1:      field,    // \\ 
    pk_part_2:      field,    //  |
    pk_part_3:      field,    //  |
    pk_part_4:      field,    //  | Encrypted burner private key
    pk_part_5:      field,    //  | split across 10 field elements
    pk_part_6:      field,    //  | (AES-256 or equivalent encryption
    pk_part_7:      field,    //  | applied off-chain before submission)
    pk_part_8:      field,    //  |
    pk_part_9:      field,    //  |
    pk_part_10:     field     // /
}

// When backup_password is called for password-only backup:
// burner_address = self.caller (same as owner)
// pk_part_1..10 = all 0field (no burner key stored)`;

const cardAndGiftExample = `// Private records for the card and gift card system.
// Both live in zk_pay_proofs_privacy_wallet_v3.aleo.

record CardProfileRecord {
    owner:                  address,     // main wallet address
    card_number_hash:       field,       // BHP256 hash of card number material
    profile_version:        u8,          // version counter (incremented on upgrade)
    encrypted_card_number:  [field; 6],  // 6 field elements of encrypted card number
    encrypted_card_address: [field; 10], // 10 field elements of encrypted card address
    encrypted_label:        [field; 10], // 10 field elements of encrypted label
    encrypted_hint:         [field; 8]   // 8 field elements of encrypted hint
}

record GiftCardRecord {
    owner:            address,    // The main wallet address (creator/issuer)
    gift_card_address: address,   // The generated gift card Aleo address
    gift_private_key: [field; 8], // Encrypted gift card private key (8 fragments)
    label:            field       // A packed label (max ~31 chars, like a card name)
}`;

export const recordsSection: DocsSection = {
    id: 'sc-records',
    group: 'Contract Layout',
    label: 'Records',
    eyebrow: 'Smart Contract',
    title: 'Private records — full field reference',
    summary:
        'NullPay uses six private Leo records across its two programs. Records are zero-knowledge — only their owner can read them. This page documents every field in every record, its type, its source, and its meaning.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { prog: 'v26 (Core)', records: ['Invoice', 'PayerReceipt', 'MerchantReceipt'], color: 'text-orange-300' },
                    { prog: 'v1 (Wallet)', records: ['BurnerWalletRecord', 'CardProfileRecord', 'GiftCardRecord'], color: 'text-blue-300' },
                    { prog: 'Privacy model', records: ['All records are private', 'Only owner can read', 'Struct fields are public'], color: 'text-emerald-300' },
                ].map(({ prog, records, color }) => (
                    <div key={prog} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className={`mb-2 text-xs font-black uppercase tracking-widest ${color}`}>{prog}</p>
                        <ul className="space-y-1 text-xs text-gray-400">
                            {records.map(r => <li key={r}>• {r}</li>)}
                        </ul>
                    </div>
                ))}
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v27.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">record Invoice</h3>
                    <p className="mt-1 text-sm text-gray-400">Owner: Merchant. Contains the full invoice definition including the hash, salt, amount, and memo.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Invoice record" language="leo" code={invoiceRecordExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v27.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">record PayerReceipt</h3>
                    <p className="mt-1 text-sm text-gray-400">Owner: Payer. Cryptographic proof that the payer completed a payment. The receipt_hash uniquely identifies this payment event.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="PayerReceipt record" language="leo" code={payerReceiptExample} />
                    <Callout title="timestamp is always 0" tone="blue">
                        Aleo Leo transitions cannot access <code className="rounded bg-white/10 px-1.5 py-0.5">block.timestamp</code> — only <code className="rounded bg-white/10 px-1.5 py-0.5">block.height</code> (and only inside <code className="rounded bg-white/10 px-1.5 py-0.5">final</code> blocks). The <code className="rounded bg-white/10 px-1.5 py-0.5">timestamp</code> field is a placeholder that always stores <code className="rounded bg-white/10 px-1.5 py-0.5">0u64</code>.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">zk_pay_proofs_privacy_v27.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">record MerchantReceipt</h3>
                    <p className="mt-1 text-sm text-gray-400">Owner: Merchant. Companion to PayerReceipt. Shares the same receipt_hash, enabling both parties to independently verify the same payment.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="MerchantReceipt record" language="leo" code={merchantReceiptExample} />
                    <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Reconciliation via receipt_hash</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Both the payer and merchant receive a record with the same <code className="rounded bg-white/5 px-1 py-0.5">receipt_hash</code>. This hash is a BHP256 commitment of the <code className="rounded bg-white/5 px-1 py-0.5">payment_secret</code> and a scalar derived from the salt. Since neither party published the secret, the hash proves they share knowledge of the same payment event without revealing the secret itself.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">zk_pay_proofs_privacy_wallet_v3.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">record BurnerWalletRecord</h3>
                    <p className="mt-1 text-sm text-gray-400">Owner: Main wallet. Stores an encrypted burner private key split into 10 field elements for on-chain backup.</p>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="BurnerWalletRecord" language="leo" code={burnerWalletRecordExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">zk_pay_proofs_privacy_wallet_v3.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">record CardProfileRecord &amp; GiftCardRecord</h3>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="CardProfileRecord and GiftCardRecord" language="leo" code={cardAndGiftExample} />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">CardProfileRecord field arrays</p>
                            <p className="text-xs leading-relaxed text-gray-400">The encrypted fields use fixed-size arrays of <code className="rounded bg-white/5 px-1 py-0.5">field</code> elements. AES-256 or equivalent encryption is applied off-chain before the transaction is submitted. The contract stores raw field arrays — no on-chain decryption occurs.</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">GiftCardRecord key sharding</p>
                            <p className="text-xs leading-relaxed text-gray-400">A gift card's private key is split into <code className="rounded bg-white/5 px-1 py-0.5">[field; 8]</code> — 8 field elements. This allows a full Aleo private key (which is longer than a single field element) to be stored across multiple fields in a single record.</p>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
