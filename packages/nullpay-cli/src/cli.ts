#!/usr/bin/env node
import { onboard } from './commands/onboard';

const args = process.argv.slice(2);

if (args[0] === 'sdk' && args[1] === 'onboard') {
    onboard().catch((err) => {
        console.error('\n❌ Fatal error:', err.message || err);
        process.exit(1);
    });
} else {
    console.log(`
╔═══════════════════════════════════════╗
║           NullPay CLI v1.0.0          ║
╚═══════════════════════════════════════╝

Usage:
  nullpay sdk onboard    — Interactive invoice setup wizard
`);
    process.exit(0);
}
