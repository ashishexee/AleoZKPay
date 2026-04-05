function parseAleoSignature(sdk, signatureBase64) {
    const signatureBytes = Uint8Array.from(Buffer.from(signatureBase64 || '', 'base64'));
    if (!signatureBytes.length) {
        throw new Error('Signature payload is empty.');
    }

    const signatureString = new TextDecoder().decode(signatureBytes).trim();
    if (signatureString) {
        try {
            return sdk.Signature.from_string(signatureString);
        } catch (stringError) {
            try {
                return sdk.Signature.fromBytesLe(signatureBytes);
            } catch {
                throw stringError;
            }
        }
    }

    return sdk.Signature.fromBytesLe(signatureBytes);
}

async function verifyAleoMessageSignature({ address, message, signatureBase64 }) {
    const sdk = await import('@provablehq/sdk');
    const signature = parseAleoSignature(sdk, signatureBase64);
    const encoder = new TextEncoder();
    const aleoAddress = sdk.Address.from_string(address);
    return aleoAddress.verify(encoder.encode(message), signature);
}

module.exports = {
    parseAleoSignature,
    verifyAleoMessageSignature
};
