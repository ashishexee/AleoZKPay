import type { PendingToolCall } from '../../../../../types/nullbot';

export const formatPublicMappingBalance = (data: unknown, suffix: string) => {
    const normalize = (raw: unknown) => {
        const numeric = Number(String(raw ?? '').replace(suffix, '').replace(/"/g, '').replace(/_/g, ''));
        return Number.isFinite(numeric) ? (numeric / 1_000_000).toFixed(2) : '0.00';
    };

    if (typeof data === 'string' || typeof data === 'number') {
        return normalize(data);
    }

    if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>;
        if ('microcredits' in record) return normalize(record.microcredits);
        if ('amount' in record) return normalize(record.amount);
        if ('balance' in record) return normalize(record.balance);
        if ('value' in record) return normalize(record.value);
    }

    return '0.00';
};

export const getPendingToolPrompt = (toolCall: PendingToolCall) => {
    if (!toolCall) {
        return null;
    }

    if (toolCall.name === 'create_invoice') {
        if (toolCall.missingArgs.includes('optional_review')) {
            return 'Invoice draft ready. Add optional token/title/memo details, or say `continue`.';
        }
        return 'Invoice draft active. Reply with the missing invoice details like `0.1 credits` or say `cancel`.';
    }

    if (toolCall.name === 'sweep_funds') {
        return 'Sweep draft active. Reply with the amount and token you want to move, or say `cancel`.';
    }

    return 'Tool draft active. Reply with the missing details or say `cancel`.';
};
