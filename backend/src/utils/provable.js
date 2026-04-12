function getProvableCredentials() {
    const apiKey = process.env.PROVABLE_API_KEY;
    const consumerId = process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY;
    return { apiKey, consumerId };
}

let cachedProgramSource = null;
const cachedImportSources = new Map();
const CORE_PROGRAM_NAME = 'zk_pay_proofs_privacy_v29.aleo';
const LEO_SINGLE_FIELD_MAX_BYTES = 31;

function encodeSingleField(value, label) {
    if (!value) {
        return '0field';
    }

    const normalized = String(value).trim();
    if (!normalized) {
        return '0field';
    }

    const encoder = new TextEncoder();
    const bytes = encoder.encode(normalized);
    if (bytes.length > LEO_SINGLE_FIELD_MAX_BYTES) {
        throw new Error(`${label} exceeds the Leo single-field limit of ${LEO_SINGLE_FIELD_MAX_BYTES} bytes.`);
    }

    let hex = '0x';
    for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
    return `${BigInt(hex).toString()}field`;
}

async function getProgramSource(programName = CORE_PROGRAM_NAME) {
    if (programName === CORE_PROGRAM_NAME && cachedProgramSource) return cachedProgramSource;

    const response = await fetch(`https://api.provable.com/v1/testnet/program/${encodeURIComponent(programName)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch program source for ${programName}: ${response.status}`);
    }
    const data = await response.json();
    const programSource = typeof data === 'string'
        ? data
        : typeof data?.program === 'string'
            ? data.program
            : '';
    if (!programSource) {
        throw new Error(`Program source missing from Provable v1 response for ${programName}`);
    }

    if (programName === CORE_PROGRAM_NAME) {
        cachedProgramSource = programSource;
    }

    return programSource;
}

function extractImportIds(programSource) {
    return Array.from(programSource.matchAll(/^\s*import\s+([A-Za-z0-9_.]+);/gm), match => match[1]).filter(Boolean);
}

async function getProgramImports(programName, programSource) {
    if (cachedImportSources.has(programName)) {
        return cachedImportSources.get(programName);
    }

    const resolvedProgramSource = programSource || await getProgramSource(programName);
    const imports = {};

    for (const importId of extractImportIds(resolvedProgramSource)) {
        const importSource = await getProgramSource(importId);
        imports[importId] = importSource;

        const nestedImports = await getProgramImports(importId, importSource);
        Object.assign(imports, nestedImports);
    }

    cachedImportSources.set(programName, imports);
    return imports;
}

async function submitRelayedInvoiceCreation({ merchantPubKey, amount, currency, salt, title, memo, invoice_type }) {
    const uppercaseCurrency = (currency || 'CREDITS').toUpperCase();
    const isDonation = invoice_type === 2;
    const amountVal = amount ? Number(amount) : 0;
    const amountMicro = isDonation ? 0n : BigInt(Math.round(amountVal * 1000000));

    let funcName = 'create_invoice';
    let amountStr = `${amountMicro}u64`;

    if (uppercaseCurrency === 'USDCX') {
        funcName = 'create_invoice_usdcx';
        amountStr = `${amountMicro}u128`;
    } else if (uppercaseCurrency === 'USAD') {
        funcName = 'create_invoice_usad';
        amountStr = `${amountMicro}u128`;
    } else if (uppercaseCurrency === 'ANY') {
        funcName = 'create_invoice_any';
        amountStr = `${amountMicro}u128`;
    }

    if (!merchantPubKey) {
        throw new Error('Merchant public key missing');
    }

    const titleField = encodeSingleField(title, 'Invoice title');
    const memoField = encodeSingleField(memo, 'Invoice memo');

    const typeStr = `${invoice_type !== undefined ? invoice_type : 0}u8`;
    const inputs = [merchantPubKey, amountStr, salt, titleField, memoField, '0u32', typeStr, '0u8'];

    const relayerPrivateKeyStr = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKeyStr) throw new Error('RELAYER_PRIVATE_KEY missing');

    const sdk = await import('@provablehq/sdk');
    const host = 'https://api.explorer.provable.com/v1';
    const networkClient = new sdk.AleoNetworkClient(host);
    const relayerAccount = new sdk.Account({ privateKey: relayerPrivateKeyStr });

    const keyProvider = new sdk.AleoKeyProvider();
    keyProvider.useCache(true);
    const pm = new sdk.ProgramManager(host, keyProvider, undefined);
    pm.setAccount(relayerAccount);

    const programName = CORE_PROGRAM_NAME;
    const programSource = await getProgramSource(programName);
    const programImports = await getProgramImports(programName, programSource);

    const auth = await pm.buildAuthorization({
        programName,
        functionName: funcName,
        inputs: inputs,
        programSource
    });

    const baseFeeMicrocredits = await pm.estimateFeeForAuthorization({
        authorization: auth,
        program: sdk.Program.fromString(programSource),
        imports: programImports
    });
    const safeFeeMicrocredits = Math.ceil(Number(baseFeeMicrocredits) * 1.2);
    const feeCredits = safeFeeMicrocredits / 1_000_000;

    const feeAuth = await pm.buildFeeAuthorization({
        privateKey: relayerAccount.privateKey(),
        deploymentOrExecutionId: auth.toExecutionId().toString(),
        baseFeeCredits: feeCredits,
        priorityFeeCredits: 0
    });

    const { apiKey, consumerId } = getProvableCredentials();
    if (!apiKey || !consumerId) throw new Error('Missing PROVABLE_API_KEY or PROVABLE_CONSUMER_ID/PROVABLE_CONSUMER_KEY');

    const pReq = sdk.ProvingRequest.new(auth, feeAuth, true);
    const dpsRes = await networkClient.submitProvingRequestSafe({
        provingRequest: pReq,
        dpsPrivacy: true,
        apiKey,
        consumerId,
        url: 'https://api.provable.com/prove/testnet'
    });

    if (!dpsRes.ok) {
        throw new Error(`DPS Rejected Request: ${dpsRes.error?.message || JSON.stringify(dpsRes.error)}`);
    }

    const { transaction, broadcast_result } = dpsRes.data;
    return { txId: transaction?.id || broadcast_result?.id };
}

module.exports = {
    getProvableCredentials,
    submitRelayedInvoiceCreation
};
