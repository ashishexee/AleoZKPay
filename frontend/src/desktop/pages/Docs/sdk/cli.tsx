import { Sparkles, Terminal, Shield, Zap, Info } from 'lucide-react';
import type { DocsSection } from '../types';
import { installCliCommand } from '../examples';
import { CodeBlock, MetricCard, Callout } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const onboardWalkthrough = `/**
 * THE ONBOARDING PIPELINE
 * 
 * When you run 'npx @nullpay/cli onboard', the following happens:
 * 
 * 1. Project Discovery:
 *    The CLI checks for an existing nullpay.json. If found, it loads 
 *    existing invoices to prevent duplicate salt generation.
 * 
 * 2. Identity Verification:
 *    You are prompted for your merchant wallet address. This address 
 *    must match the one registered in your NullPay Dashboard.
 * 
 * 3. Invoice Definition:
 *    You define the name (e.g., 'pro-plan'), type, and amount.
 * 
 * 4. Sponsored On-Chain Creation:
 *    The CLI calls the NullPay Relayer. The relayer pays the Aleo gas 
 *    fees to execute the 'create_invoice' transition on the zk_pay contract.
 * 
 * 5. Mapping Resolution:
 *    The CLI waits (~60s) for the Aleo blockchain to confirm the transaction.
 *    It polls the 'salt_to_invoice' mapping until your unique salt 
 *    resolves to a valid BHP256 hash.
 * 
 * 6. Manifest Generation:
 *    A local 'nullpay.json' is written/updated with the new metadata.
 */`;

const cliBenefits = [
    {
        icon: Sparkles,
        title: "Deterministic Salts",
        description: "The CLI handles the math of generating unique 128-bit field elements for your invoice salts.",
        color: "text-emerald-400"
    },
    {
        icon: Shield,
        title: "On-Chain Validation",
        description: "Every invoice in your manifest is pre-verified against the Aleo network before it is written to disk.",
        color: "text-blue-400"
    },
    {
        icon: Zap,
        title: "Relayer Integration",
        description: "The CLI leverages the NullPay Relayer infrastructure, so you never need to pay for setup fees.",
        color: "text-orange-400"
    }
];

export const cliSection: DocsSection = {
    id: 'sdk-cli',
    group: 'Packages',
    label: 'CLI',
    eyebrow: 'SDK',
    title: 'Command Line Interface — The Onboarding Wizard',
    summary:
        'The @nullpay/cli is your gateway to a seamless developer experience. It automates the complex cryptographic setup required to bridge your local environment with the Aleo blockchain.',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-bold text-white">Quick Start</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Run the onboarding wizard in your project root. This command is non-destructive and will update your <code className="text-white/80">nullpay.json</code> if it already exists.
                </p>
                <CodeBlock title="Developer Onboarding" language="bash" code={installCliCommand} />
            </GlassCard>

            <div className="grid gap-5 md:grid-cols-3">
                {cliBenefits.map((b) => (
                    <MetricCard
                        key={b.title}
                        icon={b.icon}
                        title={b.title}
                        description={b.description}
                    />
                ))}
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Onboarding Lifecycle</h3>
                <p className="mb-4 text-sm text-gray-400">
                    The CLI doesn't just write a file; it performs a multi-stage cryptographic handshake with the Relayer and the Aleo network.
                </p>
                <CodeBlock title="Technical Execution Flow" language="js" code={onboardWalkthrough} />
            </GlassCard>

            <GlassCard className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/20 p-2">
                        <Info className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white">Why use the CLI?</h4>
                        <p className="mt-1 text-sm text-gray-400 leading-relaxed">
                            Generating BHP256 hashes and managing field-element salts manually is error-prone. The CLI ensures that your <code className="text-white/80">nullpay.json</code> is always in sync with the actual state of the <code className="text-blue-400">zk_pay</code> smart contract. This eliminates "Invoice Not Found" errors during checkout.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Team Collaboration" tone="blue">
                The <code className="text-blue-200">nullpay.json</code> file generated by the CLI contains NO secrets. It is safe to commit to version control (Git). This allows your team members to use the same invoice definitions without re-running the onboarding wizard.
            </Callout>
        </div>
    ),
};
