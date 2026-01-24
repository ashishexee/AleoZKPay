<<<<<<< Updated upstream
import { BHP256, Address, Field, U64 } from '@provablehq/sdk';

export const generateSalt = (): string => {
    // Generate a random BigInt and convert to field string format
    console.log('generateSalt function called');

=======
export const generateSalt = (): string => {
>>>>>>> Stashed changes
    const randomBuffer = new Uint8Array(16);
    crypto.getRandomValues(randomBuffer);
    let randomBigInt = BigInt(0);
    for (const byte of randomBuffer) {
        randomBigInt = (randomBigInt << 8n) + BigInt(byte);
    }
    return `${randomBigInt}field`;
<<<<<<< Updated upstream

};

/**
 * Computes the invoice hash using local Leo program execution.
 * @param merchant Merchant address (e.g., aleo1...)
 * @param amount Amount in u64
 * @param salt Random salt field
 * @returns The computed hash field
 */
export const createInvoiceHash = async (merchant: string, amount: number, salt: string): Promise<string> => {
    try {
        console.log('Computing invoice hash (BHP256 Summation)...');
        const hasher = new BHP256();
        console.log(`Parsing inputs: Merchant=${merchant}, Amount=${amount}, Salt=${salt}`);
        const merchantAddr = Address.from_string(merchant);
        const amountU64 = U64.fromString(`${amount}u64`);

        // Field requires 'field' suffix (already in salt)
        const saltField = Field.fromString(salt);

        // 2. Hash each component
        // BHP256 hasher expects boolean array (bits) inputs
        const hashMerchant = hasher.hash(merchantAddr.toBitsLe());
        const hashAmount = hasher.hash(amountU64.toBitsLe());
        const hashSalt = hasher.hash(saltField.toBitsLe());

        // 3. Sum them up (Field addition)
        const finalHash = hashMerchant.add(hashAmount).add(hashSalt);

        const result = finalHash.toString();
        console.log("Hash computed:", result);
        return result;

    } catch (error) {
        console.error("Error computing hash:", error);
        throw error;
    }
};
=======
};  
>>>>>>> Stashed changes
