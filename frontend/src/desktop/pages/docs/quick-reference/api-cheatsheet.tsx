import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { EndpointCard, Callout } from '../ui';

export const apiCheatSheetSection: DocsSection = {
    id: 'qr-api',
    group: 'API',
    label: 'API Cheat Sheet',
    eyebrow: 'Quick Reference',
    title: 'Backend API Endpoint Reference',
    summary: 'All REST API endpoints organized by route group. Each entry includes HTTP method, path, authentication requirement, and a one-line description.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <EndpointCard method="GET" path="/api/invoices" auth="Public" description="List all invoices, optional merchant filter" />
                <EndpointCard method="POST" path="/api/invoices" auth="None" description="Create invoice record in backend DB" />
                <EndpointCard method="GET" path="/api/invoices/:hash" auth="Public" description="Get single invoice by BHP256 hash" />
                <EndpointCard method="GET" path="/api/invoice/:hash" auth="Public" description="Shortcut: same as above" />
                <EndpointCard method="GET" path="/api/invoices/merchant/:hash" auth="Public" description="Get all invoices for a merchant address" />
                <EndpointCard method="GET" path="/api/invoices/recent" auth="Public" description="Most recent 50 invoices" />
                <EndpointCard method="PATCH" path="/api/invoices/:hash" auth="None" description="Update invoice status/metadata" />
                <EndpointCard method="DELETE" path="/api/invoices/:hash" auth="None" description="Delete invoice from backend" />
                <EndpointCard method="POST" path="/api/checkout/sessions" auth="Bearer sk_" description="Create hosted checkout session" />
                <EndpointCard method="GET" path="/api/checkout/sessions/:id" auth="Public" description="Retrieve session status" />
                <EndpointCard method="PATCH" path="/api/checkout/sessions/:id" auth="Public" description="Update session metadata" />
                <EndpointCard method="POST" path="/api/dps/jwt" auth="API Key" description="Get JWT for DPS authentication" />
                <EndpointCard method="GET" path="/api/dps/pubkey" auth="JWT" description="Get ephemeral X25519 pubkey" />
                <EndpointCard method="POST" path="/api/dps/prove" auth="JWT" description="Submit encrypted proving request" />
                <EndpointCard method="POST" path="/api/dps/sponsor-sweep" auth="JWT" description="Sponsor execution fee" />
                <EndpointCard method="POST" path="/api/dps/relayer/create-invoice" auth="Bearer sk_" description="Relayer: create on-chain invoice" />
                <EndpointCard method="GET" path="/api/oracle/quote" auth="Public" description="Get signed cross-token conversion quote" />
                <EndpointCard method="POST" path="/api/merchants/register" auth="None" description="Register merchant, get secret key" />
                <EndpointCard method="GET" path="/api/merchants/stats/:address" auth="Public" description="Merchant analytics dashboard" />
                <EndpointCard method="POST" path="/api/sdk/onboard/validate" auth="Bearer sk_" description="Validate merchant for CLI onboarding" />
                <EndpointCard method="POST" path="/api/mcp/login" auth="Wallet creds" description="MCP session login" />
                <EndpointCard method="POST" path="/api/mcp/invoice/create" auth="Session" description="MCP relay: create invoice" />
                <EndpointCard method="POST" path="/api/mcp/invoice/pay" auth="Session" description="MCP relay: pay invoice" />
                <EndpointCard method="GET" path="/api/scanner/:network/pubkey" auth="None" description="Record Scanner: ephemeral pubkey" />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-lg font-bold text-white">Response Status Codes</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-3"><span className="font-mono text-emerald-400 w-8">200</span><span>Success</span></div>
                        <div className="flex items-center gap-3"><span className="font-mono text-emerald-400 w-8">201</span><span>Created (new session/invoice)</span></div>
                        <div className="flex items-center gap-3"><span className="font-mono text-yellow-400 w-8">400</span><span>Bad Request (invalid input)</span></div>
                        <div className="flex items-center gap-3"><span className="font-mono text-red-400 w-8">401</span><span>Unauthorized (missing/invalid auth)</span></div>
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-3"><span className="font-mono text-red-400 w-8">404</span><span>Not Found (unknown hash/ID)</span></div>
                        <div className="flex items-center gap-3"><span className="font-mono text-red-400 w-8">500</span><span>Internal Server Error</span></div>
                        <div className="flex items-center gap-3"><span className="font-mono text-orange-400 w-8">503</span><span>Service Unavailable (DPS retry)</span></div>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Base URL" tone="blue">
                Production: <code className="text-orange-300">https://api.nullpay.xyz</code>
                <br />
                All routes are unversioned. No <code className="text-gray-400">/v1</code> prefix. CORS is enabled for nullpay.app and localhost:5173.
            </Callout>
        </div>
    ),
};
