const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");

const jsEngine = require("./engineRunner");
const { LruTtlCache, stableStringify } = require("./engineCache");

let nativeAddon = null;

const cache = new LruTtlCache(
    Number(process.env.ENGINE_CACHE_MAX || 300),
    Number(process.env.ENGINE_CACHE_TTL_MS || 120000),
);
const allowCppCli = (process.env.ENGINE_ALLOW_CPP_CLI || "false").toLowerCase() === "true";

function getConfiguredBackend() {
    const raw = (process.env.ENGINE_BACKEND || "js").toLowerCase();
    if (raw === "cpp_cli" && !allowCppCli) {
        return "cpp";
    }
    return ["js", "cpp", "cpp_cli"].includes(raw) ? raw : "js";
}

function getBackendInfo() {
    const raw = (process.env.ENGINE_BACKEND || "js").toLowerCase();
    const backend = getConfiguredBackend();

    if (backend === "cpp") {
        if (raw === "cpp_cli" && !allowCppCli) {
            return {
                backend,
                note: "CLI backend disabled (ENGINE_ALLOW_CPP_CLI=false). Using Node native addon (N-API) with JS fallback.",
            };
        }
        return {
            backend,
            note: "Node native addon (N-API); falls back to JS if addon load fails",
        };
    }

    if (backend === "cpp_cli") {
        return {
            backend,
            note: "C++ CLI process bridge; falls back to JS if CLI fails",
        };
    }

    return {
        backend: "js",
        note: "Pure JavaScript engine",
    };
}

function getCacheStats() {
    return cache.stats();
}

function makeCacheKey(backend, input, constraints, options) {
    return `${backend}|${stableStringify({
        input,
        constraints: constraints || {},
        options: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 50,
        },
    })}`;
}

function clone(value) {
    return structuredClone(value);
}

function isPolynomialInput(input) {
    if (typeof input !== "string") return false;
    const src = input.toLowerCase();
    return (
        /[\^²³]/.test(src) ||
        /[a-z][a-z0-9]*\s*\*\s*[a-z][a-z0-9]*/.test(src) ||
        /\)\s*\(/.test(src) ||
        /\)\s*[a-z]/.test(src) ||
        /[a-z]\s*\(/.test(src)
    );
}

function loadNativeAddon() {
    if (nativeAddon) return nativeAddon;

    const addonPath = path.join(
        __dirname,
        "..",
        "..",
        "build",
        "Release",
        "quantsolve_engine.node",
    );

    // eslint-disable-next-line global-require, import/no-dynamic-require
    nativeAddon = require(addonPath);
    return nativeAddon;
}

function buildCliEnv() {
    const env = { ...process.env };
    const pathKey = process.platform === "win32" ? "Path" : "PATH";
    const currentPath = env[pathKey] || env.PATH || "";

    const extraBins = ["C:\\msys64\\ucrt64\\bin"].filter((p) =>
        fs.existsSync(p),
    );

    if (extraBins.length > 0) {
        env[pathKey] = `${extraBins.join(";")};${currentPath}`;
    }

    return env;
}

function runCppCli(input, constraints = {}, options = {}) {
    return new Promise((resolve, reject) => {
        const exePath = path.join(
            __dirname,
            "..",
            "engine-cpp",
            "build",
            "quant_engine_cli.exe",
        );

        if (!fs.existsSync(exePath)) {
            reject(new Error(`C++ CLI executable not found: ${exePath}`));
            return;
        }

        const args = [
            "--equation",
            `${input ?? ""}`,
            "--page",
            `${options.page || 1}`,
            "--pageSize",
            `${options.pageSize || 50}`,
        ];

        for (const [varName, c] of Object.entries(constraints || {})) {
            args.push(
                "--constraint",
                varName,
                c?.min !== undefined && c?.min !== null && c?.min !== ""
                    ? `${parseInt(c.min, 10)}`
                    : "-",
                c?.max !== undefined && c?.max !== null && c?.max !== ""
                    ? `${parseInt(c.max, 10)}`
                    : "-",
                c?.exact !== undefined && c?.exact !== null && c?.exact !== ""
                    ? `${parseInt(c.exact, 10)}`
                    : "-",
                c?.even === true || c?.even === "true" ? "1" : "0",
                c?.odd === true || c?.odd === "true" ? "1" : "0",
                "_",
            );
        }

        const child = spawn(exePath, args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: buildCliEnv(),
        });

        let stdout = "";
        let stderr = "";

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error("C++ CLI timeout"));
        }, 8000);

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            if (!stdout.trim()) {
                reject(
                    new Error(
                        `C++ CLI empty output (exit=${code}). stderr: ${stderr.trim()}`,
                    ),
                );
                return;
            }
            try {
                const parsed = JSON.parse(stdout);
                resolve(parsed);
            } catch (e) {
                reject(
                    new Error(
                        `C++ CLI invalid JSON (exit=${code}): ${e.message}; stdout: ${stdout.slice(0, 300)}; stderr: ${stderr.trim()}`,
                    ),
                );
            }
        });
    });
}

