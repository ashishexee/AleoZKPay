const crypto = require('crypto');

function tokenTypeToNum(token) {
    if (!token) return 0;
    const t = token.toUpperCase();
    if (t === 'USDCX') return 1;
    if (t === 'USAD') return 2;
    if (t === 'ANY') return 3;
    return 0; // CREDITS
}

// ─── Price Cache ────────────────────────────────────────────────
// Cache CREDITS price from Provable API for 60 seconds to avoid hammering
let cachedCreditsPrice = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
let cachedBlockHeight = 0;
let cachedBlockHeightAt = 0;
const BLOCK_HEIGHT_CACHE_TTL_MS = 10_000;

// Fallback rates (safety net if Provable API is down)
const FALLBACK_RATES_USD = {
    'CREDITS': 0.044,
    'USDCX': 1.00,
    'USAD': 1.00
};

/**
 * Fetch live CREDITS price from the Provable API.
 * Uses a 60-second in-memory cache.
 * Falls back to hardcoded rate on failure.
 */
async function fetchCreditsPriceUSD() {
    const now = Date.now();
    if (cachedCreditsPrice !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedCreditsPrice;
    }

    try {
        const url = 'https://api.provable.com/v2/testnet/tokens/details?program_id=credits.aleo';
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000)  // 8-second timeout
        });

        if (!response.ok) {
            throw new Error(`Provable API returned ${response.status}`);
        }

        const data = await response.json();
        const price = parseFloat(data?.token?.price);

        if (isNaN(price) || price <= 0) {
            throw new Error(`Invalid price value from Provable API: ${data?.token?.price}`);
        }

        cachedCreditsPrice = price;
        cacheTimestamp = now;
        console.log(`[Oracle] Fetched live CREDITS price: $${price}`);
        return price;
    } catch (err) {
        console.warn(`[Oracle] Provable API fetch failed, using fallback: ${err.message}`);
        return FALLBACK_RATES_USD['CREDITS'];
    }
}

/**
 * Get USD price for a token.
 * USDCX and USAD are pegged stablecoins at $1.00.
 * CREDITS uses live Provable API price.
 */
async function fetchPriceUSD(token) {
    const t = token.toUpperCase();
    if (t === 'USDCX' || t === 'USAD') return 1.00;
    if (t === 'CREDITS') return await fetchCreditsPriceUSD();
    return 1.00; // unknown token fallback
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
        const fromPrice = await fetchPriceUSD(from_token);
        const toPrice = await fetchPriceUSD(to_token);
        
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
