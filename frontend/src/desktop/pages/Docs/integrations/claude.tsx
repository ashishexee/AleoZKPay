import type { DocsSection } from '../types';
import { claudeConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge } from '../ui';

export const claudeSection: DocsSection = {
    id: 'int-claude',
    group: 'Clients',
    label: 'Claude',
    eyebrow: 'Integrations',
    title: 'Claude setup',
    summary:
        'Claude is the client with the smoothest setup today because the NullPay MCP package already ships with a wizard that can write the config for Claude Desktop or Claude Code.',
    content: (
        <div className="space-y-6">
            <IntegrationBadge
                src="/assets/claude.svg"
                alt="Claude"
                title="Wizard-supported setup"
                description="Run npx -y @nullpay/mcp, choose Claude Desktop or Claude Code, enter wallet credentials, then restart Claude."
            />
            <CodeBlock title="Claude Desktop config example" language="json" code={claudeConfigExample} />
        </div>
    ),
};
