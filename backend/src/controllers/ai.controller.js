const path = require('path');
const fs = require('fs');

function safeReadText(relativePath) {
    try {
        // AI component looks for docs in root/docs
        return fs.readFileSync(path.join(__dirname, '../../..', relativePath), 'utf8');
    } catch {
        return '';
    }
}

function getDeveloperKnowledgeContext(message, context) {
    const normalizedMessage = String(message || '').toLowerCase();
    const route = String(context?.route || '').toLowerCase();
    const docsMode = context?.mode === 'docs';
    const wantsSecretKeyInfo =
        normalizedMessage.includes('secret key') ||
        normalizedMessage.includes('secret keys') ||
        normalizedMessage.includes('api key') ||
        normalizedMessage.includes('merchant') ||
        route.includes('/developer');
    const wantsCliInfo =
        normalizedMessage.includes('cli') ||
        normalizedMessage.includes('nullpay.json') ||
        normalizedMessage.includes('onboard') ||
        route.includes('/developer');

    const sections = [];

    if (wantsSecretKeyInfo) {
        sections.push([
            'NullPay merchant registration and secret key facts from the repository:',
            '- Secret keys are NOT auto-issued just because someone has a generic account or visits the dashboard.',
            '- A developer must explicitly register as a merchant.',
            '- Frontend registration flow: `frontend/src/shared/pages/Developer/index.tsx` calls `POST /api/merchants/register` from `handleRegister`.',
            '- The registration form lives in `frontend/src/shared/pages/Developer/components/MerchantConsole.tsx` and tells the user to connect their wallet, register their store, and save the key once.',
            '- Backend endpoint: `backend/index.js` at `POST /api/merchants/register`.',
            '- On successful merchant registration, the backend generates a new secret key using `crypto.randomBytes(24)` and prefixes it with `sk_test_`.',
            '- The generated key is returned once in the registration response as `secret_key`.',
            '- The dashboard copy explicitly says the key will not be shown again after registration, so developers should save it immediately in their backend environment.',
            '- The CLI command `nullpay sdk onboard` does not create a secret key. It asks the developer to paste an existing merchant secret key and then validates it via `POST /api/sdk/onboard/validate`.'
        ].join('\n'));
    }

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
            '- `nullpay.json` is optional. Developers can use it for named pre-generated invoices, or skip it and create checkout sessions directly with `amount`, `currency`, and `type`.',
            '- If a backend uses `nullpay.json` on Vercel or another serverless runtime, it is safer to initialize the SDK with `projectRoot` and `configPath` so file lookup does not rely on `process.cwd()`.',
            '- The CLI does NOT add `nullpay.json` to `.gitignore`. Developers can safely commit the file to source control — it contains only public invoice hashes and is not a secret.',
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
        'If the dashboard context includes wallet addresses such as main or burner wallet addresses, you may return them directly.',
        'The dashboard context can contain separate `mainWalletBalances` and `burnerWalletBalances` arrays. Treat them as different wallets.',
        'If the user asks about burner wallet funds, balances, invoices, or receipts, use only burner wallet data. Never substitute main wallet balances for burner wallet balances.',
        'If burner data is missing or still loading, say that clearly instead of guessing from the main wallet.',
        'Use recentConversation when it helps preserve continuity, but prefer the latest dashboard state over older chat messages.',
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
        'Be precise about secret key onboarding: do not say a secret key is created automatically for any account. Explain that a developer must register as a merchant first, after which the backend generates the key and returns it once.',
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

function normalizePromptCurrency(rawValue) {
    const value = String(rawValue || '').toLowerCase();
    if (value.includes('usdcx')) return 'USDCX';
    if (value.includes('usad')) return 'USAD';
    if (value.includes('any')) return 'ANY';
    return 'CREDITS';
}

function detectNullBotAction(message) {
    const rawMessage = String(message || '').trim();
    const normalizedMessage = rawMessage.toLowerCase();

    if (!rawMessage) {
        return null;
    }

    if (/(connect wallet|connect my wallet|link wallet)/i.test(rawMessage)) {
        return {
            type: 'connect_wallet',
            args: {},
            reply: 'Connect your wallet first, then I can run NullPay actions from your prompts.'
        };
    }

    const sweepIntent =
        /\bsweep\b[\s\S]{0,40}\b(burner|funds?|wallet)\b/i.test(rawMessage) ||
        /\bmove\b[\s\S]{0,40}\bfrom burner\b/i.test(rawMessage) ||
        /\btransfer\b[\s\S]{0,50}\bfrom burner\b/i.test(rawMessage);

    if (sweepIntent && normalizedMessage.includes('burner')) {
        const amountMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*(aleo|credits?|credit|usdcx|usad)\b/i);
        const currency = amountMatch ? normalizePromptCurrency(amountMatch[2]) : null;

        return {
            type: 'sweep_burner_to_main',
            args: {
                ...(amountMatch ? { amount: Number(amountMatch[1]) } : {}),
                ...(currency ? { currency } : {})
            },
            reply: amountMatch
                ? `I can sweep ${amountMatch[1]} ${currency} from your burner wallet to your connected main wallet using the usual sponsored burner sweep flow.`
                : 'I can sweep your available burner-wallet funds to your connected main wallet using the usual sponsored burner sweep flow.'
        };
    }

    const createInvoiceIntent =
        /\b(create|make|generate)\b[\s\S]{0,40}\b(invoice|invocie|bill|payment link)\b/i.test(rawMessage) ||
        /\binvoice\b[\s\S]{0,30}\b(of|for)\b/i.test(rawMessage);

    if (createInvoiceIntent) {
        const amountMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*(credits?|credit|usdcx|usad|any token|any)\b/i);
        const invoiceTypeMatch = rawMessage.match(/\b(donation|multipay|multi-pay|standard)\b/i);
        const walletMatch = rawMessage.match(/\b(main|burner)\b/);
        const memoMatch = rawMessage.match(/(?:memo|note)\s+(?:as|to|is)?\s*["']([^"']+)["']/i);

        if (amountMatch) {
            const amount = Number(amountMatch[1]);
            const currency = normalizePromptCurrency(amountMatch[2]);
            const invoiceTypeRaw = String(invoiceTypeMatch?.[1] || 'standard').toLowerCase();
            const invoiceType = invoiceTypeRaw === 'multi-pay' ? 'multipay' : invoiceTypeRaw;
            const wallet = walletMatch?.[1] === 'burner' ? 'burner' : 'main';
            const memo = memoMatch?.[1]?.trim();

            return {
                type: 'create_invoice',
                args: {
                    amount,
                    currency,
                    invoice_type: invoiceType,
                    wallet,
                    ...(memo ? { memo } : {})
                },
                reply: `I can create a ${invoiceType} invoice for ${amount} ${currency} from your ${wallet} wallet. Approve the wallet popup when it opens.`
            };
        }
    }

    const paymentLinkMatch = rawMessage.match(/https?:\/\/[^\s]+/i);
    const payIntent = /\b(pay|open|use)\b[\s\S]{0,30}\b(invoice|link|payment)\b/i.test(rawMessage);
    if (payIntent && paymentLinkMatch) {
        return {
            type: 'open_payment_link',
            args: {
                url: paymentLinkMatch[0]
            },
            reply: 'I found a NullPay payment link. I can open the in-app payment flow so you can approve it with your wallet popup.'
        };
    }

    return null;
}

async function generateNullBotChat(message, context) {
    const action = detectNullBotAction(message);

    if (action) {
        return {
            reply: action.reply,
            action
        };
    }

    const mode = context?.mode === 'developer' || context?.mode === 'docs'
        ? context.mode
        : 'dashboard';

    const reply = mode === 'dashboard'
        ? await generateDashboardAssistantReply(message, context)
        : await generateDeveloperAssistantReply(message, context);

    return { reply };
}

const getAIModels = async (req, res) => {
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
};

const dashboardAssistantChat = async (req, res) => {
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
};

const developerAssistantChat = async (req, res) => {
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
};

const nullBotChat = async (req, res) => {
    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required.' });
    }

    if (!context || typeof context !== 'object') {
        return res.status(400).json({ error: 'context is required.' });
    }

    try {
        const payload = await generateNullBotChat(message.trim(), context);
        return res.json(payload);
    } catch (error) {
        console.error('NullBot chat error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate NullBot reply.' });
    }
};

module.exports = {
    getAIModels,
    dashboardAssistantChat,
    developerAssistantChat,
    nullBotChat
};
