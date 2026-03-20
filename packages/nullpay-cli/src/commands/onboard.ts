import inquirer from 'inquirer';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const BACKEND_URL = 'http://localhost:3000/api';
const ALEO_PROGRAM = 'zk_pay_proofs_privacy_v20.aleo';
const ALEO_MAP_BASE = `https://api.provable.com/v2/testnet/program/${ALEO_PROGRAM}/mapping/salt_to_invoice`;

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
    brand:    chalk.hex('#00FFD1'),       // mint/cyan — primary brand
    brandDim: chalk.hex('#00B894'),       // muted brand
    gold:     chalk.hex('#FFD166'),       // warm gold — highlights
    rose:     chalk.hex('#FF6B8A'),       // error / warning
    slate:    chalk.hex('#8892A4'),       // secondary text
    white:    chalk.hex('#F0F4FF'),       // primary text
    dim:      chalk.hex('#3A4055'),       // borders / dividers
    success:  chalk.hex('#06D6A0'),       // success
    purple:   chalk.hex('#A78BFA'),       // accent for types
    orange:   chalk.hex('#FB923C'),       // donation accent
    bg:       chalk.bgHex('#0A0D14'),     // "bg" tint for labels
};

// ── Typography / Layout ───────────────────────────────────────────────────────
const W = 56; // total inner width
const line  = (content: string) => console.log(content);
const blank = ()                 => line('');
const rule  = (char = '─')      => C.dim('  ' + char.repeat(W));
const tag   = (label: string, color: chalk.Chalk = C.brand) =>
    color.bold(` ${label} `);

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner(): void {
    blank();
    line(C.dim('  ┌' + '─'.repeat(W) + '┐'));
    line(C.dim('  │') + ' '.repeat(W) + C.dim('│'));
    line(
        C.dim('  │') +
        ' '.repeat(10) +
        C.brand.bold('◈ NULLPAY') +
        C.slate('  ·  ') +
        C.white.bold('SDK Onboard Wizard') +
        ' '.repeat(9) +
        C.dim('│')
    );
    line(
        C.dim('  │') +
        ' '.repeat(12) +
        C.slate('Zero-knowledge blockchain invoicing') +
        ' '.repeat(9) +
        C.dim('│')
    );
    line(C.dim('  │') + ' '.repeat(W) + C.dim('│'));
    line(C.dim('  └' + '─'.repeat(W) + '┘'));
    blank();
    line(C.slate(`  Version 1.0.0  ·  Aleo Testnet  ·  ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`));
    blank();
}

// ── Section header ────────────────────────────────────────────────────────────
function section(step: number, total: number, title: string): void {
    blank();
    line(rule());
    line(
        C.dim('  │ ') +
        C.slate(`Step ${step}/${total}`) +
        '  ' +
        C.white.bold(title) +
        '  ' +
        C.brand('◈')
    );
    line(rule());
    blank();
}

// ── Key-value info row ────────────────────────────────────────────────────────
function kv(key: string, value: string, valueColor: chalk.Chalk = C.white): void {
    const pad = 18;
    line(`  ${C.slate(key.padEnd(pad))} ${valueColor(value)}`);
}

