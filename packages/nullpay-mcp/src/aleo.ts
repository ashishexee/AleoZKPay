import crypto from 'crypto';
import { Currency, InvoiceRecord, InvoiceStatusData, InvoiceType, ParsedOwnedInvoiceRecord } from './types';
import { dynamicImport } from './esm';

export const PROGRAM_ID = 'zk_pay_proofs_privacy_v22.aleo';
const FREEZELIST_PROGRAM_ID = 'test_usdcx_freezelist.aleo';
const EXPLORER_BASE = 'https://api.explorer.provable.com/v1';
const MAPPING_BASE = 'https://api.provable.com/v2/testnet/program';
const SCANNER_BASE = 'https://api.provable.com/scanner/testnet';

export function generateSalt(): string {
    const randomBuffer = crypto.randomBytes(16);
    let randomBigInt = 0n;
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return `${randomBigInt}field`;
}

export function normalizeInvoiceHash(hash: string): string {
    return hash.trim().replace(/field$/, '');
}

function fieldToString(fieldVal: string): string {
    try {
        const val = BigInt(fieldVal.replace('field', ''));
        let hex = val.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return new TextDecoder().decode(bytes).replace(/\0/g, '');
    } catch {
        return '';
    }
}

function parseNumericValue(value: string | null | undefined): number {
    if (!value) {
        return 0;
    }

    const normalized = value
        .replace(/_/g, '')
        .replace(/u64|u128|u8|field/g, '')
        .trim();

    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

export async function getInvoiceHashFromMapping(salt: string): Promise<string | null> {
    const response = await fetch(`${MAPPING_BASE}/${PROGRAM_ID}/mapping/salt_to_invoice/${salt}`);
    if (!response.ok) {
        return null;
    }
    const value = await response.json();
    return value ? value.toString().replace(/(['"])/g, '') : null;
}

export async function waitForInvoiceHash(salt: string, attempts = 60, delayMs = 2000): Promise<string> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const hash = await getInvoiceHashFromMapping(salt);
        if (hash) {
            return hash;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error('Timed out while resolving invoice hash from mapping.');
}

export async function getInvoiceStatusData(hash: string): Promise<InvoiceStatusData | null> {
    const response = await fetch(`${MAPPING_BASE}/${PROGRAM_ID}/mapping/invoices/${hash}`);
    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    if (!data) {
        return null;
    }

    if (typeof data === 'string') {
        const statusMatch = data.match(/status:\s*(\d+)u8/);
        const tokenMatch = data.match(/token_type:\s*(\d+)u8/);
        const typeMatch = data.match(/invoice_type:\s*(\d+)u8/);
        return {
            status: statusMatch ? Number(statusMatch[1]) : 0,
            tokenType: tokenMatch ? Number(tokenMatch[1]) : 0,
            invoiceType: typeMatch ? Number(typeMatch[1]) : 0,
        };
    }

    const objectData = data as Record<string, unknown>;
    const parseValue = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return Number(value.replace('u8', ''));
        return 0;
    };

    return {
        status: parseValue(objectData.status),
        tokenType: parseValue(objectData.token_type ?? objectData.tokenType),
        invoiceType: parseValue(objectData.invoice_type ?? objectData.invoiceType),
    };
}

export function invoiceTypeToNumber(invoiceType: InvoiceType): number {
    if (invoiceType === 'multipay') return 1;
    if (invoiceType === 'donation') return 2;
    return 0;
}

function getTokenTypeNumber(currency: Currency): number {
    if (currency === 'USDCX') return 1;
    if (currency === 'USAD') return 2;
    if (currency === 'ANY') return 3;
    return 0;
}

export function buildPaymentLink(baseUrl: string, args: {
    merchant: string;
    amount: number;
    salt: string;
    memo?: string;
    invoiceType: InvoiceType;
    currency: Currency;
    invoiceHash: string;
}): string {
    const url = new URL('/pay', baseUrl);
    url.searchParams.set('merchant', args.merchant);
    url.searchParams.set('amount', args.amount.toString());
    url.searchParams.set('salt', args.salt);
    url.searchParams.set('hash', args.invoiceHash);
    if (args.memo) url.searchParams.set('memo', args.memo);
    if (args.invoiceType === 'multipay') url.searchParams.set('type', 'multipay');
    if (args.invoiceType === 'donation') url.searchParams.set('type', 'donation');
    if (args.currency === 'USDCX') url.searchParams.set('token', 'usdcx');
    if (args.currency === 'USAD') url.searchParams.set('token', 'usad');
    if (args.currency === 'ANY') url.searchParams.set('token', 'any');
    return url.toString();
}

export function createInvoiceDbRecord(args: {
    invoiceHash: string;
    merchantAddress: string;
    amount: number;
    memo?: string;
    invoiceType: InvoiceType;
    currency: Currency;
    salt: string;
    invoiceTxId: string;
    wallet: 'main' | 'burner';
    lineItems?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
    merchantAddressHash: string;
}) {
    return {
        invoice_hash: args.invoiceHash,
        merchant_address: args.merchantAddress,
        designated_address: args.merchantAddress,
        merchant_address_hash: args.merchantAddressHash,
        is_burner: args.wallet === 'burner',
        amount: args.amount,
        memo: args.memo || '',
        status: 'PENDING' as const,
        invoice_transaction_id: args.invoiceTxId,
        salt: args.salt,
        invoice_type: invoiceTypeToNumber(args.invoiceType),
        token_type: getTokenTypeNumber(args.currency),
        invoice_items: args.lineItems || null,
        for_sdk: false,
    };
}

function resolvePaymentMode(invoice: InvoiceRecord, fallbackAmount?: number, fallbackCurrency?: Exclude<Currency, 'ANY'>): {
    invoiceType: number;
    tokenType: number;
    amountMicro: bigint;
    functionName: string;
    tokenProgram: string;
    amountSuffix: 'u64' | 'u128';
} {
    const invoiceType = invoice.invoice_type ?? 0;
    const tokenType = invoice.token_type ?? (fallbackCurrency === 'USDCX' ? 1 : fallbackCurrency === 'USAD' ? 2 : 0);
    const amountMajor = invoice.amount && invoice.amount > 0 ? Number(invoice.amount) : Number(fallbackAmount ?? 0);
    const amountMicroFromInvoice = invoice.amount_micro && invoice.amount_micro > 0 ? BigInt(invoice.amount_micro) : null;
    const amountMicro = amountMicroFromInvoice ?? BigInt(Math.round(amountMajor * 1_000_000));
    const isDonation = invoiceType === 2;

    if (!isDonation && amountMicro <= 0n) {
        throw new Error('Invoice amount is missing. Add main wallet private key in env or pass amount explicitly.');
    }

    if (tokenType === 1) {
        return {
            invoiceType,
            tokenType,
            amountMicro,
            functionName: isDonation ? 'pay_donation_usdcx' : 'pay_invoice_usdcx',
            tokenProgram: 'test_usdcx_stablecoin.aleo',
            amountSuffix: 'u128',
        };
    }

    if (tokenType === 2) {
        return {
            invoiceType,
            tokenType,
            amountMicro,
            functionName: isDonation ? 'pay_donation_usad' : 'pay_invoice_usad',
            tokenProgram: 'test_usad_stablecoin.aleo',
            amountSuffix: 'u128',
        };
    }

    return {
        invoiceType,
        tokenType,
        amountMicro,
        functionName: isDonation ? 'pay_donation' : 'pay_invoice',
        tokenProgram: 'credits.aleo',
        amountSuffix: 'u64',
    };
}

interface ScannerSession {
    scannerHeaders: Record<string, string>;
    scannerUuid: string;
    account: any;
}

function getProvableConsumerId(): string | undefined {
    return process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY;
}

async function getScannerSession(privateKey: string): Promise<ScannerSession> {
    const provableApiKey = process.env.PROVABLE_API_KEY;
    const consumerId = getProvableConsumerId();

    if (!provableApiKey || !consumerId) {
        throw new Error('PROVABLE_API_KEY and PROVABLE_CONSUMER_ID/PROVABLE_CONSUMER_KEY are required for record fetching and payment automation.');
    }

    const jwtResponse = await fetch(`https://api.provable.com/jwts/${consumerId}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Provable-API-Key': provableApiKey },
    });

    if (!jwtResponse.ok) {
        throw new Error(`Failed to fetch scanner JWT: ${jwtResponse.status}`);
    }

    const authHeader = jwtResponse.headers.get('authorization') || jwtResponse.headers.get('Authorization');
    const scannerHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) {
        scannerHeaders.Authorization = authHeader;
    } else {
        scannerHeaders['X-Provable-API-Key'] = provableApiKey;
    }

    const { Account, encryptRegistrationRequest } = await dynamicImport<any>('@provablehq/sdk');
    const account = new Account({ privateKey });
    const pubkeyResponse = await fetch(`${SCANNER_BASE}/pubkey`, { method: 'GET', headers: scannerHeaders });
    if (!pubkeyResponse.ok) {
        throw new Error(`Failed to fetch scanner pubkey: ${pubkeyResponse.status}`);
    }

    const pubkey = await pubkeyResponse.json() as { key_id: string; public_key: string };
    const ciphertext = encryptRegistrationRequest(pubkey.public_key, account.viewKey(), 0);

    const registerResponse = await fetch(`${SCANNER_BASE}/register/encrypted`, {
        method: 'POST',
        headers: scannerHeaders,
        body: JSON.stringify({ key_id: pubkey.key_id, ciphertext }),
    });

    if (!registerResponse.ok) {
        throw new Error(`Failed to register scanner session: ${registerResponse.status}`);
    }

    const registered = await registerResponse.json() as { uuid: string };
    return {
        scannerHeaders,
        scannerUuid: registered.uuid,
        account,
    };
}

async function fetchOwnedProgramRecords(session: ScannerSession, programFilter: string, options?: { unspent?: boolean }): Promise<any[]> {
    const body = {
        uuid: session.scannerUuid,
        decrypt: true,
        filter: { program: programFilter },
        ...(options?.unspent !== undefined ? { unspent: options.unspent } : {})
    };

    const response = await fetch(`${SCANNER_BASE}/records/owned`, {
        method: 'POST',
        headers: session.scannerHeaders,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch scanner records: ${response.status}`);
    }

    const data = await response.json() as { data?: any[] } | any[];
    return Array.isArray(data) ? data : (data.data || []);
}

export function parseOwnedInvoiceRecord(plaintext: string): ParsedOwnedInvoiceRecord | null {
    try {
        const getVal = (key: string) => {
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = plaintext.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const invoiceHash = getVal('invoice_hash') || getVal('invoiceHash');
        const owner = getVal('owner');
        const salt = getVal('salt');
        const memoField = getVal('memo');
        const invoiceTypeVal = getVal('invoice_type') || getVal('invoiceType');

        if (!invoiceHash || !owner || !invoiceTypeVal) {
            return null;
        }

        const amountVal = getVal('amount');
        const tokenTypeVal = getVal('token_type') || getVal('tokenType');
        const walletTypeVal = getVal('wallet_type') || getVal('walletType');

        return {
            owner,
            invoiceHash,
            amountMicro: parseNumericValue(amountVal),
            tokenType: parseNumericValue(tokenTypeVal),
            invoiceType: parseNumericValue(invoiceTypeVal),
            salt: salt || '',
            memo: memoField ? fieldToString(memoField) : '',
            walletType: parseNumericValue(walletTypeVal),
            plaintext,
        };
    } catch {
        return null;
    }
}

export async function fetchOwnedInvoiceRecords(privateKey: string): Promise<ParsedOwnedInvoiceRecord[]> {
    const session = await getScannerSession(privateKey);
    const records = await fetchOwnedProgramRecords(session, PROGRAM_ID);
    const parsed: ParsedOwnedInvoiceRecord[] = [];

    for (const record of records) {
        let plaintext = record.record_plaintext || record.plaintext || '';
        if (!plaintext && record.record_ciphertext) {
            const { RecordCiphertext } = await dynamicImport<any>('@provablehq/sdk');
            const ciphertext = RecordCiphertext.fromString(record.record_ciphertext);
            plaintext = ciphertext.decrypt(session.account.viewKey()).toString();
        }
        if (!plaintext) continue;

        const invoice = parseOwnedInvoiceRecord(plaintext);
        if (invoice) {
            parsed.push(invoice);
        }
    }

    return parsed;
}

export async function fetchOwnedInvoiceRecordByHash(privateKey: string, invoiceHash: string): Promise<ParsedOwnedInvoiceRecord | null> {
    const normalized = normalizeInvoiceHash(invoiceHash);
    const records = await fetchOwnedInvoiceRecords(privateKey);
    return records.find((record) => normalizeInvoiceHash(record.invoiceHash) === normalized) || null;
}

export async function enrichInvoiceWithRecordAmount(invoice: InvoiceRecord, privateKey?: string | null): Promise<InvoiceRecord> {
    if (!privateKey || !invoice.invoice_transaction_id) {
        return invoice;
    }

    try {
        const { Account } = await dynamicImport<any>('@provablehq/sdk');
        const account = new Account({ privateKey });

        const response = await fetch(`https://api.provable.com/v1/testnet/transaction/${invoice.invoice_transaction_id}`);
        if (!response.ok) return invoice;

        // Cast it to `any` so we can safely traverse it without TS complaining
        const tx = await response.json() as any;

        let transitions: any[] = [];
        if (tx?.execution?.transitions) {
            transitions = tx.execution.transitions;
        } else if (tx?.fee?.transition) {
            transitions = [tx.fee.transition];
        }

        for (const transition of transitions) {
            const outputs = transition?.outputs || [];
            for (const output of outputs) {
                if (output?.type === 'record') {
                    const ciphertext = output.value;

                    if (account.ownsRecordCiphertext(ciphertext)) {
                        const plaintextObj = account.decryptRecord(ciphertext);
                        const plaintextStr = typeof plaintextObj === 'string' ? plaintextObj : plaintextObj.toString();

                        const recordNode = parseOwnedInvoiceRecord(plaintextStr);

                        if (recordNode && recordNode.invoiceHash === invoice.invoice_hash) {
                            return {
                                ...invoice,
                                amount_micro: recordNode.amountMicro,
                                amount: recordNode.amountMicro / 1_000_000,
                                token_type: invoice.token_type ?? recordNode.tokenType,
                                invoice_type: invoice.invoice_type ?? recordNode.invoiceType,
                                salt: invoice.salt || recordNode.salt,
                                memo: invoice.memo || recordNode.memo,
                            };
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Direct TX Enrichment Error:", e);
    }

    return invoice;
}
async function findSpendableRecord(
    session: ScannerSession,
    programFilter: string,
    recordName: string,
    amountRequired: bigint,
    isCredits: boolean
): Promise<string | null> {
    const response = await fetch(`${SCANNER_BASE}/records/owned`, {
        method: 'POST',
        headers: session.scannerHeaders,
        body: JSON.stringify({
            uuid: session.scannerUuid,
            unspent: true,
            decrypt: true,
            filter: { program: programFilter, record: recordName }
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch scanner records: ${response.status}`);
    }

    const data = await response.json() as { data?: any[] } | any[];
    const records = Array.isArray(data) ? data : (data.data || []);

    for (const record of records) {
        const recordProgram = record.program_name || record.program || '';
        if (recordProgram && recordProgram !== programFilter) {
            continue;
        }

        let plaintext = record.record_plaintext || '';
        if (!plaintext && record.record_ciphertext) {
            const { RecordCiphertext } = await dynamicImport<any>('@provablehq/sdk');
            const ciphertext = RecordCiphertext.fromString(record.record_ciphertext);
            plaintext = ciphertext.decrypt(session.account.viewKey()).toString();
        }
        if (!plaintext) {
            continue;
        }

        if (isCredits) {
            const match = plaintext.match(/microcredits\s*:\s*([\d_]+)u64/);
            if (match && BigInt(match[1].replace(/_/g, '')) >= amountRequired) {
                return plaintext.trim();
            }
            continue;
        }

        if (/amount\s*:\s*[\d_]+u128/.test(plaintext) && !/invoice_hash/.test(plaintext)) {
            const match = plaintext.match(/amount\s*:\s*([\d_]+)u128/);
            if (match && BigInt(match[1].replace(/_/g, '')) >= amountRequired) {
                return plaintext.trim();
            }
        }
    }

    return null;
}

async function getFreezeListIndex(index: number): Promise<string | null> {
    const { AleoNetworkClient } = await dynamicImport<any>('@provablehq/sdk');
    const client = new AleoNetworkClient(EXPLORER_BASE);
    const value = await client.getProgramMappingValue(FREEZELIST_PROGRAM_ID, 'freeze_list_index', `${index}u32`);
    return value ? value.replace(/"/g, '') : null;
}

async function generateFreezeListProof(targetIndex = 1, occupiedLeafValue?: string): Promise<string> {
    const { Field, Poseidon4 } = await dynamicImport<any>('@provablehq/wasm');
    const hasher = new Poseidon4();
    const emptyHashes: string[] = [];
    let currentEmpty = '0field';

    for (let level = 0; level < 16; level += 1) {
        emptyHashes.push(currentEmpty);
        const field = Field.fromString(currentEmpty);
        currentEmpty = hasher.hash([field, field]).toString();
    }

    let currentHash = '0field';
    let currentIndex = targetIndex;
    const proofSiblings: string[] = [];

    for (let level = 0; level < 16; level += 1) {
        const isLeft = currentIndex % 2 === 0;
        const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
        let siblingHash = emptyHashes[level];

        if (level === 0 && siblingIndex === 0 && occupiedLeafValue) {
            siblingHash = occupiedLeafValue;
        }

        proofSiblings.push(siblingHash);
        const left = Field.fromString(isLeft ? currentHash : siblingHash);
        const right = Field.fromString(isLeft ? siblingHash : currentHash);
        currentHash = hasher.hash([left, right]).toString();
        currentIndex = Math.floor(currentIndex / 2);
    }

    return `[${proofSiblings.join(', ')}]`;
}

export async function createSponsoredPaymentAuthorization(args: {
    walletPrivateKey: string;
    invoice: InvoiceRecord;
    amount?: number;
    currency?: Exclude<Currency, 'ANY'>;
}): Promise<{ authorization: string }> {
    const session = await getScannerSession(args.walletPrivateKey);
    const paymentMode = resolvePaymentMode(args.invoice, args.amount, args.currency);

    if (!args.invoice.salt) {
        throw new Error('Invoice is missing salt.');
    }

    const merchantAddress = args.invoice.designated_address || args.invoice.merchant_address;
    if (!merchantAddress || !merchantAddress.startsWith('aleo')) {
        throw new Error('Invoice merchant address is unavailable for automated payment.');
    }

    const record = await findSpendableRecord(
        session,
        paymentMode.tokenProgram,
        paymentMode.tokenProgram === 'credits.aleo' ? 'credits' : 'Token',
        paymentMode.amountMicro,
        paymentMode.tokenProgram === 'credits.aleo'
    );

    if (!record) {
        throw new Error(`No spendable private record found for ${paymentMode.tokenProgram}.`);
    }

    let proofsInput: string | undefined;
    if (paymentMode.tokenProgram !== 'credits.aleo') {
        const firstIndex = await getFreezeListIndex(0);
        let index0Field: string | undefined;
        if (firstIndex) {
            const { Address } = await dynamicImport<any>('@provablehq/wasm');
            index0Field = Address.from_string(firstIndex).toGroup().toXCoordinate().toString();
        }
        const proof = await generateFreezeListProof(1, index0Field);
        proofsInput = `[${proof}, ${proof}]`;
    }

    const { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } = await dynamicImport<any>('@provablehq/sdk');
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const networkClient = new AleoNetworkClient(EXPLORER_BASE);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);
    const programManager = new ProgramManager(EXPLORER_BASE, keyProvider, recordProvider);
    programManager.setAccount(session.account);

    const paymentSecret = generateSalt();
    const inputs = [
        record,
        merchantAddress,
        `${paymentMode.amountMicro}${paymentMode.amountSuffix}`,
        args.invoice.salt,
        paymentSecret,
        args.invoice.invoice_hash,
    ];

    if (proofsInput) {
        inputs.push(proofsInput);
    }

    const authorization = await programManager.buildAuthorization({
        programName: PROGRAM_ID,
        functionName: paymentMode.functionName,
        inputs,
    });

    return { authorization: authorization.toString() };
}
