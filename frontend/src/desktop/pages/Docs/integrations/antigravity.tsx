import type { DocsSection } from '../types';
import { manualConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge } from '../ui';

export const antigravitySection: DocsSection = {
    id: 'int-antigravity',
    group: 'Clients',
    label: 'Antigravity',
    eyebrow: 'Integrations',
    title: 'Antigravity setup',
    summary:
        'Antigravity can follow the same manual MCP registration pattern as other stdio-capable clients: register NullPay as a local MCP server, pass the wallet env block, and keep the config file private.',
    content: (
        <div className="space-y-6">
            <IntegrationBadge
                src="/assets/antigravity.svg"
                alt="Antigravity"
                title="Manual stdio MCP wiring"
                description="Use the same NullPay server command and environment variables used by Claude, Codex, Cursor, and OpenClaw."
            />
            <CodeBlock title="generic MCP registration example" language="json" code={manualConfigExample} />
        </div>
    ),
};
