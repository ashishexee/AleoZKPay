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
    const normalizedMessage = String(message || '').toLowerCase();

const systemInstruction = [
        'You are NullBot, the NullPay Dashboard Assistant.',
        'You MUST answer using ONLY the data provided in the context below. Do NOT guess or fake data.',
        'The context contains: invoices (your created invoices), payerReceipts (invoices you paid TO OTHERS), merchantReceipts (payments YOU received), mainWalletBalances, burnerWalletBalances, and stats.',
        'When user asks about "paid by me" or "i paid" - use payerReceipts array, NOT invoices array.',
        'When user asks about "invoices i created" or "my invoices" - use invoices array.',
        'When user asks about "received" payments - use merchantReceipts.main and merchantReceipts.burner.',
        'IMPORTANT: ALWAYS output FULL hashes (the entire string). Do NOT truncate.',
        'Format each entry with hashes wrapped in backticks for easy copying:',
        '---',
        '`Invoice: 2545169706...field`',
        '`Receipt: 6530241316...field`',
        'Amount: X Token',
        'Merchant: aleo1...',
        '---',
        'Wrap hashes in backticks (`) so they can be easily copied.',
        'IMPORTANT: NEVER wrap your response in markdown code blocks. Output raw text.',
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

function parsePromptAmount(rawValue) {
    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? rawValue : null;
    }

    const normalized = String(rawValue || '')
        .trim()
        .replace(/,/g, '.')
        .replace(/[^\d.]/g, '');

    if (!normalized) {
        return null;
    }

    const amount = Number(normalized);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function normalizePromptWallet(rawValue) {
    return String(rawValue || '').toLowerCase() === 'burner' ? 'burner' : 'main';
}

function normalizePromptInvoiceType(rawValue) {
    const value = String(rawValue || '').toLowerCase();
    if (value === 'multipay' || value === 'multi-pay') return 'multipay';
    if (value === 'donation') return 'donation';
    return 'standard';
}

function extractOptionalFieldValue(rawMessage, fieldName) {
    const patterns = fieldName === 'title'
        ? [
            /(?:invoice\s+title|title|titile|name)\s+(?:as|to|is|should\s+be|would\s+be|=)?\s*["']([^"']+)["']/i,
            /(?:invoice\s+title|title|titile|name)\s+(?:as|to|is|should\s+be|would\s+be|=)\s+([a-z0-9][a-z0-9 _.-]{0,80})$/i
        ]
        : [
            /(?:memo|note)\s+(?:as|to|is|should\s+be|would\s+be|=)?\s*["']([^"']+)["']/i,
            /(?:memo|note)\s+(?:as|to|is|should\s+be|would\s+be|=)\s+([a-z0-9][a-z0-9 _.,-]{0,120})$/i
        ];

    for (const pattern of patterns) {
        const match = String(rawMessage || '').match(pattern);
        if (match?.[1]?.trim()) {
            return match[1].trim();
        }
    }

    return null;
}

function parseInvoiceArgsFromMessage(message, existingArgs = {}) {
    const rawMessage = String(message || '').trim();
    const nextArgs = { ...(existingArgs && typeof existingArgs === 'object' ? existingArgs : {}) };
    const amountMatch = rawMessage.match(/(\d+(?:[.,]\d+)?)\s*(credits?|credit|usdcx|usad|any token|any)\b/i);
    const invoiceTypeMatch = rawMessage.match(/\b(donation|multipay|multi-pay|standard)\b/i);
    const walletMatch = rawMessage.match(/\b(main|burner)\b/i);
    const titleValue = extractOptionalFieldValue(rawMessage, 'title');
    const memoValue = extractOptionalFieldValue(rawMessage, 'memo');

    const amount = amountMatch ? parsePromptAmount(amountMatch[1]) : parsePromptAmount(rawMessage);
    const currency = amountMatch ? normalizePromptCurrency(amountMatch[2]) : (
        /\b(usdcx|usad|credits?|credit|aleo|any token|any)\b/i.test(rawMessage)
            ? normalizePromptCurrency(rawMessage)
            : null
    );

    if (amount != null) {
        nextArgs.amount = amount;
    }

    if (currency) {
        nextArgs.currency = currency;
    }

    if (invoiceTypeMatch?.[1]) {
        nextArgs.invoice_type = normalizePromptInvoiceType(invoiceTypeMatch[1]);
    }

    if (walletMatch?.[1]) {
        nextArgs.wallet = normalizePromptWallet(walletMatch[1]);
    }

    if (titleValue) {
        nextArgs.title = titleValue;
    }

    if (memoValue) {
        nextArgs.memo = memoValue;
    }

    return nextArgs;
}

function buildOptionalReviewReply(mergedArgs, isDonation) {
    const collected = [];
    const remaining = [];
    const title = typeof mergedArgs?.title === 'string' ? mergedArgs.title.trim() : '';
    const memo = typeof mergedArgs?.memo === 'string' ? mergedArgs.memo.trim() : '';
    const currency = mergedArgs?.currency ? normalizePromptCurrency(mergedArgs.currency) : null;

    if (title) {
        collected.push(`- ✓ Title: **${title}**`);
    } else {
        remaining.push('- Title (e.g. `title "Team dinner"`).');
    }

    if (memo) {
        collected.push(`- ✓ Memo: **${memo}**`);
    } else {
        remaining.push('- Memo (e.g. `memo "April payout"`).');
    }

    if (isDonation) {
        if (currency && currency !== 'ANY') {
            collected.push(`- ✓ Token: **${currency}**`);
        } else {
            remaining.push('- Token restriction (`credits`, `usdcx`, `usad`, or `any token`).');
        }
    }

    const lines = ['Your invoice draft is ready.', ''];

    if (collected.length > 0) {
        lines.push('Current invoice details:');
        lines.push(...collected);
        lines.push('');
    }

    if (remaining.length > 0) {
        lines.push('You can still add:');
        lines.push(...remaining);
        lines.push('');
    } else {
        lines.push('Everything optional is already set.');
        lines.push('');
    }

    lines.push('Say `continue` when you are ready to create the invoice.');
    return lines.join('\n');
}

function normalizeMissingArgs(rawValue) {
    if (!Array.isArray(rawValue)) {
        return [];
    }

    return Array.from(
        new Set(
            rawValue
                .map((value) => String(value || '').trim())
                .filter(Boolean)
        )
    );
}

function getPlannerContext(context = {}) {
    const safeContext = context && typeof context === 'object' ? { ...context } : {};
    const pendingToolCall = safeContext.pendingToolCall && typeof safeContext.pendingToolCall === 'object'
        ? safeContext.pendingToolCall
        : null;

    if (pendingToolCall?.name !== 'create_invoice') {
        return safeContext;
    }

    const pendingArgs = pendingToolCall.args && typeof pendingToolCall.args === 'object'
        ? pendingToolCall.args
        : {};
    const normalizedInvoiceType = pendingArgs.invoice_type
        ? normalizePromptInvoiceType(pendingArgs.invoice_type)
        : 'standard';
    const normalizedCurrency = pendingArgs.currency
        ? normalizePromptCurrency(pendingArgs.currency)
        : (normalizedInvoiceType === 'donation' ? 'ANY' : null);
    const amount = normalizedInvoiceType === 'donation'
        ? 0
        : parsePromptAmount(pendingArgs.amount);
    const title = typeof pendingArgs.title === 'string' && pendingArgs.title.trim()
        ? pendingArgs.title.trim()
        : null;
    const memo = typeof pendingArgs.memo === 'string' && pendingArgs.memo.trim()
        ? pendingArgs.memo.trim()
        : null;

    return {
        ...safeContext,
        pendingToolCall,
        currentCollectedInvoiceArgs: {
            invoice_type: normalizedInvoiceType,
            wallet: normalizePromptWallet(pendingArgs.wallet),
            ...(amount != null ? { amount } : {}),
            ...(normalizedCurrency ? { currency: normalizedCurrency } : {}),
            ...(title ? { title } : {}),
            ...(memo ? { memo } : {})
        }
    };
}

function extractJsonObject(text) {
    const raw = String(text || '').trim();
    if (!raw) {
        return null;
    }

    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() || raw;

    try {
        return JSON.parse(candidate);
    } catch {
        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            return null;
        }

        try {
            return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
        } catch {
            return null;
        }
    }
}

