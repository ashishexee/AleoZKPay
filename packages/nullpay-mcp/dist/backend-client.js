"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPayBackendClient = void 0;
function mapBackendError(path, text) {
    return text;
}
class NullPayBackendClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    buildUrl(path) {
        return `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    }
    async request(path, init) {
        const response = await fetch(this.buildUrl(path), init);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(mapBackendError(path, text || `Backend request failed: ${response.status}`));
        }
        return await response.json();
    }
    async getUserProfile(addressHash) {
        const response = await fetch(this.buildUrl(`/users/profile/${addressHash}`));
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.status}`);
        }
        return await response.json();
    }
    async upsertUserProfile(body) {
        return await this.request('/users/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async createInvoiceRow(body) {
        return await this.request('/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async updateInvoice(hash, body) {
        return await this.request(`/invoices/${hash}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async updateCheckoutSession(id, body) {
        return await this.request(`/checkout/sessions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async getInvoice(hash) {
        return await this.request(`/invoice/${hash}`);
    }
    async getMerchantInvoices(merchantHash) {
        return await this.request(`/invoices/merchant/${merchantHash}`);
    }
    async relayCreateInvoice(body) {
        return await this.request('/mcp/relay/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async sponsorExecution(body) {
        return await this.request('/dps/sponsor-sweep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async lookupCardWallet(cardNumberHash) {
        return await this.request('/users/card/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number_hash: cardNumberHash }),
        }).catch(() => null);
    }
}
exports.NullPayBackendClient = NullPayBackendClient;
