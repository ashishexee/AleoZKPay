const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL = 'https://nullpay.app/';

app.use(cors({
    origin: ['https://nullpay.app', 'http://localhost:5173', 'https://testing-website-frontend.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const readMerchantStoredValue = (value) => value || null;
const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

function getProvableCredentials() {
    const apiKey = process.env.PROVABLE_API_KEY;
    const consumerId = process.env.PROVABLE_CONSUMER_ID || process.env.PROVABLE_CONSUMER_KEY;
    return { apiKey, consumerId };
}

function safeReadText(relativePath) {
    try {
        return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    } catch {
        return '';
    }
}

function getDeveloperKnowledgeContext(message, context) {
    const normalizedMessage = String(message || '').toLowerCase();
    const route = String(context?.route || '').toLowerCase();
    const docsMode = context?.mode === 'docs';
    const wantsCliInfo =
        normalizedMessage.includes('cli') ||
        normalizedMessage.includes('nullpay.json') ||
        normalizedMessage.includes('onboard') ||
        route.includes('/developer');

    const sections = [];

    if (wantsCliInfo) {
        sections.push([
            'NullPay CLI implementation facts from the repository:',
            '- Package: `packages/nullpay-cli`.',
            '- Entry point: `packages/nullpay-cli/src/cli.ts`.',
            '- The CLI currently exposes one real command: `nullpay sdk onboard`.',
            '- That command launches an interactive onboarding wizard implemented in `packages/nullpay-cli/src/commands/onboard.ts`.',
            '- The wizard asks for a NullPay secret key (`sk_test_...` or `sk_live_...`) and an Aleo merchant address (`aleo1...`).',
            '- It validates the merchant by calling `POST /api/sdk/onboard/validate` with the secret key as a Bearer token.',
            '- It can create fixed-amount `multipay` invoices and open-amount `donation` invoices.',
            '- Multipay invoices prompt for `name`, `amount`, `currency`, and optional memo label.',
            '- Donation invoices are built from token templates and support `CREDITS`, `USDCX`, `USAD`, and `ANY`.',
            '- For every invoice, the CLI generates a random salt locally with `crypto.randomBytes(16)` and converts it to a Leo/Aleo `field` string.',
            '- It submits invoice creation through the NullPay relayer using `POST /api/dps/relayer/create-invoice`.',
            '- After submission, it polls the Provable mapping endpoint `salt_to_invoice` for up to about 60 retries with a 2 second delay to resolve the on-chain invoice hash.',
            '- When complete, it writes a local `nullpay.json` file containing `merchant`, `generated_at`, and the generated invoices with `name`, `type`, `amount`, `currency`, `label`, `hash`, and `salt`.',
            '- The CLI also attempts to append `nullpay.json` to `.gitignore` because salts are sensitive.',
            '- The relayer-sponsored setup flow means NullPay covers the invoice-creation network fee instead of requiring the merchant to broadcast the setup transaction manually.',
            '- Important limitation: today the CLI is mainly an onboarding and invoice pre-generation tool. It is not a full general-purpose management CLI with many subcommands yet.'
        ].join('\n'));
    }

    if (docsMode) {
        const sdkDoc = safeReadText('docs/nullpay_sdk.md');
        if (sdkDoc) {
            sections.push([
                'Relevant repository documentation excerpt:',
                sdkDoc.slice(0, 7000)
            ].join('\n'));
        }
    }

    return sections.join('\n\n');
}

let geminiModelsCache = {
    expiresAt: 0,
    models: null
};

function getGeminiModelCandidates() {
    const configured = (process.env.GOOGLE_GEMINI_MODELS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    const primary = (process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const defaults = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    return Array.from(new Set([primary, ...configured, ...defaults].filter(Boolean)));
}

async function fetchAvailableGeminiModels(apiKey) {
    const now = Date.now();
    if (geminiModelsCache.models && geminiModelsCache.expiresAt > now) {
        return geminiModelsCache.models;
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const payload = await response.json();

    if (!response.ok) {
        const errorMessage =
            payload?.error?.message ||
            payload?.error?.status ||
            'Failed to list Gemini models.';
        throw new Error(errorMessage);
    }

    const models = (payload?.models || [])
        .map((model) => {
            const rawName = String(model?.name || '');
            const shortName = rawName.startsWith('models/') ? rawName.slice('models/'.length) : rawName;
            const supportedMethods = Array.isArray(model?.supportedGenerationMethods)
                ? model.supportedGenerationMethods
                : Array.isArray(model?.supportedActions)
                    ? model.supportedActions
                    : [];

            return {
                rawName,
                shortName,
                supportedMethods
            };
        })
        .filter((model) =>
            model.shortName &&
            model.supportedMethods.some((method) => String(method).toLowerCase() === 'generatecontent')
        );

    geminiModelsCache = {
        models,
        expiresAt: now + 5 * 60 * 1000
    };

    return models;
}

function isRetryableGeminiError(response, payload) {
    const statusCode = response?.status || payload?.error?.code || 0;
    const statusText = String(payload?.error?.status || '').toUpperCase();
    const message = String(payload?.error?.message || '').toLowerCase();

    if (statusCode === 429 || statusCode === 503) return true;
    if (statusText === 'RESOURCE_EXHAUSTED' || statusText === 'UNAVAILABLE') return true;

    return (
        message.includes('quota') ||
        message.includes('rate limit') ||
        message.includes('retry in') ||
        message.includes('resource exhausted') ||
        message.includes('model not found') ||
        message.includes('not found')
    );
}

async function requestGeminiReply({ systemInstruction, prompt, maxOutputTokens }) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured on the backend.');
    }

    const configuredCandidates = getGeminiModelCandidates();
    let models = configuredCandidates;
    const errors = [];

    try {
        const availableModels = await fetchAvailableGeminiModels(apiKey);
        const availableNames = new Set(availableModels.map((model) => model.shortName));
        const filteredConfiguredModels = configuredCandidates.filter((model) => availableNames.has(model));

        if (filteredConfiguredModels.length > 0) {
            models = filteredConfiguredModels;
        } else if (availableModels.length > 0) {
            models = availableModels
                .map((model) => model.shortName)
                .filter((name) =>
                    name.includes('flash') &&
                    !name.includes('image') &&
                    !name.includes('live') &&
                    !name.includes('preview')
                );
        }
    } catch (listError) {
        console.warn('Gemini ListModels failed, falling back to configured model list:', listError.message);
    }

    for (let index = 0; index < models.length; index += 1) {
        const model = models[index];
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens
                    }
                })
            }
        );

        const payload = await response.json();

        if (response.ok) {
            const text = payload?.candidates
                ?.flatMap(candidate => candidate?.content?.parts || [])
                ?.map(part => part?.text || '')
                ?.join('\n')
                ?.trim();

            if (!text) {
                errors.push(`${model}: empty response`);
                continue;
            }

            return {
                model,
                text
            };
        }

        const errorMessage =
            payload?.error?.message ||
            payload?.error?.status ||
            `Gemini request failed for ${model}.`;

        errors.push(`${model}: ${errorMessage}`);

        const shouldRetryWithNextModel = index < models.length - 1 && isRetryableGeminiError(response, payload);
        if (!shouldRetryWithNextModel) {
            throw new Error(errorMessage);
        }
    }

    throw new Error(
        `All configured Gemini models failed. ${errors.join(' | ')}`
    );
}

