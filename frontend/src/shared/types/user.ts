import { CardTokenCode } from './tokens';

export interface UserProfile {
    main_address: string;
    burner_address?: string | null;
    encrypted_burner_key?: string | null;
    profile_main_invoice_hash?: string | null;
    profile_burner_invoice_hash?: string | null;
    encrypted_address_check?: string | null;
    notify_on_settled?: boolean;
    updated_at?: string;
}

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
    card_status?: string;
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
