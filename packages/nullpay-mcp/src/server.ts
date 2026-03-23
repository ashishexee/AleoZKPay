import fs from 'fs';
import path from 'path';
import { NullPayBackendClient } from './backend-client';
import { StdioJsonRpcServer } from './protocol';
import { SessionStore } from './session-store';
import { NullPayMcpService } from './service';

function parseDotEnv(content: string): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
        const separatorIndex = normalized.indexOf('=');
        if (separatorIndex <= 0) {
            continue;
        }

        const key = normalized.slice(0, separatorIndex).trim();
        let value = normalized.slice(separatorIndex + 1).trim();
        if (!key) {
            continue;
        }

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        parsed[key] = value;
    }

    return parsed;
}

function loadEnvFiles() {
    const packageRoot = path.resolve(__dirname, '..');
    const repoRoot = path.resolve(packageRoot, '..', '..');
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(packageRoot, '.env'),
        path.resolve(repoRoot, '.env'),
        path.resolve(repoRoot, 'backend', '.env'),
    ];

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const values = parseDotEnv(fs.readFileSync(filePath, 'utf8'));
        for (const [key, value] of Object.entries(values)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

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

loadEnvFiles();
shieldStdoutForMcp();

const backendBaseUrl = process.env.NULLPAY_BACKEND_URL || 'http://localhost:3000/api';
const publicBaseUrl = process.env.NULLPAY_PUBLIC_BASE_URL || 'https://nullpay.app';
const mcpSecret = process.env.NULLPAY_MCP_SHARED_SECRET;

const backend = new NullPayBackendClient(backendBaseUrl, mcpSecret);
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
                version: '0.1.0'
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
console.error('nullpay mcp starting');

server.start();

