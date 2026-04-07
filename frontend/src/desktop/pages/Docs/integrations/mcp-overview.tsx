import { GitBranch, Network, ScrollText, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { installMcpCommand } from '../examples';
import { CodeBlock, MetricCard } from '../ui';

export const mcpOverviewSection: DocsSection = {
    id: 'int-mcp',
    group: 'MCP',
    label: 'MCP Overview',
    eyebrow: 'Integrations',
    title: 'NullPay MCP overview',
    summary:
        'NullPay MCP packages the merchant and wallet actions into a local stdio server. That lets AI clients call login, create_invoice, pay_invoice, and get_transaction_info while the private key remains inside the local process.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="Install NullPay MCP" language="bash" code={installMcpCommand} />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    title="login"
                    description="Starts the wallet session, supports password recovery, and can restore burner-wallet data when records are available."
                />
                <MetricCard
                    icon={ScrollText}
                    title="create_invoice"
                    description="Creates an invoice and returns the resulting payment details and transaction metadata."
                />
                <MetricCard
                    icon={GitBranch}
                    title="pay_invoice"
                    description="Accepts a payment link or invoice hash, resolves the correct program, and executes payment from the user wallet."
                />
                <MetricCard
                    icon={Network}
                    title="get_transaction_info"
                    description="Reads invoice state and recent transaction history, enriched by private record access when available."
                />
            </div>
        </div>
    ),
};
