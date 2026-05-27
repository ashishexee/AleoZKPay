export interface SupportFeedbackPayload {
    email: string;
    type: 'complaint' | 'feedback';
    message: string;
    walletAddress?: string;
}

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

export interface LinkedTelegramAccount {
    id: number;
    username: string | null;
    telegram_id: string | null;
    chat_id: string | null;
    notifications_enabled: boolean;
    linked_at: string | null;
}
