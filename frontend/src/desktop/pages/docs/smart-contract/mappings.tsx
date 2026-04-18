import { Database, Shield, Zap, Search, Lock } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoicesMappingExample = `/**
 * CORE STATE: mapping invoices
 * Key: invoice_hash (BHP256 sum)
 * Value: InvoiceData Struct
 * 
 * This mapping is the source of truth for every payment request.
 * Even though the value is public, the 'salt' within the InvoiceData
 * is NOT stored here—it is only used to compute the key.
 */

mapping invoices: field => InvoiceData;

/**
 * Access Lifecycle:
 * 1. set() -> Called during invoice creation (sponsored by relayer).
 * 2. get() -> Called during payment to verify amount and merchant.
 * 3. set() -> Called after payment to mark standard invoices as 'Settled'.
 */`;

const saltToInvoiceMappingExample = `/**
 * PRIVACY BRIDGE: mapping salt_to_invoice
 * Key: salt (128-bit private field)
 * Value: invoice_hash (256-bit public field)
 * 
 * This mapping allows the buyer to prove they know a specific
 * 'salt' without revealing the product details (stored in 'invoices').
 */

mapping salt_to_invoice: field => field;

// Transition Logic (ZK Proof):
// The buyer provides 'salt' as a PRIVATE input.
// The contract recomputes the hash using the merchant and amount.
// Then, it looks up this mapping to ensure the resulting hash 
// matches the one the merchant committed to.`;

const securityDeepDiveExample = `/**
 * THE ZERO-KNOWLEDGE HANDSHAKE
 * 
 * By separating state into two mappings, NullPay achieves:
 * 1. Data Integrity: The merchant cannot change the price (invoices mapping).
 * 2. Buyer Privacy: Observers see a 'salt' lookup, but they don't know
 *    which 'invoice_hash' it corresponds to unless they already have the salt.
 * 
 * This prevents "Sales Scraping" where competitors could otherwise 
 * monitor a merchant's total volume by watching a single mapping.
 */`;

export const mappingsSection: DocsSection = {
    id: 'sc-mappings',
    group: 'Contract Architecture',
    label: 'Mappings',
    eyebrow: 'Smart Contract',
    title: 'Mappings — The On-Chain Ledger',
    summary:
        'Mappings represent the persistent, public state of the NullPay protocol. They act as the "Global Key-Value Store" where ZK-Proof commitments are recorded and verified by the Aleo network.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">Privacy Boundaries</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Aleo mappings are public. However, NullPay obfuscates the relationship between a payer and a product by using <b>Salted Hashes</b> as the primary keys. An external observer may see a change in mapping state, but cannot determine the merchant or amount without the corresponding private salt.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-bold text-white">Finalizer Performance</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        All mapping operations occur within <code className="text-white/80">final</code> blocks. These blocks execute asynchronously from the ZK circuit, ensuring that the heavy lifting of proof generation doesn't slow down the actual state commitment on the ledger.
                    </p>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Program: zk_pay.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">The Invoice Registry</h3>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The <code className="text-orange-300">invoices</code> mapping stores the static data for every payment request. This includes the <code className="text-white/80">merchant_address</code> and the <code className="text-white/80">amount_paid</code>.
                    </p>
                    <CodeBlock title="invoices: field => InvoiceData" language="leo" code={invoicesMappingExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-emerald-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Program: zk_pay.aleo</p>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">The Salt-to-Invoice Bridge</h3>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        This is the most critical mapping for privacy. It links a random 128-bit salt to a 256-bit BHP hash. The salt is passed privately during payment, ensuring the link is only discoverable by the payer and merchant.
                    </p>
                    <CodeBlock title="salt_to_invoice: field => field" language="leo" code={saltToInvoiceMappingExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Search className="h-5 w-5 text-purple-400" />
                    <h3 className="text-xl font-bold text-white">Security Deep-Dive</h3>
                </div>
                <CodeBlock title="Zero-Knowledge Handshake Logic" language="js" code={securityDeepDiveExample} />
                <div className="mt-6 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <p className="text-xs text-gray-400"><b>Immutability:</b> Mappings cannot be edited except by the program creator using strictly defined transitions.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <p className="text-xs text-gray-400"><b>Resolution:</b> The SDK polls these mappings to verify when a transition has reached "Final" state on the chain.</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Aleo Explorer Integration" tone="blue">
                You can manually inspect these mappings by searching for the <code className="text-blue-200">zk_pay.aleo</code> program on any Aleo block explorer. Look for the "Mappings" tab to see the live size and state updates of the protocol registry.
            </Callout>
        </div>
    ),
};
