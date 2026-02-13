const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Invoice {
    invoice_hash: string;
    merchant_address: string;
    payer_address?: string;
    amount: number;
    memo?: string;
    status: 'PENDING' | 'SETTLED';
    block_height?: number;
    block_settled?: number;
    invoice_transaction_id?: string;
    payment_tx_ids?: string[];
    payment_tx_id?: string;
    created_at?: string;
    updated_at?: string;
    salt?: string;
    invoice_type?: number;
    token_type?: number;
}

export const fetchInvoices = async (status?: string): Promise<Invoice[]> => {
    const url = new URL(`${API_URL}/invoices`);
    if (status) {
        url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch invoices');
    }
    return response.json();
};

export const fetchInvoiceByHash = async (hash: string): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoice/${hash}`);
    if (!response.ok) {
        throw new Error('Failed to fetch invoice');
    }
    return response.json();
};

export const createInvoice = async (data: Partial<Invoice>): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create invoice');
    }
    return response.json();
};

export const updateInvoiceStatus = async (hash: string, data: Partial<Invoice>): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoices/${hash}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update invoice');
    }
    return response.json();
};

export const fetchInvoicesByMerchant = async (merchant: string): Promise<Invoice[]> => {
    const response = await fetch(`${API_URL}/invoices/merchant/${merchant}`);
    if (!response.ok) {
        throw new Error('Failed to fetch merchant invoices');
    }
    return response.json();
};

export const fetchRecentTransactions = async (limit: number = 10): Promise<Invoice[]> => {
    const response = await fetch(`${API_URL}/invoices/recent?limit=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to fetch recent transactions');
    }
    return response.json();
};
