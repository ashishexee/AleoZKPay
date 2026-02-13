import { AleoNetworkClient } from '@provablehq/sdk';
export const PROGRAM_ID = "zk_pay_proofs_privacy_v10.aleo";
export const FREEZELIST_PROGRAM_ID = "test_usdcx_freezelist.aleo";

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

                    // Check snake_case and camelCase
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

// --- FreezeList / Proof Helpers ---

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
}

export const parseInvoice = (record: any): InvoiceRecord | null => {
    try {
        const data = record.plaintext || '';
        const getVal = (key: string) => {
            const regex = new RegExp(`${key}:\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const invoiceHash = getVal('invoice_hash');
        const owner = getVal('owner');
        const salt = getVal('salt');

        if (invoiceHash && owner) {
            const amountVal = getVal('amount');
            const amount = amountVal ? parseInt(amountVal.replace('u64', '')) : 0;

            const tokenTypeVal = getVal('token_type');
            const tokenType = tokenTypeVal ? parseInt(tokenTypeVal.replace('u8', '')) : 0;

            const invoiceTypeVal = getVal('invoice_type');
            const invoiceType = invoiceTypeVal ? parseInt(invoiceTypeVal.replace('u8', '')) : 0;

            return {
                owner: owner,
                invoiceHash: invoiceHash,
                amount: amount,
                tokenType: tokenType,
                invoiceType: invoiceType,
                salt: salt || ''
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
    timestamp: number;
}

export const parsePayerReceipt = (record: any): PayerReceipt | null => {
    try {
        const data = record.plaintext || '';

        const getVal = (key: string) => {
            const regex = new RegExp(`${key}:\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const receiptHash = getVal('receipt_hash');
        const invoiceHash = getVal('invoice_hash');
        const owner = getVal('owner');
        const merchant = getVal('merchant');

        if (receiptHash && invoiceHash) {
            return {
                owner: owner || '',
                merchant: merchant || '',
                receiptHash: receiptHash,
                invoiceHash: invoiceHash,
                amount: parseInt((getVal('amount') || '0').replace('u64', '')),
                tokenType: parseInt((getVal('token_type') || '0').replace('u8', '')),
                timestamp: 0 // Placeholder
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
}

export const parseMerchantReceipt = (record: any): MerchantReceipt | null => {
    try {
        const data = record.plaintext || '';
        const getVal = (key: string) => {
            const regex = new RegExp(`${key}:\\s*([\\w\\d\\.]+)`);
            const match = data.match(regex);
            if (match && match[1]) {
                return match[1].replace('.private', '').replace('.public', '');
            }
            return null;
        };

        const invoiceHash = getVal('invoice_hash');
        const receiptHash = getVal('receipt_hash');
        const owner = getVal('owner');

        if (invoiceHash && receiptHash && owner) {
            const amountVal = getVal('amount');
            const amount = amountVal ? parseInt(amountVal.replace('u64', '')) : 0;
            const tokenTypeVal = getVal('token_type');
            const tokenType = tokenTypeVal ? parseInt(tokenTypeVal.replace('u8', '')) : 0;

            return {
                owner: owner,
                receiptHash: receiptHash,
                invoiceHash: invoiceHash,
                amount: amount,
                tokenType: tokenType
            };
        }
    } catch (e) { console.error("Error parsing MerchantReceipt record:", e); }
    return null;
};