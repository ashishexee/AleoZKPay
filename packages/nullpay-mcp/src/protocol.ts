type JsonRpcId = string | number | null;

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: JsonRpcId;
    method: string;
    params?: Record<string, any>;
}

export class StdioJsonRpcServer {
    private buffer = '';

    constructor(
        private readonly onRequest: (request: JsonRpcRequest) => Promise<unknown>
    ) {}

    start(): void {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk: string) => {
            this.buffer += chunk;
            this.processBuffer().catch((error) => {
                console.error('[nullpay-mcp] transport error', error instanceof Error ? error.message : String(error));
                this.send({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
                    id: null,
                });
            });
        });
    }

    private async processBuffer(): Promise<void> {
        while (true) {
            const framed = this.tryReadFramedMessage();
            if (framed !== null) {
                const request = JSON.parse(framed) as JsonRpcRequest;
                console.error('[nullpay-mcp] parsed framed request', request.method, request.id);
                await this.handleMessage(request);
                continue;
            }

            const plain = this.tryReadPlainJsonMessage();
            if (plain !== null) {
                const request = JSON.parse(plain) as JsonRpcRequest;
                console.error('[nullpay-mcp] parsed plain request', request.method, request.id);
                await this.handleMessage(request);
                continue;
            }

            return;
        }
    }

    private tryReadFramedMessage(): string | null {
        let headerEnd = this.buffer.indexOf('\r\n\r\n');
        let headerLength = 4;

        if (headerEnd === -1) {
            headerEnd = this.buffer.indexOf('\n\n');
            headerLength = 2;
        }

        if (headerEnd === -1) {
            return null;
        }

        const header = this.buffer.slice(0, headerEnd);
        const contentLengthHeader = header
            .split(/\r?\n/)
            .find((line) => line.toLowerCase().startsWith('content-length:'));

        if (!contentLengthHeader) {
            return null;
        }

        const contentLength = Number(contentLengthHeader.split(':')[1].trim());
        const messageStart = headerEnd + headerLength;
        const messageEnd = messageStart + contentLength;
        if (this.buffer.length < messageEnd) {
            return null;
        }

        const message = this.buffer.slice(messageStart, messageEnd);
        this.buffer = this.buffer.slice(messageEnd);
        return message;
    }

    private tryReadPlainJsonMessage(): string | null {
        const trimmed = this.buffer.trim();
        if (!trimmed.startsWith('{')) {
            return null;
        }

        try {
            JSON.parse(trimmed);
            this.buffer = '';
            return trimmed;
        } catch {
            const newlineIndex = this.buffer.indexOf('\n');
            if (newlineIndex === -1) {
                return null;
            }

            const candidate = this.buffer.slice(0, newlineIndex).trim();
            if (!candidate.startsWith('{')) {
                this.buffer = this.buffer.slice(newlineIndex + 1);
                return null;
            }

            JSON.parse(candidate);
            this.buffer = this.buffer.slice(newlineIndex + 1);
            return candidate;
        }
    }

    private async handleMessage(request: JsonRpcRequest): Promise<void> {
        if (request.id === undefined || request.id === null) {
            await this.onRequest(request);
            return;
        }

        try {
            const result = await this.onRequest(request);
            console.error('[nullpay-mcp] sending response', request.method, request.id);
            this.send({ jsonrpc: '2.0', id: request.id, result });
        } catch (error) {
            console.error('[nullpay-mcp] request handler failed', request.method, request.id, error instanceof Error ? error.message : String(error));
            this.send({
                jsonrpc: '2.0',
                id: request.id,
                error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
            });
        }
    }

    send(payload: unknown): void {
        const body = JSON.stringify(payload);
        const safeWrite = ((globalThis as any).__nullpayMcpStdoutWrite as ((chunk: string) => boolean) | undefined)
            || ((chunk: string) => process.stdout.write(chunk));
        safeWrite(body + '\n');
    }
}
