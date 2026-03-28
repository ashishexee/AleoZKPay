"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PUBLIC_BASE_URL = exports.DEFAULT_BACKEND_URL = void 0;
exports.parseDotEnv = parseDotEnv;
exports.loadEnvFiles = loadEnvFiles;
exports.getRuntimeConfig = getRuntimeConfig;
exports.getProvableConfig = getProvableConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.DEFAULT_BACKEND_URL = 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
exports.DEFAULT_PUBLIC_BASE_URL = 'https://nullpay.app';
const DEFAULT_PROVABLE_API_KEY = 'tWR9YWkM5SVmx1u3m7My8S4p4e2s84Oe';
const DEFAULT_PROVABLE_CONSUMER_ID = '73ba1b21-d8f7-4d7f-bfd9-0408a4e183f3';
function parseDotEnv(content) {
    const parsed = {};
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
function loadEnvFiles() {
    const packageRoot = path_1.default.resolve(__dirname, '..');
    const repoRoot = path_1.default.resolve(packageRoot, '..', '..');
    const candidates = [
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(packageRoot, '.env'),
        path_1.default.resolve(repoRoot, '.env'),
        path_1.default.resolve(repoRoot, 'backend', '.env'),
    ];
    for (const filePath of candidates) {
        if (!fs_1.default.existsSync(filePath)) {
            continue;
        }
        const values = parseDotEnv(fs_1.default.readFileSync(filePath, 'utf8'));
        for (const [key, value] of Object.entries(values)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}
function getRuntimeConfig() {
    loadEnvFiles();
    return {
        backendBaseUrl: process.env.NULLPAY_BACKEND_URL || exports.DEFAULT_BACKEND_URL,
        publicBaseUrl: process.env.NULLPAY_PUBLIC_BASE_URL || exports.DEFAULT_PUBLIC_BASE_URL,
    };
}
function getProvableConfig() {
    loadEnvFiles();
    return {
        apiKey: process.env.PROVABLE_API_KEY || DEFAULT_PROVABLE_API_KEY,
        consumerId: process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY || DEFAULT_PROVABLE_CONSUMER_ID,
    };
}
