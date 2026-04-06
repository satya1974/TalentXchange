import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchEngineMetrics } from "../api/solveApi";

export default function EngineMonitor() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [snapshot, setSnapshot] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await fetchEngineMetrics();
                if (!cancelled) {
                    setSnapshot(data);
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err?.response?.data?.error ||
                            err?.message ||
                            "Unable to load engine metrics",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        const id = setInterval(load, 10000);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    const metrics = snapshot?.metrics || {};
    const engine = snapshot?.engine || {};
    const cache = snapshot?.cache || {};
    const durations = metrics.durations || {};

    if (error) {
        return (
            <div className="panel-soft p-3 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                <span className="muted">Engine Monitor</span>
                <span className="text-xs text-[var(--danger)]">{error}</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-soft p-3"
        >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {/* Status */}
                <div className="flex items-center gap-2">
                    <div className={loading ? "w-2 h-2 rounded-full bg-[var(--text-muted)] animate-pulse" : "status-dot"} />
                    <span className="text-xs font-bold uppercase tracking-[0.08em] muted">
                        {loading ? "Connecting..." : "Live"}
                    </span>
                </div>

                {/* Backend */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs muted">Backend:</span>
                    <span className={`engine-badge ${engine.backend === "cpp" || engine.backend === "cpp_cli" ? "engine-badge-cpp" : "engine-badge-js"}`}>
                        {engine.backend || "-"}
                    </span>
                </div>

                {/* P95 Latency */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs muted">P95:</span>
                    <span className="text-xs font-bold">
                        {durations.p95Ms != null ? `${durations.p95Ms}ms` : "-"}
                    </span>
                </div>

                {/* Avg Latency */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs muted">Avg:</span>
                    <span className="text-xs font-bold">
                        {durations.avgMs != null ? `${durations.avgMs}ms` : "-"}
                    </span>
                </div>

                {/* Cache */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs muted">Cache:</span>
                    <span className="text-xs font-bold">
                        {metrics.cache?.hitRate ?? 0}% hit
                    </span>
                    <span className="text-xs muted">
                        ({cache.size ?? 0}/{cache.maxEntries ?? "-"})
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
