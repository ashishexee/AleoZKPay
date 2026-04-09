import { Code2, GitBranch, Lock, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const programHeaderExample = `// ─── Core Payment Program ────────────────────────────────────────
import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_v26.aleo {
    @admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")
    constructor() { ... }

    // Structs:  InvoiceData
    // Records:  Invoice, PayerReceipt, MerchantReceipt
    // Mappings: invoices, salt_to_invoice
    // Functions: 12 total (4 creation + 6 payment + 2 settlement)
}

// ─── Wallet & Card Program ────────────────────────────────────────
import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_wallet_v3.aleo {
    @admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")
    constructor() { ... }

    // Structs:  CardLookupData
    // Records:  BurnerWalletRecord, CardProfileRecord, GiftCardRecord
    // Mappings: card_lookup
    // Functions: 5 total (backup x2, card profile x2, gift card x1)
}`;

const importedProgramsExample = `// Three external programs are imported by both contracts:

// 1. credits.aleo
//    The native Aleo Credits program.
//    Used for private Credits token transfers.
//    Transition: credits.aleo::transfer_private(record, recipient, amount)

// 2. test_usdcx_stablecoin.aleo
//    The USDCx stablecoin program on Aleo testnet.
//    Requires MerkleProof[2] array for compliance.
//    Transition: test_usdcx_stablecoin.aleo::transfer_private(recipient, amount, record, proofs)
//    Also emits: ComplianceRecord (returned alongside Token outputs)

// 3. test_usad_stablecoin.aleo
//    The USAD stablecoin program on Aleo testnet.
//    Mirrors USDCx — same signature pattern, separate program address.
//    Transition: test_usad_stablecoin.aleo::transfer_private(recipient, amount, record, proofs)`;

export const programOverviewSection: DocsSection = {
    id: 'sc-overview',
    group: 'Program Architecture',
    label: 'Program Overview',
    eyebrow: 'Smart Contract',
    title: 'Contract programs, imports, and admin',
    summary:
        'NullPay is deployed as two separate Leo programs on the Aleo network: the core payment program (v26) and the wallet/card helper program (v1). Both import the native Credits and two stablecoin programs for private token transfers.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={Code2}
                    title="zk_pay_proofs_privacy_v26"
                    description="The core payment program. Handles invoice creation, all payment transitions, settlement, and status reads."
                />
                <MetricCard
                    icon={Shield}
                    title="zk_pay_proofs_privacy_wallet_v3"
                    description="The wallet helper program. Handles burner wallet backup, password backup, card profiles, and gift card minting."
                />
                <MetricCard
                    icon={GitBranch}
                    title="3 imported programs"
                    description="credits.aleo, test_usdcx_stablecoin.aleo, test_usad_stablecoin.aleo — all called via cross-program invocation inside payment transitions."
                />
                <MetricCard
                    icon={Lock}
                    title="@admin constructor"
                    description="Both programs have an admin-gated constructor tied to the NullPay deployer address. Only this address can perform admin operations."
                />
            </div>

            <CodeBlock title="Program declarations and structure" language="leo" code={programHeaderExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Why two programs?</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The split between the core payment program and the wallet program is a deliberate architectural boundary:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <p className="text-sm font-bold text-white">Core program (<code className="text-orange-300 text-sm">v26</code>)</p>
                        <ul className="space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• Owns all invoice state (mappings)</li>
                            <li>• Handles money movement (cross-program calls to token programs)</li>
                            <li>• Emits payment receipts for both payer and merchant</li>
                            <li>• Contains the stateful settlement logic</li>
                        </ul>
                    </div>
                    <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
                        <p className="text-sm font-bold text-white">Wallet program (<code className="text-orange-300 text-sm">v1</code>)</p>
                        <ul className="space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• Owns identity and card lookup state</li>
                            <li>• Creates private records for wallet recovery</li>
                            <li>• Manages gift card minting and card profiles</li>
                            <li>• Deliberately isolated from payment logic</li>
                        </ul>
                    </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                    This separation means the wallet program can be upgraded, extended, or replaced without affecting the payment program's invariants — and vice versa.
                </p>
            </GlassCard>

            <CodeBlock title="Imported programs and their roles" language="text" code={importedProgramsExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Stablecoin transfer signature differences</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Credits and the stablecoin programs have different call signatures. The stablecoin programs require a <strong className="text-white">Merkle proof array</strong> (<code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">[MerkleProof; 2]</code>) for compliance verification, and they return a <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">ComplianceRecord</code> in addition to the two token outputs.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            prog: 'credits.aleo',
                            sig: 'transfer_private(record, recipient, amount)',
                            returns: '(credits, credits)',
                            note: 'Simple two-output split. No compliance record.',
                        },
                        {
                            prog: 'test_usdcx_stablecoin.aleo',
                            sig: 'transfer_private(recipient, amount, record, proofs)',
                            returns: '(ComplianceRecord, Token, Token, Final)',
                            note: 'Requires Merkle proofs. Emits ComplianceRecord.',
                        },
                        {
                            prog: 'test_usad_stablecoin.aleo',
                            sig: 'transfer_private(recipient, amount, record, proofs)',
                            returns: '(ComplianceRecord, Token, Token, Final)',
                            note: 'Identical pattern to USDCx. Separate program address.',
                        },
                    ].map(({ prog, sig, returns, note }) => (
                        <div key={prog} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <code className="mb-2 block text-xs font-bold text-orange-300">{prog}</code>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Signature</p>
                            <code className="mb-3 block text-[11px] text-gray-300 leading-relaxed">{sig}</code>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Returns</p>
                            <code className="mb-2 block text-[11px] text-emerald-300">{returns}</code>
                            <p className="text-xs text-gray-500">{note}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="Admin address" tone="orange">
                Both contracts are deployed with <code className="rounded bg-white/10 px-1.5 py-0.5">@admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")</code>. Admin operations require a transaction from this specific Aleo address. The Leo compiler generates the admin-gate guard automatically from the decorator.
            </Callout>
        </div>
    ),
};
