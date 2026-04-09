import inquirer from 'inquirer';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const BACKEND_URL = process.env.NULLPAY_BACKEND_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
const ALEO_PROGRAM = 'zk_pay_proofs_privacy_26.aleo';
const ALEO_MAP_BASE = `https://api.provable.com/v2/testnet/program/${ALEO_PROGRAM}/mapping/salt_to_invoice`;
const W = 56;

const C = {
    brand: chalk.hex('#00FFD1'),
    brandDim: chalk.hex('#00B894'),
    gold: chalk.hex('#FFD166'),
    rose: chalk.hex('#FF6B8A'),
    slate: chalk.hex('#8892A4'),
    white: chalk.hex('#F0F4FF'),
    dim: chalk.hex('#3A4055'),
    success: chalk.hex('#06D6A0'),
    purple: chalk.hex('#A78BFA'),
    orange: chalk.hex('#FB923C'),
};

const line = (content: string) => console.log(content);
const blank = () => line('');
const rule = (char = '=') => C.dim(`  ${char.repeat(W)}`);
const tag = (label: string, color: chalk.Chalk = C.brand) => color.bold(` ${label} `);

interface InvoiceConfig {
    name: string;
    type: 'multipay' | 'donation';
    amount: number | null;
    currency: string;
    label: string;
}

interface GeneratedInvoice extends InvoiceConfig {
    hash: string;
    salt: string;
}

interface NullPayJson {
    merchant: string;
    generated_at: string;
    invoices: GeneratedInvoice[];
}

interface DonationTemplate {
    currency: 'CREDITS' | 'USDCX' | 'USAD' | 'ANY';
    title: string;
    exampleName: string;
}

function printBanner(): void {
    blank();
    line(C.dim(`  +${'-'.repeat(W)}+`));
    line(C.dim('  |') + ' '.repeat(W) + C.dim('|'));
    line(
        C.dim('  |') +
        ' '.repeat(10) +
        C.brand.bold('NULLPAY') +
        C.slate('  |  ') +
        C.white.bold('SDK Onboard Wizard') +
        ' '.repeat(13) +
        C.dim('|')
    );
    line(
        C.dim('  |') +
        ' '.repeat(8) +
        C.slate('Zero-knowledge blockchain invoicing on Aleo') +
        ' '.repeat(5) +
        C.dim('|')
    );
    line(C.dim('  |') + ' '.repeat(W) + C.dim('|'));
    line(C.dim(`  +${'-'.repeat(W)}+`));
    blank();
    line(C.slate(`  Version 1.0.0 | Aleo Testnet | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`));
    blank();
}

function section(step: number, total: number, title: string): void {
    blank();
    line(rule('-'));
    line(C.dim('  | ') + C.slate(`Step ${step}/${total}`) + '  ' + C.white.bold(title));
    line(rule('-'));
    blank();
}

function kv(key: string, value: string, valueColor: chalk.Chalk = C.white): void {
    const pad = 18;
    line(`  ${C.slate(key.padEnd(pad))} ${valueColor(value)}`);
}

function spin(text: string): Ora {
    return ora({
        text,
        spinner: 'dots12',
        color: 'cyan',
        prefixText: '  ',
    }).start();
}

function generateSalt(): string {
    const buf = crypto.randomBytes(16);
    let n = BigInt(0);
    for (const b of buf) n = (n << BigInt(8)) + BigInt(b);
    return `${n.toString()}field`;
}

function truncateHash(hash: string, len = 24): string {
    return hash.length > len ? `${hash.slice(0, len)}...` : hash;
}

function formatCurrencyLabel(currency: string): string {
    if (currency === 'ANY') return 'CREDITS + USDCX + USAD';
    return currency;
}

function resolveOutputPath(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
        return path.resolve(process.cwd(), 'nullpay.json');
    }

    return path.resolve(process.cwd(), trimmed);
}

async function validateMerchant(
    secretKey: string,
    merchantAddress: string,
): Promise<{ merchant_name: string; merchant_address: string }> {
    const res = await fetch(`${BACKEND_URL}/sdk/onboard/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
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
): Promise<string> {
    const invoiceTypeNum = invoice.type === 'multipay' ? 1 : 2;
    const res = await fetch(`${BACKEND_URL}/dps/relayer/create-invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
            amount: invoice.type === 'donation' ? 0 : invoice.amount,
            currency: invoice.currency,
            salt,
            memo: invoice.label ?? '',
            invoice_type: invoiceTypeNum,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `Relayer error (${res.status})`);
    }

    const data = await res.json() as { tx_id?: string };
    if (!data.tx_id) {
        throw new Error('Relayer response did not include a creation transaction id.');
    }

    return data.tx_id;
}

