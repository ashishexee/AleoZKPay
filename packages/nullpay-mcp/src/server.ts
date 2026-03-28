import { NullPayBackendClient } from './backend-client';
import { getRuntimeConfig } from './env';
import { StdioJsonRpcServer } from './protocol';
import { SessionStore } from './session-store';
import { NullPayMcpService } from './service';

function shieldStdoutForMcp() {
    const protocolWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write;
    (globalThis as any).__nullpayMcpStdoutWrite = (chunk: string) => protocolWrite(chunk);

    process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
        const text = typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
                ? chunk.toString('utf8')
                : String(chunk);

        process.stderr.write(text);

        if (typeof encoding === 'function') {
            encoding();
        } else if (typeof callback === 'function') {
            callback();
        }

        return true;
    }) as typeof process.stdout.write;
}

export function startServer() {
    shieldStdoutForMcp();

    const { backendBaseUrl, publicBaseUrl } = getRuntimeConfig();
    const backend = new NullPayBackendClient(backendBaseUrl);
    const sessions = new SessionStore();
    const service = new NullPayMcpService(backend, sessions, publicBaseUrl);

    const server = new StdioJsonRpcServer(async (request) => {
        if (request.method === 'initialize') {
            return {
                protocolVersion: String(request.params?.protocolVersion || '2025-11-25'),
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'nullpay-mcp',
                    version: '0.2.0'
                }
            };
        }

        if (request.method === 'notifications/initialized') {
            return {};
        }

        if (request.method === 'tools/list') {
            return { tools: service.listTools() };
        }

        if (request.method === 'tools/call') {
            const name = String(request.params?.name || '');
            const args = (request.params?.arguments || {}) as Record<string, unknown>;
            return await service.callTool(name, args);
        }

        return {};
    });

    console.error(`nullpay mcp starting against ${backendBaseUrl}`);
    server.start();
}
