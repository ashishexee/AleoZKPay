import type { DocsSection } from '../types';
import { testingWebsiteBackendExample } from '../examples';
import { Callout, CodeBlock } from '../ui';

export const backendExampleSection: DocsSection = {
    id: 'sdk-backend-example',
    group: 'Config',
    label: 'Backend Example',
    eyebrow: 'SDK',
    title: 'Using the testing-website backend as reference',
    summary:
        'The repo already contains a concrete merchant backend under testing-website/backend. It is a good template because it shows fixed invoice routes, variable sessions, session verification, and webhook verification in one place.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="testing-website/backend/index.js" language="js" code={testingWebsiteBackendExample} />
            <Callout title="Folder context" tone="emerald">
                This example lives in <code className="rounded bg-white/10 px-1.5 py-0.5">testing-website/backend</code> and
                uses <code className="rounded bg-white/10 px-1.5 py-0.5">projectRoot: __dirname</code> plus
                <code className="rounded bg-white/10 px-1.5 py-0.5"> configPath: path.join(__dirname, 'nullpay.json')</code>
                so the config lookup stays stable.
            </Callout>
        </div>
    ),
};