async function pollForHash(salt: string, maxRetries = 60): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
            const res = await fetch(`${ALEO_MAP_BASE}/${salt}`);
            if (res.ok) {
                const val = await res.json();
                if (val) return val.toString().replace(/['"]/g, '');
            }
        } catch (_) {
            // Ignore transient mapping lookup failures while polling.
        }
    }

    return null;
}

async function saveInvoiceToDashboard(
    secretKey: string,
    merchantAddress: string,
    invoice: InvoiceConfig,
    hash: string,
    salt: string,
    invoiceTransactionId: string
): Promise<void> {
    const invoiceTypeNum = invoice.type === 'multipay' ? 1 : 2;
    const res = await fetch(`${BACKEND_URL}/invoices`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
            invoice_hash: hash,
            merchant_address: merchantAddress,
            amount: invoice.type === 'donation' ? 0 : invoice.amount,
            memo: invoice.label ?? '',
            invoice_type: invoiceTypeNum,
            salt,
            invoice_transaction_id: invoiceTransactionId,
            for_sdk: true,
            status: 'PENDING'
        }),
    });

    if (!res.ok) {
        throw new Error(`Dashboard sync failed (${res.status})`);
    }
}


function renderInvoiceCard(inv: InvoiceConfig, index: number): void {
    const typeLabel = inv.type === 'multipay'
        ? tag('MULTI-PAY', C.brand)
        : tag('DONATION', C.orange);
    const amountLabel = inv.amount !== null
        ? C.gold.bold(`${inv.amount} ${formatCurrencyLabel(inv.currency)}`)
        : C.slate(`Open | ${formatCurrencyLabel(inv.currency)}`);

    line(
        `  ${C.slate(`${String(index).padStart(2, '0')}.`)}  ` +
        typeLabel +
        C.dim('  ') +
        C.white.bold(inv.name) +
        C.dim('  -  ') +
        amountLabel
    );
}

function renderResultCard(inv: GeneratedInvoice, index: number, total: number): void {
    const typeColor = inv.type === 'multipay' ? C.brand : C.orange;
    const amountText = inv.amount !== null
        ? `${inv.amount} ${formatCurrencyLabel(inv.currency)}`
        : `open / ${formatCurrencyLabel(inv.currency)}`;
    const amountLabel = inv.amount !== null
        ? C.gold(amountText)
        : C.slate(amountText);

    line(C.dim(`  +${'-'.repeat(W + 1)}+`));
    line(C.dim('  | ') + C.success('OK') + '  ' + typeColor.bold(inv.name.toUpperCase()) + C.dim(`  [${index}/${total}]`));
    line(C.dim('  |'));
    line(C.dim('  |  ') + C.slate('type    ') + '  ' + typeColor(inv.type));
    line(C.dim('  |  ') + C.slate('amount  ') + '  ' + amountLabel);
    line(C.dim('  |  ') + C.slate('hash    ') + '  ' + C.brandDim(truncateHash(inv.hash, 36)));
    line(C.dim(`  +${'-'.repeat(W + 1)}+`));
}

async function promptDonationInvoice(template: DonationTemplate): Promise<InvoiceConfig> {
    blank();
    line(`  ${C.orange.bold(template.title)}  ${C.dim('-'.repeat(28))}`);

    const a = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: C.slate('Name'),
            prefix: C.dim('    >'),
            suffix: C.dim(`  e.g. ${template.exampleName}`),
            validate: (v: string) => v.trim().length ? true : C.rose('Cannot be empty'),
        },
        {
            type: 'input',
            name: 'label',
            message: C.slate('Memo') + C.dim(' (optional)'),
            prefix: C.dim('    >'),
            default: '',
        },
    ]);

    return {
        name: a.name.trim().toLowerCase().replace(/\s+/g, '-'),
        type: 'donation',
        amount: null,
        currency: template.currency,
        label: a.label,
    };
}

