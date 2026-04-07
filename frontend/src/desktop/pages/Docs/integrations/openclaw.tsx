import type { DocsSection } from '../types';
import { openclawConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge } from '../ui';

export const openclawSection: DocsSection = {
    id: 'int-openclaw',
    group: 'Clients',
    label: 'OpenClaw',
    eyebrow: 'Integrations',
    title: 'OpenClaw setup',
    summary:
        'OpenClaw uses a gateway-style config that can host NullPay as an MCP server. Your local openclaw.json already follows this pattern under mcp.servers.nullpay.',
    content: (
        <div className="space-y-6">
            <IntegrationBadge
                src="/assets/openclaw.svg"
                alt="OpenClaw"
                title="Gateway-style MCP registration"
                description="Add NullPay under mcp.servers and point it to the same local stdio server command used by the other clients."
            />
            <CodeBlock title="openclaw.json example" language="json" code={openclawConfigExample} />
        </div>
    ),
};
