const SHIELD_NO_RESPONSE_PATTERNS = [
    'no response',
    'did not respond',
    'no_response',
    'timed out waiting for response',
];

export const isShieldNoResponseError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = message.toLowerCase();
    return SHIELD_NO_RESPONSE_PATTERNS.some(pattern => normalized.includes(pattern));
};

export const executeWithShieldRetry = async <T>(
    operation: () => Promise<T>,
    options?: {
        onRetry?: () => void;
        maxRetries?: number;
        retryDelayMs?: number;
    }
): Promise<T> => {
    const maxRetries = options?.maxRetries ?? 1;
    const retryDelayMs = options?.retryDelayMs ?? 900;

    let attempt = 0;
    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= maxRetries || !isShieldNoResponseError(error)) {
                throw error;
            }
            attempt += 1;
            options?.onRetry?.();
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
    }
};