async function executeBackend(configuredBackend, input, constraints, options) {
    if (configuredBackend === "js") {
        return { result: await jsEngine.runEngine(input, constraints, options), activeBackend: "js", fallbackUsed: false };
    }

    if (configuredBackend === "cpp") {
        try {
            const addon = loadNativeAddon();
            const cppResult = addon.runEngine(input, constraints, options);

            // If the C++ engine returned an error, fall back to JS
            if (
                cppResult &&
                cppResult.success === false &&
                ["INTERNAL_ERROR"].includes(cppResult.code)
            ) {
                console.warn(
                    "[engine-adapter] C++ addon error, falling back to JS:",
                    cppResult.code,
                );
                return {
                    result: await jsEngine.runEngine(input, constraints, options),
                    activeBackend: "js",
                    fallbackUsed: true,
                };
            }

            return { result: cppResult, activeBackend: "cpp", fallbackUsed: false };
        } catch (err) {
            console.error(
                "[engine-adapter] C++ addon backend failed, falling back to JS:",
                err.message,
            );
            return { result: await jsEngine.runEngine(input, constraints, options), activeBackend: "js", fallbackUsed: true };
        }
    }

    if (configuredBackend === "cpp_cli") {
        try {
            return { result: await runCppCli(input, constraints, options), activeBackend: "cpp_cli", fallbackUsed: false };
        } catch (err) {
            console.error(
                "[engine-adapter] C++ CLI backend failed, falling back to JS:",
                err.message,
            );
            return { result: await jsEngine.runEngine(input, constraints, options), activeBackend: "js", fallbackUsed: true };
        }
    }

    return { result: await jsEngine.runEngine(input, constraints, options), activeBackend: "js", fallbackUsed: true };
}

async function runEngineWithMeta(input, constraints = {}, options = {}, metaOptions = {}) {
    const configuredBackend = getConfiguredBackend();
    const started = performance.now();
    const useCache = metaOptions.disableCache !== true;
    const cacheKey = makeCacheKey(configuredBackend, input, constraints, options);

    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
            const cachedResult =
                cached && typeof cached === "object" && "result" in cached
                    ? cached.result
                    : cached;
            const cachedActiveBackend =
                cached && typeof cached === "object" && cached.activeBackend
                    ? cached.activeBackend
                    : configuredBackend;
            const cachedFallbackUsed =
                cached && typeof cached === "object" && typeof cached.fallbackUsed === "boolean"
                    ? cached.fallbackUsed
                    : false;

        return {
            result: clone(cachedResult),
            meta: {
                configuredBackend,
                activeBackend: cachedActiveBackend,
                cacheHit: true,
                fallbackUsed: cachedFallbackUsed,
                durationMs: Number((performance.now() - started).toFixed(2)),
            },
        };
    }
    }

    const { result, activeBackend, fallbackUsed } = await executeBackend(
        configuredBackend,
        input,
        constraints,
        options,
    );

    if (useCache) {
        cache.set(
            cacheKey,
            clone({
                result,
                activeBackend,
                fallbackUsed,
            }),
        );
    }

    return {
        result,
        meta: {
            configuredBackend,
            activeBackend,
            cacheHit: false,
            fallbackUsed,
            durationMs: Number((performance.now() - started).toFixed(2)),
        },
    };
}

async function runEngine(input, constraints = {}, options = {}) {
    const { result } = await runEngineWithMeta(input, constraints, options);
    return result;
}

async function checkBackendAvailability() {
    const configured = getConfiguredBackend();

    if (configured === "js") {
        return { configured, active: "js", ok: true, error: null };
    }

    if (configured === "cpp") {
        try {
            loadNativeAddon();
            return { configured, active: "cpp", ok: true, error: null };
        } catch (err) {
            return {
                configured,
                active: "js",
                ok: false,
                error: `C++ addon unavailable: ${err.message}`,
            };
        }
    }

    if (configured === "cpp_cli") {
        try {
            const probe = await runCppCli("50x=200", {}, { page: 1, pageSize: 1 });
            if (probe && probe.success) {
                return { configured, active: "cpp_cli", ok: true, error: null };
            }
            return {
                configured,
                active: "js",
                ok: false,
                error: "C++ CLI probe returned non-success payload",
            };
        } catch (err) {
            return {
                configured,
                active: "js",
                ok: false,
                error: `C++ CLI unavailable: ${err.message}`,
            };
        }
    }

    return {
        configured,
        active: "js",
        ok: false,
        error: "Unknown backend configuration",
    };
}

module.exports = {
    runEngine,
    runEngineWithMeta,
    getBackendInfo,
    checkBackendAvailability,
    getCacheStats,
};

