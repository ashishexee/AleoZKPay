const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const COINCAP_API_KEY = process.env.COINCAP_API_KEY;

function tokenTypeToNum(token) {
    if (!token) return 0;
    const t = token.toUpperCase();
    if (t === 'USDCX') return 1;
    if (t === 'USAD') return 2;
    if (t === 'ANY') return 3;
    return 0; // CREDITS
}

// ─── Price Cache ────────────────────────────────────────────────
// Cache aggregated CREDITS price for 60 seconds to avoid hammering
let cachedCreditsPrice = null;
let cacheTimestamp = 0;
let cachedCreditsPriceMeta = null;
const CACHE_TTL_MS = 60_000; // 60 seconds
let cachedBlockHeight = 0;
let cachedBlockHeightAt = 0;
const BLOCK_HEIGHT_CACHE_TTL_MS = 10_000;

const PRICE_SOURCE_TIMEOUT_MS = 4000;

const PRICE_SOURCES = [
    {
        name: 'provable',
        url: 'https://api.provable.com/v2/testnet/tokens/details?program_id=credits.aleo',
        parse: (data) => ({
            priceUsd: parseFloat(data?.token?.price),
            fetchedAt: Date.now()
        })
    },
    {
        name: 'coingecko',
        url: 'https://api.coingecko.com/api/v3/simple/price?ids=aleo&vs_currencies=usd',
        parse: (data) => ({
            priceUsd: Number(data?.aleo?.usd),
            fetchedAt: Date.now()
        })
    },
    {
        name: 'coincap',
        url: 'https://rest.coincap.io/v3/assets?search=aleo',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${COINCAP_API_KEY}`
        },
        parse: (data) => ({
            priceUsd: parseFloat(data?.data?.[0]?.priceUsd),
            fetchedAt: Number(data?.timestamp) || Date.now()
        })
    },
    {
        name: 'coinbase',
        url: 'https://api.coinbase.com/v2/prices/ALEO-USD/spot',
        parse: (data) => ({
            priceUsd: parseFloat(data?.data?.amount),
            fetchedAt: Date.now()
        })
    },
    {
        name: 'mexc',
        url: 'https://api.mexc.com/api/v3/ticker/price?symbol=ALEOUSDT',
        parse: (data) => ({
            priceUsd: parseFloat(data?.price),
            fetchedAt: Date.now()
        })
    },
    {
        name: 'bitmart',
        url: 'https://api-cloud.bitmart.com/spot/v1/ticker?symbol=ALEO_USDT',
        parse: (data) => ({
            priceUsd: parseFloat(data?.data?.tickers?.[0]?.last_price),
            fetchedAt: Number(data?.data?.tickers?.[0]?.timestamp) || Date.now()
        })
    },
    {
        name: 'xt',
        url: 'https://sapi.xt.com/v4/public/ticker?symbol=aleo_usdt',
        parse: (data) => ({
            priceUsd: parseFloat(data?.result?.[0]?.c),
            fetchedAt: Number(data?.result?.[0]?.t) || Date.now()
        })
    }
];

// Fallback rates (safety net if Provable API is down)
const FALLBACK_RATES_USD = {
    'CREDITS': 0.044,
    'USDCX': 1.00,
    'USAD': 1.00
};

function isValidPrice(price) {
    return Number.isFinite(price) && price > 0;
}

function median(values) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 1) {
        return sorted[middle];
    }

    return (sorted[middle - 1] + sorted[middle]) / 2;
}

async function fetchJsonWithTimeout(url, headers = {}) {
    const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(PRICE_SOURCE_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

async function fetchPriceFromSource(source) {
    const data = await fetchJsonWithTimeout(source.url, source.headers || {});
    const parsed = source.parse(data);

    if (!isValidPrice(parsed?.priceUsd)) {
        throw new Error('Invalid price');
    }

    return {
        source: source.name,
        priceUsd: parsed.priceUsd,
        fetchedAt: parsed.fetchedAt || Date.now()
    };
}

function filterOutlierPrices(sourceResults) {
    if (sourceResults.length < 3) {
        return sourceResults;
    }

    const baseline = median(sourceResults.map((result) => result.priceUsd));
    if (!isValidPrice(baseline)) {
        return sourceResults;
    }

    const filtered = sourceResults.filter((result) => Math.abs(result.priceUsd - baseline) / baseline <= 0.10);
    return filtered.length > 0 ? filtered : sourceResults;
}

function logPriceSourceResults(settledResults, filteredResults, aggregatedPrice) {
    settledResults.forEach((result, index) => {
        const sourceName = PRICE_SOURCES[index]?.name || `source_${index}`;

        if (result.status === 'fulfilled') {
            console.log(`[Oracle] Source ${sourceName} OK -> $${result.value.priceUsd}`);
            return;
        }

        console.warn(`[Oracle] Source ${sourceName} failed -> ${result.reason?.message || 'Unknown error'}`);
    });

    const filteredSourceNames = new Set(filteredResults.map((result) => result.source));
    const droppedOutliers = settledResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((result) => !filteredSourceNames.has(result.source));

    droppedOutliers.forEach((result) => {
        console.warn(`[Oracle] Source ${result.source} dropped as outlier -> $${result.priceUsd}`);
    });

    console.log(`[Oracle] Aggregation median -> $${aggregatedPrice}`);
}

/**
 * Fetch live CREDITS price from all configured sources.
 * Uses a 60-second in-memory cache.
 * Silently drops failed/invalid sources and falls back only if none survive.
 */
async function fetchCreditsPriceUSD() {
    const now = Date.now();
    if (cachedCreditsPrice !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return {
            priceUsd: cachedCreditsPrice,
            meta: cachedCreditsPriceMeta || {
                aggregation: 'median',
                source_count: 0,
                sources_used: []
            }
        };
    }

    try {
        const settled = await Promise.allSettled(
            PRICE_SOURCES.map((source) => fetchPriceFromSource(source))
        );

        const validResults = filterOutlierPrices(
            settled
                .filter((result) => result.status === 'fulfilled')
                .map((result) => result.value)
        );

        const aggregatedPrice = median(validResults.map((result) => result.priceUsd));

        if (!isValidPrice(aggregatedPrice)) {
            throw new Error('No valid price sources returned usable data');
        }

        logPriceSourceResults(settled, validResults, aggregatedPrice);

        cachedCreditsPrice = aggregatedPrice;
        cachedCreditsPriceMeta = {
            aggregation: 'median',
            source_count: validResults.length,
            sources_used: validResults.map((result) => result.source),
            fetched_at: now
        };
        cacheTimestamp = now;
        console.log(`[Oracle] Aggregated CREDITS price: $${aggregatedPrice} from ${validResults.length}/${PRICE_SOURCES.length} sources`);
        return {
            priceUsd: aggregatedPrice,
            meta: cachedCreditsPriceMeta
        };
    } catch (err) {
        console.warn(`[Oracle] Price aggregation failed, using fallback: ${err.message}`);
        return {
            priceUsd: FALLBACK_RATES_USD['CREDITS'],
            meta: {
                aggregation: 'fallback',
                source_count: 0,
                sources_used: [],
                fetched_at: now
            }
        };
    }
}

/**
 * Get USD price for a token.
 * USDCX and USAD are pegged stablecoins at $1.00.
 * CREDITS uses live Provable API price.
 */
async function fetchPriceUSD(token) {
    const t = token.toUpperCase();
    if (t === 'USDCX' || t === 'USAD') {
        return {
            priceUsd: 1.00,
            meta: {
                aggregation: 'fixed',
                source_count: 1,
                sources_used: [t],
                fetched_at: Date.now()
            }
        };
    }
    if (t === 'CREDITS') return await fetchCreditsPriceUSD();
    return {
        priceUsd: 1.00,
        meta: {
            aggregation: 'fixed',
            source_count: 0,
            sources_used: [],
            fetched_at: Date.now()
        }
    }; // unknown token fallback
}

/**
 * Fetch current block height from the Aleo network.
 * Used to compute block-height-based quote expiry.
 */
async function fetchCurrentBlockHeight() {
    const now = Date.now();
    if (cachedBlockHeight > 0 && (now - cachedBlockHeightAt) < BLOCK_HEIGHT_CACHE_TTL_MS) {
        return cachedBlockHeight;
    }

    try {
        const response = await fetch(
            'https://api.explorer.provable.com/v1/testnet/block/height/latest',
            { signal: AbortSignal.timeout(5000) }
        );
        if (!response.ok) throw new Error(`Block height API returned ${response.status}`);
        const height = parseInt(await response.text(), 10);
        if (isNaN(height)) throw new Error('Invalid block height');
        cachedBlockHeight = height;
        cachedBlockHeightAt = now;
        return height;
    } catch (err) {
        console.warn(`[Oracle] Block height fetch failed: ${err.message}`);
        if (cachedBlockHeight > 0) {
            return cachedBlockHeight;
        }
        // Fallback: return 0 so the contract won't enforce expiry
        return 0;
    }
}

// ─── Main Quote Endpoint ────────────────────────────────────────
const getQuote = async (req, res) => {
    try {
        let { from_token, to_token, amount } = req.query;
        if (!from_token || !to_token || !amount) {
            return res.status(400).json({ error: 'Missing from_token, to_token, or amount' });
        }

        from_token = from_token.toUpperCase();
        to_token = to_token.toUpperCase();
        const originalAmount = parseFloat(amount);
        
        if (isNaN(originalAmount) || originalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (from_token === to_token) {
            return res.status(400).json({ error: 'from_token and to_token cannot be the same' });
        }

        const oraclePrivateKeyStr = process.env.ORACLE_PRIVATE_KEY;
        if (!oraclePrivateKeyStr) {
            return res.status(500).json({ error: 'Backend ORACLE_PRIVATE_KEY is not configured.' });
        }

        // Fetch live prices
        const fromPriceResult = await fetchPriceUSD(from_token);
        const toPriceResult = await fetchPriceUSD(to_token);
        const fromPrice = fromPriceResult.priceUsd;
        const toPrice = toPriceResult.priceUsd;
        
        // Convert: originalAmount of from_token → equivalent in to_token
        // value in USD = originalAmount * fromPriceUSD
        // expected in to_token = valueUSD / toPriceUSD
        const valueUSD = originalAmount * fromPrice;
        const expectedAmount = valueUSD / toPrice;

        // Micro amounts (6 decimals)
        const originalAmountMicro = BigInt(Math.round(originalAmount * 1_000_000));
        const convertedAmountMicro = BigInt(Math.round(expectedAmount * 1_000_000));

        // Block-height-based expiry (~5 minutes at ~10s/block = 30 blocks)
        const currentBlockHeight = await fetchCurrentBlockHeight();
        const expiresAtBlock = currentBlockHeight > 0 ? currentBlockHeight + 30 : 0;

        const fromTypeNum = tokenTypeToNum(from_token);
        const toTypeNum = tokenTypeToNum(to_token);

        const sdk = await import('@provablehq/sdk/testnet.js');
        const oracleAccount = new sdk.Account({ privateKey: oraclePrivateKeyStr });
        const oraclePublicAddress = oracleAccount.address().to_string();

        // Mirror Leo's `BHP256::hash_to_field(quote)` before signing so the on-chain
        // `signature::verify(..., quote_hash)` check validates the exact same payload.
        const quotePlaintext = sdk.Plaintext.fromString(`{
            original_amount_micro: ${originalAmountMicro.toString()}u64,
            converted_amount_micro: ${convertedAmountMicro.toString()}u64,
            from_token_type: ${fromTypeNum}u8,
            to_token_type: ${toTypeNum}u8,
            expires_at: ${expiresAtBlock}u32
        }`);
        const quoteHash = new sdk.BHP256().hash(quotePlaintext.toBitsLe());
        const signatureObj = sdk.Signature.signValue(oracleAccount.privateKey(), quoteHash.toString());
        const signature = signatureObj.to_string();

        res.json({
            expected_amount: expectedAmount,
            original_amount_micro: originalAmountMicro.toString(),
            converted_amount_micro: convertedAmountMicro.toString(),
            expires_at: expiresAtBlock,
            signature,
            quote_hash: quoteHash.toString(),
            oracle_address: oraclePublicAddress,
            from_token,
            to_token,
            rates: {
                from_usd: fromPrice,
                to_usd: toPrice
            },
            oracle_meta: {
                from_token: fromPriceResult.meta,
                to_token: toPriceResult.meta
            }
        });
    } catch (err) {
        console.error('Oracle GetQuote Error:', err);
        res.status(500).json({ error: 'Failed to generate oracle quote' });
    }
};

module.exports = {
    getQuote
};
