type JsonRpcId = string | number | null;
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: JsonRpcId;
    method: string;
    params?: Record<string, any>;
}
export declare class StdioJsonRpcServer {
    private readonly onRequest;
    private buffer;
    constructor(onRequest: (request: JsonRpcRequest) => Promise<unknown>);
    start(): void;
    private processBuffer;
    private tryReadFramedMessage;
    private tryReadPlainJsonMessage;
    private handleMessage;
    send(payload: unknown): void;
}
export {};
