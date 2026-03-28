"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const backend_client_1 = require("./backend-client");
const env_1 = require("./env");
const protocol_1 = require("./protocol");
const session_store_1 = require("./session-store");
const service_1 = require("./service");
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
function startServer() {
    shieldStdoutForMcp();
    const { backendBaseUrl, publicBaseUrl } = (0, env_1.getRuntimeConfig)();
    const backend = new backend_client_1.NullPayBackendClient(backendBaseUrl);
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
            const args = (request.params?.arguments || {});
            return await service.callTool(name, args);
        }
        return {};
    });
    console.error(`nullpay mcp starting against ${backendBaseUrl}`);
    server.start();
}
