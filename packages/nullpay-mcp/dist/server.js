"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const backend_client_1 = require("./backend-client");
const protocol_1 = require("./protocol");
const session_store_1 = require("./session-store");
const service_1 = require("./service");
function parseDotEnv(content) {
    const parsed = {};
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
    const packageRoot = path_1.default.resolve(__dirname, '..');
    const repoRoot = path_1.default.resolve(packageRoot, '..', '..');
    const candidates = [
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(packageRoot, '.env'),
        path_1.default.resolve(repoRoot, '.env'),
        path_1.default.resolve(repoRoot, 'backend', '.env'),
    ];
    for (const filePath of candidates) {
        if (!fs_1.default.existsSync(filePath)) {
            continue;
        }
        const values = parseDotEnv(fs_1.default.readFileSync(filePath, 'utf8'));
        for (const [key, value] of Object.entries(values)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}
function shieldStdoutForMcp() {
    const protocolWrite = process.stdout.write.bind(process.stdout);
    globalThis.__nullpayMcpStdoutWrite = (chunk) => protocolWrite(chunk);
    process.stdout.write = ((chunk, encoding, callback) => {
        const text = typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
                ? chunk.toString('utf8')
                : String(chunk);
        process.stderr.write(text);
        if (typeof encoding === 'function') {
            encoding();
        }
        else if (typeof callback === 'function') {
            callback();
        }
        return true;
    });
}
loadEnvFiles();
shieldStdoutForMcp();
const backendBaseUrl = process.env.NULLPAY_BACKEND_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
const publicBaseUrl = process.env.NULLPAY_PUBLIC_BASE_URL || 'https://nullpay.app';
const mcpSecret = process.env.NULLPAY_MCP_SHARED_SECRET;
const backend = new backend_client_1.NullPayBackendClient(backendBaseUrl, mcpSecret);
const sessions = new session_store_1.SessionStore();
const service = new service_1.NullPayMcpService(backend, sessions, publicBaseUrl);
const server = new protocol_1.StdioJsonRpcServer(async (request) => {
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
        const args = (request.params?.arguments || {});
        return await service.callTool(name, args);
    }
    return {};
});
console.error('nullpay mcp starting');
server.start();
