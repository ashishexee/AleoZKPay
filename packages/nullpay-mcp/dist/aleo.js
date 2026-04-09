"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRAM_ID = void 0;
exports.generateSalt = generateSalt;
exports.normalizeInvoiceHash = normalizeInvoiceHash;
exports.getInvoiceHashFromMapping = getInvoiceHashFromMapping;
exports.waitForInvoiceHash = waitForInvoiceHash;
exports.getInvoiceStatusData = getInvoiceStatusData;
exports.invoiceTypeToNumber = invoiceTypeToNumber;
exports.buildPaymentLink = buildPaymentLink;
exports.createInvoiceDbRecord = createInvoiceDbRecord;
exports.getScannerSession = getScannerSession;
exports.parseOwnedInvoiceRecord = parseOwnedInvoiceRecord;
exports.parseBurnerBackupRecord = parseBurnerBackupRecord;
exports.fetchOwnedInvoiceRecords = fetchOwnedInvoiceRecords;
exports.fetchOwnedBurnerBackupRecords = fetchOwnedBurnerBackupRecords;
exports.recoverOnChainWalletBackup = recoverOnChainWalletBackup;
exports.fetchOwnedInvoiceRecordByHash = fetchOwnedInvoiceRecordByHash;
exports.enrichInvoiceWithRecordAmount = enrichInvoiceWithRecordAmount;
exports.findSpendableRecord = findSpendableRecord;
exports.getWalletBalances = getWalletBalances;
exports.generateFreezeListProof = generateFreezeListProof;
exports.createSponsoredPaymentAuthorization = createSponsoredPaymentAuthorization;
exports.createSweepAuthorization = createSweepAuthorization;
const crypto_1 = __importDefault(require("crypto"));
const esm_1 = require("./esm");
const env_1 = require("./env");
exports.PROGRAM_ID = 'zk_pay_proofs_privacy_v26.aleo';
const USDCX_FREEZELIST_PROGRAM_ID = 'test_usdcx_freezelist.aleo';
const USAD_FREEZELIST_PROGRAM_ID = 'test_usad_freezelist.aleo';
const EXPLORER_BASE = 'https://api.explorer.provable.com/v1';
const MAPPING_BASE = 'https://api.provable.com/v2/testnet/program';
const SCANNER_BASE = 'https://api.provable.com/scanner/testnet';
function generateSalt() {
    const randomBuffer = crypto_1.default.randomBytes(16);
    let randomBigInt = 0n;
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return `${randomBigInt}field`;
}
function normalizeInvoiceHash(hash) {
    return hash.trim().replace(/field$/, '');
}
function fieldToString(fieldVal) {
    try {
        const val = BigInt(fieldVal.replace('field', ''));
        let hex = val.toString(16);
        if (hex.length % 2 !== 0)
            hex = '0' + hex;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return new TextDecoder().decode(bytes).replace(/\0/g, '');
    }
    catch {
        return '';
    }
}
function fieldChunksToString(chunks) {
    let result = '';
    for (const chunk of chunks) {
        if (!chunk || chunk === '0field' || chunk === '0') {
            continue;
        }
        const numeric = chunk.replace('field', '').replace('u128', '').replace('u64', '');
        let value;
        try {
            value = BigInt(numeric);
        }
        catch {
            continue;
        }
        let hex = value.toString(16);
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        for (let i = 0; i < hex.length; i += 2) {
            result += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
        }
    }
    return result;
}
function parseNumericValue(value) {
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
async function getInvoiceHashFromMapping(salt) {
    const response = await fetch(`${MAPPING_BASE}/${exports.PROGRAM_ID}/mapping/salt_to_invoice/${salt}`);
    if (!response.ok) {
        return null;
    }
    const value = await response.json();
    return value ? value.toString().replace(/(['"])/g, '') : null;
}
async function waitForInvoiceHash(salt, attempts = 60, delayMs = 2000) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const hash = await getInvoiceHashFromMapping(salt);
        if (hash) {
            return hash;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error('Timed out while resolving invoice hash from mapping.');
}
async function getInvoiceStatusData(hash) {
    const response = await fetch(`${MAPPING_BASE}/${exports.PROGRAM_ID}/mapping/invoices/${hash}`);
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
    const objectData = data;
    const parseValue = (value) => {
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string')
            return Number(value.replace('u8', ''));
        return 0;
    };
    return {
        status: parseValue(objectData.status),
        tokenType: parseValue(objectData.token_type ?? objectData.tokenType),
        invoiceType: parseValue(objectData.invoice_type ?? objectData.invoiceType),
    };
}
function invoiceTypeToNumber(invoiceType) {
    if (invoiceType === 'multipay')
        return 1;
    if (invoiceType === 'donation')
        return 2;
    return 0;
}
function getTokenTypeNumber(currency) {
    if (currency === 'USDCX')
        return 1;
    if (currency === 'USAD')
        return 2;
    if (currency === 'ANY')
        return 3;
    return 0;
}
function buildPaymentLink(baseUrl, args) {
    const url = new URL('/pay', baseUrl);
    url.searchParams.set('merchant', args.merchant);
    url.searchParams.set('amount', args.amount.toString());
    url.searchParams.set('salt', args.salt);
    url.searchParams.set('hash', args.invoiceHash);
    if (args.memo)
        url.searchParams.set('memo', args.memo);
    if (args.invoiceType === 'multipay')
        url.searchParams.set('type', 'multipay');
    if (args.invoiceType === 'donation')
        url.searchParams.set('type', 'donation');
    if (args.currency === 'USDCX')
        url.searchParams.set('token', 'usdcx');
    if (args.currency === 'USAD')
        url.searchParams.set('token', 'usad');
    if (args.currency === 'ANY')
        url.searchParams.set('token', 'any');
    return url.toString();
}
function createInvoiceDbRecord(args) {
    return {
        invoice_hash: args.invoiceHash,
        merchant_address: args.merchantAddress,
        designated_address: args.merchantAddress,
        merchant_address_hash: args.merchantAddressHash,
        is_burner: args.wallet === 'burner',
        amount: args.amount,
        memo: args.memo || '',
        status: 'PENDING',
        invoice_transaction_id: args.invoiceTxId,
        salt: args.salt,
        invoice_type: invoiceTypeToNumber(args.invoiceType),
        token_type: getTokenTypeNumber(args.currency),
        invoice_items: args.lineItems || null,
        for_sdk: false,
    };
}
function resolvePaymentMode(invoice, fallbackAmount, fallbackCurrency) {
    const invoiceType = invoice.invoice_type ?? 0;
    const tokenType = invoice.token_type ?? (fallbackCurrency === 'USDCX' ? 1 : fallbackCurrency === 'USAD' ? 2 : 0);
    const amountMajor = invoice.amount && invoice.amount > 0 ? Number(invoice.amount) : Number(fallbackAmount ?? 0);
    const amountMicroFromInvoice = invoice.amount_micro && invoice.amount_micro > 0 ? BigInt(invoice.amount_micro) : null;
    const amountMicro = amountMicroFromInvoice ?? BigInt(Math.round(amountMajor * 1000000));
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
async function getScannerSession(privateKey) {
    const { apiKey: provableApiKey, consumerId } = (0, env_1.getProvableConfig)();
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
    const scannerHeaders = { 'Content-Type': 'application/json' };
    if (authHeader) {
        scannerHeaders.Authorization = authHeader;
    }
    else {
        scannerHeaders['X-Provable-API-Key'] = provableApiKey;
    }
    const { Account, encryptRegistrationRequest } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
    const account = new Account({ privateKey });
    const pubkeyResponse = await fetch(`${SCANNER_BASE}/pubkey`, { method: 'GET', headers: scannerHeaders });
    if (!pubkeyResponse.ok) {
        throw new Error(`Failed to fetch scanner pubkey: ${pubkeyResponse.status}`);
    }
    const pubkey = await pubkeyResponse.json();
    const ciphertext = encryptRegistrationRequest(pubkey.public_key, account.viewKey(), 0);
    const registerResponse = await fetch(`${SCANNER_BASE}/register/encrypted`, {
        method: 'POST',
        headers: scannerHeaders,
        body: JSON.stringify({ key_id: pubkey.key_id, ciphertext }),
    });
    if (!registerResponse.ok) {
        throw new Error(`Failed to register scanner session: ${registerResponse.status}`);
    }
    const registered = await registerResponse.json();
    return {
        scannerHeaders,
        scannerUuid: registered.uuid,
        account,
    };
}
async function fetchOwnedProgramRecords(session, programFilter, options) {
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
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
}
function parseOwnedInvoiceRecord(plaintext) {
    try {
        const getVal = (key) => {
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
    }
    catch {
        return null;
    }
}
function parseBurnerBackupRecord(plaintext) {
    try {
        const getVal = (key) => {
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = plaintext.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };
        const owner = getVal('owner');
        const burnerAddress = getVal('burner_address');
        const passwordPart = getVal('password_part');
        if (!burnerAddress || !passwordPart) {
            return null;
        }
        const pkParts = [];
        for (let i = 1; i <= 10; i += 1) {
            const part = getVal(`pk_part_${i}`);
            if (part && part !== '0field' && part !== '0') {
                pkParts.push(part);
            }
        }
        return {
            owner: owner || '',
            burnerAddress,
            passwordPart,
            pkParts,
            plaintext,
        };
    }
    catch {
        return null;
    }
}
async function fetchOwnedInvoiceRecords(privateKey) {
    const session = await getScannerSession(privateKey);
    const records = await fetchOwnedProgramRecords(session, exports.PROGRAM_ID);
    const parsed = [];
    for (const record of records) {
        let plaintext = record.record_plaintext || record.plaintext || '';
        if (!plaintext && record.record_ciphertext) {
            const { RecordCiphertext } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
            const ciphertext = RecordCiphertext.fromString(record.record_ciphertext);
            plaintext = ciphertext.decrypt(session.account.viewKey()).toString();
        }
        if (!plaintext)
            continue;
        const invoice = parseOwnedInvoiceRecord(plaintext);
        if (invoice) {
            parsed.push(invoice);
        }
    }
    return parsed;
}
async function fetchOwnedBurnerBackupRecords(privateKey) {
    const session = await getScannerSession(privateKey);
    const records = await fetchOwnedProgramRecords(session, exports.PROGRAM_ID);
    const parsed = [];
    for (const record of records) {
        let plaintext = record.record_plaintext || record.plaintext || '';
        if (!plaintext && record.record_ciphertext) {
            const { RecordCiphertext } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
            const ciphertext = RecordCiphertext.fromString(record.record_ciphertext);
            plaintext = ciphertext.decrypt(session.account.viewKey()).toString();
        }
        if (!plaintext)
            continue;
        const burnerRecord = parseBurnerBackupRecord(plaintext);
        if (burnerRecord) {
            parsed.push(burnerRecord);
        }
    }
    return parsed;
}
async function recoverOnChainWalletBackup(privateKey, ownerAddress) {
    const records = await fetchOwnedBurnerBackupRecords(privateKey);
    let passwordOnlyMatch = null;
    let fullBurnerMatch = null;
    for (const record of records) {
        const ownerMatches = record.owner === ownerAddress;
        const passwordOnlyMatches = record.burnerAddress === ownerAddress;
        if (!ownerMatches && !passwordOnlyMatches) {
            continue;
        }
        const encryptedPayload = fieldChunksToString(record.pkParts);
        const hasRealPayload = Boolean(encryptedPayload && !encryptedPayload.startsWith('0'));
        if (hasRealPayload) {
            fullBurnerMatch = record;
        }
        else if (!passwordOnlyMatch) {
            passwordOnlyMatch = record;
        }
    }
    const bestMatch = fullBurnerMatch || passwordOnlyMatch;
    if (!bestMatch) {
        return null;
    }
    const password = fieldChunksToString([bestMatch.passwordPart]);
    if (!password) {
        return null;
    }
    if (fullBurnerMatch) {
        const encryptedBurnerKey = fieldChunksToString(fullBurnerMatch.pkParts);
        return {
            password,
            burnerAddress: fullBurnerMatch.burnerAddress,
            encryptedBurnerKey: encryptedBurnerKey || undefined,
            source: 'full_burner',
        };
    }
    return {
        password,
        source: 'password_only',
    };
}
async function fetchOwnedInvoiceRecordByHash(privateKey, invoiceHash) {
    const normalized = normalizeInvoiceHash(invoiceHash);
    const records = await fetchOwnedInvoiceRecords(privateKey);
    return records.find((record) => normalizeInvoiceHash(record.invoiceHash) === normalized) || null;
}
async function enrichInvoiceWithRecordAmount(invoice, privateKey) {
    if (!privateKey || !invoice.invoice_transaction_id) {
        return invoice;
    }
    try {
        const { Account } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
        const account = new Account({ privateKey });
        const response = await fetch(`https://api.provable.com/v1/testnet/transaction/${invoice.invoice_transaction_id}`);
        if (!response.ok)
            return invoice;
        // Cast it to `any` so we can safely traverse it without TS complaining
        const tx = await response.json();
        let transitions = [];
        if (tx?.execution?.transitions) {
            transitions = tx.execution.transitions;
        }
        else if (tx?.fee?.transition) {
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
                                amount: recordNode.amountMicro / 1000000,
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
    }
    catch (e) {
        console.error("Direct TX Enrichment Error:", e);
    }
    return invoice;
}
async function findSpendableRecord(session, programFilter, recordName, amountRequired, isCredits) {
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
    const data = await response.json();
    const records = Array.isArray(data) ? data : (data.data || []);
    for (const record of records) {
        const recordProgram = record.program_name || record.program || '';
        if (recordProgram && recordProgram !== programFilter) {
            continue;
        }
        let plaintext = record.record_plaintext || '';
        if (!plaintext && record.record_ciphertext) {
            const { RecordCiphertext } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
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
async function getWalletBalances(session) {
    const programs = [
        { name: 'credits.aleo', field: 'microcredits' },
        { name: 'test_usdcx_stablecoin.aleo', field: 'amount' },
        { name: 'test_usad_stablecoin.aleo', field: 'amount' }
    ];
    let credits = 0n;
    let usdcx = 0n;
    let usad = 0n;
    for (const prog of programs) {
        try {
            const response = await fetch(`${SCANNER_BASE}/records/owned`, {
                method: 'POST',
                headers: session.scannerHeaders,
                body: JSON.stringify({
                    uuid: session.scannerUuid,
                    unspent: true,
                    decrypt: true,
                    filter: { program: prog.name }
                })
            });
            if (response.ok) {
                const data = await response.json();
                const records = Array.isArray(data) ? data : (data.data || []);
                for (const record of records) {
                    let plaintext = record.record_plaintext || '';
                    if (!plaintext && record.record_ciphertext) {
                        try {
                            const { RecordCiphertext } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
                            const ciphertext = RecordCiphertext.fromString(record.record_ciphertext);
                            plaintext = ciphertext.decrypt(session.account.viewKey()).toString();
                        }
                        catch {
                            // ignore decrypt fail
                        }
                    }
                    if (plaintext && !/invoice_hash/.test(plaintext)) {
                        const regex = prog.field === 'microcredits' ? /microcredits\s*:\s*([\d_]+)u64/ : /amount\s*:\s*([\d_]+)u128/;
                        const match = plaintext.match(regex);
                        if (match) {
                            const value = BigInt(match[1].replace(/_/g, ''));
                            if (prog.name === 'credits.aleo')
                                credits += value;
                            else if (prog.name === 'test_usdcx_stablecoin.aleo')
                                usdcx += value;
                            else if (prog.name === 'test_usad_stablecoin.aleo')
                                usad += value;
                        }
                    }
                }
            }
        }
        catch {
            // fail silently on single program error to keep accumulating others
        }
    }
    return {
        credits: Number(credits) / 1000000,
        usdcx: Number(usdcx) / 1000000,
        usad: Number(usad) / 1000000
    };
}
function getFreezeListProgramId(tokenProgram) {
    if (tokenProgram === 'test_usdcx_stablecoin.aleo') {
        return USDCX_FREEZELIST_PROGRAM_ID;
    }
    if (tokenProgram === 'test_usad_stablecoin.aleo') {
        return USAD_FREEZELIST_PROGRAM_ID;
    }
    return null;
}
async function getFreezeListIndex(programId, index) {
    const { AleoNetworkClient } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
    const client = new AleoNetworkClient(EXPLORER_BASE);
    const value = await client.getProgramMappingValue(programId, 'freeze_list_index', `${index}u32`);
    return value ? value.replace(/"/g, '') : null;
}
async function getFreezeListCount(programId) {
    const response = await fetch(`${MAPPING_BASE}/${programId}/mapping/freeze_list_last_index/true`);
    if (!response.ok) {
        return 0;
    }
    const value = await response.json();
    if (!value) {
        return 0;
    }
    const parsed = Number.parseInt(String(value).replace(/u32|["']/g, ''), 10);
    return Number.isFinite(parsed) ? parsed + 1 : 0;
}
async function generateFreezeListProof(ownerAddress, tokenProgram) {
    const freezeListProgramId = getFreezeListProgramId(tokenProgram);
    if (!freezeListProgramId) {
        throw new Error(`Unsupported freeze list program for ${tokenProgram}`);
    }
    const { SealanceMerkleTree } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
    const count = Math.max(1, await getFreezeListCount(freezeListProgramId));
    const addresses = [];
    for (let index = 0; index < count; index += 1) {
        const address = await getFreezeListIndex(freezeListProgramId, index);
        if (address) {
            addresses.push(address);
        }
    }
    const sealance = new SealanceMerkleTree();
    const leaves = sealance.generateLeaves(addresses, 16);
    const tree = sealance.buildTree(leaves);
    const [leftIdx, rightIdx] = sealance.getLeafIndices(tree, ownerAddress);
    const proofLeft = sealance.getSiblingPath(tree, leftIdx, 16);
    const proofRight = sealance.getSiblingPath(tree, rightIdx, 16);
    return sealance.formatMerkleProof([proofLeft, proofRight]);
}
async function createSponsoredPaymentAuthorization(args) {
    const session = await getScannerSession(args.walletPrivateKey);
    const paymentMode = resolvePaymentMode(args.invoice, args.amount, args.currency);
    if (!args.invoice.salt) {
        throw new Error('Invoice is missing salt.');
    }
    const merchantAddress = args.invoice.designated_address || args.invoice.merchant_address;
    if (!merchantAddress || !merchantAddress.startsWith('aleo')) {
        throw new Error('Invoice merchant address is unavailable for automated payment.');
    }
    const record = await findSpendableRecord(session, paymentMode.tokenProgram, paymentMode.tokenProgram === 'credits.aleo' ? 'credits' : 'Token', paymentMode.amountMicro, paymentMode.tokenProgram === 'credits.aleo');
    if (!record) {
        throw new Error(`No spendable private record found for ${paymentMode.tokenProgram}.`);
    }
    let proofsInput;
    if (paymentMode.tokenProgram !== 'credits.aleo') {
        const ownerMatch = record.match(/owner\s*:\s*([a-z0-9]+)/i);
        const ownerAddress = ownerMatch?.[1];
        if (!ownerAddress || !ownerAddress.startsWith('aleo')) {
            throw new Error(`Failed to read token record owner for ${paymentMode.tokenProgram}.`);
        }
        proofsInput = await generateFreezeListProof(ownerAddress, paymentMode.tokenProgram);
    }
    const { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
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
        session.account.address().toString(),
        `${paymentMode.amountMicro}${paymentMode.amountSuffix}`,
        args.invoice.salt,
        paymentSecret,
        '0field',
        '0field',
        args.invoice.invoice_hash,
    ];
    if (proofsInput) {
        inputs.push(proofsInput);
    }
    const authorization = await programManager.buildAuthorization({
        programName: exports.PROGRAM_ID,
        functionName: paymentMode.functionName,
        inputs,
    });
    return { authorization: authorization.toString() };
}
async function createSweepAuthorization(args) {
    const session = await getScannerSession(args.walletPrivateKey);
    let tokenProgram = 'credits.aleo';
    let recordName = 'credits';
    let functionName = 'transfer_private';
    let amountSuffix = 'u64';
    if (args.currency === 'USDCX') {
        tokenProgram = 'test_usdcx_stablecoin.aleo';
        recordName = 'Token';
        amountSuffix = 'u128';
    }
    else if (args.currency === 'USAD') {
        tokenProgram = 'test_usad_stablecoin.aleo';
        recordName = 'Token';
        amountSuffix = 'u128';
    }
    const record = await findSpendableRecord(session, tokenProgram, recordName, args.amountMicro, tokenProgram === 'credits.aleo');
    if (!record) {
        throw new Error(`No spendable private record found for ${tokenProgram} with sufficient balance.`);
    }
    let proofsInput;
    if (tokenProgram !== 'credits.aleo') {
        const ownerMatch = record.match(/owner\s*:\s*([a-z0-9]+)/i);
        const ownerAddress = ownerMatch?.[1];
        if (!ownerAddress || !ownerAddress.startsWith('aleo')) {
            throw new Error(`Failed to read token record owner for ${tokenProgram}.`);
        }
        proofsInput = await generateFreezeListProof(ownerAddress, tokenProgram);
    }
    const { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } = await (0, esm_1.dynamicImport)('@provablehq/sdk');
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const networkClient = new AleoNetworkClient(EXPLORER_BASE);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);
    const programManager = new ProgramManager(EXPLORER_BASE, keyProvider, recordProvider);
    programManager.setAccount(session.account);
    const inputs = [
        args.destination,
        `${args.amountMicro}${amountSuffix}`
    ];
    if (tokenProgram === 'credits.aleo') {
        inputs.unshift(record); // For credits, record goes first: [record, destination, amount]
    }
    else {
        inputs.push(record); // For Token, record goes last: [destination, amount, record]
        if (proofsInput) {
            inputs.push(proofsInput); // [destination, amount, record, proofs]
        }
    }
    const authorization = await programManager.buildAuthorization({
        programName: tokenProgram,
        functionName,
        inputs,
    });
    return { authorization: authorization.toString(), programName: tokenProgram };
}
