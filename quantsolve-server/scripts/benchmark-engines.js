/* eslint-disable no-console */
const { performance } = require("perf_hooks");
const { runEngineWithMeta } = require("../src/engine/engineAdapter");

const CASES = [
    {
        name: "small-2var",
        equation: "10x + 20y = 100",
        constraints: {},
        options: { page: 1, pageSize: 50 },
    },
    {
        name: "mid-3var",
        equation: "10x + 20y + 5z = 100",
        constraints: {},
        options: { page: 1, pageSize: 50 },
    },
    {
        name: "large-5var",
        equation: "10a + 15b + 20c + 50d + 5e = 1000",
        constraints: {},
        options: { page: 1, pageSize: 50 },
    },
];

const BACKENDS = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["js", "cpp"];

const WARMUP = Number(process.env.BENCH_WARMUP || 2);
const RUNS = Number(process.env.BENCH_RUNS || 6);

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return sorted[idx];
}

async function benchOne(backend, testCase, disableCache) {
    process.env.ENGINE_BACKEND = backend;

    for (let i = 0; i < WARMUP; i += 1) {
        await runEngineWithMeta(
            testCase.equation,
            testCase.constraints,
            testCase.options,
            { disableCache },
        );
    }

    const times = [];
    let cacheHits = 0;
    let activeBackend = backend;
    let fallbackUsed = false;

    for (let i = 0; i < RUNS; i += 1) {
        const started = performance.now();
        const { result, meta } = await runEngineWithMeta(
            testCase.equation,
            testCase.constraints,
            testCase.options,
            { disableCache },
        );
        const elapsed = performance.now() - started;

        if (!result || typeof result.success !== "boolean") {
            throw new Error(`Invalid response for backend=${backend}`);
        }

        activeBackend = meta.activeBackend;
        fallbackUsed = fallbackUsed || meta.fallbackUsed;
        if (meta.cacheHit) cacheHits += 1;
        times.push(elapsed);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    return {
        avg,
        min: sorted[0],
        p95: percentile(sorted, 0.95),
        max: sorted[sorted.length - 1],
        cacheHits,
        runs: RUNS,
        activeBackend,
        fallbackUsed,
    };
}

async function run() {
    console.log(`Benchmarking backends: ${BACKENDS.join(", ")}`);
    console.log(`Warmup=${WARMUP}, runs=${RUNS}`);
    console.log("(raw = disable cache, cached = normal cache)\n");

    for (const testCase of CASES) {
        console.log(`Case: ${testCase.name}`);

        for (const backend of BACKENDS) {
            try {
                const raw = await benchOne(backend, testCase, true);
                const cached = await benchOne(backend, testCase, false);
                console.log(
                    `  ${backend.padEnd(7)} raw(avg=${raw.avg.toFixed(2)}ms,p95=${raw.p95.toFixed(2)}ms) cached(avg=${cached.avg.toFixed(2)}ms,hits=${cached.cacheHits}/${cached.runs}) active=${cached.activeBackend}${cached.fallbackUsed ? "(fallback)" : ""}`,
                );
            } catch (err) {
                console.log(`  ${backend.padEnd(7)} ERROR: ${err.message}`);
            }
        }

        console.log("");
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
