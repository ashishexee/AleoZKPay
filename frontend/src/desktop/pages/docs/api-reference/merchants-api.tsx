import { User, Key, Shield, BarChart2 } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const merchantsEndpoints = `// ─── Merchants & Users API ──────────────────────────────────────
// Source: backend/src/routes/merchants.routes.js
//         backend/src/routes/users.routes.js

// Merchants routes (/api/merchants):
// POST /api/merchants/register — Register as a merchant
// Body: { name, aleo_address, webhook_url? }
// Response: { secret_key, status }

// GET /api/merchants/stats/:address — Get merchant analytics
// Response: { total_volume, successful_sessions, total_sessions, conversion_rate }

// POST /api/sdk/onboard/validate — Validate onboarding
// Auth: Bearer sk_...
// Body: { merchant_address }
// Response: { valid: true }

// ─── Users routes (/api/users) ──────────────────────────────────
// POST /api/users/register — Register a user
// Body: { aleo_address, password_hash?, metadata? }

// GET /api/users/profile/:hash — Get user profile by hashed address
// Response: { address, burner_address, encrypted_backup, ... }

// PATCH /api/users/profile — Update user profile
// Body: { address, burner_address, encrypted_backup, ... }

// ─── MCP routes (/api/mcp) ──────────────────────────────────────
// POST /api/mcp/login — MCP login
// Body: { address, password, private_key? }
// Response: { session_id, profile }

// POST /api/mcp/invoice/create — MCP create invoice relay
// POST /api/mcp/invoice/pay — MCP pay invoice relay
// POST /api/mcp/transaction/info — MCP get transaction info

// ─── Scanner routes (/api/scanner/:network) ─────────────────────
// GET /api/scanner/:network/pubkey — Ephemeral pubkey
// POST /api/scanner/:network/register — Register view key
// POST /api/scanner/:network/records/owned — Get owned records

// ─── Telegram routes (/api/telegram) ────────────────────────────
// POST /api/telegram/link — Link Telegram account
// POST /api/telegram/webhook — Telegram bot webhook`;

const merchantRegisterExample = `// Example: POST /api/merchants/register
// Request:
{
  "name": "Dhruv's Store",
  "aleo_address": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "webhook_url": "https://mystore.com/api/nullpay-webhook"
}

// Response:
{
  "secret_key": "sk_test_abc123xyz...",
  "status": "registered"
}
// Save this secret_key! It is shown only once upon registration.`;

export const merchantsApiSection: DocsSection = {
    id: 'api-merchants',
    group: 'Endpoints',
    label: 'Merchants & Users',
    eyebrow: 'API Reference',
    title: 'Merchants, Users, MCP & Support APIs',
    summary: 'Registration, authentication, profile management, analytics, MCP relay routes, scanner proxy, Telegram bot integration, and support endpoints.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard icon={User} title="Merchants" description="Register, validate onboarding, view analytics dashboard stats." />
                <MetricCard icon={Key} title="Users & MCP" description="Register users, manage profiles, MCP login and relay routes." />
                <MetricCard icon={Shield} title="Scanner" description="Proxy to Provable Record Scanner for encrypted view key registration." />
                <MetricCard icon={BarChart2} title="Telegram & Support" description="Bot webhooks, account linking, support requests." />
            </div>

            <CodeBlock title="Merchants, Users, MCP, Scanner, Telegram APIs" language="text" code={merchantsEndpoints} />
            <CodeBlock title="Merchant registration" language="json" code={merchantRegisterExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Merchant route details</h3>
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
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/merchants/register</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Register new merchant, get secret key</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/merchants/stats/:address</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Get merchant analytics</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/sdk/onboard/validate</td><td className="px-4 py-3 font-mono text-xs text-red-300">Bearer sk_</td><td className="px-4 py-3 text-sm text-gray-400">Validate merchant for SDK onboarding</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/users/register</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Register user profile</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/users/profile/:hash</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Get user profile by hashed address</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-blue-300">PATCH</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/users/profile</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Update user profile</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/mcp/login</td><td className="px-4 py-3 text-sm">Wallet creds</td><td className="px-4 py-3 text-sm text-gray-400">MCP session login</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/mcp/invoice/create</td><td className="px-4 py-3 text-sm">Session</td><td className="px-4 py-3 text-sm text-gray-400">MCP relay: create invoice</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/mcp/invoice/pay</td><td className="px-4 py-3 text-sm">Session</td><td className="px-4 py-3 text-sm text-gray-400">MCP relay: pay invoice</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/mcp/transaction/info</td><td className="px-4 py-3 text-sm">Session</td><td className="px-4 py-3 text-sm text-gray-400">MCP relay: get transaction info</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/scanner/:network/pubkey</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Record Scanner: get ephemeral pubkey</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/scanner/:network/register</td><td className="px-4 py-3 text-sm">API Key</td><td className="px-4 py-3 text-sm text-gray-400">Record Scanner: register encrypted view key</td></tr>
                            <tr><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/scanner/:network/records/owned</td><td className="px-4 py-3 text-sm">API Key</td><td className="px-4 py-3 text-sm text-gray-400">Record Scanner: get owned records</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="Secret key is shown once" tone="orange">
                When registering as a merchant, the <code className="rounded bg-white/10 px-1.5 py-0.5">secret_key</code> is returned in the response
                and shown exactly once. If lost, re-registration generates a new key. Store it in environment variables immediately.
                Test keys are prefixed <code className="rounded bg-white/10 px-1.5 py-0.5">sk_test_</code> and live keys are prefixed <code className="rounded bg-white/10 px-1.5 py-0.5">sk_live_</code>.
            </Callout>
        </div>
    ),
};
