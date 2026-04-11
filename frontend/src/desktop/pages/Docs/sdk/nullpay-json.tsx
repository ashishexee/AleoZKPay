import { FileJson, Layers, Shield, Database, Cpu } from 'lucide-react';
import type { DocsSection } from '../types';
import { nullpayJsonExample } from '../examples';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const nullpayJsonStructureExample = `// Annotated nullpay.json Structure

{
  /**
   * The public Aleo address (aleo1...) of the merchant.
   * This identifies which "Balance Pool" the funds belong to.
   */
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",

  "generated_at": "2026-03-21T09:10:24.522Z",

  "invoices": [
    {
      /** Unique alias used in the Node SDK nullpay_invoice_name parameter */
      "name": "pro-plan",

      /** 'multipay' (reusable) or 'donation' (variable amount) */
      "type": "multipay",

      /** Denominated in standard units (e.g. 50.00) */
      "amount": 50,

      /** CREDITS | USDCX | USAD | ANY */
      "currency": "USDCX",

      /** Displayed to the end-user during checkout */
      "label": "Pro Plan - Monthly Subscription",

      /** 
       * BHP256 Invoice Hash. 
       * This is a commitment of (merchant + amount + currency + salt).
       * If any value changes, the hash becomes invalid on-chain.
       */
      "hash": "1724879449753...74419194field",

      /** 
       * 128-bit Random Salt.
       * Acts as a privacy shield. Without the salt, an observer 
       * cannot link an invoice hash to a specific product or price.
       */
      "salt": "1891356075502...81168field"
    }
  ]
}`;

const hashingLogicExample = `/**
 * THE INVOICE COMMITMENT (ZK-PROOF COMPATIBLE)
 * 
 * The 'hash' field in nullpay.json is derived using the BHP256 
 * Pedersen Hash algorithm on the Aleo blockchain.
 * 
 * Hash = BHP256::hash_to_field([
 *    merchant_address,
 *    amount_u64,
 *    token_id_field,
 *    salt_field
 * ]);
 * 
 * SECURITY IMPLICATIONS:
 * 1. Immutability: Once the hash is created on-chain, you cannot 
 *    change the price or recipient without invalidating the 256-bit hash.
 * 2. Privacy: The salt ensures that two identical products (same price/token)
 *    result in completely different hashes, preventing "price-tag" clustering.
 */`;

export const nullpayJsonSection: DocsSection = {
    id: 'sdk-nullpay-json',
    group: 'Config',
    label: 'nullpay.json',
    eyebrow: 'SDK',
    title: 'nullpay.json — The Local Merchant Manifest',
    summary:
        'The nullpay.json file acts as a local "Lookup Table" for your on-chain invoices. It bridge the gap between human-readable names and the low-level BHP256 hashes required by the Aleo network.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Database}
                    title="Lookup Table"
                    description="Reduces database queries and blockchain polling by storing invoice hashes locally contextually."
                />
                <MetricCard
                    icon={Cpu}
                    title="Pre-Computed"
                    description="All hashes are pre-generated via CLI, ensuring zero-latency checkout session creation."
                />
                <MetricCard
                    icon={Shield}
                    title="On-Chain Verified"
                    description="The manifest is generated only after the CLI confirms the invoice exists in the Aleo salt_to_invoice mapping."
                />
                <MetricCard
                    icon={Layers}
                    title="Context Aware"
                    description="Allows merchants to categorize invoices by name (e.g., 'subscription', 'add-on') for better analytics."
                />
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <FileJson className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">The Annotated Schema</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    The <code className="text-white/80">nullpay.json</code> file is a standard JSON manifest. It should be kept in your server-side repository and loaded by the SDK at startup.
                </p>
                <CodeBlock title="nullpay.json structure" language="json" code={nullpayJsonStructureExample} />
            </GlassCard>

            <GlassCard className="p-6 border-emerald-500/20 bg-emerald-500/5">
                <h3 className="mb-4 text-xl font-bold text-white">Cryptographic Theory: BHP256 Hashing</h3>
                <p className="mb-4 text-sm text-gray-400 leading-relaxed">
                    Unlike standard web hashes (MD5, SHA256), NullPay uses **BHP256 (Pedersen Hash)**. This algorithm is optimized for Zero-Knowledge circuits, allowing the buyer to prove they paid exactly the amount specified in the manifest without revealing the manifest content to the entire network.
                </p>
                <CodeBlock title="Hash Derivation Logic" language="js" code={hashingLogicExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">SDK Resolution Strategy</h3>
                <div className="space-y-4 text-sm text-gray-400">
                    <div className="flex items-start gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px]">1</div>
                        <p><b>explicit path:</b> If <code className="text-white/80">configPath</code> is provided in the constructor, the SDK looks ONLY at that location.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px]">2</div>
                        <p><b>project root:</b> If <code className="text-white/80">projectRoot</code> is provided, the SDK searches for <code className="text-white/80">nullpay.json</code> in that specific folder.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px]">3</div>
                        <p><b>working directory:</b> By default, it looks in <code className="text-white/80">process.cwd()</code>. Note: This often fails in Vercel/Next.js functions.</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Public Data, Private Secrets" tone="blue">
                Even though <code className="text-white/80">nullpay.json</code> contains hashes and salts, it is perfectly safe to keep public. These values are committed to the public Aleo blockchain. The ONLY secret you must protect is your <code className="text-blue-200">NULLPAY_SECRET_KEY</code> and your merchant wallet's private key.
            </Callout>
        </div>
    ),
};