async function generateDashboardAssistantReply(message, context) {
    const systemInstruction = [
        'You are NullBot, the NullPay Dashboard Assistant.',
        'Answer only from the provided dashboard context. Do not invent details.',
        'Format your responses using clean Markdown. Use **bold** for emphasis, bullet lists for multiple items, and tables if useful.',
        'IMPORTANT: NEVER WRAP your entire response in a ```markdown code block. Output raw markdown text directly.',
        'When returning hashes (invoice or receipt), wrap them in `code blocks` to make them easy to read.',
        'Keep replies professional, concise, and structured.',
    ].join(' ');

    const prompt = [
        'Dashboard context:',
        JSON.stringify(context, null, 2),
        '',
        'User request:',
        message,
    ].join('\n');

    const result = await requestGeminiReply({
        systemInstruction,
        prompt,
        maxOutputTokens: 900
    });

    return result.text;
}

async function generateDeveloperAssistantReply(message, context) {
    const isDocsMode = context.mode === 'docs';
    const repositoryKnowledge = getDeveloperKnowledgeContext(message, context);
    const systemInstruction = [
        `You are NullBot, the NullPay ${isDocsMode ? 'Documentation' : 'Developer Portal'} Assistant.`,
        isDocsMode
            ? 'Your primary focus is helping developers navigate the NullPay technical docs, explaining APIs, SDKs, and Smart Contracts conceptually.'
            : 'Your primary focus is helping developers integrate NullPay in their applications, configuring Webhooks, setting up Secret Keys, and backend implementation.',
        'Use the provided context to answer questions. Do not invent details not present in the context or your general knowledge of the system.',
        'When repository knowledge is provided, prefer it over generic assumptions and cite concrete command names, files, and behaviors.',
        'Format your responses using clean Markdown. Use **bold** for emphasis, bullet lists for multiple items.',
        'IMPORTANT: NEVER WRAP your entire response in a ```markdown code block. Output raw markdown text directly.',
        'Provide code snippets using standard markdown code blocks when appropriate.',
        'Keep replies professional, concise, and structured. Assume the user is a developer integrating NullPay.'
    ].join(' ');

    const prompt = [
        'Documentation Context:',
        JSON.stringify(context, null, 2),
        '',
        'Repository Knowledge:',
        repositoryKnowledge || 'No extra repository knowledge was attached for this question.',
        '',
        'Developer Question:',
        message,
    ].join('\n');

    const result = await requestGeminiReply({
        systemInstruction,
        prompt,
        maxOutputTokens: 1200
    });

    return result.text;
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
        programName: 'zk_pay_proofs_privacy_v22.aleo',
        functionName: funcName,
        inputs: inputs,
        fee: 0.1
    });

    // NullPay's relayer wallet signs the fee authorization here, so invoice creation
    // can be submitted on behalf of the merchant without the merchant paying setup gas.
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

app.get('/', (req, res) => {
    res.send('AleoZKPay Backend is running');
});

