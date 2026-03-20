"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboard = onboard;
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const BACKEND_URL = 'http://localhost:3000/api';
const ALEO_PROGRAM = 'zk_pay_proofs_privacy_v20.aleo';
const ALEO_MAP_BASE = `https://api.provable.com/v2/testnet/program/${ALEO_PROGRAM}/mapping/salt_to_invoice`;
function printBanner() {
    console.log('');
    console.log(chalk_1.default.cyan('╔══════════════════════════════════════════════╗'));
    console.log(chalk_1.default.cyan('║') + chalk_1.default.bold.white('          NullPay SDK Onboard Wizard          ') + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('║') + chalk_1.default.gray('    Generate your nullpay.json config file    ') + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('╚══════════════════════════════════════════════╝'));
    console.log('');
}
function generateSalt() {
    const randomBuffer = crypto.randomBytes(16);
    let randomBigInt = BigInt(0);
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << BigInt(8)) + BigInt(byte);
    }
    return `${randomBigInt.toString()}field`;
}
async function pollForHash(salt, maxRetries = 60) {
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            const res = await (0, node_fetch_1.default)(`${ALEO_MAP_BASE}/${salt}`);
            if (res.ok) {
                const val = await res.json();
                if (val)
                    return val.toString().replace(/['"]/g, '');
            }
        }
        catch (_) {
            // transient, continue
        }
    }
    return null;
}
async function validateMerchant(secretKey, merchantAddress) {
    const res = await (0, node_fetch_1.default)(`${BACKEND_URL}/sdk/onboard/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify({ merchant_address: merchantAddress })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Validation failed (${res.status})`);
    }
    return res.json();
}
async function submitToRelayer(secretKey, invoice, salt) {
    const isDonation = invoice.type === 'donation';
    let invoiceTypeNum = invoice.type === 'multipay' ? 1 : 2;
    const res = await (0, node_fetch_1.default)(`${BACKEND_URL}/dps/relayer/create-invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify({
            amount: isDonation ? 0 : invoice.amount,
            currency: invoice.currency,
            salt,
            memo: invoice.label || '',
            invoice_type: invoiceTypeNum
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Relayer error (${res.status})`);
    }
}
function updateGitignore(projectRoot) {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const entry = 'nullpay.json';
    if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        if (!content.includes(entry)) {
            fs.appendFileSync(gitignorePath, `\n# NullPay — contains sensitive salt values\n${entry}\n`);
        }
    }
    else {
        fs.writeFileSync(gitignorePath, `# NullPay — contains sensitive salt values\n${entry}\n`);
    }
}
async function onboard() {
    printBanner();
    // ── STEP 1 & 2: Auth + Address ──────────────────────────────────────────
    const { secretKey } = await inquirer_1.default.prompt([{
            type: 'password',
            name: 'secretKey',
            message: 'Enter your NullPay Secret Key (sk_test_...):',
            mask: '*',
            validate: (v) => v.startsWith('sk_') ? true : 'Must start with sk_test_ or sk_live_'
        }]);
    const { merchantAddress } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'merchantAddress',
            message: 'Enter your Merchant Aleo Address (aleo1...):',
            validate: (v) => v.startsWith('aleo1') ? true : 'Must be a valid Aleo address starting with aleo1'
        }]);
    // ── STEP 3: Validate ─────────────────────────────────────────────────────
    const validateSpinner = (0, ora_1.default)('Verifying credentials with NullPay...').start();
    let merchantName;
    let resolvedAddress;
    try {
        const result = await validateMerchant(secretKey, merchantAddress);
        merchantName = result.merchant_name;
        resolvedAddress = result.merchant_address;
        validateSpinner.succeed(chalk_1.default.green(`✅ Verified! Welcome, ${chalk_1.default.bold(merchantName)}`));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        validateSpinner.fail(chalk_1.default.red(`❌ Validation failed: ${msg}`));
        process.exit(1);
    }
    console.log('');
    console.log(chalk_1.default.gray(`  Merchant Address : ${resolvedAddress}`));
    console.log('');
    // ── STEP 4: Multi-Pay Invoices ───────────────────────────────────────────
    console.log(chalk_1.default.bold.yellow('── MULTI-PAY INVOICES ──────────────────────────'));
    const { wantsMultipay } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'wantsMultipay',
            message: 'Do you want to create multi-pay invoices?',
            default: true
        }]);
    const multipayConfigs = [];
    if (wantsMultipay) {
        const { multipayCount } = await inquirer_1.default.prompt([{
                type: 'number',
                name: 'multipayCount',
                message: 'How many multi-pay invoices?',
                default: 1,
                validate: (v) => (v > 0 && v <= 20) ? true : 'Must be between 1 and 20'
            }]);
        for (let i = 1; i <= multipayCount; i++) {
            console.log(chalk_1.default.cyan(`\n  Invoice #${i}`));
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: `  Name (e.g. 'basic-tier', 'pro-plan'):`,
                    validate: (v) => v.trim().length > 0 ? true : 'Name cannot be empty'
                },
                {
                    type: 'number',
                    name: 'amount',
                    message: `  Amount:`,
                    validate: (v) => (v > 0) ? true : 'Amount must be greater than 0'
                },
                {
                    type: 'list',
                    name: 'currency',
                    message: `  Token:`,
                    choices: ['CREDITS', 'USDCX', 'USAD'],
                    default: 'CREDITS'
                }
            ]);
            multipayConfigs.push({
                name: answers.name.trim().toLowerCase().replace(/\s+/g, '-'),
                type: 'multipay',
                amount: answers.amount,
                currency: answers.currency,
                label: ''
            });
        }
    }
    // ── STEP 5: Donation Invoices ────────────────────────────────────────────
    console.log('');
    console.log(chalk_1.default.bold.yellow('── DONATION INVOICES ───────────────────────────'));
    const { wantsDonation } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'wantsDonation',
            message: 'Do you want to create donation-type invoices?',
            default: false
        }]);
    const donationConfigs = [];
    if (wantsDonation) {
        const { donationCount } = await inquirer_1.default.prompt([{
                type: 'number',
                name: 'donationCount',
                message: 'How many donation invoices?',
                default: 1,
                validate: (v) => (v > 0 && v <= 10) ? true : 'Must be between 1 and 10'
            }]);
        for (let i = 1; i <= donationCount; i++) {
            console.log(chalk_1.default.cyan(`\n  Donation #${i}`));
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: `  Name (e.g. 'open-donation', 'support-us'):`,
                    validate: (v) => v.trim().length > 0 ? true : 'Name cannot be empty'
                },
                {
                    type: 'list',
                    name: 'currency',
                    message: `  Token:`,
                    choices: ['CREDITS', 'USDCX', 'USAD'],
                    default: 'CREDITS'
                },
                {
                    type: 'input',
                    name: 'label',
                    message: `  Label/Memo (optional):`,
                    default: ''
                }
            ]);
            donationConfigs.push({
                name: answers.name.trim().toLowerCase().replace(/\s+/g, '-'),
                type: 'donation',
                amount: null,
                currency: answers.currency,
                label: answers.label
            });
        }
    }
    const allInvoices = [...multipayConfigs, ...donationConfigs];
    if (allInvoices.length === 0) {
        console.log(chalk_1.default.yellow('\n  No invoices configured. Exiting.'));
        process.exit(0);
    }
    // ── STEP 6: Confirmation Summary ─────────────────────────────────────────
    console.log('');
    console.log(chalk_1.default.bold('── SUMMARY ─────────────────────────────────────'));
    console.log(chalk_1.default.gray(`  Merchant : ${resolvedAddress}`));
    console.log('');
    allInvoices.forEach((inv, i) => {
        const typeLabel = inv.type === 'multipay' ? chalk_1.default.blue('[Multi-Pay]') : chalk_1.default.magenta('[Donation]');
        const amtLabel = inv.amount !== null ? `${inv.amount} ${inv.currency}` : `Open (${inv.currency})`;
        console.log(`  ${i + 1}. ${typeLabel} ${chalk_1.default.bold(inv.name)} — ${amtLabel}`);
    });
    console.log('');
    console.log(chalk_1.default.yellow('  ⚠️  Each invoice will submit an Aleo transaction (~60-120s each)'));
    console.log('');
    const { confirmed } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: `Proceed to generate ${allInvoices.length} invoice(s) on-chain?`,
            default: true
        }]);
    if (!confirmed) {
        console.log(chalk_1.default.gray('\n  Aborted. No transactions submitted.'));
        process.exit(0);
    }
    // ── STEP 7: Generation ───────────────────────────────────────────────────
    console.log('');
    const generatedInvoices = [];
    for (let i = 0; i < allInvoices.length; i++) {
        const inv = allInvoices[i];
        const salt = generateSalt();
        const label = inv.name;
        const spinner = (0, ora_1.default)(`[${i + 1}/${allInvoices.length}] Submitting "${label}" to Aleo network...`).start();
        try {
            await submitToRelayer(secretKey, inv, salt);
            spinner.text = `[${i + 1}/${allInvoices.length}] Waiting for blockchain confirmation for "${label}"...`;
            const hash = await pollForHash(salt);
            if (!hash) {
                spinner.fail(chalk_1.default.red(`  ❌ Timed out waiting for hash on "${label}". Skipping.`));
                continue;
            }
            spinner.succeed(chalk_1.default.green(`  ✅ "${label}" confirmed — hash: ${chalk_1.default.gray(hash.substring(0, 20))}...`));
            generatedInvoices.push({
                ...inv,
                hash,
                salt
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            spinner.fail(chalk_1.default.red(`  ❌ Failed to generate "${label}": ${msg}`));
        }
    }
    if (generatedInvoices.length === 0) {
        console.log(chalk_1.default.red('\n  No invoices were successfully generated. Exiting.'));
        process.exit(1);
    }
    // ── STEP 8: Write nullpay.json ───────────────────────────────────────────
    const projectRoot = process.cwd();
    const outputPath = path.join(projectRoot, 'nullpay.json');
    const output = {
        merchant: resolvedAddress,
        generated_at: new Date().toISOString(),
        invoices: generatedInvoices
    };
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    updateGitignore(projectRoot);
    console.log('');
    console.log(chalk_1.default.bold.green('══════════════════════════════════════════════'));
    console.log(chalk_1.default.bold.green('  🎉  nullpay.json generated successfully!'));
    console.log(chalk_1.default.bold.green('══════════════════════════════════════════════'));
    console.log('');
    console.log(chalk_1.default.gray(`  File     : ${outputPath}`));
    console.log(chalk_1.default.gray(`  Merchant : ${resolvedAddress}`));
    console.log(chalk_1.default.gray(`  Invoices : ${generatedInvoices.length} generated`));
    console.log('');
    console.log(chalk_1.default.yellow('  ⚠️  nullpay.json has been added to .gitignore (contains sensitive salts)'));
    console.log('');
    console.log(chalk_1.default.bold('  Use in your app:'));
    console.log(chalk_1.default.cyan(`
  import { NullPay } from '@nullpay/node';

  const nullpay = new NullPay({ secretKey: process.env.NULLPAY_SECRET_KEY });

  // Reference by name (recommended):
  const session = await nullpay.checkout.sessions.create({
    nullpay_invoice_name: '${generatedInvoices[0]?.name || 'your-invoice-name'}',
    success_url: 'https://yourapp.com/success',
    cancel_url: 'https://yourapp.com/cancel'
  });
`));
}
