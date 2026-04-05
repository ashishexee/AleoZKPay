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
                memo?: undefined;
                invoice_type?: undefined;
                wallet?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                invoice_hash?: undefined;
                session_id?: undefined;
                limit?: undefined;
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
                    description?: undefined;
                };
                currency: {
                    type: string;
                    enum: string[];
                    description?: undefined;
                };
                memo: {
                    type: string;
                };
                invoice_type: {
                    type: string;
                    enum: string[];
                };
                wallet: {
                    type: string;
                    enum: string[];
                };
                line_items: {
                    type: string;
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
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                limit?: undefined;
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
                memo?: undefined;
                invoice_type?: undefined;
                line_items?: undefined;
                payment_link?: undefined;
                session_id?: undefined;
            };
            required?: undefined;
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
}