app.get('/api/ai/models', async (req, res) => {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GOOGLE_API_KEY is not configured on the backend.' });
    }

    try {
        const availableModels = await fetchAvailableGeminiModels(apiKey);
        const preferredModels = getGeminiModelCandidates();
        const availableNames = new Set(availableModels.map((model) => model.shortName));
        const fallbackOrder = preferredModels.filter((model) => availableNames.has(model));

        return res.json({
            primaryModel: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash',
            configuredModels: preferredModels,
            fallbackOrder: fallbackOrder.length > 0
                ? fallbackOrder
                : availableModels
                    .map((model) => model.shortName)
                    .filter((name) =>
                        name.includes('flash') &&
                        !name.includes('image') &&
                        !name.includes('live') &&
                        !name.includes('preview')
                    ),
            availableModels: availableModels.map((model) => ({
                name: model.shortName,
                rawName: model.rawName,
                supportedMethods: model.supportedMethods
            }))
        });
    } catch (error) {
        console.error('AI models debug route error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch AI model list.' });
    }
});

app.post('/api/dashboard-assistant/chat', async (req, res) => {
    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required.' });
    }

    if (!context || typeof context !== 'object') {
        return res.status(400).json({ error: 'context is required.' });
    }

    try {
        const reply = await generateDashboardAssistantReply(message.trim(), context);
        return res.json({ reply });
    } catch (error) {
        console.error('Dashboard assistant error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate dashboard assistant reply.' });
    }
});

app.post('/api/developer-assistant/chat', async (req, res) => {
    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required.' });
    }

    if (!context || typeof context !== 'object') {
        return res.status(400).json({ error: 'context is required.' });
    }

    try {
        const reply = await generateDeveloperAssistantReply(message.trim(), context);
        return res.json({ reply });
    } catch (error) {
        console.error('Developer assistant error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate developer assistant reply.' });
    }
});

// Proxy for Record Scanner to bypass CORS
app.use('/api/scanner/:network', async (req, res) => {
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
});

app.post('/api/proxy/provable/jwts/:id', async (req, res) => {
    try {
        console.log(`Proxying JWT request for Consumer ID: ${req.params.id}`);
        const providedKey = req.headers['x-provable-api-key'] || "";
        console.log(`Received X-Provable-API-Key: ${providedKey.substring(0, 5)}...`);

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Provable-API-Key': providedKey
            }
        };

        const response = await fetch(`https://api.provable.com/jwts/${req.params.id}`, fetchOptions);

        console.log(`Provable API returned Status: ${response.status}`);
        res.status(response.status);

        // Ensure the authorization header from Provable is forwarded
        const authHeader = response.headers.get('authorization');
        if (authHeader) {
            console.log(`Found Authorization header: ${authHeader.substring(0, 15)}...`);
            // Expose the header back to the frontend since CORS by default hides non-standard headers from JS fetch()
            res.setHeader('Access-Control-Expose-Headers', 'Authorization, authorization');
            res.setHeader('authorization', authHeader);
        } else {
            console.log("No authorization header found in response.");
        }

        const data = await response.text();
        console.log("Response data:", data);
        res.send(data);
    } catch (error) {
        console.error('JWT Proxy Error:', error);
        res.status(500).json({ error: 'JWT fetch proxy error' });
    }
});

