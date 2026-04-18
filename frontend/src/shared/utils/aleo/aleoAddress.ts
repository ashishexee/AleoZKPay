const ALEO_ADDRESS_PATTERN = /^aleo1[0-9a-z]+$/;

export const normalizeAleoAddress = (value?: string | null) => (value || '').trim();

export const looksLikeAleoAddress = (value?: string | null) => {
    const normalized = normalizeAleoAddress(value);
    return normalized.length > 0 && ALEO_ADDRESS_PATTERN.test(normalized);
};

export const isValidAleoAddress = async (value?: string | null) => {
    const normalized = normalizeAleoAddress(value);
    if (!looksLikeAleoAddress(normalized)) {
        return false;
    }

    try {
        const { Address } = await import('@provablehq/wasm');
        Address.from_string(normalized);
        return true;
    } catch {
        return false;
    }
};
