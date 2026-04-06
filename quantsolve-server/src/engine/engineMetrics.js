class EngineMetrics {
    constructor(maxSamples = 2000) {
        this.maxSamples = Math.max(100, Number(maxSamples) || 2000);
        this.startedAt = Date.now();
        this.totalRequests = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.fallbacks = 0;
        this.byConfiguredBackend = {};
        this.byActiveBackend = {};
        this.durationSamples = [];
        this.lastRequest = null;
    }

    _incCounter(map, key) {
        map[key] = (map[key] || 0) + 1;
    }

    _pushDuration(value) {
        if (typeof value !== "number" || Number.isNaN(value)) return;
        this.durationSamples.push(value);
        if (this.durationSamples.length > this.maxSamples) {
            this.durationSamples.shift();
        }
    }

    record(meta = {}) {
        this.totalRequests += 1;

        const configuredBackend = meta.configuredBackend || "unknown";
        const activeBackend = meta.activeBackend || "unknown";

        if (meta.cacheHit) this.cacheHits += 1;
        else this.cacheMisses += 1;

        if (meta.fallbackUsed) this.fallbacks += 1;

        this._incCounter(this.byConfiguredBackend, configuredBackend);
        this._incCounter(this.byActiveBackend, activeBackend);
        this._pushDuration(meta.durationMs);

        this.lastRequest = {
            at: new Date().toISOString(),
            configuredBackend,
            activeBackend,
            cacheHit: Boolean(meta.cacheHit),
            fallbackUsed: Boolean(meta.fallbackUsed),
            durationMs: typeof meta.durationMs === "number" ? meta.durationMs : null,
        };
    }

    _durationStats() {
        if (!this.durationSamples.length) {
            return {
                count: 0,
                avgMs: null,
                minMs: null,
                p95Ms: null,
                maxMs: null,
            };
        }

        const sorted = [...this.durationSamples].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, n) => acc + n, 0);
        const p95Index = Math.min(
            sorted.length - 1,
            Math.floor(sorted.length * 0.95),
        );

        return {
            count: sorted.length,
            avgMs: Number((sum / sorted.length).toFixed(2)),
            minMs: Number(sorted[0].toFixed(2)),
            p95Ms: Number(sorted[p95Index].toFixed(2)),
            maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
        };
    }

    snapshot() {
        return {
            startedAt: new Date(this.startedAt).toISOString(),
            uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
            totalRequests: this.totalRequests,
            cache: {
                hits: this.cacheHits,
                misses: this.cacheMisses,
                hitRate:
                    this.totalRequests > 0
                        ? Number(((this.cacheHits / this.totalRequests) * 100).toFixed(2))
                        : 0,
            },
            fallbacks: this.fallbacks,
            byConfiguredBackend: this.byConfiguredBackend,
            byActiveBackend: this.byActiveBackend,
            durations: this._durationStats(),
            lastRequest: this.lastRequest,
        };
    }
}

module.exports = { EngineMetrics };

