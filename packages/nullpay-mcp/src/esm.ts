export async function dynamicImport<T = any>(specifier: string): Promise<T> {
    const importer = new Function('s', 'return import(s);');
    return await importer(specifier) as Promise<T>;
}
