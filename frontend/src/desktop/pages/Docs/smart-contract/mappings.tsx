import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const mappingsSection: DocsSection = {
    id: 'sc-mappings',
    group: 'Contract Layout',
    label: 'Mappings',
    eyebrow: 'Smart Contract',
    title: 'Mappings and what they index',
    summary:
        'The contract keeps public lookups intentionally small. They exist to validate invoice state, connect salts to hashes, and support card status lookups without publishing the entire payment relationship.',
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
                <h3 className="mb-2 text-xl font-bold text-white">card_lookup: field =&gt; CardLookupData</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Stores the card status and encrypted key metadata keyed by card number hash so the card profile and status
                    flow can be resolved on-chain.
                </p>
            </GlassCard>
        </div>
    ),
};
