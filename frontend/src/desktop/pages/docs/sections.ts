import type { DocsSection, DocsTabId } from './types';

const loaders: Record<DocsTabId, () => Promise<DocsSection[]>> = {
    'getting-started': () => import('./getting-started').then(m => m.gettingStartedSections),
    'smart-contract': () => import('./smart-contract').then(m => m.smartContractSections),
    'sdk': () => import('./sdk').then(m => m.sdkSections),
    'api-reference': () => import('./api-reference').then(m => m.apiReferenceSections),
    'integrations': () => import('./integrations').then(m => m.integrationSections),
    'architecture': () => import('./architecture').then(m => m.architectureSections),
    'quick-reference': () => import('./quick-reference').then(m => m.quickReferenceSections),
};

export const SECTION_TAB_LOOKUP: Record<string, DocsTabId> = {
    'overview': 'getting-started',
    'installation': 'getting-started',
    'quick-start': 'getting-started',
    'concepts': 'getting-started',
    'nullpay-overview': 'getting-started',
    'getting-started-wallet': 'getting-started',
    'getting-started-first-invoice': 'getting-started',
    'getting-started-first-payment': 'getting-started',
    'getting-started-checkout': 'getting-started',
    'getting-started-gift-cards': 'getting-started',
    'getting-started-telegram': 'getting-started',
    'getting-started-mcp': 'getting-started',
    'getting-started-card': 'getting-started',
    'getting-started-batch': 'getting-started',
    'getting-started-faq': 'getting-started',
    'contract-architecture': 'smart-contract',
    'contract-records': 'smart-contract',
    'contract-mappings': 'smart-contract',
    'contract-invoice-lifecycle': 'smart-contract',
    'contract-payment-paths': 'smart-contract',
    'contract-burner-records': 'smart-contract',
    'contract-card-profiles': 'smart-contract',
    'contract-gift-cards': 'smart-contract',
    'contract-cross-token': 'smart-contract',
    'contract-oracle': 'smart-contract',
    'contract-freeze-list': 'smart-contract',
    'contract-security': 'smart-contract',
    'sdk-overview': 'sdk',
    'sdk-node-install': 'sdk',
    'sdk-python-install': 'sdk',
    'sdk-quick-start': 'sdk',
    'sdk-create-invoice': 'sdk',
    'sdk-checkout': 'sdk',
    'sdk-payment-link': 'sdk',
    'sdk-webhooks': 'sdk',
    'sdk-dps': 'sdk',
    'sdk-nullpay-json': 'sdk',
    'sdk-cli-guide': 'sdk',
    'sdk-cli-reference': 'sdk',
    'sdk-testing-integration': 'sdk',
    'sdk-error-handling': 'sdk',
    'api-overview': 'api-reference',
    'api-invoices': 'api-reference',
    'api-checkout': 'api-reference',
    'api-dps': 'api-reference',
    'api-oracle': 'api-reference',
    'api-merchants': 'api-reference',
    'api-users': 'api-reference',
    'api-mcp': 'api-reference',
    'api-telegram': 'api-reference',
    'api-support-feedback': 'api-reference',
    'api-gift-cards': 'api-reference',
    'api-scanner': 'api-reference',
    'integrations-mcp': 'integrations',
    'integrations-openclaw': 'integrations',
    'integrations-claude': 'integrations',
    'integrations-codex': 'integrations',
    'integrations-cursor': 'integrations',
    'integrations-antigravity': 'integrations',
    'architecture-overview': 'architecture',
    'architecture-ui': 'architecture',
    'architecture-backend': 'architecture',
    'architecture-relayer': 'architecture',
    'architecture-mcp': 'architecture',
    'architecture-contracts': 'architecture',
    'architecture-sdk': 'architecture',
    'architecture-workflow': 'architecture',
    'architecture-payment-flow': 'architecture',
    'quick-ref-transitions': 'quick-reference',
    'quick-ref-api': 'quick-reference',
    'quick-ref-sdk': 'quick-reference',
    'quick-ref-errors': 'quick-reference',
};

let _allSections: DocsSection[] | null = null;
let _allSectionsPromise: Promise<DocsSection[]> | null = null;

export function loadSectionsForTab(tabId: DocsTabId): Promise<DocsSection[]> {
    return loaders[tabId]();
}

export function loadAllSections(): Promise<DocsSection[]> {
    if (_allSections) return Promise.resolve(_allSections);
    if (_allSectionsPromise) return _allSectionsPromise;

    _allSectionsPromise = Promise.all(
        Object.values(loaders).map(loader => loader())
    ).then(results => {
        _allSections = results.flat();
        return _allSections;
    });

    return _allSectionsPromise;
}

export function getTabForSectionId(sectionId: string): DocsTabId | null {
    return SECTION_TAB_LOOKUP[sectionId] ?? null;
}
