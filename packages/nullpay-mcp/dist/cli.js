#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const setup_1 = require("./setup");
function printHelp() {
    console.log('NullPay MCP');
    console.log('');
    console.log('Usage:');
    console.log('  nullpay-mcp           Start the setup wizard');
    console.log('  nullpay-mcp setup     Start the setup wizard');
    console.log('  nullpay-mcp server    Run the stdio MCP server');
}
async function main() {
    const mode = (process.argv[2] || 'setup').toLowerCase();
    if (mode === 'server') {
        (0, server_1.startServer)();
        return;
    }
    if (mode === 'setup') {
        await (0, setup_1.runSetupWizard)();
        return;
    }
    if (mode === '--help' || mode === '-h' || mode === 'help') {
        printHelp();
        return;
    }
    console.error(`Unknown command: ${mode}`);
    printHelp();
    process.exitCode = 1;
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
