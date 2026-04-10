import { AleoNetworkClient, Account } from '@provablehq/sdk';
import { FIXED_FEE_MICROCREDITS, getFeePreferenceMode } from './feePreference';
export const CORE_PROGRAM_ID = "zk_pay_proofs_privacy_v27.aleo";
export const WALLET_PROGRAM_ID = "zk_pay_proofs_privacy_wallet_v4.aleo";
export const PROGRAM_ID = CORE_PROGRAM_ID;
export const FREEZELIST_PROGRAM_ID = "test_usdcx_freezelist.aleo";
const PROVABLE_HOST = 'https://api.explorer.provable.com/v1';
const PROVABLE_PROGRAM_API = 'https://api.provable.com/v1/testnet/program';
const PAYMENT_FUNCTION_FALLBACKS = new Set([
    'pay_invoice',
    'pay_invoice_usdcx',
    'pay_invoice_usad',
    'pay_donation',
    'pay_donation_usdcx',
    'pay_donation_usad',
]);

let feeEstimatorManagerPromise: Promise<any> | null = null;
const programSourceCache = new Map<string, string>();
const programImportsCache = new Map<string, Record<string, string>>();

const getFeeEstimatorProgramManager = async () => {
    if (!feeEstimatorManagerPromise) {
        feeEstimatorManagerPromise = (async () => {
            const sdk = await import('@provablehq/sdk');
            const keyProvider = new sdk.AleoKeyProvider();
            keyProvider.useCache(true);
            const programManager = new sdk.ProgramManager(PROVABLE_HOST, keyProvider, undefined);
            const tempPrivateKey = new sdk.PrivateKey();
            programManager.setAccount(new sdk.Account({ privateKey: tempPrivateKey.to_string() }));
            return programManager;
        })();
    }

    return feeEstimatorManagerPromise;
};

const getProgramSource = async (programName: string): Promise<string> => {
    const cached = programSourceCache.get(programName);
    if (cached) return cached;

    const response = await fetch(`${PROVABLE_PROGRAM_API}/${encodeURIComponent(programName)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch program source for ${programName}: ${response.status}`);
    }

    const data = await response.json();
    console.log('[fee-estimation] getProgramSource response', {
        programName,
        responseType: typeof data,
        isString: typeof data === 'string',
        keys: typeof data === 'object' && data ? Object.keys(data) : [],
        preview: typeof data === 'string' ? data.slice(0, 120) : typeof data?.program === 'string' ? data.program.slice(0, 120) : data
    });
    const programSource = typeof data === 'string'
        ? data
        : typeof data?.program === 'string'
            ? data.program
            : '';
    if (!programSource) {
        throw new Error(`Program source missing for ${programName}`);
    }

    programSourceCache.set(programName, programSource);
    return programSource;
};

const extractImportIds = (programSource: string): string[] => {
    const importMatches = programSource.matchAll(/^\s*import\s+([A-Za-z0-9_.]+);/gm);
    return Array.from(importMatches, (match) => match[1]).filter(Boolean);
};

