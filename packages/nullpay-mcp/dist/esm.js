"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicImport = dynamicImport;
async function dynamicImport(specifier) {
    const importer = new Function('s', 'return import(s);');
    return await importer(specifier);
}
