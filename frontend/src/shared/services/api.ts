const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
import { hashAddress } from '../utils/crypto';

export interface Invoice {
    invoice_hash: string;
    merchant_address: string;
    merchant_address_hash?: string;
    designated_address?: string;
    is_burner?: boolean;
    for_sdk?: boolean;
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
    invoice_items?: { name: string; quantity: number; unitPrice: number; total: number }[];
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
    const hash = await hashAddress(merchant);
    console.log(`📡 [API CALL] Fetching invoices for merchant: ${merchant} (Hash: ${hash})`);

    const response = await fetch(`${API_URL}/invoices/merchant/${hash}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status}`);
    }

    const data = await response.json();
    return data;
};
export const fetchInvoicesByMerchantForSdk = async (
    merchant: string,
    options?: { forSdk?: boolean }
): Promise<Invoice[]> => {
    const hash = await hashAddress(merchant);
    const url = new URL(`${API_URL}/invoices/merchant/${hash}`);
    if (options?.forSdk) {
        url.searchParams.append('for_sdk', 'true');
    }

    const response = await fetch(url.toString());
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

export interface UserProfile {
    main_address: string;
    burner_address?: string | null;
    encrypted_burner_key?: string | null;
    profile_main_invoice_hash?: string | null;
    profile_burner_invoice_hash?: string | null;
    encrypted_address_check?: string | null;
    updated_at?: string;
}

export type CardTokenCode = 'CREDITS' | 'USDCX' | 'USAD';

export interface CardTokenLimits {
    max_balance: number;
}

export interface CardWalletProfile {
    address_hash: string;
    main_owner?: string | null;
    mainOwner?: string | null;
    card_address: string;
    encrypted_card_address?: string | null;
    card_number?: string | null;
    encrypted_card_number?: string | null;
    card_number_hash?: string | null;
    card_number_hash_field?: string | null;
    card_last4?: string | null;
    encrypted_card_private_key: string;
    card_kdf_salt: string;
    card_kdf_algorithm: string;
    card_kdf_params: Record<string, unknown> | null;
    card_status: string;
    card_label?: string | null;
    card_hint?: string | null;
    card_limits_updated_at?: string | null;
    limits: Record<CardTokenCode, CardTokenLimits>;
}

export interface CardWalletUpsertPayload {
    main_address?: string | null;
    card_address?: string | null;
    encrypted_card_number?: string | null;
    card_number_hash?: string | null;
    card_last4?: string | null;
    encrypted_card_private_key?: string | null;
    card_kdf_salt?: string | null;
    card_kdf_algorithm?: string | null;
    card_kdf_params?: Record<string, unknown> | null;
    card_status?: string;
    card_label?: string | null;
    card_hint?: string | null;
    limits?: Partial<Record<CardTokenCode, Partial<CardTokenLimits>>>;
}

export const getUserProfile = async (address: string): Promise<UserProfile | null> => {
    const hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/profile/${hash}`);
    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        throw new Error('Failed to fetch user profile');
    }
    return response.json();
};

export const updateUserProfile = async (
    address: string,
    encrypted_main_address: string,
    burner_address?: string,
    encrypted_burner_key?: string,
    profile_main_invoice_hash?: string,
    profile_burner_invoice_hash?: string
): Promise<UserProfile> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            address_hash,
            main_address: encrypted_main_address,
            burner_address,
            encrypted_burner_key,
            profile_main_invoice_hash,
            profile_burner_invoice_hash
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to update user profile');
    }

    return response.json();
};

export const clearBurnerData = async (address: string): Promise<void> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/profile/clear-burner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_hash }),
    });
    if (!response.ok) {
        throw new Error('Failed to clear burner data');
    }
};

export const getCardWallet = async (address: string): Promise<CardWalletProfile | null> => {
    const hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/card/${hash}`);
    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        throw new Error('Failed to fetch card wallet');
    }
    return response.json();
};

export const upsertCardWallet = async (
    address: string,
    payload: CardWalletUpsertPayload
): Promise<CardWalletProfile> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address_hash,
            ...payload
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to save card wallet');
    }

    return response.json();
};

export interface TelegramLinkSession {
    token: string;
    telegram_id: number;
    chat_id: number;
    nonce: string;
    expires_at: string;
    consumed_at?: string | null;
    is_expired?: boolean;
    is_consumed?: boolean;
    message: string;
    link_url: string;
}

export interface CompleteTelegramLinkSessionResponse {
    success: boolean;
    user: {
        telegram_id: number;
        username?: string | null;
        chat_id: number;
        aleo_address: string;
        aleo_address_hash?: string | null;
        notifications_enabled?: boolean;
        linked_at?: string | null;
        updated_at?: string | null;
    };
    telegram_app_url?: string | null;
    telegram_web_url?: string | null;
}

export const fetchTelegramLinkSession = async (token: string): Promise<TelegramLinkSession> => {
    const response = await fetch(`${API_URL}/telegram/link-sessions/${encodeURIComponent(token)}`);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load Telegram link session');
    }

    return payload;
};

export const completeTelegramLinkSession = async (payload: {
    token: string;
    aleo_address: string;
    signature_base64: string;
    username?: string;
    aleo_address_client_ciphertext?: string;
}): Promise<CompleteTelegramLinkSessionResponse> => {
    const response = await fetch(`${API_URL}/telegram/link-sessions/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(body?.error || 'Failed to complete Telegram wallet link');
    }

    return body;
};

export const lookupCardWalletByNumberHash = async (
    cardNumberHash: string
): Promise<CardWalletProfile | null> => {
    const response = await fetch(`${API_URL}/users/card/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_number_hash: cardNumberHash })
    });

    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to look up card wallet');
    }

    return response.json();
};

export const submitCardLimitChange = async (
    address: string,
    mainAddress: string,
    message: string,
    signatureBase64: string
): Promise<CardWalletProfile> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/card/limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address_hash,
            main_address: mainAddress,
            message,
            signature_base64: signatureBase64
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to update card limits');
    }

    return response.json();
};

export const recordCardSpend = async (
    address: string,
    token: CardTokenCode,
    amountMicro: number
): Promise<CardWalletProfile> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/card/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address_hash,
            token,
            amount_micro: amountMicro
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to record card spend');
    }

    return response.json();
};

export const chatWithDashboardAssistant = async (
    message: string,
    context: Record<string, unknown>
): Promise<string> => {
    const response = await fetch(`${API_URL}/dashboard-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error || 'Failed to chat with dashboard assistant');
    }

    return payload.reply;
};

export const chatWithDeveloperAssistant = async (
    message: string,
    context: Record<string, unknown>
): Promise<string> => {
    const response = await fetch(`${API_URL}/developer-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error || 'Failed to chat with developer assistant');
    }

    return payload.reply;
};
