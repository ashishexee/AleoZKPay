"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnvTrimmed = readEnvTrimmed;
exports.getMainWalletEnv = getMainWalletEnv;
function readEnvTrimmed(name) {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}
function getMainWalletEnv() {
    return {
        address: readEnvTrimmed('NULLPAY_MAIN_ADDRESS'),
        password: readEnvTrimmed('NULLPAY_MAIN_PASSWORD'),
        privateKey: readEnvTrimmed('NULLPAY_MAIN_PRIVATE_KEY') || readEnvTrimmed('NULLPAY_MAIN_PVT_KEY')
    };
}