const looksLikeRecordInput = (input: string) => {
    const value = String(input || '').trim();
    return /^record1/i.test(value)
        || /^ciphertext1/i.test(value)
        || (/^\{/.test(value) && /owner:\s*[A-Za-z0-9]+/.test(value) && /_nonce:/.test(value));
};

const getEffectiveFallbackMicrocredits = (
    programName: string,
    functionName: string,
    fallbackMicrocredits: number
) => {
    if (programName === PROGRAM_ID && PAYMENT_FUNCTION_FALLBACKS.has(functionName)) {
        return FIXED_FEE_MICROCREDITS;
    }
    return fallbackMicrocredits;
};

const getProgramImports = async (programName: string, programSource?: string): Promise<Record<string, string>> => {
    const cached = programImportsCache.get(programName);
    if (cached) return cached;

    const resolvedProgramSource = programSource ?? await getProgramSource(programName);
    const imports: Record<string, string> = {};

    for (const importId of extractImportIds(resolvedProgramSource)) {
        const importSource = await getProgramSource(importId);
        imports[importId] = importSource;

        const nestedImports = await getProgramImports(importId, importSource);
        Object.assign(imports, nestedImports);
    }

    programImportsCache.set(programName, imports);
    return imports;
};

export const estimateExecutionFee = async ({
    programName,
    functionName,
    inputs,
    fallbackMicrocredits = 250_000,
    bufferPercent = 20
}: {
    programName: string;
    functionName: string;
    inputs: string[];
    fallbackMicrocredits?: number;
    bufferPercent?: number;
}): Promise<number> => {
    const effectiveFallbackMicrocredits = getEffectiveFallbackMicrocredits(
        programName,
        functionName,
        fallbackMicrocredits
    );

    try {
        const feeMode = getFeePreferenceMode();
        if (feeMode === 'fixed') {
            console.log('[fee-estimation] fixed fee mode enabled', {
                programName,
                functionName,
                fixedFeeMicrocredits: FIXED_FEE_MICROCREDITS
            });
            return FIXED_FEE_MICROCREDITS;
        }

        const sdk = await import('@provablehq/sdk');
        console.log('[fee-estimation] starting', {
            programName,
            functionName,
            inputCount: inputs.length,
            fallbackMicrocredits: effectiveFallbackMicrocredits,
            bufferPercent
        });

        if (inputs.some(looksLikeRecordInput)) {
            console.log('[fee-estimation] signer-owned record input detected, skipping exact authorization-based estimation', {
                programName,
                functionName,
                fallbackMicrocredits: effectiveFallbackMicrocredits
            });
            return effectiveFallbackMicrocredits;
        }

        const programManager = await getFeeEstimatorProgramManager();
        const authorizationParams: {
            programName: string;
            functionName: string;
            inputs: string[];
            programSource?: string;
        } = {
            programName,
            functionName,
            inputs
        };
        const programSource = await getProgramSource(programName);
        const programImports = await getProgramImports(programName, programSource);
        authorizationParams.programSource = programSource;
        console.log('[fee-estimation] program bundle loaded', {
            programName,
            sourceLength: programSource.length,
            importCount: Object.keys(programImports).length,
            importIds: Object.keys(programImports)
        });

        console.log('[fee-estimation] building authorization', {
            programName,
            functionName
        });
        const authorization = await programManager.buildAuthorization(authorizationParams);
        console.log('[fee-estimation] authorization built', {
            programName,
            functionName,
            executionId: authorization.toExecutionId().toString()
        });

        const baseFeeMicrocredits = await programManager.estimateFeeForAuthorization({
            authorization,
            program: sdk.Program.fromString(programSource),
            imports: programImports
        });
        console.log('[fee-estimation] base fee estimated', {
            programName,
            functionName,
            baseFeeMicrocredits: baseFeeMicrocredits.toString()
        });

        const fee = BigInt(baseFeeMicrocredits.toString());
        const safeFee = fee + ((fee * BigInt(bufferPercent)) / 100n);
        console.log('[fee-estimation] safe fee computed', {
            programName,
            functionName,
            safeFeeMicrocredits: safeFee.toString()
        });
        return Number(safeFee);
    } catch (error) {
        console.warn(`[fee-estimation] Falling back to ${effectiveFallbackMicrocredits} microcredits for ${programName}/${functionName}`, {
            error,
            inputs
        });
        return effectiveFallbackMicrocredits;
    }
};


export const fetchBurnerRecordsFromTx = async (txId: string, privateKeyStr: string): Promise<any[]> => {
    try {
        if (!txId || !privateKeyStr) {
            console.log("🔍 [fetchBurnerRecords] Skipping - missing txId or privateKey", { txId: !!txId, key: !!privateKeyStr });
            return [];
        }

        let retries = 5;
        while (retries > 0) {
            const url = `https://api.provable.com/v1/testnet/transaction/${txId}`;
            console.log(`🔍 [fetchBurnerRecords] Fetching: ${url} (retries left: ${retries})`);
            const response = await fetch(url);
            console.log(`🔍 [fetchBurnerRecords] Response status: ${response.status}`);

            if (response.ok) {
                const tx = await response.json();
                console.log(`🔍 [fetchBurnerRecords] TX data keys:`, Object.keys(tx));
                const account = new Account({ privateKey: privateKeyStr });
                const foundRecords: any[] = [];

                let transitions = [];
                if (tx.execution && tx.execution.transitions) {
                    transitions = tx.execution.transitions;
                } else if (tx.fee && tx.fee.transition) {
                    transitions = [tx.fee.transition];
                }
                console.log(`🔍 [fetchBurnerRecords] Transitions found: ${transitions.length}`);

                for (const transition of transitions) {
                    const outputs = transition.outputs || [];
                    console.log(`🔍 [fetchBurnerRecords] Transition ${transition.id} - Program: ${transition.program} - Outputs: ${outputs.length}`);
                    for (const output of outputs) {
                        console.log(`🔍 [fetchBurnerRecords] Output type: ${output.type}, id: ${output.id}`);
                        if (output.type === 'record') {
                            const ciphertext = output.value;
                            console.log(`🔍 [fetchBurnerRecords] Found record ciphertext (first 80 chars): ${ciphertext?.substring(0, 80)}...`);
                            try {
                                const owns = account.ownsRecordCiphertext(ciphertext);
                                console.log(`🔍 [fetchBurnerRecords] Owns record? ${owns}`);
                                if (owns) {
                                    const plaintextObj = account.decryptRecord(ciphertext);
                                    const plaintextStr = typeof plaintextObj === 'string' ? plaintextObj : plaintextObj.toString();
                                    console.log(`✅ [fetchBurnerRecords] DECRYPTED RECORD:\n${plaintextStr}`);

                                    foundRecords.push({
                                        ...output,
                                        plaintext: plaintextStr,
                                        recordCiphertext: ciphertext,
                                        ciphertext: ciphertext,
                                        transactionId: txId,
                                        transitionId: transition.id
                                    });
                                }
                            } catch (e) {
                                console.warn(`🔍 [fetchBurnerRecords] Decrypt/ownership check failed:`, e);
                            }
                        }
                    }
                }
                console.log(`🔍 [fetchBurnerRecords] Total records found for TX ${txId}: ${foundRecords.length}`);
                return foundRecords;
            }
            console.log(`🔍 [fetchBurnerRecords] Response not OK (${response.status}), retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            retries--;
        }

        console.warn(`Failed to fetch tx ${txId} for burner analysis after retries`);
        return [];
    } catch (e) {
        console.error("Error fetching burner records for tx:", txId, e);
        return [];
    }
};

export const stringToField = (str: string): string => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length > 31) {
        throw new Error(`Value exceeds single Leo field capacity (${bytes.length}/31 bytes).`);
    }
    let hex = '0x';
    for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, '0');
    }
    return `${BigInt(hex).toString()}field`;
};

export const fieldToString = (fieldVal: string): string => {
    try {
        const val = BigInt(fieldVal.replace('field', ''));
        let hex = val.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        const decoder = new TextDecoder();
        return decoder.decode(bytes).replace(/\0/g, '');
    } catch (e) { return ''; }
};

export const generateSalt = (): string => {
    const randomBuffer = new Uint8Array(16);
    crypto.getRandomValues(randomBuffer);
    let randomBigInt = BigInt(0);
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return `${randomBigInt}field`;
};


export const getInvoiceHashFromMapping = async (salt: string): Promise<string | null> => {
    console.log(`Checking salt mapping for ${salt}...`);
    try {
        const url = `https://api.provable.com/v2/testnet/program/${PROGRAM_ID}/mapping/salt_to_invoice/${salt}`;
        const res = await fetch(url);
        if (res.ok) {
            const val = await res.json();
            if (val) return val.toString().replace(/(['"])/g, '');
        }
    } catch (e) { console.error(e); }
    return null;
};

export const getInvoiceStatus = async (hash: string): Promise<number | null> => {
    const data = await getInvoiceData(hash);
    return data ? data.status : null;
};

export const getInvoiceData = async (hash: string): Promise<{ status: number, tokenType: number, invoiceType: number } | null> => {
    console.log(`Fetching invoice data for hash ${hash}...`);
    try {
        const url = `https://api.provable.com/v2/testnet/program/${PROGRAM_ID}/mapping/invoices/${hash}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data) {
                let status = 0;
                let tokenType = 0;
                let invoiceType = 0;

                // Handle String Response
                if (typeof data === 'string') {
                    console.log("Invoice Data (String):", data);
                    const statusMatch = data.match(/status:\s*(\d+)u8/);
                    if (statusMatch && statusMatch[1]) status = parseInt(statusMatch[1]);

                    const tokenMatch = data.match(/token_type:\s*(\d+)u8/);
                    if (tokenMatch && tokenMatch[1]) tokenType = parseInt(tokenMatch[1]);

                    const typeMatch = data.match(/invoice_type:\s*(\d+)u8/);
                    if (typeMatch && typeMatch[1]) invoiceType = parseInt(typeMatch[1]);

                    return { status, tokenType, invoiceType };
                }

                // Handle Object Response
                if (typeof data === 'object') {
                    console.log("Invoice Data (Object):", JSON.stringify(data));

                    // Helper to safely parse int from various formats (number, "1u8", "1")
                    const parseVal = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') return parseInt(val.replace('u8', ''));
                        return 0;
                    };

                    if ('status' in data) status = parseVal(data.status);

                    if ('token_type' in data) tokenType = parseVal(data.token_type);
                    else if ('tokenType' in data) tokenType = parseVal(data.tokenType);

                    if ('invoice_type' in data) invoiceType = parseVal(data.invoice_type);
                    else if ('invoiceType' in data) invoiceType = parseVal(data.invoiceType);

                    console.log(`Parsed Data -> Status: ${status}, TokenType: ${tokenType}, InvoiceType: ${invoiceType}`);

                    return { status, tokenType, invoiceType };
                }
            }
        }
    } catch (e) {
        console.error('Error fetching invoice data:', e);
    }
    return null;
};

export const getFreezeListRoot = async (): Promise<string | null> => {
    try {
        const url = `https://api.provable.com/v2/testnet/program/${FREEZELIST_PROGRAM_ID}/mapping/freeze_list_root/1u8`;
        const res = await fetch(url);
        if (res.ok) {
            const val = await res.json();
            // Value is usually "12345field"
            return val ? val.toString().replace(/(['"])/g, '') : null;
        }
    } catch (e) { console.error("Error fetching freeze list root:", e); }
    return null;
};

export const getFreezeListCount = async (): Promise<number> => {
    try {
        const url = `https://api.provable.com/v2/testnet/program/${FREEZELIST_PROGRAM_ID}/mapping/freeze_list_last_index/true`;
        const res = await fetch(url);
        if (res.ok) {
            const val = await res.json();
            // Value is "0u32" or "5u32"
            if (val) {
                const parsed = parseInt(val.replace('u32', '').replace(/(['"])/g, ''));
                return isNaN(parsed) ? 0 : parsed + 1; // last_index is 0-based, so count is index + 1
            }
        }
    } catch (e) { console.error("Error fetching freeze list count:", e); }
    return 0;
};

export const getFreezeListIndex = async (index: number): Promise<string | null> => {
    try {
        const client = new AleoNetworkClient("https://api.provable.com/v1"); // Use v1 client
        const mappingValue = await client.getProgramMappingValue(FREEZELIST_PROGRAM_ID, 'freeze_list_index', `${index}u32`);
        return mappingValue ? mappingValue.replace(/"/g, '') : null;
    } catch (e) {
        console.error(`Error fetching freeze list index ${index}:`, e);
        return null;
    }
};


export const generateFreezeListProof = async (targetIndex: number = 1, occupiedLeafValue?: string): Promise<string> => {
    try {
        const { Poseidon4, Field } = await import('@provablehq/wasm');
        const hasher = new Poseidon4();

        // 1. Pre-calculate Empty Hashes for each level (0 to 15)
        const emptyHashes: string[] = [];
        let currentEmpty = '0field';
        for (let i = 0; i < 16; i++) {
            emptyHashes.push(currentEmpty);
            const f = Field.fromString(currentEmpty);
            const nextHashField = hasher.hash([f, f]);
            currentEmpty = nextHashField.toString();
        }

        let currentHash = '0field';
        let currentIndex = targetIndex;
        const proofSiblings: string[] = [];

        for (let i = 0; i < 16; i++) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            let siblingHash = emptyHashes[i]
            if (i === 0 && siblingIndex === 0 && occupiedLeafValue) {
                siblingHash = occupiedLeafValue;
            }

            proofSiblings.push(siblingHash);

            const fCurrent = Field.fromString(currentHash);
            const fSibling = Field.fromString(siblingHash);

            const input = isLeft ? [fCurrent, fSibling] : [fSibling, fCurrent];

            const nextHashField = hasher.hash(input);
            currentHash = nextHashField.toString();

            currentIndex = Math.floor(currentIndex / 2);
        }

        return `{ siblings: [${proofSiblings.join(', ')}], leaf_index: ${targetIndex}u32 }`;

    } catch (e) {
        console.warn("Merkle Proof Generation Warning (using fallback):", e);
        const s = Array(16).fill('0field').join(', ');
        return `{ siblings: [${s}], leaf_index: ${targetIndex}u32 }`;
    }
};

export interface InvoiceRecord {
    owner: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    salt: string;
    title: string;
    memo: string;
    walletType?: number;
}

export const parseInvoice = (record: any): InvoiceRecord | null => {
    try {
        const data = record.plaintext || '';
        console.log("📝 parseInvoice checking plaintext:", data);

        const getVal = (key: string) => {
            // Handle standard (key: value) and quoted ("key": value)
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const invoiceHash = getVal('invoice_hash') || getVal('invoiceHash');
        const owner = getVal('owner');
        const salt = getVal('salt');
        const titleField = getVal('title');
        const memoField = getVal('memo');

        if (invoiceHash && owner) {
            const invoiceTypeVal = getVal('invoice_type') || getVal('invoiceType');
            if (invoiceTypeVal === null) return null; // Only Invoices have invoice_type

            const amountVal = getVal('amount');
            const amount = amountVal ? parseInt(amountVal.replace('u64', '')) : 0;

            const tokenTypeVal = getVal('token_type') || getVal('tokenType');
            const tokenType = tokenTypeVal ? parseInt(tokenTypeVal.replace('u8', '')) : 0;

            const invoiceType = invoiceTypeVal ? parseInt(invoiceTypeVal.replace('u8', '')) : 0;

            const walletTypeVal = getVal('wallet_type') || getVal('walletType');
            const walletType = walletTypeVal ? parseInt(walletTypeVal.replace('u8', '')) : 0;

            return {
                owner: owner,
                invoiceHash: invoiceHash,
                amount: amount,
                tokenType: tokenType,
                invoiceType: invoiceType,
                salt: salt || '',
                title: titleField ? fieldToString(titleField) : '',
                memo: memoField ? fieldToString(memoField) : '',
                walletType: walletType
            };
        }
    } catch (e) { console.error("Error parsing Invoice record:", e); }
    return null;
};

export interface PayerReceipt {
    owner: string;
    merchant: string;
    receiptHash: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    payerNote: string;
    timestamp: number;
    transactionId?: string;
}

export const parsePayerReceipt = (record: any): PayerReceipt | null => {
    try {
        const data = record.plaintext || '';

        const getVal = (key: string) => {
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const receiptHash = getVal('receipt_hash') || getVal('receiptHash');
        const invoiceHash = getVal('invoice_hash') || getVal('invoiceHash');
        const owner = getVal('owner');
        const merchant = getVal('merchant');
        const payerNoteField = getVal('payer_note') || getVal('note');

        if (!receiptHash || !merchant) return null;

        if (receiptHash && invoiceHash) {
            return {
                owner: owner || '',
                merchant: merchant || '',
                receiptHash: receiptHash,
                invoiceHash: invoiceHash,
                amount: parseInt((getVal('amount') || '0').replace('u64', '')),
                tokenType: parseInt((getVal('token_type') || getVal('tokenType') || '0').replace('u8', '')),
                payerNote: payerNoteField ? fieldToString(payerNoteField) : '',
                timestamp: 0, // Placeholder
                transactionId: record.transactionId || record.transaction_id || undefined
            };
        }
    } catch (e) { console.error("Error parsing PayerReceipt:", e); }
    return null;
};

export interface MerchantReceipt {
    owner: string;
    receiptHash: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    merchantNote: string;
    timestamp?: number;
    transactionId?: string;
}

export const parseMerchantReceipt = (record: any): MerchantReceipt | null => {
    try {
        const data = record.plaintext || '';

        const getVal = (key: string) => {
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const invoiceHash = getVal('invoice_hash') || getVal('invoiceHash');
        const receiptHash = getVal('receipt_hash') || getVal('receiptHash');
        const owner = getVal('owner');
        const merchant = getVal('merchant');
        const merchantNoteField = getVal('merchant_note') || getVal('note');

        if (merchant) return null;

        if (invoiceHash && receiptHash && owner) {
            const amountVal = getVal('amount');
            const amount = amountVal ? parseInt(amountVal.replace('u64', '')) : 0;
            const tokenTypeVal = getVal('token_type') || getVal('tokenType');
            const tokenType = tokenTypeVal ? parseInt(tokenTypeVal.replace('u8', '')) : 0;

            return {
                owner: owner,
                receiptHash: receiptHash,
                invoiceHash: invoiceHash,
                amount: amount,
                tokenType: tokenType,
                merchantNote: merchantNoteField ? fieldToString(merchantNoteField) : '',
                transactionId: record.transactionId || record.transaction_id || undefined
            };
        }
    } catch (e) { console.error("Error parsing MerchantReceipt record:", e); }
    return null;
};

export interface BurnerWalletRecord {
    owner: string;
    burnerAddress: string;
    passwordPart: string;
    pkParts: string[];
}

export const parseBurnerBackupRecord = (record: any): BurnerWalletRecord | null => {
    try {
        const data = record.plaintext || '';

        const getVal = (key: string) => {
            const regex = new RegExp(`(?:${key}|"${key}"):\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const burnerAddress = getVal('burner_address');
        const owner = getVal('owner');
        const passwordPart = getVal('password_part');

        if (!burnerAddress || !passwordPart) return null;

        const pkParts = [];
        for (let i = 1; i <= 10; i++) {
            const part = getVal(`pk_part_${i}`);
            if (part && part !== '0field' && part !== '0') {
                pkParts.push(part);
            }
        }

        return {
            owner: owner || '',
            burnerAddress: burnerAddress,
            passwordPart: passwordPart,
            pkParts: pkParts
        };
    } catch (e) { console.error("Error parsing BurnerWalletRecord:", e); }
    return null;
};
