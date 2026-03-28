import fs from 'fs';
import path from 'path';

export const DEFAULT_BACKEND_URL = 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
export const DEFAULT_PUBLIC_BASE_URL = 'https://nullpay.app';
const DEFAULT_PROVABLE_API_KEY = 'tWR9YWkM5SVmx1u3m7My8S4p4e2s84Oe';
const DEFAULT_PROVABLE_CONSUMER_ID = '73ba1b21-d8f7-4d7f-bfd9-0408a4e183f3';

export function parseDotEnv(content: string): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
        const separatorIndex = normalized.indexOf('=');
        if (separatorIndex <= 0) {
            continue;
        }

        const key = normalized.slice(0, separatorIndex).trim();
        let value = normalized.slice(separatorIndex + 1).trim();
        if (!key) {
            continue;
        }

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        parsed[key] = value;
    }

    return parsed;
}

export function loadEnvFiles(): void {
    const packageRoot = path.resolve(__dirname, '..');
    const repoRoot = path.resolve(packageRoot, '..', '..');
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(packageRoot, '.env'),
        path.resolve(repoRoot, '.env'),
        path.resolve(repoRoot, 'backend', '.env'),
    ];

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const values = parseDotEnv(fs.readFileSync(filePath, 'utf8'));
        for (const [key, value] of Object.entries(values)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

export function getRuntimeConfig() {
    loadEnvFiles();

    return {
        backendBaseUrl: process.env.NULLPAY_BACKEND_URL || DEFAULT_BACKEND_URL,
        publicBaseUrl: process.env.NULLPAY_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL,
    };
}

export function getProvableConfig() {
    loadEnvFiles();

    return {
        apiKey: process.env.PROVABLE_API_KEY || DEFAULT_PROVABLE_API_KEY,
        consumerId: process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY || DEFAULT_PROVABLE_CONSUMER_ID,
    };
}

