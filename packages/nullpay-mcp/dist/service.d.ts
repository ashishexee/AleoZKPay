import { NullPayBackendClient } from './backend-client';
import { SessionStore } from './session-store';
import { ToolResult } from './types';
export declare class NullPayMcpService {
    private readonly backend;
    private readonly sessions;
    private readonly publicBaseUrl;
    constructor(backend: NullPayBackendClient, sessions: SessionStore, publicBaseUrl: string);
    listTools(): ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                address: {
                    type: string;
                    description: string;
                };
                password: {
                    type: string;
                    description: string;
                };
                main_private_key: {
                    type: string;
                    description: string;
                };
                create_burner_wallet: {
                    type: string;
                    description: string;
                };
                wallet_preference: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                amount?: undefined;
                currency?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                wallet?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                amount: {
                    type: string;
                    description: string;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                title: {
                    type: string;
                    description: string;
                };
                memo: {
                    type: string;
                    description: string;
                };
                invoice_type: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                wallet: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                line_items: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
                            name: {
                                type: string;
                            };
                            quantity: {
                                type: string;
                            };
                            unitPrice: {
                                type: string;
                            };
                            total: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                payment_link: {
                    type: string;
                    description: string;
                };
                invoice_hash: {
                    type: string;
                    description: string;
                };
                wallet: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                amount: {
                    type: string;
                    description: string;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                session_id: {
                    type: string;
                    description: string;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                invoice_hash: {
                    type: string;
                    description?: undefined;
                };
                wallet: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                limit: {
                    type: string;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                amount?: undefined;
                currency?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                session_id?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                amount: {
                    type: string;
                    description: string;
                };
                destination: {
                    type: string;
                    description: string;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                wallet: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                gift_code: {
                    type: string;
                    description: string;
                };
                payment_link: {
                    type: string;
                    description: string;
                };
                invoice_hash: {
                    type: string;
                    description: string;
                };
                amount: {
                    type: string;
                    description?: undefined;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                session_id: {
                    type: string;
                    description?: undefined;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                wallet?: undefined;
                line_items?: undefined;
                limit?: undefined;
                destination?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                card_number: {
                    type: string;
                };
                pin: {
                    type: string;
                };
                card_secret: {
                    type: string;
                };
                payment_link: {
                    type: string;
                    description?: undefined;
                };
                invoice_hash: {
                    type: string;
                    description?: undefined;
                };
                amount: {
                    type: string;
                    description?: undefined;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                session_id: {
                    type: string;
                    description?: undefined;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                wallet?: undefined;
                line_items?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                days?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                wallet: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                days: {
                    type: string;
                    description: string;
                };
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                amount?: undefined;
                currency?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                address?: undefined;
                password?: undefined;
                main_private_key?: undefined;
                create_burner_wallet?: undefined;
                wallet_preference?: undefined;
                amount?: undefined;
                currency?: undefined;
                title?: undefined;
                memo?: undefined;
                invoice_type?: undefined;
                wallet?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
                destination?: undefined;
                gift_code?: undefined;
                card_number?: undefined;
                pin?: undefined;
                card_secret?: undefined;
                days?: undefined;
            };
            required: never[];
        };
    })[];
    callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
    private login;
    private createInvoice;
    private payInvoice;
    private getTransactionInfo;
    private resolveWallet;
    private resolveWalletAddress;
    private resolveWalletPrivateKey;
    private resolveWalletPrivateKeyOptional;
    private resolveInvoiceLookupPrivateKey;
    private resolvePayInvoiceContext;
    private enrichInvoiceIfPossible;
    private getEnrichedInvoice;
    private checkBurnerBalance;
    private sweepFunds;
    private payWithGiftcard;
    private payWithCard;
    private getAnalytics;
}