function normalizePlannedNullBotToolCall(rawToolCall) {
    if (!rawToolCall || typeof rawToolCall !== 'object') {
        return null;
    }

    const toolCall = rawToolCall;
    const rawName = String(toolCall.name || toolCall.type || '').trim();
    const args = toolCall.args && typeof toolCall.args === 'object' ? toolCall.args : {};
    const missingArgs = normalizeMissingArgs(toolCall.missingArgs || toolCall.missing_args);

    if (!rawName) {
        return null;
    }

    if (rawName === 'connect_wallet') {
        return {
            name: 'connect_wallet',
            args: {},
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'check_burner_balance') {
        return {
            name: 'check_burner_balance',
            args: {},
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'create_invoice') {
        const amount = parsePromptAmount(args.amount);
        const memo = typeof args.memo === 'string' ? args.memo.trim() : undefined;
        const title = typeof args.title === 'string' ? args.title.trim() : undefined;

        return {
            name: 'create_invoice',
            args: {
                ...(amount != null ? { amount } : {}),
                ...(args.currency ? { currency: normalizePromptCurrency(args.currency) } : {}),
                ...(title ? { title } : {}),
                ...(args.invoice_type ? { invoice_type: normalizePromptInvoiceType(args.invoice_type) } : {}),
                ...(args.wallet ? { wallet: normalizePromptWallet(args.wallet) } : {}),
                ...(memo ? { memo } : {})
            },
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'pay_invoice' || rawName === 'open_payment_link') {
        const amount = parsePromptAmount(args.amount);
        const paymentLink = typeof args.payment_link === 'string'
            ? args.payment_link.trim()
            : typeof args.url === 'string'
                ? args.url.trim()
                : undefined;

        return {
            name: 'pay_invoice',
            args: {
                ...(paymentLink ? { payment_link: paymentLink } : {}),
                ...(typeof args.invoice_hash === 'string' && args.invoice_hash.trim()
                    ? { invoice_hash: args.invoice_hash.trim() }
                    : {}),
                ...(args.wallet ? { wallet: normalizePromptWallet(args.wallet) } : {}),
                ...(amount != null ? { amount } : {}),
                ...(args.currency ? { currency: normalizePromptCurrency(args.currency) } : {})
            },
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'get_transaction_info') {
        const limit = Number(args.limit);

        return {
            name: 'get_transaction_info',
            args: {
                ...(typeof args.invoice_hash === 'string' && args.invoice_hash.trim()
                    ? { invoice_hash: args.invoice_hash.trim() }
                    : {}),
                ...(args.wallet ? { wallet: normalizePromptWallet(args.wallet) } : {}),
                ...(Number.isFinite(limit) && limit > 0 ? { limit: Math.round(limit) } : {})
            },
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'get_analytics') {
        const days = Number(args.days);

        return {
            name: 'get_analytics',
            args: {
                ...(args.wallet ? { wallet: normalizePromptWallet(args.wallet) } : {}),
                ...(Number.isFinite(days) && days > 0 ? { days: Math.round(days) } : {})
            },
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    if (rawName === 'sweep_funds' || rawName === 'sweep_burner_to_main') {
        const amount = parsePromptAmount(args.amount);
        const destination = typeof args.destination === 'string' ? args.destination.trim() : undefined;

        return {
            name: 'sweep_funds',
            args: {
                ...(amount != null ? { amount } : {}),
                ...(args.currency ? { currency: normalizePromptCurrency(args.currency) } : {}),
                ...(args.wallet ? { wallet: normalizePromptWallet(args.wallet) } : {}),
                ...(destination ? { destination } : {})
            },
            ...(missingArgs.length > 0 ? { missingArgs } : {})
        };
    }

    return null;
}

function detectNullBotToolCall(message, context = {}) {
    const rawMessage = String(message || '').trim();
    const normalizedMessage = rawMessage.toLowerCase();
    const pendingToolCall = context?.pendingToolCall && typeof context.pendingToolCall === 'object'
        ? context.pendingToolCall
        : null;

    if (!rawMessage) {
        return null;
    }

    const viewDataIntents = [
        /\b(show|list|get|display|view|fetch|load)\b[\s\S]{0,30}\b(invoices|paid|income|earnings|settled)\b/i,
        /\b(show|list|get|display|view|fetch|load)\b[\s\S]{0,30}\b(receipts|payments|transactions)\b/i,
        /\b(show|list|get|display|view|check)\b[\s\S]{0,30}\b(balance|balances)\b/i,
        /\b(all|both)\b[\s\S]{0,20}\b(wallet|wallets|invoices|receipts)\b/i,
        /\b(main|burner)\b[\s\S]{0,20}\b(wallet|wallets|invoices|receipts|balance)\b/i,
        /\bhow many\b[\s\S]{0,30}\b(invoices|received|paid|settled|pending)\b/i,
        /\bwhat.*\b(invoices|receipts|balance|stats|summary)\b/i,
        /\b(total|all)\b[\s\S]{0,20}\b(invoices|paid|settled)\b/i,
    ];

    for (const pattern of viewDataIntents) {
        if (pattern.test(rawMessage)) {
            return {
                reply: 'I can see your dashboard data in the context. I will reply with a summary of the requested data.',
                toolCall: null
            };
        }
    }

    if (pendingToolCall?.name === 'create_invoice') {
        const pendingArgs = pendingToolCall.args && typeof pendingToolCall.args === 'object'
            ? pendingToolCall.args
            : {};
        const mergedArgs = parseInvoiceArgsFromMessage(rawMessage, pendingArgs);
        const invoiceType = mergedArgs.invoice_type ? normalizePromptInvoiceType(mergedArgs.invoice_type) : 'standard';
        const isDonation = invoiceType === 'donation';
        const wantsContinue = /^(continue|skip|no|none|nope|go ahead|create it|create invoice|proceed)$/i.test(rawMessage);
        const hasOptionalReviewStage = Array.isArray(pendingToolCall.missingArgs) && pendingToolCall.missingArgs.includes('optional_review');
        const currency = mergedArgs.currency ? normalizePromptCurrency(mergedArgs.currency) : null;
        const amount = parsePromptAmount(mergedArgs.amount);

        if (hasOptionalReviewStage) {
            if (wantsContinue) {
                return {
                    reply: 'Creating the invoice now. Approve the wallet popup when it appears.',
                    toolCall: {
                        name: 'create_invoice',
                        args: {
                            ...(isDonation ? { amount: 0 } : (amount != null ? { amount } : {})),
                            ...(currency ? { currency } : (isDonation ? { currency: 'ANY' } : {})),
                            ...(mergedArgs.title ? { title: String(mergedArgs.title).trim() } : {}),
                            invoice_type: invoiceType,
                            wallet: normalizePromptWallet(mergedArgs.wallet),
                            ...(mergedArgs.memo ? { memo: String(mergedArgs.memo).trim() } : {})
                        }
                    }
                };
            }

            return {
                reply: buildOptionalReviewReply(mergedArgs, isDonation),
                toolCall: {
                    name: 'create_invoice',
                    args: {
                        ...(isDonation ? { amount: 0 } : (amount != null ? { amount } : {})),
                        ...(currency ? { currency } : {}),
                        ...(mergedArgs.title ? { title: String(mergedArgs.title).trim() } : {}),
                        invoice_type: invoiceType,
                        wallet: normalizePromptWallet(mergedArgs.wallet),
                        ...(mergedArgs.memo ? { memo: String(mergedArgs.memo).trim() } : {})
                    },
                    missingArgs: ['optional_review']
                }
            };
        }

        const missingArgs = [
            ...(isDonation || amount != null ? [] : ['amount']),
            ...((isDonation ? (currency || 'ANY') : currency) ? [] : ['currency'])
        ];

        if (missingArgs.length > 0) {
            return {
                reply: isDonation
                    ? 'Tell me which token to restrict the donation to, like `credits`, `usdcx`, or `usad`, or say `any token`.'
                    : missingArgs.length === 2
                        ? 'Tell me the invoice amount and token, like `0.1 credits` or `2 usdcx`.'
                        : missingArgs[0] === 'amount'
                            ? 'Tell me the invoice amount.'
                            : 'Tell me which token to use, like `credits`, `usdcx`, or `usad`.',
                toolCall: {
                    name: 'create_invoice',
                    args: {
                        ...(amount != null ? { amount } : {}),
                        ...(currency ? { currency } : {}),
                        ...(mergedArgs.title ? { title: String(mergedArgs.title).trim() } : {}),
                        invoice_type: invoiceType,
                        wallet: normalizePromptWallet(mergedArgs.wallet),
                        ...(mergedArgs.memo ? { memo: String(mergedArgs.memo).trim() } : {})
                    },
                    missingArgs
                }
            };
        }

        return {
            reply: buildOptionalReviewReply(mergedArgs, isDonation),
            toolCall: {
                name: 'create_invoice',
                args: {
                    ...(isDonation ? { amount: 0 } : { amount }),
                    ...(currency ? { currency } : (isDonation ? { currency: 'ANY' } : {})),
                    ...(mergedArgs.title ? { title: String(mergedArgs.title).trim() } : {}),
                    invoice_type: invoiceType,
                    wallet: normalizePromptWallet(mergedArgs.wallet),
                    ...(mergedArgs.memo ? { memo: String(mergedArgs.memo).trim() } : {})
                },
                missingArgs: ['optional_review']
            }
        };
    }

    if (/(connect wallet|connect my wallet|link wallet)/i.test(rawMessage)) {
        return {
            reply: 'Connect your wallet first, then I can run NullPay actions from your prompts.',
            toolCall: {
                name: 'connect_wallet',
                args: {}
            }
        };
    }

    const invoiceHashMatch = rawMessage.match(/\b\d{40,}field\b/i);
    const invoiceLookupIntent =
        Boolean(invoiceHashMatch) &&
        (
            /\b(hash|invoice|info|details|detail|about|show|find|lookup|look up|status|check)\b/i.test(rawMessage) ||
            rawMessage.trim() === invoiceHashMatch[0]
        );

    if (invoiceLookupIntent) {
        const invoiceHash = invoiceHashMatch[0];
        return {
            reply: `I can look up invoice \`${invoiceHash}\`.`,
            toolCall: {
                name: 'get_transaction_info',
                args: {
                    invoice_hash: invoiceHash
                }
            }
        };
    }

    const burnerBalanceIntent =
        /\b(balance|balances|funds?)\b[\s\S]{0,30}\b(burner)\b/i.test(rawMessage) ||
        /\b(burner)\b[\s\S]{0,30}\b(balance|balances|funds?)\b/i.test(rawMessage);

    if (burnerBalanceIntent) {
        return {
            reply: 'I can check your burner wallet balances now.',
            toolCall: {
                name: 'check_burner_balance',
                args: {}
            }
        };
    }

    const sweepIntent =
        /\bsweep\b[\s\S]{0,40}\b(burner|funds?|wallet)\b/i.test(rawMessage) ||
        /\bmove\b[\s\S]{0,40}\bfrom burner\b/i.test(rawMessage) ||
        /\btransfer\b[\s\S]{0,50}\bfrom burner\b/i.test(rawMessage);

    if (sweepIntent && normalizedMessage.includes('burner')) {
        const amountMatch = rawMessage.match(/(\d+(?:[.,]\d+)?)\s*(aleo|credits?|credit|usdcx|usad)\b/i);
        const currency = amountMatch ? normalizePromptCurrency(amountMatch[2]) : null;
        const amount = amountMatch ? parsePromptAmount(amountMatch[1]) : null;

        return {
            reply: amountMatch
                ? `I can sweep ${amountMatch[1]} ${currency} from your burner wallet to your connected main wallet using the usual sponsored burner sweep flow.`
                : 'I can sweep your available burner-wallet funds to your connected main wallet using the usual sponsored burner sweep flow.',
            toolCall: {
                name: 'sweep_funds',
                args: {
                    wallet: 'burner',
                    destination: 'main_wallet',
                    ...(amount != null ? { amount } : {}),
                    ...(currency ? { currency } : {})
                },
                ...(!amountMatch ? { missingArgs: ['amount', 'currency'] } : {})
            }
        };
    }

    const createInvoiceIntent =
        /\b(create|make|generate)\b[\s\S]{0,40}\b(invoice|invocie|bill|payment link)\b/i.test(rawMessage) ||
        /\b(create|make|generate)\b[\s\S]{0,20}\b(donation|multipay|multi-pay|standard)\b/i.test(rawMessage) ||
        /\binvoice\b[\s\S]{0,30}\b(of|for)\b/i.test(rawMessage);

    if (createInvoiceIntent) {
        const mergedArgs = parseInvoiceArgsFromMessage(rawMessage, {});
        const invoiceType = mergedArgs.invoice_type ? normalizePromptInvoiceType(mergedArgs.invoice_type) : 'standard';
        const title = typeof mergedArgs.title === 'string' ? mergedArgs.title.trim() : undefined;
        const memo = typeof mergedArgs.memo === 'string' ? mergedArgs.memo.trim() : undefined;
        const wallet = normalizePromptWallet(mergedArgs.wallet);
        const amount = parsePromptAmount(mergedArgs.amount);
        const currency = mergedArgs.currency ? normalizePromptCurrency(mergedArgs.currency) : null;

        if (invoiceType === 'donation') {
            return {
                reply: buildOptionalReviewReply({
                    amount: 0,
                    ...(currency ? { currency } : { currency: 'ANY' }),
                    ...(title ? { title } : {}),
                    invoice_type: 'donation',
                    wallet,
                    ...(memo ? { memo } : {})
                }, true),
                toolCall: {
                    name: 'create_invoice',
                    args: {
                        amount: 0,
                        ...(currency ? { currency } : { currency: 'ANY' }),
                        ...(title ? { title } : {}),
                        invoice_type: 'donation',
                        wallet,
                        ...(memo ? { memo } : {})
                    },
                    missingArgs: ['optional_review']
                }
            };
        }

        if (amount != null && currency) {
            return {
                reply: buildOptionalReviewReply({
                    amount,
                    currency,
                    ...(title ? { title } : {}),
                    invoice_type: invoiceType,
                    wallet,
                    ...(memo ? { memo } : {})
                }, false),
                toolCall: {
                    name: 'create_invoice',
                    args: {
                        amount,
                        currency,
                        ...(title ? { title } : {}),
                        invoice_type: invoiceType,
                        wallet,
                        ...(memo ? { memo } : {})
                    },
                    missingArgs: ['optional_review']
                }
            };
        }

        return {
            reply: 'I can create that invoice for you. Tell me the amount and token, like `0.1 credits` or `2 usdcx`.',
            toolCall: {
                name: 'create_invoice',
                args: {
                    ...(title ? { title } : {}),
                    ...(mergedArgs.invoice_type ? { invoice_type: invoiceType } : {}),
                    ...(mergedArgs.wallet ? { wallet } : {}),
                    ...(memo ? { memo } : {})
                },
                missingArgs: ['amount', 'currency']
            }
        };
    }

    const paymentLinkMatch = rawMessage.match(/https?:\/\/[^\s]+/i);
    const payIntent = /\b(pay|open|use)\b[\s\S]{0,30}\b(invoice|link|payment)\b/i.test(rawMessage);
    if (payIntent && paymentLinkMatch) {
        return {
            reply: 'I found a NullPay payment link. I can open the in-app payment flow so you can approve it with your wallet popup.',
            toolCall: {
                name: 'pay_invoice',
                args: {
                    payment_link: paymentLinkMatch[0]
                }
            }
        };
    }

    return null;
}

function extractInvoiceHashFromToolCall(toolCall) {
    return typeof toolCall?.args?.invoice_hash === 'string' && toolCall.args.invoice_hash.trim()
        ? toolCall.args.invoice_hash.trim()
        : null;
}

async function planNullBotToolCall(message, context) {
    const systemInstruction = [
        'You are the NullBot tool planner for the browser dashboard.',
        'Your job is to decide whether the next user message should call one dashboard tool, continue collecting args for a pending tool, or just answer directly from provided context data.',
        'You must never ask the user for a private key or secret key.',
        'IMPORTANT: The context already contains dashboard data like invoices, receipts, balances, and stats.',
        'When user asks to SHOW, LIST, GET, DISPLAY, or VIEW data that already exists in context (like invoices, receipts, transactions, balances, stats), do NOT call any tool.',
        'Instead, directly reply with a summary of the requested data. The frontend will render the appropriate UI components.',
        'Only call a tool when user explicitly requests an ACTION like create, pay, sweep, check, or connect.',
        'CRITICAL: Do NOT ask clarifying questions like "which wallet" when the context already has data from both wallets.',
        'Examples of responses that require NO tool:',
        '  - "show me all paid invoices" -> reply with summary like "You have 23 paid invoices: 15 from main wallet (8 SETTLED, 7 PENDING) and 8 from burner (all SETTLED)."',
        '  - "list my receipts" -> reply with summary like "You received 42 merchant receipts total: 31 in Credits, 8 in USDCx, 3 in USAD."',
        '  - "what is my balance" -> reply with summary like "Main wallet: 250 Credits (public), 50 Credits (private). Burner: 12 Credits."',
        '  - "give me a summary" -> reply with stats summary including total invoices, volumes, and receipts counts.',
        'Use these exact tool names only when needed: connect_wallet, create_invoice, pay_invoice, get_transaction_info, get_analytics, check_burner_balance, sweep_funds.',
        'Use get_analytics only for dashboard summaries or stats questions that need aggregated data from the last 7/30 days.',
        'Use get_transaction_info only when user asks to LOOK UP a specific invoice hash or transaction ID.',
        'When the context includes pendingToolCall, treat the new message as a follow-up that may fill missing args for that same tool.',
        'Treat both `0.1` and `0,1` as valid decimal amounts.',
        'For create_invoice, preferred args are amount, currency, title, invoice_type, wallet, memo.',
        'Donation invoices are open amount. Never ask for an amount when invoice_type is donation.',
        'For donation invoices, token restriction is optional. If none is supplied, keep currency as ANY until the user restricts it or says continue.',
        'When required invoice args are complete but the user may still want optional token/title/memo fields, keep the tool pending with missingArgs ["optional_review"] and ask what optional fields to add or whether to continue.',
        'When the pending create_invoice tool is in optional review and the user says continue/skip/no, finalize the tool call with no missingArgs so the frontend can execute it.',
        'If the user adds title, memo, or donation token during optional review, keep the same pending create_invoice tool and preserve previously collected args.',
        'CRITICAL: Never re-ask for any create_invoice parameter that already exists in the collected state provided in the context.',
        'CRITICAL: During optional_review, acknowledge the specific value the user just added and keep previously collected values intact.',
        'CRITICAL: When replying during optional_review, reference what is already collected and only mention fields that are still missing or optional to add.',
        'For sweep_funds from burner to the connected main wallet, set wallet to burner and destination to main_wallet when the user says burner to main.',
        'If some required args are still missing, return the chosen tool with missingArgs and a short follow-up question.',
        'If no tool should run, return toolCall as null and provide a concise helpful reply.',
        'Respond with JSON only. No markdown fences, no prose outside JSON.',
        'JSON shape: {"reply":"string","toolCall":{"name":"tool_name","args":{},"missingArgs":["field"]} | null}.'
    ].join(' ');

    const prompt = [
        'Dashboard tool context:',
        JSON.stringify(getPlannerContext(context), null, 2),
        '',
        'User message:',
        message
    ].join('\n');

    const result = await requestGeminiReply({
        systemInstruction,
        prompt,
        maxOutputTokens: 700
    });

    const parsed = extractJsonObject(result.text);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Planner returned invalid JSON.');
    }

    const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : '';
    const toolCall = normalizePlannedNullBotToolCall(parsed.toolCall);

    return {
        reply,
        ...(toolCall ? { toolCall } : {})
    };
}

function sanitizePlannedNullBotResponse(planned, fallback) {
    const fallbackInvoiceHash = extractInvoiceHashFromToolCall(fallback?.toolCall);
    const plannedInvoiceHash = extractInvoiceHashFromToolCall(planned?.toolCall);

    if (fallback?.toolCall?.name === 'get_transaction_info' && fallbackInvoiceHash) {
        if (
            !planned?.toolCall ||
            planned.toolCall.name !== 'get_transaction_info' ||
            plannedInvoiceHash?.toLowerCase() !== fallbackInvoiceHash.toLowerCase()
        ) {
            return fallback;
        }
    }

    if (fallback?.toolCall?.name === 'check_burner_balance') {
        if (!planned?.toolCall || planned.toolCall.name !== 'check_burner_balance') {
            return fallback;
        }
    }

    if (!planned?.toolCall || planned.toolCall.name !== 'create_invoice') {
        return planned;
    }

    const invoiceType = planned.toolCall.args?.invoice_type
        ? normalizePromptInvoiceType(planned.toolCall.args.invoice_type)
        : null;

    if (invoiceType !== 'donation') {
        return planned;
    }

    const missingArgs = normalizeMissingArgs(planned.toolCall.missingArgs);
    const asksForAmount = /\bamount\b/i.test(planned.reply || '') || missingArgs.includes('amount');

    if (!asksForAmount) {
        return planned;
    }

    if (fallback?.toolCall?.name === 'create_invoice') {
        const fallbackInvoiceType = fallback.toolCall.args?.invoice_type
            ? normalizePromptInvoiceType(fallback.toolCall.args.invoice_type)
            : null;

        if (fallbackInvoiceType === 'donation') {
            return fallback;
        }
    }

    const sanitizedArgs = {
        ...planned.toolCall.args,
        amount: 0,
        currency: planned.toolCall.args?.currency
            ? normalizePromptCurrency(planned.toolCall.args.currency)
            : 'ANY',
        invoice_type: 'donation',
        wallet: normalizePromptWallet(planned.toolCall.args?.wallet)
    };

    return {
        reply: buildOptionalReviewReply(sanitizedArgs, true),
        toolCall: {
            ...planned.toolCall,
            args: sanitizedArgs,
            missingArgs: ['optional_review']
        }
    };
}

async function generateNullBotChat(message, context) {
    const fallback = detectNullBotToolCall(message, context);

    try {
        const planned = await planNullBotToolCall(message, context);
        const sanitized = sanitizePlannedNullBotResponse(planned, fallback);

        if (sanitized.toolCall) {
            return sanitized;
        }

        if (fallback?.toolCall) {
            return fallback;
        }

        const isGenericReply = !sanitized.reply || sanitized.reply.length < 10 || /I (can|will|would)/i.test(sanitized.reply);
        if (isGenericReply || !sanitized.reply) {
            console.log('[NullBot] Planner returned generic reply, using direct data handler');
            const directReply = await generateDashboardAssistantReply(message, context);
            return { reply: directReply };
        }

        return sanitized;
    } catch (plannerError) {
        console.warn('NullBot planner fallback:', plannerError.message);
    }

    if (fallback?.toolCall) {
        return fallback;
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
