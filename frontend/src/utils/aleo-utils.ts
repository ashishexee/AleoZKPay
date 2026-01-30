export const PROGRAM_ID = "zk_pay_proofs_privacy_v7.aleo";

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
    console.log(`Checking invoice status for hash ${hash}...`);
    try {
        const url = `https://api.provable.com/v2/testnet/program/${PROGRAM_ID}/mapping/invoices/${hash}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data) {
                if (typeof data === 'string') {
                    const statusMatch = data.match(/status:\s*(\d+)u8/);
                    if (statusMatch && statusMatch[1]) {
                        const statusValue = parseInt(statusMatch[1]);
                        return statusValue;
                    }
                } else if (typeof data === 'object') {
                    const statusStr = data.status;
                    if (typeof statusStr === 'string') {
                        const parsed = parseInt(statusStr.replace(/u8/g, '').trim());
                        return parsed;
                    }
                    if (typeof statusStr === 'number') {
                        return statusStr;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error fetching invoice status:', e);
    }
    console.log('Returning null - no valid status found');
    return null;
};