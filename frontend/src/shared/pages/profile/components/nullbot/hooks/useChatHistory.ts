import { useEffect, useState } from 'react';
import type { InvoiceData } from '../../../../../types/invoice';
import type { ChatMessage } from '../../../../../types/nullbot';
import {
    INITIAL_ASSISTANT_MESSAGE,
    MAX_HISTORY_MESSAGES,
    NULLBOT_HISTORY_KEY,
} from '../lib/constants';

export const useChatHistory = () => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window === 'undefined') {
            return [INITIAL_ASSISTANT_MESSAGE];
        }

        try {
            const stored = window.sessionStorage.getItem(NULLBOT_HISTORY_KEY);
            if (!stored) {
                return [INITIAL_ASSISTANT_MESSAGE];
            }

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                return [INITIAL_ASSISTANT_MESSAGE];
            }

            return parsed.slice(-MAX_HISTORY_MESSAGES);
        } catch {
            return [INITIAL_ASSISTANT_MESSAGE];
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.sessionStorage.setItem(
            NULLBOT_HISTORY_KEY,
            JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES))
        );
    }, [messages]);

    const appendMessage = (message: ChatMessage) => {
        setMessages((current) => [...current, message].slice(-MAX_HISTORY_MESSAGES));
    };

    const appendAssistantMessage = (content: string, invoiceData?: InvoiceData) => {
        appendMessage({
            id: Date.now() + Math.floor(Math.random() * 1000),
            role: 'assistant',
            content,
            invoiceData,
        });
    };

    return {
        messages,
        setMessages,
        appendMessage,
        appendAssistantMessage,
    };
};
