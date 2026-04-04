function getProvableCredentials() {
    const apiKey = process.env.PROVABLE_API_KEY;
    const consumerId = process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY;
    return { apiKey, consumerId };
}

async function submitRelayedInvoiceCreation({ merchantPubKey, amount, currency, salt, memo, invoice_type }) {
    const uppercaseCurrency = (currency || 'CREDITS').toUpperCase();
    const isDonation = invoice_type === 2;
    const amountVal = amount ? Number(amount) : 0;
    const amountMicro = isDonation ? 0n : BigInt(Math.round(amountVal * 1000000));

    let funcName = 'create_invoice';
    let amountStr = `${amountMicro}u64`;

    if (uppercaseCurrency === 'USDCX') {
        funcName = 'create_invoice_usdcx';
        amountStr = `${amountMicro}u128`;
    } else if (uppercaseCurrency === 'USAD') {
        funcName = 'create_invoice_usad';
        amountStr = `${amountMicro}u128`;
    } else if (uppercaseCurrency === 'ANY') {
        funcName = 'create_invoice_any';
        amountStr = `${amountMicro}u128`;
    }

    if (!merchantPubKey) {
        throw new Error('Merchant public key missing');
    }

    let memoField = '0field';
    if (memo) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(memo);
        let hex = '0x';
        for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
        memoField = `${BigInt(hex).toString()}field`;
    }

    const typeStr = `${invoice_type !== undefined ? invoice_type : 0}u8`;
    const inputs = [merchantPubKey, amountStr, salt, memoField, '0u32', typeStr, '0u8'];

    const relayerPrivateKeyStr = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKeyStr) throw new Error('RELAYER_PRIVATE_KEY missing');

    const sdk = await import('@provablehq/sdk');
    const host = 'https://api.explorer.provable.com/v1';
    const networkClient = new sdk.AleoNetworkClient(host);
    const relayerAccount = new sdk.Account({ privateKey: relayerPrivateKeyStr });

    const keyProvider = new sdk.AleoKeyProvider();
    keyProvider.useCache(true);
    const pm = new sdk.ProgramManager(host, keyProvider, undefined);
    pm.setAccount(relayerAccount);

    const auth = await pm.buildAuthorization({
        programName: 'zk_pay_proofs_privacy_v24.aleo',
        functionName: funcName,
        inputs: inputs,
        fee: 0.1
    });

    const feeAuth = await pm.buildFeeAuthorization({
        privateKey: relayerAccount.privateKey(),
        deploymentOrExecutionId: auth.toExecutionId().toString(),
        baseFeeCredits: 0.05,
        priorityFeeCredits: 0
    });

    const { apiKey, consumerId } = getProvableCredentials();
    if (!apiKey || !consumerId) throw new Error('Missing PROVABLE_API_KEY or PROVABLE_CONSUMER_ID/PROVABLE_CONSUMER_KEY');

    const pReq = sdk.ProvingRequest.new(auth, feeAuth, true);
    const dpsRes = await networkClient.submitProvingRequestSafe({
        provingRequest: pReq,
        dpsPrivacy: true,
        apiKey,
        consumerId,
        url: 'https://api.provable.com/prove/testnet'
    });

    if (!dpsRes.ok) {
        throw new Error(`DPS Rejected Request: ${dpsRes.error?.message || JSON.stringify(dpsRes.error)}`);
    }

    const { transaction, broadcast_result } = dpsRes.data;
    return { txId: transaction?.id || broadcast_result?.id };
}

module.exports = {
    getProvableCredentials,
    submitRelayedInvoiceCreation
};