app.get('/api/invoices', async (req, res) => {
    const { status, limit = 50, merchant_hash } = req.query;
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(limit);

    if (status) {
        query = query.eq('status', status);
    }
    if (merchant_hash) {
        query = query.eq('merchant_address_hash', merchant_hash);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

app.get('/api/invoices/merchant/:hash', async (req, res) => {
    const { hash } = req.params;
    const { for_sdk } = req.query;

    // Fetch recent invoices (limit 100 for now to prevent overload)
    let query = supabase
        .from('invoices')
        .select('*')
        .eq('merchant_address_hash', hash)
        .order('created_at', { ascending: false })
        .limit(5000);

    if (for_sdk === 'true') {
        query = query.eq('for_sdk', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

app.get('/api/invoices/recent', async (req, res) => {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

app.get('/api/invoice/:hash', async (req, res) => {
    const { hash } = req.params;

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_hash', hash)
        .single();

    if (error) {
        // console.error('Error fetching invoice:', error);
        return res.status(404).json({ error: 'Invoice not found' });
    }
    if (data.is_burner && data.designated_address) {
        data.merchant_address = data.designated_address;
    }

    res.json(data);
});


app.post('/api/merchants/register', async (req, res) => {
    const { name, aleo_address, webhook_url } = req.body;

    if (!name || !aleo_address) {
        return res.status(400).json({ error: 'Missing required fields: name, aleo_address' });
    }

    try {
        const secretKey = 'sk_test_' + crypto.randomBytes(24).toString('hex');

        // Salted hash for O(1) lookup
        const secretKeyHash = sha256Hex(secretKey);

        // Note: With the removal of server-side encryption, developer API metadata is stored natively
        // Developers manage their own privacy by keeping their secret keys secure.
        const { data: merchant, error } = await supabase
            .from('merchants')
            .insert([{
                name: name,
                encrypted_aleo_address: aleo_address,
                encrypted_secret_key: secretKey,
                secret_key_hash: secretKeyHash,
                encrypted_webhook_url: webhook_url || null
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: merchant.id,
            name: merchant.name,
            secret_key: secretKey, // Only returned ONCE during creation!
            webhook_url: webhook_url || null
        });
    } catch (err) {
        console.error("Error registering merchant:", err);
        res.status(500).json({ error: 'Internal server error while registering merchant.' });
    }
});

app.post('/api/sdk/onboard/validate', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    const secretKey = authHeader.split(' ')[1];
    const secretKeyHash = sha256Hex(secretKey);

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('secret_key_hash', secretKeyHash)
        .single();

    if (merchantError || !merchant) {
        return res.status(401).json({ error: 'Invalid API key.' });
    }

    const merchantAddress = readMerchantStoredValue(merchant.encrypted_aleo_address);

    const { merchant_address } = req.body;
    if (merchant_address && merchant_address !== merchantAddress) {
        return res.status(400).json({ error: 'Merchant address does not match the registered address for this API key.' });
    }

    res.json({
        valid: true,
        merchant_name: merchant.name,
        merchant_address: merchantAddress
    });
});

// Relayed invoice creation endpoint used by the CLI and Node SDK fallback flow.
// The relayer wallet broadcasts the invoice-creation transaction and covers the fee path.
app.post('/api/dps/relayer/create-invoice', async (req, res) => {
    console.log(`[SDK] POST /api/dps/relayer/create-invoice - Merchant Key Hash check...`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    const secretKey = authHeader.split(' ')[1];
    const secretKeyHash = sha256Hex(secretKey);

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('secret_key_hash', secretKeyHash)
        .single();

    if (merchantError || !merchant) return res.status(401).json({ error: 'Invalid API key.' });

    const { amount, currency, salt, memo, invoice_type } = req.body;
    if (!salt) return res.status(400).json({ error: 'Salt is required.' });

    const merchantPubKey = readMerchantStoredValue(merchant.encrypted_aleo_address);

    try {
        const { txId } = await submitRelayedInvoiceCreation({
            merchantPubKey,
            amount,
            currency,
            salt,
            memo,
            invoice_type
        });
        res.json({ success: true, tx_id: txId, salt: salt });
    } catch (err) {
        console.error('Relayer execution via DPS failed:', err);
        res.status(500).json({ error: err.message || 'Failed to dispatch relayer tx' });
    }
});

// MCP-facing version of relayed invoice creation. This uses the same relayer wallet model
// so merchants can pre-generate invoice mappings without holding extra setup gas.
app.post('/api/mcp/relay/create-invoice', async (req, res) => {
    const sharedSecret = process.env.NULLPAY_MCP_SHARED_SECRET;
    if (!sharedSecret) {
        return res.status(500).json({ error: 'NULLPAY_MCP_SHARED_SECRET is not configured.' });
    }

    const providedSecret = req.headers['x-nullpay-mcp-secret'];
    if (!providedSecret || providedSecret !== sharedSecret) {
        return res.status(401).json({ error: 'Invalid MCP shared secret.' });
    }

    const { merchant_address, amount, currency, salt, memo, invoice_type } = req.body;
    if (!merchant_address || !salt) {
        return res.status(400).json({ error: 'merchant_address and salt are required.' });
    }

    try {
        const { txId } = await submitRelayedInvoiceCreation({
            merchantPubKey: merchant_address,
            amount,
            currency,
            salt,
            memo,
            invoice_type
        });

        res.json({ success: true, tx_id: txId, salt });
    } catch (err) {
        console.error('MCP relayer execution failed:', err);
        res.status(500).json({ error: err.message || 'Failed to dispatch MCP relayer tx' });
    }
});

app.post('/api/checkout/sessions', async (req, res) => {
    // 1. Authenticate the Merchant using Bearer token (secret_key)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <secret_key>' });
    }
    const secretKey = authHeader.split(' ')[1];
    const secretKeyHash = sha256Hex(secretKey);

    // Fetch merchant from DB
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('secret_key_hash', secretKeyHash)
        .single();

    if (merchantError || !merchant) {
        return res.status(401).json({ error: 'Invalid API key.' });
    }

    // 2. Validate Request Body
    const { amount, currency, success_url, cancel_url, invoice_hash, salt: providedSalt, invoice_type, type } = req.body;
    
    // Map SDK string 'type' to backend integer 'invoice_type'
    let finalInvoiceType = invoice_type !== undefined ? invoice_type : 0;
    if (invoice_type === undefined && type) {
        if (type === 'multipay') finalInvoiceType = 1;
        else if (type === 'donation') finalInvoiceType = 2;
        else finalInvoiceType = 0; // 'standard' or unrecognized
    }

    // For standard invoices amount must be > 0. For donations, it can be 0 or omitted.
    if (finalInvoiceType !== 2 && (!amount || typeof amount !== 'number' || amount <= 0)) {
        return res.status(400).json({ error: 'Invalid amount. Must be a positive number for standard invoices.' });
    }

    // Map string currency to our token system
    const validCurrencies = ['CREDITS', 'USDCX', 'USAD', 'ANY'];
    const uppercaseCurrency = currency ? currency.toUpperCase() : 'CREDITS';
    if (!validCurrencies.includes(uppercaseCurrency)) {
        return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
    }
    if (uppercaseCurrency === 'ANY' && finalInvoiceType !== 2) {
        return res.status(400).json({ error: 'ANY token mode is only supported for donation invoices.' });
    }

    // 3. Use provided parameters for Multi-Pay or generate temp ones for Relayer
    let finalSalt = providedSalt;
    let finalInvoiceHash = invoice_hash;
    let initialStatus = 'PROCESSING'; // Default to Relayer flow
    let finalCurrency = uppercaseCurrency;

    if (invoice_hash && providedSalt) {
        initialStatus = 'OPEN'; // Merchant already provided the ZK parameters
        const typeName = finalInvoiceType === 1 ? 'Multi-Pay' : (finalInvoiceType === 2 ? 'Donation' : 'Standard');
        console.log(`[Checkout] Using pre-generated ${typeName} hash: ${invoice_hash}`);

        if (!currency) {
            const { data: invoice } = await supabase
                .from('invoices')
                .select('token_type')
                .eq('invoice_hash', invoice_hash)
                .single();

            if (invoice) {
                finalCurrency = invoice.token_type === 3
                    ? 'ANY'
                    : invoice.token_type === 1
                        ? 'USDCX'
                        : invoice.token_type === 2
                            ? 'USAD'
                            : 'CREDITS';
                console.log(`[Checkout] Derived currency from invoice: ${finalCurrency}`);
            }
        }
    } else {
        // Fallback to generating temp ones for the slow Relayer flow (legacy)
        const randomBuffer = crypto.randomBytes(16);
        let randomBigInt = 0n;
        for (const byte of randomBuffer) {
            randomBigInt = (randomBigInt << 8n) + BigInt(byte);
        }
        finalSalt = `${randomBigInt}field`;
        finalInvoiceHash = crypto.randomInt(100000000, 999999999).toString() + "field";
    }

    try {
        // 4. Create the Payment Intent in Supabase
        const { data: intent, error: intentError } = await supabase
            .from('payment_intents')
            .insert([{
                merchant_id: merchant.id,
                amount: amount || 0,
                token_type: finalCurrency,
                invoice_type: finalInvoiceType,
                salt: finalSalt,
                invoice_hash: finalInvoiceHash,
                status: initialStatus,
                success_url: success_url || null,
                cancel_url: cancel_url || null
            }])
            .select()
            .single();

        if (intentError) throw intentError;

        // 5. Also insert into the main `invoices` table for dashboard visibility
        const tokenTypeNum = finalCurrency === 'ANY' ? 3 : (finalCurrency === 'USDCX' ? 1 : (finalCurrency === 'USAD' ? 2 : 0));
        const merchantAddress = readMerchantStoredValue(merchant.encrypted_aleo_address);
        const merchantAddressHash = merchantAddress ? sha256Hex(merchantAddress) : null;
        
        const { error: invTableError } = await supabase.from('invoices').upsert({
            invoice_hash: finalInvoiceHash,
            merchant_address: merchantAddress,
            merchant_address_hash: merchantAddressHash,
            designated_address: merchantAddress,
            is_burner: false,
            token_type: tokenTypeNum,
            invoice_type: finalInvoiceType,
            salt: finalSalt,
            status: 'PENDING',
            for_sdk: true,
            invoice_items: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (invTableError) {
            console.error("[Checkout] Failed to insert invoice to dashboard:", invTableError);
        }

        const checkoutUrl = `${FRONTEND_URL}/checkout/${intent.id}`;

        res.status(200).json({
            id: intent.id,
            checkout_url: checkoutUrl,
            status: intent.status,
            invoice_hash: finalInvoiceHash,
            salt: finalSalt
        });

    } catch (err) {
        console.error("Error creating checkout session:", err);
        res.status(500).json({ error: 'Internal server error while creating checkout session.' });
    }
});

/**
 * Retrieves a Checkout Session for the frontend Checkout Page.
 */
app.get('/api/checkout/sessions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: intent, error } = await supabase
            .from('payment_intents')
            .select(`
                *,
                merchants:merchant_id (
                    name,
                    encrypted_aleo_address
                )
            `)
            .eq('id', id)
            .single();

        if (error || !intent) {
            return res.status(404).json({ error: 'Checkout session not found.' });
        }

        // Return merchant address as-is (checkout/merchant data uses its own developer-side encryption)
        if (intent.merchants && intent.merchants.encrypted_aleo_address) {
            intent.merchants.aleo_address = intent.merchants.encrypted_aleo_address;
        }

        // Return safe data for the frontend (do NOT return secret_key or webhook URLs)
        const sessionData = {
            id: intent.id,
            amount: intent.amount,
            token_type: intent.token_type,
            status: intent.status,
            invoice_hash: intent.invoice_hash,
            salt: intent.salt,
            invoice_type: intent.invoice_type,
            success_url: intent.success_url || null,
            cancel_url: intent.cancel_url || null,
            merchant_name: intent.merchants ? intent.merchants.name : 'Unknown Merchant',
            merchant_address: intent.merchants ? intent.merchants.encrypted_aleo_address : null
        };

        res.json(sessionData);

    } catch (err) {
        console.error("Error fetching checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


app.patch('/api/checkout/sessions/:id', async (req, res) => {
    const { id } = req.params;
    const { status, tx_id } = req.body;

    try {
        if (status !== 'SETTLED' && status !== 'FAILED') {
            return res.status(400).json({ error: 'Invalid status update.' });
        }

        // 1. Update the Payment Intent
        const { data: intent, error: updateError } = await supabase
            .from('payment_intents')
            .update({ status })
            .eq('id', id)
            .select(`
                *,
                merchants:merchant_id (
                    id,
                    encrypted_webhook_url,
                    encrypted_secret_key
                )
            `)
            .single();

        if (updateError || !intent) {
            return res.status(404).json({ error: 'Checkout session not found.' });
        }

        // 2. Dispatch Webhook if SETTLED and webhook_url exists
        if (status === 'SETTLED' && intent.merchants && intent.merchants.encrypted_webhook_url) {
            const secretKey = intent.merchants.encrypted_secret_key;
            const webhookUrl = intent.merchants.encrypted_webhook_url;

            const payload = {
                id: intent.id,
                amount: intent.amount,
                token_type: intent.token_type,
                status: intent.status,
                tx_id: tx_id || null,
                timestamp: new Date().toISOString()
            };

            const payloadString = JSON.stringify(payload);
            const signature = crypto
                .createHmac('sha256', secretKey)
                .update(payloadString)
                .digest('hex');

            console.log(`[Webhook] Dispatching to ${webhookUrl} for session ${intent.id}`);

            // Dispatch async (fire and forget)
            fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-nullpay-signature': signature
                },
                body: payloadString
            }).then(resp => {
                console.log(`[Webhook] Response status: ${resp.status}`);
            }).catch(err => {
                console.error(`[Webhook] Dispatch failed:`, err.message);
            });
        }

        res.json({ success: true, status: intent.status });

    } catch (err) {
        console.error("Error updating checkout session:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/invoices', async (req, res) => {
    const { invoice_hash, merchant_address, designated_address, merchant_address_hash, is_burner, amount, memo, status, invoice_transaction_id, salt, invoice_type, token_type, invoice_items, for_sdk } = req.body;

    if (!invoice_hash || !merchant_address) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Frontend sends merchant_address already encrypted — store directly
        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                invoice_hash,
                merchant_address,
                merchant_address_hash: merchant_address_hash || null,
                designated_address: designated_address || merchant_address,
                is_burner: is_burner || false,
                status: status || 'PENDING',
                invoice_transaction_id,  // Invoice creation TX
                salt: salt || null,  // Store salt for payment link generation
                invoice_type: invoice_type !== undefined ? invoice_type : 0,  // 0 = Standard, 1 = Fundraising
                token_type: token_type !== undefined ? token_type : 0,  // 0 = Credits, 1 = USDCx
                for_sdk: for_sdk === true,
                invoice_items: invoice_items || null,  // Line items for standard invoices
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);

    } catch (err) {
        console.error("Error creating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/invoices/:hash', async (req, res) => {
    const { hash } = req.params;
    const { status, payment_tx_ids, payer_address, block_settled, session_id } = req.body;

    try {
        const { data: current, error: fetchError } = await supabase
            .from('invoices')
            .select('payment_tx_ids, invoice_type, status, merchant_address') // Select merchant_address for decryption
            .eq('invoice_hash', hash)
            .single();

        if (fetchError) throw fetchError;

        const updates = {
            updated_at: new Date().toISOString()
        };
        if (block_settled) updates.block_settled = block_settled;
        // payer_address handling removed

        const normalizeTxIds = (value) => {
            const source = Array.isArray(value) ? value : (value ? [value] : []);
            const flattened = [];
            for (const item of source) {
                if (!item) continue;
                if (Array.isArray(item)) {
                    flattened.push(...normalizeTxIds(item));
                    continue;
                }
                if (typeof item === 'string') {
                    const trimmed = item.trim();
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        try {
                            flattened.push(...normalizeTxIds(JSON.parse(trimmed)));
                            continue;
                        } catch {}
                    }
                    flattened.push(trimmed);
                    continue;
                }
                flattened.push(String(item));
            }
            return Array.from(new Set(flattened.filter(Boolean)));
        };

        if (payment_tx_ids) {
            const currentIds = normalizeTxIds(current.payment_tx_ids);
            const incomingIds = normalizeTxIds(payment_tx_ids);
            updates.payment_tx_ids = Array.from(new Set([...currentIds, ...incomingIds]));
        }

        if (status) updates.status = status;

        const { data, error } = await supabase
            .from('invoices')
            .update(updates)
            .eq('invoice_hash', hash)
            .select()
            .single();

        if (error) throw error;

        // Return data as-is — merchant_address is encrypted on the client side
        // The frontend will decrypt it using the user's password

        const incomingIds = normalizeTxIds(payment_tx_ids);
        const currentIds = normalizeTxIds(current.payment_tx_ids);
        const hasNewPayment = incomingIds.some(id => !currentIds.includes(id));
        console.log(`   - Has New Payment?`, hasNewPayment);

        // LOGIC FIX: If there is a payment ID in the request, it IS a new payment event.
        if (status === 'SETTLED' || payment_tx_ids) {
            console.log(`📢 Backend detected SETTLED event for hash: ${hash}, Status: ${status}, Merchant: ${data.merchant_address}`);

            // Auto-Sync SDK Checkouts: Use exact session_id if provided (for multi-pay safety)
            if (status === 'SETTLED') {
                try {
                    let intentIdToSync = session_id;
                    
                    if (!intentIdToSync) {
                        // Fallback: strictly safe ONLY if it's uniquely mapped
                        const { data: intentInfo } = await supabase
                            .from('payment_intents')
                            .select('id')
                            .eq('invoice_hash', hash)
                            .maybeSingle();
                        if (intentInfo) intentIdToSync = intentInfo.id;
                    }

                    if (intentIdToSync) {
                        console.log(`🔗 Matching SDK Session found (${intentIdToSync}). Triggering direct sync & webhooks...`);
                        
                        // 1. Update the Payment Intent directly
                        const { data: intent, error: updateError } = await supabase
                            .from('payment_intents')
                            .update({ status: 'SETTLED' })
                            .eq('id', intentIdToSync)
                            .select(`
                                *,
                                merchants:merchant_id (
                                    id,
                                    encrypted_webhook_url,
                                    encrypted_secret_key
                                )
                            `)
                            .single();

                        if (!updateError && intent) {
                            console.log(`✅ SDK Session ${intent.id} synced directly in DB.`);
                            
                            // 2. Dispatch Webhook
                            if (intent.merchants && intent.merchants.encrypted_webhook_url) {
                                try {
                                    const secretKey = readMerchantStoredValue(intent.merchants.encrypted_secret_key);
                                    const webhookUrl = readMerchantStoredValue(intent.merchants.encrypted_webhook_url);

                                    const payload = {
                                        id: intent.id,
                                        amount: intent.amount,
                                        token_type: intent.token_type,
                                        status: intent.status,
                                        tx_id: incomingIds[0] || null,
                                        timestamp: new Date().toISOString()
                                    };

                                    const payloadString = JSON.stringify(payload);
                                    const signature = crypto
                                        .createHmac('sha256', secretKey)
                                        .update(payloadString)
                                        .digest('hex');

                                    console.log(`[Webhook] Dispatching to ${webhookUrl} for auto-synced session ${intent.id}`);

                                    fetch(webhookUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'x-nullpay-signature': signature
                                        },
                                        body: payloadString
                                    }).then(resp => {
                                        console.log(`[Webhook] Response status: ${resp.status}`);
                                    }).catch(err => {
                                        console.error(`[Webhook] Dispatch failed:`, err.message);
                                    });
                                } catch (err) {
                                    console.error("Webhook processing error:", err);
                                }
                            }
                        } else {
                            console.error("❌ Failed to update intent via Supabase auto-sync:", updateError);
                        }
                    }
                } catch (syncError) {
                    console.error("Failed to lookup intent for auto-sync:", syncError);
                }
            }
        }

        res.json(data);

    } catch (err) {
        console.error("Error updating invoice:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/profile', async (req, res) => {
    const { address_hash, main_address, burner_address, encrypted_burner_key, profile_main_invoice_hash, profile_burner_invoice_hash } = req.body;

    if (!address_hash) {
        return res.status(400).json({ error: 'Missing address_hash' });
    }

    try {
        // Find existing user by deterministic address_hash
        const { data: allUsers, error: fetchError } = await supabase.from('users').select('*').eq('address_hash', address_hash);
        if (fetchError) throw fetchError;

        let existingUser = allUsers && allUsers.length > 0 ? allUsers[0] : null;

        const updates = {
            address_hash: address_hash,
            updated_at: new Date().toISOString()
        };

        // Store already-encrypted values from frontend directly
        if (main_address !== undefined) updates.main_address = main_address;
        if (burner_address !== undefined) updates.burner_address = burner_address;
        if (encrypted_burner_key !== undefined) updates.encrypted_burner_key = encrypted_burner_key;
        if (profile_main_invoice_hash !== undefined) updates.profile_main_invoice_hash = profile_main_invoice_hash;
        if (profile_burner_invoice_hash !== undefined) updates.profile_burner_invoice_hash = profile_burner_invoice_hash;

        let data, error;

        if (existingUser) {
            const response = await supabase
                .from('users')
                .update(updates)
                .eq('address_hash', address_hash)
                .select()
                .single();
            data = response.data;
            error = response.error;
        } else {
            const response = await supabase
                .from('users')
                .insert(updates)
                .select()
                .single();
            data = response.data;
            error = response.error;
        }

        if (error) throw error;

        res.json(data);

    } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/profile/:address', async (req, res) => {
    const { address } = req.params;

    try {
        // The frontend now sends the address_hash as the :address param
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('address_hash', address)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Profile not found' });
            }
            return res.status(500).json({ error: error.message });
        }

        // Return encrypted row directly — frontend decrypts using password
        res.json(data);

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: err.message });
    }
});


// Clear burner data from DB after successful on-chain backup
app.post('/api/users/profile/clear-burner', async (req, res) => {
    const { address_hash } = req.body;
    if (!address_hash) return res.status(400).json({ error: 'Missing address_hash' });

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ burner_address: null, encrypted_burner_key: null, updated_at: new Date().toISOString() })
            .eq('address_hash', address_hash)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error clearing burner data:", err);
        res.status(500).json({ error: err.message });
    }
});

console.log('Backend initialized. (Relayer daemon removed, relayer is now on-demand)');


const PROVABLE_PROVER_BASE = 'https://api.provable.com/prove/testnet';

let _dpsProxyCookie = null;
app.post('/api/dps/jwt', async (req, res) => {
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
});
app.get('/api/dps/pubkey', async (req, res) => {
    const { apiKey, consumerId } = getProvableCredentials();
    if (!apiKey || !consumerId) return res.status(500).json({ error: 'Provable credentials not configured.' });
    try {
        // Step 1: Issue JWT session — auth token comes back as Set-Cookie, not in body
        const jwtRes = await fetch(`https://api.provable.com/jwts/${consumerId}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Provable-API-Key': apiKey },
        });
        console.log('[DPS] JWT status:', jwtRes.status);
        if (!jwtRes.ok) {
            const t = await jwtRes.text();
            return res.status(jwtRes.status).json({ error: `JWT fetch failed: ${t}` });
        }
        const jwtAuth = jwtRes.headers.get('authorization');
        console.log('[DPS] JWT Authorization header:', jwtAuth?.slice(0, 40));
        if (!jwtAuth) {
            return res.status(500).json({ error: 'Provable did not return an Authorization header from /jwts.' });
        }
        const pkRes = await fetch(`${PROVABLE_PROVER_BASE}/pubkey`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Authorization': jwtAuth },
        });
        const pkText = await pkRes.text();
        console.log('[DPS] Pubkey status:', pkRes.status, pkText);
        if (!pkRes.ok) return res.status(pkRes.status).json({ error: `Pubkey fetch failed: ${pkText}` });

        const pkData = JSON.parse(pkText);
        // Send pubkey + JWT auth header back to browser so prove endpoint can use it
        return res.json({ ...pkData, _auth: jwtAuth });
    } catch (err) {
        console.error('DPS pubkey proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// 3) POST /api/dps/prove — forwards encrypted ciphertext to Provable TEE
app.post('/api/dps/prove', async (req, res) => {
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
        console.log('[DPS] Prove response:', r.status, text.slice(0, 300));
        let body;
        try { body = JSON.parse(text); } catch { body = { message: text }; }
        return res.status(r.status).json(body);
    } catch (err) {
        console.error('DPS prove proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// 4) POST /api/dps/sponsor-sweep — Backend-sponsored execution endpoint.
// Used for burner sweeps, gift-card redeems, and direct gift-card payment flows where
// the user still authorizes the action but NullPay's relayer covers the fee authorization.
app.post('/api/dps/sponsor-sweep', async (req, res) => {
    const { execution_authorization_string } = req.body;
    if (!execution_authorization_string) {
        return res.status(400).json({ error: 'Missing execution_authorization_string' });
    }

    const relayerPrivateKeyStr = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKeyStr) {
        return res.status(500).json({ error: 'Backend RELAYER_PRIVATE_KEY is not configured.' });
    }

    try {
        console.log('[DPS] Starting backend fee sponsorship...');
        const sdk = await import('@provablehq/sdk');

        const relayerAccount = new sdk.Account({ privateKey: relayerPrivateKeyStr });
        const host = "https://api.explorer.provable.com/v1";
        const networkClient = new sdk.AleoNetworkClient(host);
        const keyProvider = new sdk.AleoKeyProvider();
        keyProvider.useCache(true);
        const recordProvider = new sdk.NetworkRecordProvider(relayerAccount, networkClient);

        const programManager = new sdk.ProgramManager(host, keyProvider, recordProvider);
        programManager.setAccount(relayerAccount);
        console.log('[DPS] 1. Parsing execution authorization from frontend...');
        const executionAuth = sdk.Authorization.fromString(execution_authorization_string);

        // 2. Estimate the required fee from the execution authorization
        const baseFeeMicrocredits = await programManager.estimateFeeForAuthorization({
            programName: req.body.programName,
            authorization: executionAuth
        });

        // Add a 10% safety buffer for testnet congestion
        const safeFeeMicrocredits = Number(baseFeeMicrocredits) * 1.1;
        const feeCredits = safeFeeMicrocredits / 1_000_000; // SDK requires ALEO format, not microcredits

        console.log(`[DPS] 2. Building fee authorization with Relayer wallet (${feeCredits} ALEO)...`);

        // The relayer wallet pays the network fee here while the user-provided execution authorization
        // remains unchanged, which keeps the flow sponsored rather than custodial.
        // buildFeeAuthorization expects: { privateKey, deploymentOrExecutionId, baseFeeCredits, priorityFeeCredits, feeRecord }
        const executionId = executionAuth.toExecutionId().toString();
        const feeAuth = await programManager.buildFeeAuthorization({
            privateKey: relayerAccount.privateKey(),
            deploymentOrExecutionId: executionId,
            baseFeeCredits: feeCredits,
            priorityFeeCredits: 0
        });
        console.log('[DPS] 3. Building ProvingRequest for Remote DPS...');
        const { apiKey, consumerId } = getProvableCredentials();

        if (!apiKey || !consumerId) {
            throw new Error("Missing PROVABLE_API_KEY or PROVABLE_CONSUMER_ID/PROVABLE_CONSUMER_KEY in backend .env");
        }

        const pReq = sdk.ProvingRequest.new(executionAuth, feeAuth, true);

        console.log('[DPS] 4. Submitting secure payload to Provable Network DPS...');
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
            console.log(`[DPS] Sponsored Transaction actively proving on remote DPS! TXID: ${txId}`);
            console.log(`[DPS] Broadcast Status:`, broadcast_result);
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
});

// START SERVER
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});