export async function onboard(): Promise<void> {
    printBanner();

    section(1, 4, 'Authentication');

    const { secretKey } = await inquirer.prompt([{
        type: 'password',
        name: 'secretKey',
        message: C.slate('Secret Key') + ' ' + C.dim('(sk_test_... or sk_live_...)'),
        mask: '*',
        prefix: C.brand('  >'),
        validate: (v: string) => v.startsWith('sk_') ? true : C.rose('Must start with sk_test_ or sk_live_'),
    }]);

    const { merchantAddress } = await inquirer.prompt([{
        type: 'input',
        name: 'merchantAddress',
        message: C.slate('Aleo Address') + ' ' + C.dim('(aleo1...)'),
        prefix: C.brand('  >'),
        validate: (v: string) => v.startsWith('aleo1') ? true : C.rose('Must be a valid Aleo address (aleo1...)'),
    }]);

    section(2, 4, 'Verifying Credentials');

    const spinner = spin('Connecting to NullPay network...');
    let merchantName = '';
    let resolvedAddress = '';

    try {
        const result = await validateMerchant(secretKey, merchantAddress);
        merchantName = result.merchant_name;
        resolvedAddress = result.merchant_address;
        spinner.stopAndPersist({
            symbol: C.success('  OK'),
            text: C.white('Merchant verified'),
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        spinner.stopAndPersist({
            symbol: C.rose('  X'),
            text: C.rose(`Auth failed: ${msg}`),
        });
        process.exit(1);
    }

    blank();
    kv('Merchant', merchantName, C.white.bold);
    kv('Address', resolvedAddress, C.brandDim);
    kv('Network', 'Aleo Testnet', C.purple);
    kv('Status', 'Active', C.success.bold);
    blank();

    section(3, 4, 'Invoice Configuration');

    const multipayConfigs: InvoiceConfig[] = [];
    const donationConfigs: InvoiceConfig[] = [];

    line(`  ${C.brand('>')} ${C.white.bold('Multi-Pay Invoices')}  ${C.slate('| Fixed-amount recurring payments')}`);
    blank();

    const { wantsMultipay } = await inquirer.prompt([{
        type: 'confirm',
        name: 'wantsMultipay',
        message: C.slate('Create multi-pay invoices?'),
        prefix: C.dim('  -'),
        default: true,
    }]);

    if (wantsMultipay) {
        const { multipayCount } = await inquirer.prompt([{
            type: 'number',
            name: 'multipayCount',
            message: C.slate('How many?'),
            prefix: C.dim('  -'),
            default: 1,
            validate: (v: number) => (v > 0 && v <= 20) ? true : C.rose('Between 1 and 20'),
        }]);

        for (let i = 1; i <= multipayCount; i++) {
            blank();
            line(`  ${C.brand.bold(`Invoice #${i}`)}  ${C.dim('-'.repeat(30))}`);
            const a = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: C.slate('Name'),
                    prefix: C.dim('    >'),
                    suffix: C.dim('  e.g. pro-plan'),
                    validate: (v: string) => v.trim().length ? true : C.rose('Cannot be empty'),
                },
                {
                    type: 'number',
                    name: 'amount',
                    message: C.slate('Amount'),
                    prefix: C.dim('    >'),
                    validate: (v: number) => v > 0 ? true : C.rose('Must be > 0'),
                },
                {
                    type: 'list',
                    name: 'currency',
                    message: C.slate('Token'),
                    prefix: C.dim('    >'),
                    choices: [
                        { name: `${C.brand('CREDITS')}  ${C.slate('| native Aleo')}`, value: 'CREDITS' },
                        { name: `${C.gold('USDCX')}    ${C.slate('| USD stablecoin')}`, value: 'USDCX' },
                        { name: `${C.purple('USAD')}     ${C.slate('| Aleo-native USD')}`, value: 'USAD' },
                    ],
                },
            ]);

            multipayConfigs.push({
                name: a.name.trim().toLowerCase().replace(/\s+/g, '-'),
                type: 'multipay',
                amount: a.amount,
                currency: a.currency,
                label: '',
            });
        }
    }

    blank();
    line(`  ${C.orange('>')} ${C.white.bold('Donation Invoices')}  ${C.slate('| Open-amount contributions')}`);
    blank();

    const { wantsDonation } = await inquirer.prompt([{
        type: 'confirm',
        name: 'wantsDonation',
        message: C.slate('Create donation invoices?'),
        prefix: C.dim('  -'),
        default: false,
    }]);

    if (wantsDonation) {
        const donationChoices = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'creditsOnly',
                message: C.slate('Create a Credits-only donation invoice?'),
                prefix: C.dim('  -'),
                default: true,
            },
            {
                type: 'confirm',
                name: 'usdcxOnly',
                message: C.slate('Create a USDCX-only donation invoice?'),
                prefix: C.dim('  -'),
                default: false,
            },
            {
                type: 'confirm',
                name: 'usadOnly',
                message: C.slate('Create a USAD-only donation invoice?'),
                prefix: C.dim('  -'),
                default: false,
            },
            {
                type: 'confirm',
                name: 'allTokens',
                message: C.slate('Create a donation invoice that accepts all three tokens?'),
                prefix: C.dim('  -'),
                default: false,
            },
        ]);

        const selectedTemplates: DonationTemplate[] = [];

        if (donationChoices.creditsOnly) {
            selectedTemplates.push({
                currency: 'CREDITS',
                title: 'Credits Donation',
                exampleName: 'support-credits',
            });
        }

        if (donationChoices.usdcxOnly) {
            selectedTemplates.push({
                currency: 'USDCX',
                title: 'USDCX Donation',
                exampleName: 'support-usdcx',
            });
        }

        if (donationChoices.usadOnly) {
            selectedTemplates.push({
                currency: 'USAD',
                title: 'USAD Donation',
                exampleName: 'support-usad',
            });
        }

        if (donationChoices.allTokens) {
            selectedTemplates.push({
                currency: 'ANY',
                title: 'All Tokens Donation',
                exampleName: 'support-any',
            });
        }

        for (const template of selectedTemplates) {
            donationConfigs.push(await promptDonationInvoice(template));
        }
    }

    const allInvoices = [...multipayConfigs, ...donationConfigs];
    if (allInvoices.length === 0) {
        blank();
        line(`  ${C.gold('!')}  ${C.white('No invoices configured.')}  ${C.slate('Exiting.')}`);
        process.exit(0);
    }

    blank();
    line(rule('='));
    line(`  ${C.white.bold('DEPLOYMENT SUMMARY')}`);
    line(rule('='));
    blank();
    kv('Merchant', resolvedAddress, C.brandDim);
    kv('Invoices', `${allInvoices.length} total`, C.white.bold);
    kv('Est. time', `${allInvoices.length * 2}-${allInvoices.length * 3} min`, C.slate);
    blank();

    allInvoices.forEach((inv, i) => renderInvoiceCard(inv, i + 1));

    blank();
    line(`  ${C.gold('!')}  ${C.slate('Each invoice submits a live Aleo transaction (60-120s each)')}`);
    blank();

    const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: C.white.bold(`Deploy ${allInvoices.length} invoice(s) to Aleo?`),
        prefix: C.gold('  >'),
        default: true,
    }]);

    if (!confirmed) {
        blank();
        line(`  ${C.slate('Aborted. No transactions submitted.')}`);
        process.exit(0);
    }

    section(4, 4, 'On-Chain Deployment');

    const generatedInvoices: GeneratedInvoice[] = [];

    for (let i = 0; i < allInvoices.length; i++) {
        const inv = allInvoices[i];
        const salt = generateSalt();
        const prefix = C.dim(`  [${i + 1}/${allInvoices.length}]`);
        const sp = spin(`${prefix.toString()} Submitting "${C.brand(inv.name)}" to Aleo network...`);

        try {
            const creationTxId = await submitToRelayer(secretKey, inv, salt);
            sp.text = `${prefix.toString()} Waiting for block confirmation -> "${C.brand(inv.name)}"`;

            const hash = await pollForHash(salt);
            if (!hash) {
                sp.stopAndPersist({
                    symbol: C.rose('  X'),
                    text: C.rose(`Timed out: "${inv.name}" - skipped`),
                });
                continue;
            }

            sp.stopAndPersist({
                symbol: C.success('  OK'),
                text: C.white(`"${inv.name}" confirmed on-chain`),
            });

            // 📢 Sync with Dashboard
            try {
                await saveInvoiceToDashboard(secretKey, resolvedAddress, inv, hash, salt, creationTxId);
            } catch (syncErr) {
                line(`  ${C.gold('!')}  ${C.slate(`Dashboard sync failed for "${inv.name}", but Aleo tx succeeded.`)}`);
            }

            generatedInvoices.push({ ...inv, hash, salt });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            sp.stopAndPersist({
                symbol: C.rose('  X'),
                text: C.rose(`"${inv.name}": ${msg}`),
            });
        }
    }

    if (generatedInvoices.length === 0) {
        blank();
        line(`  ${C.rose('X')}  ${C.white('No invoices confirmed. Exiting.')}`);
        process.exit(1);
    }

    blank();
    const defaultOutputPath = path.resolve(process.cwd(), 'nullpay.json');
    const { outputPathInput } = await inquirer.prompt([{
        type: 'input',
        name: 'outputPathInput',
        message: C.slate('Write nullpay.json to'),
        prefix: C.brand('  >'),
        default: defaultOutputPath,
        validate: (v: string) => v.trim().length ? true : C.rose('Path cannot be empty'),
    }]);

    const outputPath = resolveOutputPath(outputPathInput);
    const output: NullPayJson = {
        merchant: resolvedAddress,
        generated_at: new Date().toISOString(),
        invoices: generatedInvoices,
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    blank();
    blank();
    line(rule('='));
    line(`  ${C.success.bold('OK  nullpay.json generated')}`);
    line(rule('='));
    blank();

    generatedInvoices.forEach((inv, i) => {
        renderResultCard(inv, i + 1, generatedInvoices.length);
        blank();
    });

    line(rule('-'));
    blank();
    kv('Output', outputPath, C.slate);
    kv('Merchant', resolvedAddress, C.brandDim);
    kv('Deployed', `${generatedInvoices.length} / ${allInvoices.length} invoices`, C.success.bold);
    blank();
    line(rule('-'));
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
    line(rule('='));
    blank();
    line(`  ${C.brand.bold('NULLPAY')}  ${C.slate('| zk-private invoicing on Aleo')}`);
    blank();
}
