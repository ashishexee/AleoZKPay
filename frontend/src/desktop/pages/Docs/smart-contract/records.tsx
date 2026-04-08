import { ScrollText, Shield, Sparkles, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard } from '../ui';

export const recordsSection: DocsSection = {
    id: 'sc-records',
    group: 'Contract Layout',
    label: 'Records',
    eyebrow: 'Smart Contract',
    title: 'Records defined in the Leo contract',
    summary:
        'The protocol now splits core payment records from wallet artifacts. Core owns invoices and receipts, while the wallets program owns burner, card, and gift-card records.',
    content: (
        <div className="grid gap-5 md:grid-cols-2">
            <MetricCard
                icon={ScrollText}
                title="Invoice"
                description="Private record containing merchant owner, invoice hash, amount, token type, invoice type, salt, memo, and wallet type."
            />
            <MetricCard
                icon={Shield}
                title="PayerReceipt"
                description="Private receipt for the payer with merchant address, receipt hash, invoice hash, amount, token type, and timestamp placeholder."
            />
            <MetricCard
                icon={Wallet}
                title="MerchantReceipt"
                description="Companion receipt for the merchant keyed by the same receipt hash so both sides can reconcile the same payment."
            />
            <MetricCard
                icon={Sparkles}
                title="BurnerWalletRecord"
                description="Lives in the wallets program and supports password backup plus burner wallet recovery by storing encrypted wallet fragments in separate fields."
            />
            <MetricCard
                icon={Wallet}
                title="CardProfileRecord"
                description="Lives in the wallets program and stores encrypted card profile material, label, hint, and card-number hash for the card subsystem."
            />
            <MetricCard
                icon={Sparkles}
                title="GiftCardRecord"
                description="Lives in the wallets program and stores a generated gift card address plus the encrypted private key material for later redemption flows."
            />
        </div>
    ),
};
