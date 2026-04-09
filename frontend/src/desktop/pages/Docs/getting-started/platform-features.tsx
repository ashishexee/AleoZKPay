import { Activity, BarChart2, Hash, LayoutGrid } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const batchPayExample = `// BatchPay lets you send payments to multiple recipients
// in a structured list, each with their own amount and token.
//
// This is NOT an SDK feature — it is a UI flow in the NullPay platform.
// Merchants and users configure batch payments from the BatchPay page.
//
// What BatchPay supports:
//   - Multiple recipient addresses
//   - Per-recipient amounts
//   - Selectable token (CREDITS, USDCX, USAD)
//   - Sends each payment as a separate on-chain private transfer
//
// When to use BatchPay:
//   - Payroll or contractor disbursements
//   - Distributing contributions across multiple wallets
//   - Sending a fixed amount to a list of community members`;

const explorerExample = `// The NullPay Explorer (Transaction Explorer) lets you
// look up Aleo transactions by their on-chain transaction ID.
//
// Access: /explorer route on the platform
//
// What you can look up:
//   - Aleo transaction status (confirmed, pending, failed)
//   - The program and transition that was called
//   - The transaction fee
//   - Block height and timestamp
//
// Use case for merchants:
//   After a webhook fires with event.tx_id, you can paste that ID
//   into the Explorer to confirm it on the public Aleo ledger.`;

const giftCardExample = `// Gift Cards on NullPay are on-chain records created by
// the wallet program (zk_pay_proofs_privacy_wallet_v2.aleo).
//
// How gift cards work:
//   1. The merchant calls create_card_profile on-chain
//      to initialize their gift card program.
//   2. Gift card records are minted using create_gift_card_record.
//   3. Recipients can hold these records in their Aleo wallet.
//   4. Merchants can toggle card status (active/inactive) via set_card_status.
//
// Gift cards are private records — only the holder can prove
// ownership and redeem them. They appear in the "Gift Cards" UI
// section of the platform for management.`;

const profileQrExample = `// Profile QR is a permanent payment link tied to your wallet.
// Initializing it submits a create_invoice transaction on-chain.
//
// The resulting payment link has the format:
// https://nullpay.app/pay?merchant={address}&salt={salt}&hash={hash}
//
// This link can be:
//   - Shared as text
//   - Displayed as a scannable QR code
//   - Used in marketing materials, invoices, or receipts
//
// The Profile QR page (accessed from the nav) provides:
//   - A persistent, scannable QR for the main wallet
//   - A separate QR for the burner wallet (if it exists)
//   - A copy-link button for immediate sharing
//   - Status of QR initialization (pending on-chain confirmation)

// The QR quick access button in the nav header shows a popover
// for fast sharing without navigating away from the current page.`;

export const platformFeaturesSection: DocsSection = {
    id: 'gs-platform-features',
    group: 'Platform Features',
    label: 'Platform Overview',
    eyebrow: 'Platform Features',
    title: 'NullPay platform features beyond checkout',
    summary:
        'NullPay is more than a checkout SDK. The platform includes batch payment tooling, a transaction explorer, gift card infrastructure, Profile QR payment links, and realtime merchant dashboards — all built on the same private Aleo foundation.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={LayoutGrid}
                    title="BatchPay"
                    description="Send private payments to multiple recipients in a single UI-driven flow. Useful for payroll, disbursements, and community distributions."
                />
                <MetricCard
                    icon={Hash}
                    title="Transaction Explorer"
                    description="Look up any Aleo transaction by ID. Verify on-chain confirmations for settled payments without leaving the platform."
                />
                <MetricCard
                    icon={Activity}
                    title="Gift Cards"
                    description="Mint private on-chain gift card records through the wallet program. Recipients hold them in their Aleo wallet and can redeem them."
                />
                <MetricCard
                    icon={BarChart2}
                    title="Merchant Dashboard"
                    description="Analytics, payment history, and session status tracking. Monitor conversion rates and total volume directly from the developer section."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">BatchPay</h3>
                <CodeBlock title="BatchPay overview" language="text" code={batchPayExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Supported tokens</p>
                        <p className="text-xs leading-relaxed text-gray-400">CREDITS, USDCx, USAD. Each recipient payment uses the token's private transfer path.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Privacy model</p>
                        <p className="text-xs leading-relaxed text-gray-400">Each payment is a separate on-chain private transfer. Recipients see a deposit; sender amount patterns are not grouped publicly.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Access</p>
                        <p className="text-xs leading-relaxed text-gray-400">Available at the BatchPay page in the nav. Requires a connected Aleo wallet.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Transaction Explorer</h3>
                <CodeBlock title="Explorer use cases" language="text" code={explorerExample} />
                <Callout title="Use it for webhook verification" tone="blue">
                    When your webhook fires with <code className="rounded bg-white/10 px-1.5 py-0.5">event.tx_id</code>, paste that ID into the Explorer to manually verify the on-chain confirmation before fulfilling high-value orders.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Gift Cards</h3>
                <CodeBlock title="Gift card program overview" language="text" code={giftCardExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Wallet program functions used</p>
                        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">create_card_profile</code></li>
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">set_card_status</code></li>
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">create_gift_card_record</code></li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">UI management</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Created cards appear in the Gift Cards section of the platform. Status can be toggled from active to inactive without destroying the on-chain record.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Profile QR and payment links</h3>
                <CodeBlock title="Profile QR overview" language="text" code={profileQrExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-2 text-sm font-bold text-white">Quick access in the nav</p>
                    <p className="text-xs leading-relaxed text-gray-400">
                        The QR popover button in the main navigation shows a mini-panel with the scannable QR code and a Copy Link button. You can share your payment link without navigating to the full Profile QR page. Both the main and burner wallet QRs are accessible from the same popover, with a tab switcher on top.
                    </p>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Merchant Analytics</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The developer section of the platform includes a live analytics panel that shows:
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        { metric: 'Total Volume', desc: 'Sum of all SETTLED session amounts for your merchant address. Denominated in Credits.' },
                        { metric: 'Successful Sessions', desc: 'Count of checkout sessions that reached the SETTLED state. Tracked per merchant address.' },
                        { metric: 'Conversion Rate', desc: 'Ratio of SETTLED sessions to total sessions created. Key metric for checkout optimization.' },
                    ].map(({ metric, desc }) => (
                        <div key={metric} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <p className="mb-1 text-sm font-bold text-white">{metric}</p>
                            <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                    Analytics are fetched from the NullPay backend and are scoped to your connected main wallet address. Connect the Shield extension to view your merchant data.
                </p>
            </GlassCard>
        </div>
    ),
};
