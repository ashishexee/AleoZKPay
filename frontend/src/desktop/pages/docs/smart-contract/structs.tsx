import { Database, Hash, Layers, List, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceDataStructExample = `/**
 * ON-CHAIN STATE: struct InvoiceData
 * Total Size: ~128 bits
 * 
 * This struct represents the public visibility of a payment 
 * request on the Aleo ledger. It contains the metadata 
 * required for the finalizer to accept or reject a payment.
 */

struct InvoiceData {
    expiry_height: u32,    // Chain height sentinel
    status:        u8,     // Lifecycle: Open(0) | Settled(1)
    invoice_type:  u8,     // Logic: Standard(0) | Multi(1) | Donation(2)
    token_type:    u8,     // Currency: Credits(0) | USDCx(1) | USAD(2) | ANY(3)
    wallet_type:   u8      // Context: Main(0) | Burner(1)
}`;

const cardLookupStructExample = `/**
 * WALLET DIRECTORY: struct CardLookupData
 * 
 * Minimal public mapping for gift cards. It stores only 
 * enough information to verify the owner—keeping the 
 * card details themselves in private records.
 */

struct CardLookupData {
    main_owner:      address, // Creator of the profile
    card_status:     u8,      // Active(0) | Inactive(1)
    profile_version: u8       // Upgradability marker
}`;

export const structsSection: DocsSection = {
    id: 'sc-structs',
    group: 'Contract Architecture',
    label: 'Structs',
    eyebrow: 'Smart Contract',
    title: 'Structs — Data Schemas & State Shapes',
    summary:
        'Structs define the standard data formats for all public state transitions in NullPay. They ensure that data is packed efficiently into Aleo field elements while remaining human-readable for developers.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Layers}
                    title="Fixed Layout"
                    description="Consistent memory layout ensures that mapping lookups are deterministic across all contract versions."
                />
                <MetricCard
                    icon={List}
                    title="Enum Packing"
                    description="We use u8 fields to represent enums, packing multiple protocol flags into minimal bitspace."
                />
                <MetricCard
                    icon={Shield}
                    title="Validation Hint"
                    description="Structs provide the 'hints' required by the finalizer to enforce business logic boundaries."
                />
                <MetricCard
                    icon={Database}
                    title="Durable State"
                    description="Once written to a mapping, these structs form the immutable history of the NullPay registry."
                />
            </div>

            <GlassCard className="overflow-hidden p-0 border-orange-500/20">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Definition: InvoiceData</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The <code className="text-white/80">InvoiceData</code> struct is the bridge between the ZK transition and the on-chain ledger. It allows the protocol to "remember" the rules of a payout without exposing the merchant address.
                    </p>
                    <CodeBlock title="Invoice State Schema" language="leo" code={invoiceDataStructExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The "Status" State Machine</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <h4 className="text-sm font-bold text-orange-300 mb-2">0u8 → OPEN</h4>
                        <p className="text-xs text-gray-400">The invoice is active. The finalizer will accept any payment that matches the committed hash and salt.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <h4 className="text-sm font-bold text-emerald-300 mb-2">1u8 → SETTLED</h4>
                        <p className="text-xs text-gray-400">The invoice is finalized. Any future attempts to pay this hash will be rejected by the contract to prevent double-charging.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0 border-blue-500/20">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Definition: CardLookupData</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        Used exclusively in the <code className="text-white/80">zk_pay_proofs_privacy_wallet_v3.aleo</code> program to manage gift card and burner wallet permissions.
                    </p>
                    <CodeBlock title="Wallet Registry Schema" language="leo" code={cardLookupStructExample} />
                </div>
            </GlassCard>

            <Callout title="A Note on Numeric Precision" tone="blue">
                In Aleo, structs are public. NullPay never stores raw <code className="text-white/80">u128</code> values (used for stablecoin amounts) inside these structs to prevent price exposure. We store only the <b>Commitment</b> (Hash) and the <b>Control Flags</b>. The actual amounts are strictly kept in private records or re-derived on-the-fly during payment verification.
            </Callout>
        </div>
    ),
};
