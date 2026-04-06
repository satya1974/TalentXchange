import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { solveEquation } from "../api/solveApi";
import ConstraintBuilder from "../components/ConstraintBuilder";
import ResultsTable from "../components/ResultsTable";
import EngineMonitor from "../components/EngineMonitor";

function detectVariables(equation) {
    const vars = new Set();
    const regex = /[a-zA-Z][a-zA-Z0-9]*/g;
    let match;
    while ((match = regex.exec(equation)) !== null) {
        vars.add(match[0]);
    }
    return Array.from(vars);
}

const defaultConstraint = () => ({
    min: "", max: "", exact: "", even: false, odd: false,
});

function toNullableNumber(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

// Example equations for quick-fill
const examples = [
    { label: "Linear 2-var", eq: "10x + 20y = 100" },
    { label: "Linear 4-var", eq: "150a + 100b + 50c + 10d = 5000" },
    { label: "Quadratic", eq: "x^2 - 5*x + 6 = 0" },
    { label: "Cubic", eq: "x^3 - 6*x^2 + 11*x - 6 = 0" },
    { label: "Pythagorean", eq: "x^2 + y^2 = 25" },
];

export default function Solver() {
    const [equation, setEquation] = useState("10x + 20y = 100");
    const [constraints, setConstraints] = useState({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState("");
    const [clientDuration, setClientDuration] = useState(null);
    const startRef = useRef(null);

    const variables = useMemo(() => detectVariables(equation), [equation]);

    useEffect(() => {
        setConstraints((prev) => {
            const next = { ...prev };
            for (const v of variables) {
                if (!next[v]) next[v] = defaultConstraint();
            }
            for (const key of Object.keys(next)) {
                if (!variables.includes(key)) delete next[key];
            }
            return next;
        });
    }, [variables]);

    const payload = useMemo(() => {
        const normalized = {};
        for (const [key, value] of Object.entries(constraints)) {
            normalized[key] = {
                min: toNullableNumber(value.min),
                max: toNullableNumber(value.max),
                exact: toNullableNumber(value.exact),
                even: value.even,
                odd: value.odd,
            };
        }
        return { equation, constraints: normalized, page, pageSize };
    }, [equation, constraints, page, pageSize]);

    async function runSolve(nextPage = 1) {
        setLoading(true);
        setError("");
        startRef.current = performance.now();

        try {
            const data = await solveEquation({ ...payload, page: nextPage });
            const elapsed = performance.now() - startRef.current;
            setClientDuration(Number(elapsed.toFixed(2)));
            setResponse(data);
            setPage(data.page || nextPage);
        } catch (err) {
            setClientDuration(null);
            setResponse(null);
            setError(
                err?.response?.data?.error || err?.message || "Unable to solve the equation.",
            );
        } finally {
            setLoading(false);
        }
    }

    const meta = response?.meta || {};
    const serverDuration = meta.durationMs;
    const engineBackend = meta.activeBackend || meta.configuredBackend || "-";
    const isCpp = engineBackend === "cpp" || engineBackend === "cpp_cli";
    const solverType = meta.solverType || (response?.polynomial ? "polynomial" : "-");
    const blinkMs = 400;
    const speedMultiplier = serverDuration ? Math.round(blinkMs / serverDuration) : null;

    return (
        <div className="container-pro py-8 md:py-12">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                    <span className="pill">Solver Workspace</span>
                    <h1 className="section-title mt-2">
                        QuantSolve Engine
                    </h1>
                    <p className="muted mt-1 text-sm md:text-base">
                        Integer equation solver powered by a C++ native engine with constraint-aware pruned search.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
                {/* ── Left Panel: Input ── */}
                <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                    {/* Equation Input */}
                    <div className="panel p-4">
                        <label className="text-xs uppercase tracking-[0.08em] muted font-semibold">
                            Equation
                        </label>
                        <textarea
                            id="equation-input"
                            value={equation}
                            onChange={(e) => setEquation(e.target.value)}
                            className="field-area mt-2"
                            placeholder="10x + 20y = 100"
                            rows={3}
                        />

                        {/* Quick-fill examples */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {examples.map((ex) => (
                                <button
                                    key={ex.eq}
                                    type="button"
                                    className="text-[0.68rem] font-semibold px-2 py-1 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition cursor-pointer"
                                    onClick={() => {
                                        setEquation(ex.eq);
                                        setConstraints({});
                                        setResponse(null);
                                        setError("");
                                    }}
                                >
                                    {ex.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <label className="text-xs muted">
                                Page size
                                <select
                                    className="field-select mt-1"
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                >
                                    {[25, 50, 100, 200].map((v) => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="panel-soft p-2 flex items-center justify-center">
                                <div>
                                    <div className="text-xs muted text-center">Variables</div>
                                    <div className="text-xl font-bold text-center">{variables.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Solve Button */}
                        <button
                            id="solve-button"
                            className="btn-solve w-full mt-3"
                            onClick={() => runSolve(1)}
                            disabled={loading || !equation.trim()}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Solving...
                                </span>
                            ) : (
                                "⚡ Solve Equation"
                            )}
                        </button>

                        <button
                            className="btn btn-ghost w-full mt-2 text-sm"
                            onClick={() => {
                                setEquation("10x + 20y = 100");
                                setConstraints({});
                                setPage(1);
                                setResponse(null);
                                setError("");
                                setClientDuration(null);
                            }}
                        >
                            Reset
                        </button>
                    </div>

                    {/* Constraints */}
                    <div className="panel p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-bold">Constraints</h2>
                            <span className="text-xs muted">{variables.length} vars</span>
                        </div>
                        <ConstraintBuilder
                            variables={variables}
                            constraints={constraints}
                            setConstraints={setConstraints}
                        />
                    </div>
                </div>

                {/* ── Right Panel: Results ── */}
                <div className="space-y-4">
                    {/* Speed Hero Banner — THE WOW MOMENT */}
                    <AnimatePresence mode="wait">
                        {response?.success && serverDuration != null && (
                            <motion.div
                                key="speed-hero"
                                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className="speed-hero"
                            >
                                <div className="speed-hero-glow" />
                                <div className="relative z-10">
                                    <div className="flex flex-wrap items-end justify-between gap-4">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.12em] muted font-semibold mb-1">
                                                Engine Solve Time
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <motion.span
                                                    key={serverDuration}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="speed-value"
                                                >
                                                    {serverDuration < 1 ? serverDuration.toFixed(2) : serverDuration < 10 ? serverDuration.toFixed(1) : Math.round(serverDuration)}
                                                </motion.span>
                                                <span className="speed-unit">ms</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-right">
                                            <div>
                                                <div className="text-xs muted">Solutions</div>
                                                <div className="text-2xl font-bold">
                                                    {(response.totalFound ?? 0).toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs muted">Round-trip</div>
                                                <div className="text-2xl font-bold muted">
                                                    {clientDuration != null ? `${clientDuration}ms` : "-"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Speed comparison bar */}
                                    <div className="mt-4">
                                        <div className="speed-bar-track">
                                            <motion.div
                                                className="speed-bar-fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, Math.max(2, (serverDuration / blinkMs) * 100))}%` }}
                                                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[0.68rem] muted mt-1">
                                            <span>Engine: {serverDuration.toFixed(1)}ms</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Engine & Metadata Row */}
                    {response?.success && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap items-center gap-2"
                        >
                            <span className={`engine-badge ${isCpp ? "engine-badge-cpp" : "engine-badge-js"}`}>
                                {isCpp ? "C++ Engine" : "JS Engine"}
                            </span>
                            <span className="pill">{solverType}</span>
                            {meta.cacheHit && <span className="pill">⚡ Cache Hit</span>}
                            {meta.fallbackUsed && (
                                <span className="text-xs muted px-2 py-1 rounded-lg border border-[var(--border)]">
                                    Fallback used
                                </span>
                            )}
                            {response.polynomial && (
                                <span className="text-xs muted px-2 py-1 rounded-lg border border-[var(--border)]">
                                    Degree {response.polynomial.degree} • {response.polynomial.mode?.replace("_", " ")}
                                </span>
                            )}
                        </motion.div>
                    )}

                    {/* Metrics Grid — Compact */}
                    {response?.success && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="metric-grid"
                        >
                            {[
                                ["Total Solutions", (response.totalFound ?? 0).toLocaleString()],
                                ["Variables", meta.variableCount ?? variables.length],
                                ["AST Depth", meta.astDepth ?? "-"],
                                ["Poly Degree", meta.polynomialDegree ?? "-"],
                                ["Page", `${response.page}/${response.totalPages}`],
                                ["Active Engine", engineBackend.toUpperCase()],
                            ].map(([label, value]) => (
                                <div key={label} className="metric-card">
                                    <div className="text-xs muted">{label}</div>
                                    <div className="text-lg font-bold mt-1">{value}</div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Engine Monitor */}
                    <EngineMonitor />

                    {/* Error Display */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="error-card"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">⚠️</span>
                                    <div className="text-sm font-bold text-[var(--danger)]">Solver Error</div>
                                </div>
                                <div className="text-sm mt-1.5">{error}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Results */}
                    {response?.success ? (
                        <ResultsTable result={response} />
                    ) : loading ? (
                        <div className="panel p-4 space-y-3">
                            <div className="skeleton h-12 w-full" />
                            <div className="skeleton h-8 w-3/4" />
                            <div className="skeleton h-8 w-1/2" />
                        </div>
                    ) : !error ? (
                        <div className="panel p-6 text-center">
                            <div className="text-4xl mb-3">📐</div>
                            <div className="font-bold text-lg">Ready to Solve</div>
                            <div className="text-sm muted mt-1">
                                Enter an equation and click <span className="font-semibold text-[var(--accent)]">Solve</span> to compute all integer solutions.
                            </div>
                        </div>
                    ) : null}

                    {/* Pagination */}
                    {response?.success && response.totalPages > 1 && (
                        <div className="panel p-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm muted">
                                Page {response.page} of {response.totalPages} •{" "}
                                {(response.totalFound ?? 0).toLocaleString()} solutions total
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => runSolve(Math.max(1, page - 1))}
                                    disabled={page <= 1 || loading}
                                >
                                    ← Prev
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => runSolve(Math.min(response.totalPages || 1, page + 1))}
                                    disabled={!response.hasMore || loading}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Equation Details (replacing raw JSON) */}
                    {response?.success && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="panel p-4"
                        >
                            <div className="text-xs uppercase tracking-[0.08em] muted font-semibold mb-2">
                                Parsed Equation
                            </div>
                            <div className="eq-display">
                                {response.input || equation}
                            </div>
                            {response.coeffs && Object.keys(response.coeffs).length > 0 && (
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries(response.coeffs).map(([v, c]) => (
                                        <div key={v} className="panel-soft p-2">
                                            <span className="text-xs muted">Coefficient of </span>
                                            <span className="font-bold text-[var(--accent)]">{v}</span>
                                            <span className="muted"> = </span>
                                            <span className="font-bold">{c}</span>
                                        </div>
                                    ))}
                                    <div className="panel-soft p-2">
                                        <span className="text-xs muted">Target = </span>
                                        <span className="font-bold">{response.target}</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
