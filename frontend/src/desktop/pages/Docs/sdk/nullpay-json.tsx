import { FileJson, Layers } from 'lucide-react';
import type { DocsSection } from '../types';
import { nullpayJsonExample } from '../examples';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const nullpayJsonStructureExample = `// Full nullpay.json structure with all fields documented

{
  // The merchant's Aleo address.
  // Set by the CLI when you first authenticate.
  // The SDK reads this to verify manifest ownership but does not validate it.
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",

  // ISO 8601 timestamp of when the CLI generated this file.
  // Informational — not used by the SDK at runtime.
  "generated_at": "2026-03-21T09:10:24.522Z",

  // Array of pre-generated invoices.
  // Each entry has a unique on-chain hash + salt pair.
  "invoices": [
    {
      // Developer-defined name — used in nullpay_invoice_name: "pro-plan"
      // Must be unique within this file. No spaces. Snake-case recommended.
      "name": "pro-plan",

      // Invoice type: "multipay" | "donation"
      // Standard invoices are NOT stored here (see notes below).
      "type": "multipay",

      // Fixed amount. null for donation (payer decides).
      // Denominated in the currency's standard unit (e.g., 50 = 50 USDCx)
      "amount": 50,

      // Token type: "CREDITS" | "USDCX" | "USAD" | "ANY"
      // "ANY" is only valid for donation type.
      "currency": "USDCX",

      // Optional display label. Shown in the hosted checkout UI.
      "label": "Pro Plan - Monthly",

      // BHP256 invoice hash. A field element as a decimal string + "field".
      // This is the primary identifier on the Aleo blockchain.
      "hash": "172487944975353648367817000692546933725872947260115217528616500920474419194field",

      // The random salt used during hash derivation.
      // Required to prove knowledge of the invoice during payment.
      "salt": "189135607550214029684113079727128581168field"
    },
    {
      "name": "support-campaign",
      "type": "donation",
      "amount": null,   // null = payer decides
      "currency": "ANY", // ANY = payer picks the token
      "label": "Support the project",
      "hash": "3890137687796658966791726479363108149438945720273892520625084409687425161623field",
      "salt": "64965075528395375647972437556920314428field"
    }
  ]
}`;

const pathResolutionExample = `// ─── How the SDK resolves nullpay.json ───────────────────────────────────
// From the SDK source (loadNullPayConfig):

function loadNullPayConfig(projectRoot, configPath) {
    // Resolution priority:
    // 1. configPath (if provided) — absolute or relative path
    const filePath = configPath 
        || path.join(projectRoot || process.cwd(), 'nullpay.json');

    if (!fs.existsSync(filePath)) return null;  // returns null, doesn't throw

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        // Only throws if file exists but is invalid JSON
        throw new Error(\`Failed to parse nullpay.json at \${filePath}. Ensure it is valid JSON.\`);
    }
}

// Resolution order:
//   1. configPath (exact path to file)
//   2. path.join(projectRoot, 'nullpay.json')
//   3. path.join(process.cwd(), 'nullpay.json')   ← fallback`;

const whatCLIGeneratesExample = `// ─── What the CLI writes to nullpay.json ─────────────────────────────────
// When you run: npx @nullpay/cli@latest sdk onboard
//
// The wizard:
//   1. Authenticates with your Aleo private key and merchant address
//   2. Asks: name each invoice (e.g. "pro-plan", "support-campaign")
//   3. Asks: type (multipay / donation)
//   4. Asks: amount and currency for each
//   5. Calls the NullPay backend to create the invoice on-chain via DPS relayer
//   6. Waits for Aleo network confirmation (polls salt_to_invoice mapping)
//   7. Writes the confirmed hash + salt to nullpay.json
//
// ⚠️ The hash and salt are computed and derived on-chain via zk_pay program.
// Do not manually construct or guess these values — use the CLI.
//
// After generation: place nullpay.json in your project root.
// Add to .gitignore if the salt should be kept private.
// However, salt and hash are already public on the Aleo blockchain —
// the only secret is your merchant private key (not in nullpay.json).`;

const whenToUseJsonExample = `// ─── When to use nullpay.json vs. inline params ─────────────────────────

// USE nullpay.json (nullpay_invoice_name) when:
//   ✓ Invoice is reusable (multipay, donation)
//   ✓ Price is fixed (SaaS plans, donation page, event tickets)
//   ✓ You want zero-latency session creation (no Aleo polling)
//   ✓ Multiple backend routes share the same invoice

// USE inline amount/currency when:
//   ✓ Invoice is variable-price (shopping cart, custom order)
//   ✓ You can tolerate up to 120s wait for Aleo confirmation
//   ✓ You don't want to run the CLI for every product variant

// Mixed usage is fine:
//   Fixed products → nullpay_invoice_name
//   Variable checkout → inline amount/currency + type:'standard'`;

export const nullpayJsonSection: DocsSection = {
    id: 'sdk-nullpay-json',
    group: 'Config',
    label: 'nullpay.json',
    eyebrow: 'SDK',
    title: 'nullpay.json — the merchant invoice manifest',
    summary:
        'nullpay.json is the optional pre-generated invoice manifest. It stores the on-chain hash and salt for each named invoice. Using it is the fastest path to session creation (no Aleo network wait). It is generated by the CLI wizard and read at runtime by the Node SDK.',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <FileJson className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Full nullpay.json schema — every field documented</h3>
                </div>
                <CodeBlock title="nullpay.json — annotated schema" language="json" code={nullpayJsonStructureExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Layers className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Path resolution order</h3>
                </div>
                <CodeBlock title="How the SDK finds nullpay.json" language="js" code={pathResolutionExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">What the CLI generates</h3>
                <CodeBlock title="CLI wizard — what it writes" language="text" code={whatCLIGeneratesExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Live example nullpay.json</h3>
                <CodeBlock title="Example nullpay.json (real field hashes)" language="json" code={nullpayJsonExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">When to use nullpay.json vs. inline params</h3>
                <CodeBlock title="Decision guide" language="text" code={whenToUseJsonExample} />
            </GlassCard>

            <Callout title="nullpay.json is safe to commit to version control" tone="blue">
                The <code className="rounded bg-white/10 px-1.5 py-0.5">hash</code> and <code className="rounded bg-white/10 px-1.5 py-0.5">salt</code> in <code className="rounded bg-white/10 px-1.5 py-0.5">nullpay.json</code> are already public on the Aleo blockchain — anyone can query the mapping. Your merchant private key (used to create the invoice on-chain) is <strong>not stored here</strong>. The only truly secret value is <code className="rounded bg-white/10 px-1.5 py-0.5">NULLPAY_SECRET_KEY</code>, which lives only in your server environment variables.
            </Callout>
        </div>
    ),
};
