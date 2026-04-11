import { Database, Hash, Key, User, Shield, Lock } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceRecordExample = `/**
 * MERCHANT RECORD: record Invoice
 * 
 * This record is generated upon invoice creation. It is private 
 * and owned by the MERCHANT. It serves as the local proof of 
 * a valid payment request.
 */

record Invoice {
    owner:        address,  // The Merchant
    invoice_hash: field,    // The public commitment
    amount:       u64,      // The target price
    token_type:   u8,       // Currency ID
    invoice_type: u8,       // Context ID
    salt:         field,    // Hash entropy
    memo:         field,    // Merchant description
    wallet_type:  u8        // Receipt destination contextual identifier
}

/**
 * LIFECYCLE:
 * 1. MINTED: When npx @nullpay/cli onboard is run.
 * 2. HELD: Stored in the merchant's private record store.
 * 3. NEVER CONSUMED: Unlike payment records, this is purely 
 *    informational and acts as an "On-Chain SKU".
 */`;

const receiptRecordExample = `/**
 * TRANSACTION PROOF: record PayerReceipt
 * 
 * Generated during the pay_invoice transition. 
 * Owned by the PAYER. This is the only on-chain proof 
 * that the payer fulfilled their obligation.
 */

record PayerReceipt {
    owner:        address,  // The Buyer (or Burner)
    merchant:     address,  // The Destination
    receipt_hash: field,    // Linking commitment
    invoice_hash: field,    // Link to the product
    amount:       u64,      // Final paid amount
    token_type:   u8,       // Currency used
    payer_note:   field,    // Private buyer memo
    timestamp:    u64       // Zero (Place-holder)
}`;

export const recordsSection: DocsSection = {
    id: 'sc-records',
    group: 'Contract Architecture',
    label: 'Records',
    eyebrow: 'Smart Contract',
    title: 'Records — Private On-Chain Objects',
    summary:
        'Records are the fundamental unit of private state in Aleo. In NullPay, records are used to store invoices, payment receipts, and encrypted wallet backups with absolute privacy.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Shield}
                    title="Owner Locked"
                    description="Records are encrypted for the owner's public key. No other user can see their contents."
                />
                <MetricCard
                    icon={Lock}
                    title="Spent State"
                    description="Records are consumed when used in a transition, preventing double-spending."
                />
                <MetricCard
                    icon={User}
                    title="Dual Party"
                    description="Transitions often consume one user's record and output a record for another user."
                />
                <MetricCard
                    icon={Hash}
                    title="Commitment"
                    description="Every record's serial number is a cryptographic commitment to its data."
                />
            </div>

            <GlassCard className="overflow-hidden p-0 border-orange-500/20">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Type: record Invoice</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The <code className="text-white/80">Invoice</code> record is the merchant's receipt of their own created product. While the hash is public in the mapping, the record contains the <b>Salt</b> and <b>Memo</b> in a private format.
                    </p>
                    <CodeBlock title="Merchant-Owned Invoice Record" language="leo" code={invoiceRecordExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0 border-blue-500/20">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Type: record PayerReceipt</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The <code className="text-white/80">PayerReceipt</code> is a cryptographically signed proof of payment. It allows the buyer to prove to a third party (or the merchant during a dispute) that they sent the funds without exposing their entire wallet history.
                    </p>
                    <CodeBlock title="Buyer-Owned Payment Receipt" language="leo" code={receiptRecordExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Record Sharding: The Burner Strategy</h3>
                <p className="mb-4 text-sm text-gray-400 leading-relaxed">
                    A unique challenge in ZK contracts is storing large data (like a 256-bit private key) inside 254-bit field elements. NullPay solves this by <b>sharding</b> data across multiple fields within a single record.
                </p>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Encrypted Key Size</span>
                            <span className="text-xs font-mono text-white">~2560 bits</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                            <div className="h-full w-full bg-gradient-to-r from-blue-500 to-emerald-500" />
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-3 rounded-sm bg-blue-500/20 border border-blue-500/40" />
                            ))}
                        </div>
                        <p className="text-[10px] text-center text-gray-600 uppercase tracking-widest">pk_part_1 ... pk_part_10</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Owner-Only Access" tone="blue">
                Even our administrators and relayers CANNOT read the contents of your <code className="text-white/80">Invoice</code> or <code className="text-white/80">Receipt</code> records. They are encrypted at the protocol level using Aleo's ECIES primitive, ensuring that your business sales data remains strictly between you and your customers.
            </Callout>
        </div>
    ),
};
