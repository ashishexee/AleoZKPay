const { getProvableCredentials } = require('../utils/provable');

const PROVABLE_PROVER_BASE = 'https://api.provable.com/prove/testnet';

const scannerProxy = async (req, res) => {
    try {
        const pathSuffix = req.path === '/' ? '' : req.path;
        const url = `https://api.provable.com/scanner/${req.params.network}${pathSuffix}`;

        const fetchOptions = {
            method: req.method,
            headers: {
                'authorization': req.headers['authorization'],
                'x-provable-api-key': req.headers['x-provable-api-key'],
                'accept': 'application/json'
            }
        };

        Object.keys(fetchOptions.headers).forEach(key =>
            fetchOptions.headers[key] === undefined && delete fetchOptions.headers[key]
        );

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            if (Object.keys(req.body).length > 0) {
                fetchOptions.body = JSON.stringify(req.body);
                fetchOptions.headers['content-type'] = 'application/json';
            }
        }

        const response = await fetch(url, fetchOptions);

        res.status(response.status);

        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('content-type', contentType);

        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error('Scanner Proxy Error:', error);
        res.status(500).json({ error: 'Record Scanner proxy error' });
    }
};

const proxyJwts = async (req, res) => {
    try {
        const providedKey = req.headers['x-provable-api-key'] || "";
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Provable-API-Key': providedKey
            }
        };

        const response = await fetch(`https://api.provable.com/jwts/${req.params.id}`, fetchOptions);

        res.status(response.status);

        const authHeader = response.headers.get('authorization');
        if (authHeader) {
            res.setHeader('Access-Control-Expose-Headers', 'Authorization, authorization');
            res.setHeader('authorization', authHeader);
        }

        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error('JWT Proxy Error:', error);
        res.status(500).json({ error: 'JWT fetch proxy error' });
    }
};

const dpsJwt = async (req, res) => {
    const { apiKey, consumerId } = getProvableCredentials();
    if (!apiKey || !consumerId) return res.status(500).json({ error: 'Provable credentials not configured.' });
    try {
        const r = await fetch(`https://api.provable.com/jwts/${consumerId}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Provable-API-Key': apiKey },
        });
        const text = await r.text();
        return res.status(r.status).set('Content-Type', 'application/json').send(text);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const dpsPubkey = async (req, res) => {
    const { apiKey, consumerId } = getProvableCredentials();
    if (!apiKey || !consumerId) return res.status(500).json({ error: 'Provable credentials not configured.' });
    try {
        const jwtRes = await fetch(`https://api.provable.com/jwts/${consumerId}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Provable-API-Key': apiKey },
        });
        if (!jwtRes.ok) {
            const t = await jwtRes.text();
            return res.status(jwtRes.status).json({ error: `JWT fetch failed: ${t}` });
        }
        const jwtAuth = jwtRes.headers.get('authorization');
        if (!jwtAuth) {
            return res.status(500).json({ error: 'Provable did not return an Authorization header from /jwts.' });
        }
        const pkRes = await fetch(`${PROVABLE_PROVER_BASE}/pubkey`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Authorization': jwtAuth },
        });
        const pkText = await pkRes.text();
        if (!pkRes.ok) return res.status(pkRes.status).json({ error: `Pubkey fetch failed: ${pkText}` });

        const pkData = JSON.parse(pkText);
        return res.json({ ...pkData, _auth: jwtAuth });
    } catch (err) {
        console.error('DPS pubkey proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
};

const dpsProve = async (req, res) => {
    const { key_id, ciphertext, _auth } = req.body;
    if (!key_id || !ciphertext) return res.status(400).json({ error: 'key_id and ciphertext are required.' });
    try {
        const r = await fetch(`${PROVABLE_PROVER_BASE}/prove/encrypted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': _auth,
            },
            body: JSON.stringify({ key_id, ciphertext }),
        });
        const text = await r.text();
        let body;
        try { body = JSON.parse(text); } catch { body = { message: text }; }
        return res.status(r.status).json(body);
    } catch (err) {
        console.error('DPS prove proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
};

const dpsSponsorSweep = async (req, res) => {
    const { execution_authorization_string } = req.body;
    if (!execution_authorization_string) {
        return res.status(400).json({ error: 'Missing execution_authorization_string' });
    }

    const relayerPrivateKeyStr = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKeyStr) {
        return res.status(500).json({ error: 'Backend RELAYER_PRIVATE_KEY is not configured.' });
    }

    try {
        const sdk = await import('@provablehq/sdk');

        const relayerAccount = new sdk.Account({ privateKey: relayerPrivateKeyStr });
        const host = "https://api.explorer.provable.com/v1";
        const networkClient = new sdk.AleoNetworkClient(host);
        const keyProvider = new sdk.AleoKeyProvider();
        keyProvider.useCache(true);
        const recordProvider = new sdk.NetworkRecordProvider(relayerAccount, networkClient);

        const programManager = new sdk.ProgramManager(host, keyProvider, recordProvider);
        programManager.setAccount(relayerAccount);
        
        const executionAuth = sdk.Authorization.fromString(execution_authorization_string);
        const baseFeeMicrocredits = await programManager.estimateFeeForAuthorization({
            programName: req.body.programName,
            authorization: executionAuth
        });

        const safeFeeMicrocredits = Number(baseFeeMicrocredits) * 1.1;
        const feeCredits = safeFeeMicrocredits / 1_000_000;

        const executionId = executionAuth.toExecutionId().toString();
        const feeAuth = await programManager.buildFeeAuthorization({
            privateKey: relayerAccount.privateKey(),
            deploymentOrExecutionId: executionId,
            baseFeeCredits: feeCredits,
            priorityFeeCredits: 0
        });

        const { apiKey, consumerId } = getProvableCredentials();
        if (!apiKey || !consumerId) {
            throw new Error("Missing PROVABLE_API_KEY or PROVABLE_CONSUMER_ID/PROVABLE_CONSUMER_KEY in backend .env");
        }

        const pReq = sdk.ProvingRequest.new(executionAuth, feeAuth, true);
        const dpsRes = await networkClient.submitProvingRequestSafe({
            provingRequest: pReq,
            dpsPrivacy: true,
            apiKey: apiKey,
            consumerId: consumerId,
            url: "https://api.provable.com/prove/testnet"
        });

        if (dpsRes.ok) {
            const { transaction, broadcast_result } = dpsRes.data;
            const txId = transaction?.id || broadcast_result?.id;
            const serializedPayload = JSON.stringify({
                success: true,
                transaction: { id: txId || transaction },
                broadcast_result
            }, (key, value) => typeof value === 'bigint' ? value.toString() : value);

            res.setHeader('Content-Type', 'application/json');
            return res.send(serializedPayload);
        } else {
            console.error('[DPS] Remote DPS Error:', dpsRes.status, dpsRes.error);
            const errMsg = dpsRes.error?.message || JSON.stringify(dpsRes.error) || String(dpsRes.status);
            throw new Error(`DPS Rejected Request: ${errMsg}`);
        }

    } catch (err) {
        console.error('[DPS] Sponsor Sweep Error:', err);
        return res.status(500).json({ error: err.message || 'Failed to sponsor sweep transaction' });
    }
};

module.exports = {
    scannerProxy,
    proxyJwts,
    dpsJwt,
    dpsPubkey,
    dpsProve,
    dpsSponsorSweep
};
