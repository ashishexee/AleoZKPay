import { Package, Rocket, Search, Settings2 } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { installCliCommand, nullpayJsonExample } from '../examples';

const cliWizardStepsExample = `// The CLI wizard prompts you for the following, step by step:
//
// 1. "Enter your Aleo private key"
//    → Used to sign the on-chain invoice creation transactions.
//    → Never stored permanently by the CLI.
//
// 2. "Enter your merchant secret key (sk_...)"
//    → The NullPay backend API key from your merchant registration.
//
// 3. "How many invoices do you want to create?"
//    → For each invoice, the wizard asks:
//        - Invoice name         (must be unique, URL-safe)
//        - Invoice type         (standard | multipay | donation)
//        - Amount               (number, or blank for donation)
//        - Currency             (CREDITS | USDCX | USAD | ANY)
//        - Label                (optional human-readable description)
//
// 4. The CLI generates a unique salt per invoice, computes the BHP256 hash,
//    submits the create_invoice transaction to the Aleo testnet via the
//    NullPay relayer, and waits for confirmation.
//
// 5. On success, writes nullpay.json to your project root.`;

const nullpayJsonUsageExample = `// After CLI onboarding, your backend can reference invoices by name
// instead of carrying every invoice field in code.

const nullpay = new NullPay({
  secretKey: process.env.NULLPAY_SECRET_KEY,
  projectRoot: __dirname,
  configPath: path.join(__dirname, 'nullpay.json'), // ← CLI output
});

// Creating a session by invoice name
const session = await nullpay.checkout.sessions.create({
  nullpay_invoice_name: 'pro-plan',
  success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url:  'https://yourapp.com/cancel',
});

// Iterating over all CLI-generated invoices (for dynamic route setup)
for (const invoice of nullpay.invoices.getAll()) {
  app.post(\`/api/checkout/\${invoice.name}\`, async (req, res) => {
    const session = await nullpay.checkout.sessions.create({
      nullpay_invoice_name: invoice.name,
      success_url: \`https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}&type=\${invoice.type}\`,
      cancel_url:  'https://yourapp.com/cancel',
    });
    res.json({ checkoutUrl: session.checkout_url });
  });
}`;

const relayerNoteExample = `// The NullPay Relayer is an intermediary that submits
// your on-chain invoice creation transaction on your behalf.
//
// Why it exists:
//   - Creating an invoice on Aleo requires a zero-knowledge proof
//   - Generating this proof client-side for CLI onboarding
//     would require a local Aleo prover (large, slow)
//   - The relayer handles proving and submission for you
//
// What the relayer does NOT have access to:
//   - Your main wallet private key
//   - Your payment records or settlement outputs
//   - Future payment transactions (those go directly on-chain)
//
// Relayer is only used during: CLI onboarding (invoice creation)`;

export const cliOnboardingSection: DocsSection = {
    id: 'gs-cli-onboarding',
    group: 'Setup & Tooling',
    label: 'CLI Onboarding',
    eyebrow: 'Setup & Tooling',
    title: 'CLI onboarding and nullpay.json',
    summary:
        'The NullPay CLI removes the complexity of manual salt generation, BHP256 hash derivation, and on-chain transaction submission for invoice setup. One interactive wizard run writes a nullpay.json manifest your backend SDK can use directly by invoice name.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Rocket}
                    title="1. Run the wizard"
                    description="Execute the CLI from the root of your backend Node project. The wizard collects all invoice metadata interactively."
                />
                <MetricCard
                    icon={Settings2}
                    title="2. CLI generates salts"
                    description="A cryptographically random salt is generated per invoice. These salts are embedded in nullpay.json and used to verify payments later."
                />
                <MetricCard
                    icon={Search}
                    title="3. Invoices go on-chain"
                    description="The CLI submits create_invoice (or its typed variants for USDCX, USAD, donation) to the Aleo network via the NullPay relayer."
                />
                <MetricCard
                    icon={Package}
                    title="4. nullpay.json is written"
                    description="The confirmed hash and salt for each invoice are saved locally. Your backend SDK reads this file automatically when nullpay_invoice_name is passed to sessions.create()."
                />
            </div>

            <CodeBlock title="Run CLI onboarding" language="bash" code={installCliCommand} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">What the wizard asks</h3>
                <CodeBlock title="CLI wizard walkthrough" language="text" code={cliWizardStepsExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Understanding nullpay.json</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">nullpay.json</code> file is your merchant's invoice manifest. It is a plain JSON file you should commit to source control (it contains no secrets — only hashes and salts, which are public-facing).
                </p>
                <div className="grid gap-4 md:grid-cols-2 mb-5">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Safe to commit</p>
                        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">merchant</code> address</li>
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">hash</code> and <code className="rounded bg-white/5 px-1 py-0.5">salt</code> per invoice</li>
                            <li>• Invoice name, type, amount, currency</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                        <p className="mb-1 text-sm font-bold text-orange-300">Never commit</p>
                        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• <code className="rounded bg-white/5 px-1 py-0.5">NULLPAY_SECRET_KEY</code> (env variable)</li>
                            <li>• Your Aleo private key</li>
                            <li>• Any webhook signing secrets</li>
                        </ul>
                    </div>
                </div>
                <CodeBlock title="nullpay.json structure" language="json" code={nullpayJsonExample} />
            </GlassCard>

            <CodeBlock title="Using nullpay.json in your backend" language="js" code={nullpayJsonUsageExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The NullPay Relayer</h3>
                <CodeBlock title="How the relayer works" language="text" code={relayerNoteExample} />
            </GlassCard>

            <Callout title="When to skip nullpay.json" tone="blue">
                If your checkout amounts are dynamic — for example, a shopping cart with variable totals — skip the CLI entirely and pass <code className="rounded bg-white/10 px-1.5 py-0.5">amount</code>, <code className="rounded bg-white/10 px-1.5 py-0.5">currency</code> directly to <code className="rounded bg-white/10 px-1.5 py-0.5">sessions.create()</code>. The CLI is most useful when you have reusable, named invoices like subscription plans or campaigns.
            </Callout>

            <Callout title="Serverless and Vercel deployments" tone="emerald">
                If your backend runs on a serverless platform like Vercel, pass <code className="rounded bg-white/10 px-1.5 py-0.5">projectRoot: __dirname</code> and an absolute <code className="rounded bg-white/10 px-1.5 py-0.5">configPath</code> to the NullPay constructor. Otherwise the SDK may resolve <code className="rounded bg-white/10 px-1.5 py-0.5">nullpay.json</code> relative to the build output directory rather than your source root.
            </Callout>
        </div>
    ),
};
