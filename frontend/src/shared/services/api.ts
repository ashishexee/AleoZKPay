const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
import { hashAddress } from '../utils/core/crypto';
import { CardTokenCode } from '../types/tokens';
import { SupportFeedbackPayload, TelegramLinkSession, CompleteTelegramLinkSessionResponse, LinkedTelegramAccount } from '../types/common';
import { Invoice } from '../types/invoice';
import { UserProfile, CardWalletProfile, CardWalletUpsertPayload } from '../types/user';
import { 
    NullBotChatResponse 
} from '../types/bot';



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

export const deleteInvoice = async (
    hash: string,
    data: { merchant_address_hash: string; deletion_transaction_id?: string }
): Promise<{ success: boolean; invoice_hash: string; deletion_transaction_id: string | null }> => {
    const response = await fetch(`${API_URL}/invoices/${hash}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to delete invoice');
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

export const fetchLinkedTelegramAccounts = async (address: string): Promise<LinkedTelegramAccount[]> => {
    const hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/telegram/linked-accounts/${hash}`);
    if (!response.ok) {
        return [];
    }
    return response.json();
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

export const deleteCardWallet = async (
    address: string,
    mainAddress: string,
    message: string,
    signatureBase64: string,
    deletionTransactionId?: string
): Promise<{ success: boolean; deletion_transaction_id: string | null; card: CardWalletProfile | null }> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address_hash,
            main_address: mainAddress,
            message,
            signature_base64: signatureBase64,
            deletion_transaction_id: deletionTransactionId || null
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to delete card wallet');
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


export const chatWithNullBot = async (
    message: string,
    context: Record<string, unknown>
): Promise<NullBotChatResponse> => {
    const response = await fetch(`${API_URL}/nullbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error || 'Failed to chat with NullBot');
    }

    return payload;
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

export const getNotificationPreferences = async (address: string): Promise<{ notify_on_settled: boolean }> => {
    const hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/notifications/${hash}`);
    if (!response.ok) {
        if (response.status === 404) return { notify_on_settled: false };
        throw new Error('Failed to fetch notification preferences');
    }
    return response.json();
};

export const updateNotificationPreferences = async (
    address: string,
    prefs: { notify_on_settled: boolean }
): Promise<{ notify_on_settled: boolean }> => {
    const address_hash = await hashAddress(address);
    const response = await fetch(`${API_URL}/users/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_hash, ...prefs })
    });
    if (!response.ok) {
        throw new Error('Failed to update notification preferences');
    }
    return response.json();
};

export const submitSupportFeedback = async (
    payload: SupportFeedbackPayload
): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_URL}/support/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit support feedback');
    }

    return data;
};
