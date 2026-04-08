import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const mappingsSection: DocsSection = {
    id: 'sc-mappings',
    group: 'Contract Layout',
    label: 'Mappings',
    eyebrow: 'Smart Contract',
    title: 'Mappings and what they index',
    summary:
        'The core contract keeps only invoice mappings. Wallet-specific lookup state now lives in the wallets program so the invoice core stays leaner.',
    content: (
        <div className="space-y-5">
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">invoices: field =&gt; InvoiceData</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Main invoice status map. It stores expiry height, open or settled status, invoice type, token type, and
                    wallet type for a computed invoice hash.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">salt_to_invoice: field =&gt; field</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Bridges the generated salt to the invoice hash. Payment paths recompute the expected hash and assert that
                    the stored hash matches before allowing execution.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">wallets/card_lookup: field =&gt; CardLookupData</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    This mapping now lives in the wallets program. It keeps only minimal card lookup state keyed by card number
                    hash while sensitive recovery material stays off-chain in the encrypted card vault.
                </p>
            </GlassCard>
        </div>
    ),
};
