import { InvoiceRecord, UserProfile } from './types';

function mapBackendError(path: string, text: string): string {
    if (path === '/mcp/relay/create-invoice') {
        if (text.includes('NULLPAY_MCP_SHARED_SECRET is not configured')) {
            return 'Invoice creation is blocked because NULLPAY_MCP_SHARED_SECRET is missing on the backend. Set the same NULLPAY_MCP_SHARED_SECRET value in both the backend env and the MCP server env, then restart both processes.';
        }
        if (text.includes('Invalid MCP shared secret')) {
            return 'Invoice creation is blocked because the MCP shared secret does not match. Set the same NULLPAY_MCP_SHARED_SECRET value in both the backend env and the MCP server env, then restart both processes.';
        }
    }

    return text;
}

export class NullPayBackendClient {
    constructor(
        private readonly baseUrl: string,
        private readonly mcpSecret?: string
    ) {}

    private buildUrl(path: string): string {
        return `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(this.buildUrl(path), init);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(mapBackendError(path, text || `Backend request failed: ${response.status}`));
        }
        return await response.json() as T;
    }

    async getUserProfile(addressHash: string): Promise<UserProfile | null> {
        const response = await fetch(this.buildUrl(`/users/profile/${addressHash}`));
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.status}`);
        }
        return await response.json() as UserProfile;
    }

    async upsertUserProfile(body: {
        address_hash: string;
        main_address?: string;
        burner_address?: string | null;
        encrypted_burner_key?: string | null;
    }): Promise<UserProfile> {
        return await this.request<UserProfile>('/users/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    async createInvoiceRow(body: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
        return await this.request<InvoiceRecord>('/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    async updateInvoice(hash: string, body: Partial<InvoiceRecord> & { session_id?: string }): Promise<InvoiceRecord> {
        return await this.request<InvoiceRecord>(`/invoices/${hash}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    async updateCheckoutSession(id: string, body: { status: 'SETTLED' | 'FAILED'; tx_id?: string }): Promise<Record<string, unknown>> {
        return await this.request<Record<string, unknown>>(`/checkout/sessions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    async getInvoice(hash: string): Promise<InvoiceRecord> {
        return await this.request<InvoiceRecord>(`/invoice/${hash}`);
    }

    async getMerchantInvoices(merchantHash: string): Promise<InvoiceRecord[]> {
        return await this.request<InvoiceRecord[]>(`/invoices/merchant/${merchantHash}`);
    }

    async relayCreateInvoice(body: {
        merchant_address: string;
        amount: number;
        currency: string;
        salt: string;
        memo?: string;
        invoice_type?: number;
    }): Promise<{ success: boolean; tx_id: string; salt: string }> {
        return await this.request<{ success: boolean; tx_id: string; salt: string }>('/mcp/relay/create-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.mcpSecret ? { 'x-nullpay-mcp-secret': this.mcpSecret } : {})
            },
            body: JSON.stringify(body),
        });
    }

    async sponsorExecution(body: { execution_authorization_string: string; programName: string }): Promise<{ transaction?: { id?: string } }> {
        return await this.request<{ transaction?: { id?: string } }>('/dps/sponsor-sweep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
}
