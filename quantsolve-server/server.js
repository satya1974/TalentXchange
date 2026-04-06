// server.js
require("dotenv").config();
const app = require("./src/app");
const {
    runEngineWithMeta,
    getBackendInfo,
    checkBackendAvailability,
    getCacheStats,
} = require("./src/engine/engineAdapter");
const { EngineMetrics } = require("./src/engine/engineMetrics");

const PORT = process.env.PORT || 5500;
const LOG_METRICS = (process.env.LOG_ENGINE_METRICS || "true").toLowerCase() !== "false";
const metrics = new EngineMetrics(Number(process.env.ENGINE_METRICS_MAX_SAMPLES || 2000));

process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("[process] uncaughtException:", err);
});

app.get("/", (req, res) => {
    const backend = getBackendInfo();
    res.json({
        status: "ok",
        service: "QuantSolve Engine",
        engineBackend: backend.backend,
        engineNote: backend.note,
        cache: getCacheStats(),
    });
});

app.get("/metrics", (req, res) => {
    res.json({
        success: true,
        engine: getBackendInfo(),
        cache: getCacheStats(),
        metrics: metrics.snapshot(),
    });
});

app.post("/solve", async (req, res) => {
    try {
        const { equation, constraints = {}, page = 1, pageSize = 50 } = req.body;

        if (!equation) {
            return res.status(400).json({
                success: false,
                error: "Request body must include an 'equation' field.",
                code: "EMPTY_INPUT",
                category: "syntax",
            });
        }

        const options = {
            page: Math.max(1, parseInt(page, 10) || 1),
            pageSize: Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50)),
        };

        const { result, meta } = await runEngineWithMeta(
            equation,
            constraints,
            options,
        );
        metrics.record(meta);
        const responsePayload = {
            ...result,
            meta: {
                ...(result.meta || {}),
                ...meta,
            },
        };

        if (LOG_METRICS) {
            console.log(
                `[solve] configured=${meta.configuredBackend} active=${meta.activeBackend} cacheHit=${meta.cacheHit} fallback=${meta.fallbackUsed} ms=${meta.durationMs}`,
            );
        }

        const status = responsePayload.success ? 200 : 422;
        return res.status(status).json(responsePayload);
    } catch (err) {
        console.error("[solve] unhandled error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal engine failure",
            code: "INTERNAL_ERROR",
            category: "internal",
            solutions: [],
            formattedResult: { rows: [], count: 0, warnings: [] },
            warnings: [],
            meta: {},
        });
    }
});

app.listen(PORT, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const backend = getBackendInfo();
    console.log(`QuantSolve server running on port ${PORT}`);
    console.log(
        `Engine backend (configured): ${backend.backend} (${backend.note})`,
    );

    checkBackendAvailability()
        .then((s) => {
            if (s.ok) {
                console.log(`Engine backend (active): ${s.active}`);
            } else {
                console.warn(
                    `Engine backend fallback active: configured=${s.configured}, active=${s.active}`,
                );
                console.warn(`Reason: ${s.error}`);
            }
            console.log(`[cache] ${JSON.stringify(getCacheStats())}`);
        })
        .catch((e) => {
            console.warn(`Engine backend probe failed: ${e.message}`);
        });
});
