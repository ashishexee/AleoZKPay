export type TokenCode = 'CREDITS' | 'USDCX' | 'USAD';

export const TOKEN_CODE_TO_TYPE: Record<TokenCode, number> = {
    CREDITS: 0,
    USDCX: 1,
    USAD: 2,
};

export const TOKEN_TYPE_TO_CODE: Record<number, TokenCode> = {
    0: 'CREDITS',
    1: 'USDCX',
    2: 'USAD',
};

export const TOKEN_LABELS: Record<TokenCode, string> = {
    CREDITS: 'Credits',
    USDCX: 'USDCx',
    USAD: 'USAD',
};

export const ANY_ALLOWED_TOKENS: TokenCode[] = ['CREDITS', 'USDCX', 'USAD'];
export const STABLE_ALLOWED_TOKENS: TokenCode[] = ['USDCX', 'USAD'];

const normalizeAllowedToken = (value: string): TokenCode | null => {
    const normalized = value.toUpperCase();
    if (normalized === 'CREDITS' || normalized === 'USDCX' || normalized === 'USAD') {
        return normalized;
    }
    return null;
};

export const parseAllowedTokens = (value?: string[] | string | null): TokenCode[] | undefined => {
    if (!value) return undefined;
    const rawValues = Array.isArray(value) ? value : value.split(',');
    const normalized = rawValues
        .map((item) => normalizeAllowedToken(item.trim()))
        .filter((item): item is TokenCode => Boolean(item));

    if (normalized.length === 0) return undefined;
    return Array.from(new Set(normalized));
};

export const getDefaultAllowedTokens = (tokenType: number, invoiceType?: number): TokenCode[] => {
    if (tokenType === 3) {
        return invoiceType === 2 ? [...ANY_ALLOWED_TOKENS] : [...STABLE_ALLOWED_TOKENS];
    }

    const tokenCode = TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS';
    return [tokenCode];
};

export const getAllowedTokensForInvoice = (
    tokenType: number,
    invoiceType?: number,
    allowedTokens?: string[] | null
): TokenCode[] => {
    const parsed = parseAllowedTokens(allowedTokens);
    if (parsed && parsed.length > 0) return parsed;
    return getDefaultAllowedTokens(tokenType, invoiceType);
};

export const getTokenLabel = (
    tokenType: number,
    invoiceType?: number,
    allowedTokens?: string[] | null
): string => {
    if (tokenType === 3) {
        const resolved = getAllowedTokensForInvoice(tokenType, invoiceType, allowedTokens);
        if (resolved.length === 2 && resolved.includes('USDCX') && resolved.includes('USAD')) {
            return 'USDCx/USAD';
        }
        if (resolved.length === 3) {
            return 'Any Token';
        }
    }

    return TOKEN_LABELS[TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS'];
};

export const getTokenTypeFromCode = (tokenCode: TokenCode): number => TOKEN_CODE_TO_TYPE[tokenCode];

export const getTokenCodeFromType = (tokenType: number): TokenCode => TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS';
