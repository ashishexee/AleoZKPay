import type { ChatMessage } from '../../../../../types/nullbot';

export const NULLBOT_HISTORY_KEY = 'nullbot-dashboard-history';
export const MAX_HISTORY_MESSAGES = 20;

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
    id: 1,
    role: 'assistant',
    content:
        'I can answer dashboard questions and now trigger browser-side NullPay tools. Try something like `Make an invoice of 1 credit` and I will open the normal Shield signing flow instead of asking for any private key.',
};

export const QUICK_PROMPTS = [
    'Make an invoice of 1 credit',
    'Give me a full dashboard summary',
    'Show all my invoices',
    'List all receipt hashes',
];

export const TOOL_PILLS = [
    'create_invoice',
    'pay_invoice',
    'get_transaction_info',
    'get_analytics',
    'check_burner_balance',
];
