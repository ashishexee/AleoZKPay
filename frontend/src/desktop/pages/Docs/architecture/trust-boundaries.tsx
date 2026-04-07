import type { DocsSection } from '../types';
import { Callout } from '../ui';

export const trustBoundariesSection: DocsSection = {
    id: 'arch-boundaries',
    group: 'System',
    label: 'Trust Boundaries',
    eyebrow: 'Architecture',
    title: 'Trust boundaries and secret ownership',
    summary:
        'The architecture works best when every layer owns only the secrets and permissions it actually needs. That keeps the system composable and reduces blast radius.',
    content: (
        <div className="grid gap-5 md:grid-cols-2">
            <Callout title="Backend boundary" tone="orange">
                Merchant secret keys belong in the backend only. The frontend should receive checkout URLs and payment status,
                not merchant credentials.
            </Callout>
            <Callout title="MCP boundary" tone="blue">
                MCP clients keep the main wallet private key inside the local MCP process. The backend and the model should not
                receive the raw private key as part of normal operation.
            </Callout>
            <Callout title="Chain boundary" tone="emerald">
                The contract stores only the minimum public mapping state required to verify invoice validity and payment
                permissions, while sensitive values stay in private records or off-chain config.
            </Callout>
            <Callout title="Config boundary" tone="orange">
                Files like nullpay.json and client MCP configs are operationally sensitive because they define merchant flows and
                may hold wallet environment variables.
            </Callout>
        </div>
    ),
};
