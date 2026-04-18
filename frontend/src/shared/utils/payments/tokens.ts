import { TokenCode } from '../../types/tokens';

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

const isTokenCode = (value: string): value is TokenCode => value === 'CREDITS' || value === 'USDCX' || value === 'USAD';

export const getDefaultAllowedTokens = (tokenType: number): TokenCode[] => {
    if (tokenType === 3) {
        return [...ANY_ALLOWED_TOKENS];
    }

    const tokenCode = TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS';
    return [tokenCode];
};

export const getAllowedTokensForInvoice = (
    tokenType: number,
    invoiceType?: number,
    allowedTokens?: readonly string[] | null
): TokenCode[] => {
    void invoiceType;
    if (Array.isArray(allowedTokens) && allowedTokens.length > 0) {
        const normalized = allowedTokens
            .map((token) => token?.toUpperCase?.())
            .filter(isTokenCode);
        if (normalized.length > 0) {
            return normalized;
        }
    }
    return getDefaultAllowedTokens(tokenType);
};

export const getTokenLabel = (
    tokenType: number,
    invoiceType?: number
): string => {
    void invoiceType;
    if (tokenType === 3) {
        return 'Any Token';
    }

    return TOKEN_LABELS[TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS'];
};

export const getTokenTypeFromCode = (tokenCode: TokenCode): number => TOKEN_CODE_TO_TYPE[tokenCode];

export const getTokenCodeFromType = (tokenType: number): TokenCode => TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS';