// ── Spinner factory ───────────────────────────────────────────────────────────
function spin(text: string): Ora {
    return ora({
        text,
        spinner: 'dots12',
        color: 'cyan',
        prefixText: '  ',
    }).start();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function generateSalt(): string {
    const buf = crypto.randomBytes(16);
    let n = BigInt(0);
    for (const b of buf) n = (n << BigInt(8)) + BigInt(b);
    return `${n.toString()}field`;
}

function truncateHash(hash: string, len = 24): string {
    return hash.length > len ? hash.slice(0, len) + '…' : hash;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface InvoiceConfig {
    name:     string;
    type:     'multipay' | 'donation';
    amount:   number | null;
    currency: string;
    label:    string;
}

interface GeneratedInvoice extends InvoiceConfig {
    hash: string;
    salt: string;
}

interface NullPayJson {
    merchant:     string;
    generated_at: string;
    invoices:     GeneratedInvoice[];
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function validateMerchant(
    secretKey: string,
    merchantAddress: string,
): Promise<{ merchant_name: string; merchant_address: string }> {
    const res = await fetch(`${BACKEND_URL}/sdk/onboard/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`,
        },
        body: JSON.stringify({ merchant_address: merchantAddress }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `Validation failed (${res.status})`);
    }
    return res.json() as Promise<{ merchant_name: string; merchant_address: string }>;
}

async function submitToRelayer(
    secretKey: string,
    invoice: InvoiceConfig,
    salt: string,
): Promise<void> {
    const invoiceTypeNum = invoice.type === 'multipay' ? 1 : 2;
    const res = await fetch(`${BACKEND_URL}/dps/relayer/create-invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
            amount:       invoice.type === 'donation' ? 0 : invoice.amount,
            currency:     invoice.currency,
            salt,
            memo:         invoice.label ?? '',
            invoice_type: invoiceTypeNum,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `Relayer error (${res.status})`);
    }
}

async function pollForHash(salt: string, maxRetries = 60): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            const res = await fetch(`${ALEO_MAP_BASE}/${salt}`);
            if (res.ok) {
                const val = await res.json();
                if (val) return val.toString().replace(/['"]/g, '');
            }
        } catch (_) { /* transient */ }
    }
    return null;
}

function updateGitignore(projectRoot: string): void {
    const p = path.join(projectRoot, '.gitignore');
    const entry = 'nullpay.json';
    if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (!content.includes(entry))
            fs.appendFileSync(p, `\n# NullPay — contains sensitive salt values\nnullpay.json\n`);
    } else {
        fs.writeFileSync(p, `# NullPay — contains sensitive salt values\nnullpay.json\n`);
    }
}

// ── Invoice summary card ──────────────────────────────────────────────────────
function renderInvoiceCard(inv: InvoiceConfig, index: number): void {
    const typeLabel = inv.type === 'multipay'
        ? tag('MULTI-PAY', C.brand)
        : tag('DONATION', C.orange);
    const amtLabel = inv.amount !== null
        ? C.gold.bold(`${inv.amount} ${inv.currency}`)
        : C.slate(`Open · ${inv.currency}`);

    line(
        `  ${C.slate(`${String(index).padStart(2, '0')}.`)}  ` +
        typeLabel +
        C.dim('  ') +
        C.white.bold(inv.name) +
        C.dim('  ─  ') +
        amtLabel
    );
}

// ── Generated invoice result card ────────────────────────────────────────────
function renderResultCard(inv: GeneratedInvoice, index: number, total: number): void {
    const typeColor = inv.type === 'multipay' ? C.brand : C.orange;
    const amtLabel  = inv.amount !== null
        ? C.gold(`${inv.amount} ${inv.currency}`)
        : C.slate(`open / ${inv.currency}`);

    line(C.dim('  ┌─────────────────────────────────────────────────────────┐'));
    line(C.dim('  │ ') + C.success('✔') + '  ' + typeColor.bold(inv.name.toUpperCase()) + C.dim(`  [${index}/${total}]`) + C.dim(' '.repeat(Math.max(0, W - inv.name.length - 14)) + '│'));
    line(C.dim('  │') + ' '.repeat(W) + C.dim('│'));
    line(C.dim('  │  ') + C.slate('type    ') + '  ' + typeColor(inv.type)                    + C.dim(' '.repeat(Math.max(0, W - inv.type.length - 12)) + '│'));
    line(C.dim('  │  ') + C.slate('amount  ') + '  ' + amtLabel                               + C.dim(' '.repeat(Math.max(0, W - (inv.amount !== null ? `${inv.amount} ${inv.currency}` : `open / ${inv.currency}`).length - 12)) + '│'));
    line(C.dim('  │  ') + C.slate('hash    ') + '  ' + C.brandDim(truncateHash(inv.hash, 36)) + C.dim(' '.repeat(Math.max(0, W - Math.min(36, inv.hash.length) - 13)) + '│'));
    line(C.dim('  └─────────────────────────────────────────────────────────┘'));
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function onboard(): Promise<void> {
    printBanner();

    // ── Step 1 — Authentication ───────────────────────────────────────────────
    section(1, 4, 'Authentication');

    const { secretKey } = await inquirer.prompt([{
        type:     'password',
        name:     'secretKey',
        message:  C.slate('Secret Key') + ' ' + C.dim('(sk_test_... or sk_live_...)'),
        mask:     '•',
        prefix:   C.brand('  ◆'),
        validate: (v: string) =>
            v.startsWith('sk_') ? true : C.rose('Must start with sk_test_ or sk_live_'),
    }]);

    const { merchantAddress } = await inquirer.prompt([{
        type:     'input',
        name:     'merchantAddress',
        message:  C.slate('Aleo Address') + ' ' + C.dim('(aleo1...)'),
        prefix:   C.brand('  ◆'),
        validate: (v: string) =>
            v.startsWith('aleo1') ? true : C.rose('Must be a valid Aleo address (aleo1...)'),
    }]);

    // ── Step 2 — Validation ───────────────────────────────────────────────────
    section(2, 4, 'Verifying Credentials');

    const spinner = spin('Connecting to NullPay network...');
    let merchantName: string;
    let resolvedAddress: string;

    try {
        const result = await validateMerchant(secretKey, merchantAddress);
        merchantName    = result.merchant_name;
        resolvedAddress = result.merchant_address;
        spinner.stopAndPersist({
            symbol: C.success('  ✔'),
            text:   C.white('Merchant verified'),
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        spinner.stopAndPersist({ symbol: C.rose('  ✖'), text: C.rose(`Auth failed: ${msg}`) });
        process.exit(1);
    }

    blank();
    kv('Merchant',  merchantName!,   C.white.bold);
    kv('Address',   resolvedAddress, C.brandDim);
    kv('Network',   'Aleo Testnet',  C.purple);
    kv('Status',    'Active',        C.success.bold);
    blank();

    // ── Step 3 — Invoice Configuration ───────────────────────────────────────
    section(3, 4, 'Invoice Configuration');

    const multipayConfigs: InvoiceConfig[] = [];
    const donationConfigs: InvoiceConfig[] = [];

    // Multi-pay
    line(`  ${C.brand('◈')} ${C.white.bold('Multi-Pay Invoices')}  ${C.slate('— Fixed-amount recurring payments')}`);
    blank();

    const { wantsMultipay } = await inquirer.prompt([{
        type:    'confirm',
        name:    'wantsMultipay',
        message: C.slate('Create multi-pay invoices?'),
        prefix:  C.dim('  ·'),
        default: true,
    }]);

    if (wantsMultipay) {
        const { multipayCount } = await inquirer.prompt([{
            type:     'number',
            name:     'multipayCount',
            message:  C.slate('How many?'),
            prefix:   C.dim('  ·'),
            default:  1,
            validate: (v: number) => (v > 0 && v <= 20) ? true : C.rose('Between 1 – 20'),
        }]);

        for (let i = 1; i <= multipayCount; i++) {
            blank();
            line(`  ${C.brand.bold(`Invoice #${i}`)}  ${C.dim('─'.repeat(30))}`);
            const a = await inquirer.prompt([
                {
                    type:     'input',
                    name:     'name',
                    message:  C.slate('Name'),
                    prefix:   C.dim('    ›'),
                    suffix:   C.dim('  e.g. pro-plan'),
                    validate: (v: string) => v.trim().length ? true : C.rose('Cannot be empty'),
                },
                {
                    type:     'number',
                    name:     'amount',
                    message:  C.slate('Amount'),
                    prefix:   C.dim('    ›'),
                    validate: (v: number) => v > 0 ? true : C.rose('Must be > 0'),
                },
                {
                    type:     'list',
                    name:     'currency',
                    message:  C.slate('Token'),
                    prefix:   C.dim('    ›'),
                    choices:  [
                        { name: `${C.brand('CREDITS')}  ${C.slate('· native Aleo')}`, value: 'CREDITS' },
                        { name: `${C.gold('USDCX')}    ${C.slate('· USD stablecoin')}`, value: 'USDCX' },
                        { name: `${C.purple('USAD')}     ${C.slate('· Aleo-native USD')}`, value: 'USAD' },
                    ],
                },
            ]);
            multipayConfigs.push({
                name:     a.name.trim().toLowerCase().replace(/\s+/g, '-'),
                type:     'multipay',
                amount:   a.amount,
                currency: a.currency,
                label:    '',
            });
        }
    }

    // Donation
    blank();
    line(`  ${C.orange('◈')} ${C.white.bold('Donation Invoices')}  ${C.slate('— Open-amount contributions')}`);
    blank();

    const { wantsDonation } = await inquirer.prompt([{
        type:    'confirm',
        name:    'wantsDonation',
        message: C.slate('Create donation invoices?'),
        prefix:  C.dim('  ·'),
        default: false,
    }]);

    if (wantsDonation) {
        const { donationCount } = await inquirer.prompt([{
            type:     'number',
            name:     'donationCount',
            message:  C.slate('How many?'),
            prefix:   C.dim('  ·'),
            default:  1,
            validate: (v: number) => (v > 0 && v <= 10) ? true : C.rose('Between 1 – 10'),
        }]);

        for (let i = 1; i <= donationCount; i++) {
            blank();
            line(`  ${C.orange.bold(`Donation #${i}`)}  ${C.dim('─'.repeat(28))}`);
            const a = await inquirer.prompt([
                {
                    type:     'input',
                    name:     'name',
                    message:  C.slate('Name'),
                    prefix:   C.dim('    ›'),
                    suffix:   C.dim('  e.g. support-us'),
                    validate: (v: string) => v.trim().length ? true : C.rose('Cannot be empty'),
                },
                {
                    type:    'list',
                    name:    'currency',
                    message: C.slate('Token'),
                    prefix:  C.dim('    ›'),
                    choices: [
                        { name: `${C.brand('CREDITS')}`, value: 'CREDITS' },
                        { name: `${C.gold('USDCX')}`,   value: 'USDCX'   },
                        { name: `${C.purple('USAD')}`,   value: 'USAD'    },
                    ],
                },
                {
                    type:    'input',
                    name:    'label',
                    message: C.slate('Memo') + C.dim(' (optional)'),
                    prefix:  C.dim('    ›'),
                    default: '',
                },
            ]);
            donationConfigs.push({
                name:     a.name.trim().toLowerCase().replace(/\s+/g, '-'),
                type:     'donation',
                amount:   null,
                currency: a.currency,
                label:    a.label,
            });
        }
    }

    const allInvoices = [...multipayConfigs, ...donationConfigs];
    if (allInvoices.length === 0) {
        blank();
        line(`  ${C.gold('◈')}  ${C.white('No invoices configured.')}  ${C.slate('Exiting.')}`);
        process.exit(0);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    blank();
    line(rule('═'));
    line(`  ${C.white.bold('DEPLOYMENT SUMMARY')}`);
    line(rule('═'));
    blank();
    kv('Merchant',  resolvedAddress,             C.brandDim);
    kv('Invoices',  `${allInvoices.length} total`, C.white.bold);
    kv('Est. time', `${allInvoices.length * 2}–${allInvoices.length * 3} min`, C.slate);
    blank();

    allInvoices.forEach((inv, i) => renderInvoiceCard(inv, i + 1));

    blank();
    line(`  ${C.gold('⚠')}  ${C.slate('Each invoice submits a live Aleo transaction (60–120s each)')}`);
    blank();

    const { confirmed } = await inquirer.prompt([{
        type:    'confirm',
        name:    'confirmed',
        message: C.white.bold(`Deploy ${allInvoices.length} invoice(s) to Aleo?`),
        prefix:  C.gold('  ◆'),
        default: true,
    }]);

    if (!confirmed) {
        blank();
        line(`  ${C.slate('Aborted. No transactions submitted.')}`);
        process.exit(0);
    }

    // ── Step 4 — On-chain Generation ──────────────────────────────────────────
    section(4, 4, 'On-Chain Deployment');

    const generatedInvoices: GeneratedInvoice[] = [];

    for (let i = 0; i < allInvoices.length; i++) {
        const inv  = allInvoices[i];
        const salt = generateSalt();
        const pfx  = C.dim(`  [${i + 1}/${allInvoices.length}]`);

        const sp = spin(`${pfx.toString()} Submitting "${C.brand(inv.name)}" to Aleo network...`);

        try {
            await submitToRelayer(secretKey, inv, salt);
            sp.text = `${pfx.toString()} Waiting for block confirmation › "${C.brand(inv.name)}"`;

            const hash = await pollForHash(salt);
            if (!hash) {
                sp.stopAndPersist({ symbol: C.rose('  ✖'), text: C.rose(`Timed out: "${inv.name}" — skipped`) });
                continue;
            }

            sp.stopAndPersist({ symbol: C.success('  ✔'), text: C.white(`"${inv.name}" confirmed on-chain`) });
            generatedInvoices.push({ ...inv, hash, salt });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            sp.stopAndPersist({ symbol: C.rose('  ✖'), text: C.rose(`"${inv.name}": ${msg}`) });
        }
    }

    if (generatedInvoices.length === 0) {
        blank();
        line(`  ${C.rose('✖')}  ${C.white('No invoices confirmed. Exiting.')}`);
        process.exit(1);
    }

    // ── Write nullpay.json ────────────────────────────────────────────────────
    const projectRoot = process.cwd();
    const outputPath  = path.join(projectRoot, 'nullpay.json');

    const output: NullPayJson = {
        merchant:     resolvedAddress,
        generated_at: new Date().toISOString(),
        invoices:     generatedInvoices,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    updateGitignore(projectRoot);

    // ── Final output ──────────────────────────────────────────────────────────
    blank();
    blank();
    line(rule('═'));
    line(`  ${C.success.bold('✔  nullpay.json generated')}`);
    line(rule('═'));
    blank();

    generatedInvoices.forEach((inv, i) => {
        renderResultCard(inv, i + 1, generatedInvoices.length);
        blank();
    });

    line(rule());
    blank();
    kv('Output',   outputPath,       C.slate);
    kv('Merchant', resolvedAddress,  C.brandDim);
    kv('Deployed', `${generatedInvoices.length} / ${allInvoices.length} invoices`, C.success.bold);
    blank();
    line(`  ${C.gold('⚠')}  ${C.slate('nullpay.json added to .gitignore — keep salts private')}`);
    blank();
    line(rule());
    blank();
    line(`  ${C.white.bold('Usage')}`);
    blank();
    line(C.dim(`  import { NullPay } from '@nullpay/node';`));
    blank();
    line(C.dim(`  const nullpay = new NullPay({`));
    line(C.dim(`    secretKey: process.env.NULLPAY_SECRET_KEY`));
    line(C.dim(`  });`));
    blank();
    line(C.dim(`  const session = await nullpay.checkout.sessions.create({`));
    line(C.dim(`    nullpay_invoice_name: `) + C.brand(`'${generatedInvoices[0]?.name ?? 'your-invoice-name'}'`) + C.dim(','));
    line(C.dim(`    success_url:          'https://yourapp.com/success',`));
    line(C.dim(`    cancel_url:           'https://yourapp.com/cancel'`));
    line(C.dim(`  });`));
    blank();
    line(rule('═'));
    blank();
    line(`  ${C.brand.bold('◈ NullPay')}  ${C.slate('·  zk-private invoicing on Aleo')}`);
    blank();
}