import type { DocsSection } from '../types';
import { cursorConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge } from '../ui';

export const cursorSection: DocsSection = {
    id: 'int-cursor',
    group: 'Clients',
    label: 'Cursor',
    eyebrow: 'Integrations',
    title: 'Cursor setup',
    summary:
        'Cursor uses a JSON mcpServers map. The shape is very close to Claude Desktop, which makes it a straightforward manual MCP integration target.',
    content: (
        <div className="space-y-6">
            <IntegrationBadge
                src="/assets/cursor-ide.png"
                alt="Cursor"
                title="JSON-based MCP config"
                description="Add a nullpay server entry inside the cursor mcpServers object and point it to the local NullPay server command."
            />
            <CodeBlock title="cursor mcp.json example" language="json" code={cursorConfigExample} />
        </div>
    ),
};
