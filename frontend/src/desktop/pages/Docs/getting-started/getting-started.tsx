import { Bot, CheckCircle, Package, TerminalSquare } from 'lucide-react';
import type { DocsSection } from '../types';
import { installCliCommand, installMcpCommand, installNodeCommand, nodeInitExample, webhookExample } from '../examples';
import { Callout, CodeBlock, MetricCard } from '../ui';

const backendEnvExample = `NULLPAY_SECRET_KEY=sk_xxxxxxxxxxxxxxxx
NULLPAY_BASE_URL=https://nullpay-backend-ib5q4.ondigitalocean.app/api
FRONTEND_URL=https://your-frontend.example`;

const createSessionRouteExample = `app.post('/api/checkout/variable', async (req, res) => {
  const { currency, price, tokens } = req.body;

  const session = await nullpay.checkout.sessions.create({
    amount: price,
    currency,
    success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=variable&tokens=\${tokens}\`,
    cancel_url: \`\${frontendUrl}?cancel=true\`,
  });

  res.json({ checkoutUrl: session.checkout_url });
});`;

const verifySessionExample = `app.get('/api/verify-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  const session = await nullpay.checkout.sessions.retrieve(session_id);

  if (session.status === 'SETTLED') {
    return res.json({ success: true, isPremium: true });
  }

  res.json({ success: false, status: session.status });
});`;

export const gettingStartedSection: DocsSection = {
    id: 'gs-getting-started',
    group: 'First Steps',
    label: 'Getting Started',
    eyebrow: 'First Steps',
    title: 'How to start using the platform',
    summary:
        'The most practical way to start with NullPay is backend-first: install the Node SDK, wire one checkout route, verify settlement on the backend, and then add CLI-generated invoice manifests or MCP support only when your use case needs them.',
    content: (
        <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Package}
                    title="1. Install the backend SDK"
                    description="Start in the merchant backend. That is where the secret key should live and where checkout sessions should be created."
                />
                <MetricCard
                    icon={TerminalSquare}
                    title="2. Add your merchant config"
                    description="Set the NullPay secret key and initialize the client with your backend root so nullpay.json can be resolved consistently."
                />
                <MetricCard
                    icon={CheckCircle}
                    title="3. Create and verify sessions"
                    description="Create a hosted checkout session on the server, redirect the buyer, and verify settlement on success or via webhook."
                />
                <MetricCard
                    icon={Bot}
                    title="4. Add CLI and MCP later"
                    description="Use the CLI when you want named invoice manifests, and add MCP only when conversational or AI-operated payment workflows matter."
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <CodeBlock title="Install Node SDK" language="bash" code={installNodeCommand} />
                <CodeBlock title="Run CLI onboarding" language="bash" code={installCliCommand} />
                <CodeBlock title="Install NullPay MCP" language="bash" code={installMcpCommand} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <CodeBlock title="Backend environment" language="env" code={backendEnvExample} />
                <CodeBlock title="Node SDK initialization" language="js" code={nodeInitExample} />
            </div>

            <Callout title="Recommended first integration path" tone="blue">
                If you are new to the codebase, ignore MCP at first. The fastest reliable path is:
                backend secret key, one server route that creates a session, one success verification path, and one webhook
                endpoint for fulfillment. That matches the testing-website backend and gives you the cleanest end-to-end loop.
            </Callout>

            <div className="space-y-5">
                <CodeBlock title="Create a checkout session route" language="js" code={createSessionRouteExample} />
                <CodeBlock title="Verify a session after redirect" language="js" code={verifySessionExample} />
                <CodeBlock title="Verify webhook events for fulfillment" language="js" code={webhookExample} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Callout title="When to use the CLI" tone="emerald">
                    Use <code className="rounded bg-white/10 px-1.5 py-0.5">npx @nullpay/cli@latest sdk onboard</code> when you
                    want reusable, named invoices such as subscription plans, donation campaigns, or a stable catalog of merchant
                    payment definitions. It writes <code className="rounded bg-white/10 px-1.5 py-0.5">nullpay.json</code> into
                    your backend project.
                </Callout>
                <Callout title="When to use MCP" tone="orange">
                    Add NullPay MCP when the operator experience itself matters, for example when a merchant or agent wants to
                    create invoices, inspect transactions, or pay payment links from Claude, Codex, OpenClaw, or similar clients.
                </Callout>
            </div>

            <Callout title="Security boundary" tone="orange">
                Keep merchant secret keys on the backend, keep wallet private keys inside local wallet or MCP processes, and
                treat webhook verification as mandatory before fulfillment. NullPay gives you tools for all three boundaries,
                but your integration should preserve them explicitly.
            </Callout>
        </div>
    ),
};
