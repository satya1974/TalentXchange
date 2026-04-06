function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const keys = Object.keys(value).sort();
    const entries = keys.map(
        (k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`,
    );
    return `{${entries.join(",")}}`;
}

class LruTtlCache {
    constructor(maxEntries = 200, ttlMs = 60_000) {
        this.maxEntries = Math.max(1, maxEntries);
        this.ttlMs = Math.max(1_000, ttlMs);
        this.store = new Map();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.expired = 0;
    }

    _isExpired(entry) {
        return Date.now() - entry.createdAt > this.ttlMs;
    }

    _touch(key, entry) {
        this.store.delete(key);
        this.store.set(key, entry);
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            this.misses += 1;
            return null;
        }

        if (this._isExpired(entry)) {
            this.store.delete(key);
            this.misses += 1;
            this.expired += 1;
            return null;
        }

        this._touch(key, entry);
        this.hits += 1;
        return entry.value;
    }

    set(key, value) {
        if (this.store.has(key)) {
            this.store.delete(key);
        }

        this.store.set(key, {
            value,
            createdAt: Date.now(),
        });

        while (this.store.size > this.maxEntries) {
            const oldest = this.store.keys().next().value;
            this.store.delete(oldest);
            this.evictions += 1;
        }
    }

    stats() {
        return {
            size: this.store.size,
            maxEntries: this.maxEntries,
            ttlMs: this.ttlMs,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            expired: this.expired,
        };
    }

    clear() {
        this.store.clear();
    }
}

module.exports = { LruTtlCache, stableStringify };
