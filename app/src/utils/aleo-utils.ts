import { BACKEND_URL } from '../config/backend';
import * as Crypto from 'expo-crypto';

export const generateSalt = (): string => {
    // Generate 16 random bytes (128 bits)
    const randomBytes = Crypto.getRandomBytes(16);
    let randomBigInt = BigInt(0);
    for (const byte of randomBytes) {
        randomBigInt = (randomBigInt << BigInt(8)) + BigInt(byte);
    }
    return `${randomBigInt}field`;
};

export const createInvoiceHash = async (merchant: string, amount: number, salt: string): Promise<string> => {
    try {
        console.log("🔗 Backend Call: createInvoiceHash", { merchant, amount, salt });
        const response = await fetch(`${BACKEND_URL}/api/hash-invoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant, amount, salt })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("✅ Backend Result:", data.hash);
        return data.hash;
    } catch (error: any) {
        console.error("❌ Backend Error:", error);
        throw error;
    }
};
