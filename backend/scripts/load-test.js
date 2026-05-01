const { performance } = require('perf_hooks');

function getArg(name, fallback) {
    const prefix = `--${name}=`;
    const value = process.argv.find((arg) => arg.startsWith(prefix));
    return value ? value.slice(prefix.length) : fallback;
}

function percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
    return sortedValues[Math.max(0, index)];
}

async function main() {
    const directUrl = getArg('url', process.env.LOAD_TEST_URL || '');
    const baseUrl = getArg('base-url', process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000');
    const endpoint = getArg('endpoint', process.env.LOAD_TEST_ENDPOINT || '/');
    const method = (getArg('method', process.env.LOAD_TEST_METHOD || 'GET') || 'GET').toUpperCase();
    const totalRequests = Number(getArg('requests', process.env.LOAD_TEST_REQUESTS || '100'));
    const concurrency = Number(getArg('concurrency', process.env.LOAD_TEST_CONCURRENCY || '10'));
    const bodyRaw = getArg('body', process.env.LOAD_TEST_BODY || '');
    const authHeader = getArg('auth', process.env.LOAD_TEST_AUTH || '');
    const apiKeyHeader = getArg('x-api-key', process.env.LOAD_TEST_X_API_KEY || '');

    if (!Number.isFinite(totalRequests) || totalRequests <= 0) {
        throw new Error('requests must be a positive number');
    }
    if (!Number.isFinite(concurrency) || concurrency <= 0) {
        throw new Error('concurrency must be a positive number');
    }

    let parsedBody;
    if (bodyRaw) {
        parsedBody = JSON.parse(bodyRaw);
    }

    const url = directUrl || new URL(endpoint, baseUrl).toString();
    const durations = [];
    const statusCounts = new Map();
    let completed = 0;
    let succeeded = 0;
    let failed = 0;

    const startedAt = performance.now();
    let nextRequestIndex = 0;

    async function runOne(requestNumber) {
        const requestStartedAt = performance.now();
        try {
            const headers = { Accept: 'application/json' };
            if (parsedBody !== undefined) headers['Content-Type'] = 'application/json';
            if (authHeader) headers['Authorization'] = authHeader;
            if (apiKeyHeader) headers['X-Provable-API-Key'] = apiKeyHeader;

            const response = await fetch(url, {
                method,
                headers,
                body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
            });

            const duration = performance.now() - requestStartedAt;
            durations.push(duration);
            statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);
            completed += 1;

            if (response.ok) {
                succeeded += 1;
            } else {
                failed += 1;
                const errorText = await response.text().catch(() => '');
                console.error(`[${requestNumber}] HTTP ${response.status}${errorText ? `: ${errorText.slice(0, 300)}` : ''}`);
            }
        } catch (error) {
            const duration = performance.now() - requestStartedAt;
            durations.push(duration);
            completed += 1;
            failed += 1;
            statusCounts.set('network_error', (statusCounts.get('network_error') || 0) + 1);
            console.error(`[${requestNumber}] Network error: ${error.message}`);
        }
    }

    async function worker() {
        while (nextRequestIndex < totalRequests) {
            const requestNumber = nextRequestIndex;
            nextRequestIndex += 1;
            await runOne(requestNumber + 1);
        }
    }

    console.log(`Load test starting: ${method} ${url}`);
    console.log(`Requests: ${totalRequests}, concurrency: ${concurrency}`);

    await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker()));

    const totalDurationMs = performance.now() - startedAt;
    const sortedDurations = durations.slice().sort((a, b) => a - b);
    const requestsPerSecond = totalRequests / (totalDurationMs / 1000);

    console.log('');
    console.log('Summary');
    console.log(`Completed: ${completed}/${totalRequests}`);
    console.log(`Succeeded: ${succeeded}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total time: ${totalDurationMs.toFixed(2)} ms`);
    console.log(`Throughput: ${requestsPerSecond.toFixed(2)} req/s`);
    console.log(`Latency avg: ${(durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2)} ms`);
    console.log(`Latency p50: ${percentile(sortedDurations, 50).toFixed(2)} ms`);
    console.log(`Latency p95: ${percentile(sortedDurations, 95).toFixed(2)} ms`);
    console.log(`Latency p99: ${percentile(sortedDurations, 99).toFixed(2)} ms`);
    console.log('Status counts:');
    for (const [status, count] of statusCounts.entries()) {
        console.log(`  ${status}: ${count}`);
    }
}

main().catch((error) => {
    console.error('Load test failed:', error.message);
    process.exitCode = 1;
});
