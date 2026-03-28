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

export const getDefaultAllowedTokens = (tokenType: number): TokenCode[] => {
    if (tokenType === 3) {
        return [...ANY_ALLOWED_TOKENS];
    }

    const tokenCode = TOKEN_TYPE_TO_CODE[tokenType] || 'CREDITS';
    return [tokenCode];
};

export const getAllowedTokensForInvoice = (
    tokenType: number,
    invoiceType?: number
): TokenCode[] => {
    void invoiceType;
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
