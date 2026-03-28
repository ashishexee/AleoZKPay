#!/usr/bin/env node

import { startServer } from './server';
import { runSetupWizard } from './setup';

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
        startServer();
        return;
    }

    if (mode === 'setup') {
        await runSetupWizard();
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
