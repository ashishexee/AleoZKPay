import type { DocsSection } from '../types';
import { codexConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge } from '../ui';

export const codexSection: DocsSection = {
    id: 'int-codex',
    group: 'Clients',
    label: 'Codex',
    eyebrow: 'Integrations',
    title: 'Codex setup',
    summary:
        'Codex uses an MCP server block in config.toml. The NullPay entry points to the same local stdio command and injects wallet credentials through the env table.',
    content: (
        <div className="space-y-6">
            <IntegrationBadge
                src="/assets/codex.svg"
                alt="Codex"
                title="TOML-based MCP config"
                description="Codex can load NullPay from an mcp_servers.nullpay table and keep the MCP server enabled for local workflows."
            />
            <CodeBlock title="config.toml example" language="toml" code={codexConfigExample} />
        </div>
    ),
};
