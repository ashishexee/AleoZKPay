import { Shield, Key, Zap, Gpu } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const dpsEndpoints = `// ─── DPS (Delegated Proving Service) API ────────────────────
// Base: /api/dps

// POST /api/dps/jwt — Get a JWT token for DPS authentication
// Body: { consumer_id, api_key }
// Response: { jwt, expires_at }

// GET /api/dps/pubkey — Get ephemeral X25519 public key
// Response: { key_id: string, public_key: string }
// Use this key_id in the next /prove/encrypted call

// POST /api/dps/prove — Submit encrypted proving request
// Body: { key_id, ciphertext, broadcast?: boolean }
// Response: { transaction, broadcast_result }
// The backend proxys the encrypted payload to Provable's TEE

// POST /api/dps/sponsor-sweep — Sponsor a sweep transaction
// Body: { authorization, fee_authorization, broadcast }
// Used for: burner wallet sweeps, gift card redeems
// NullPay backend sponsors the fee

// POST /api/dps/relayer/create-invoice — Relayer invoice creation
// Auth: Bearer sk_... (merchant auth required)
// Body: { merchant, amount, currency, salt, title, memo, type, wallet_type }
// Response: { invoice_hash, salt, tx_id, status }
// NullPay relayer wallet submits on-chain create_invoice transaction`;

const relayerExample = `// Example: POST /api/dps/relayer/create-invoice
// Header: Authorization: Bearer sk_test_...
// Request:
{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "amount": 50,
  "currency": "USDCX",
  "salt": "generated_128bit_salt_field",
  "title": "Pro Plan",
  "memo": "Monthly subscription",
  "type": "standard",
  "wallet_type": "main"
}

// Response:
{
  "invoice_hash": "172487...194field",
  "salt": "189135...168field",
  "tx_id": "at1r42l7dn57zczx5s4kxq4ut68g65c5d0r35jg5g9k8mx4k2j5qypsjk2xth",
  "status": "confirmed"
}`;

export const dpsApiSection: DocsSection = {
    id: 'api-dps',
    group: 'Endpoints',
    label: 'DPS & Relayer',
    eyebrow: 'API Reference',
    title: 'DPS & Relayer API — Delegated proving and sponsored execution',
    summary: 'Endpoints for delegated zero-knowledge proof generation via Provable TEE, plus the relayer that sponsors on-chain invoice creation and burner sweeps on behalf of merchants.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-5">
                <MetricCard icon={Key} title="JWT" description="POST /api/dps/jwt — Obtain authentication token for DPS operations." />
                <MetricCard icon={Shield} title="Pubkey" description="GET /api/dps/pubkey — Get ephemeral X25519 pubkey for encrypted proving." />
                <MetricCard icon={Gpu} title="Prove" description="POST /api/dps/prove — Submit encrypted proving request to TEE." />
                <MetricCard icon={Zap} title="Sponsor" description="POST /api/dps/sponsor-sweep — Backend-sponsored execution fee coverage." />
                <MetricCard icon={Key} title="Relayer" description="POST /api/dps/relayer/create-invoice — Merchant auth. Backend submits on-chain invoice." />
            </div>

            <CodeBlock title="DPS API endpoints" language="text" code={dpsEndpoints} />
            <CodeBlock title="Relayer: create-invoice" language="json" code={relayerExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Endpoint details</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Method</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Path</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Auth</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Description</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/dps/jwt</td><td className="px-4 py-3 text-sm">API Key</td><td className="px-4 py-3 text-sm text-gray-400">Get JWT for Provable DPS</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/dps/pubkey</td><td className="px-4 py-3 text-sm">JWT</td><td className="px-4 py-3 text-sm text-gray-400">Get ephemeral encryption pubkey</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/dps/prove</td><td className="px-4 py-3 text-sm">JWT</td><td className="px-4 py-3 text-sm text-gray-400">Submit encrypted proof to TEE</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/dps/sponsor-sweep</td><td className="px-4 py-3 text-sm">JWT</td><td className="px-4 py-3 text-sm text-gray-400">Sponsor sweep/burner/giftcard execution</td></tr>
                            <tr><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/dps/relayer/create-invoice</td><td className="px-4 py-3 font-mono text-xs text-red-300">Bearer sk_</td><td className="px-4 py-3 text-sm text-gray-400">Relayer: create on-chain invoice</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="The Relayer Flow" tone="blue">
                The relayer invoice creation is the core of the "sponsored setup" model. NullPay's relayer wallet submits
                the <code className="rounded bg-white/10 px-1.5 py-0.5">create_invoice</code> transaction on-chain and pays the Aleo gas fee.
                The merchant receives the <code className="rounded bg-white/10 px-1.5 py-0.5">invoice_hash</code> and <code className="rounded bg-white/10 px-1.5 py-0.5">salt</code> without
                ever needing to hold Aleo Credits for invoice setup.
            </Callout>

            <Callout title="sponsor-sweep" tone="orange">
                The <code className="rounded bg-white/10 px-1.5 py-0.5">POST /api/dps/sponsor-sweep</code> endpoint is used for
                burner wallet sweeps, gift card redemptions, and direct gift card payment flows. NullPay's backend sponsors
                the execution fee for these supported actions so the burner/card holder doesn't need to maintain Credits.
            </Callout>
        </div>
    ),
};
