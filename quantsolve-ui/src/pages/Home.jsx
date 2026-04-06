import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import FlowDiagram from "../components/FlowDiagram";

const capabilities = [
    {
        title: "Deterministic Engine Pipeline",
        text: "Each equation follows lexing, parsing, normalization, constraints, and pruned solving stages.",
    },
    {
        title: "High-scale Search Handling",
        text: "Multiple pruning layers reduce exploration cost while preserving exact integer correctness.",
    },
    {
        title: "Operator-friendly Output",
        text: "Structured response payloads with pagination, metadata, diagnostics, and warnings.",
    },
];

const opsSignals = [
    "Deterministic integer-only solver",
    "Hybrid runtime: JS + C++ acceleration paths",
    "Built-in backend fallback safety",
    "Request-level diagnostics and metadata",
];

export default function Home() {
    return (
        <div className="container-pro py-8 md:py-12 space-y-8">
            <section className="panel p-5 md:p-7 relative overflow-hidden">
                <div className="hero-glow hero-glow-a" />
                <div className="hero-glow hero-glow-b" />
                <div className="relative z-10 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {opsSignals.map((line, i) => (
                        <motion.div
                            key={line}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-soft)_85%,transparent)] px-3 py-2 text-sm"
                        >
                            {line}
                        </motion.div>
                    ))}
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4"
                >
                    <span className="pill">Production Solver Platform</span>
                    <h1 className="section-title">
                        Professional integer equation solving for real workloads.
                    </h1>
                    <p className="text-base md:text-lg muted max-w-2xl">
                        QuantSolve combines compiler-style parsing with a
                        constraint-aware integer search engine to return
                        auditable, paginated solution sets with clear diagnostics.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link className="btn btn-primary" to="/solver">
                            Open Solver
                        </Link>
                        <Link className="btn btn-ghost" to="/how-it-works">
                            View Pipeline
                        </Link>
                    </div>

                    <div className="metric-grid pt-1">
                        <div className="metric-card">
                            <div className="text-xs muted">Mode</div>
                            <div className="font-bold">Constraint Search</div>
                        </div>
                        <div className="metric-card">
                            <div className="text-xs muted">Output</div>
                            <div className="font-bold">Paginated Rows</div>
                        </div>
                        <div className="metric-card">
                            <div className="text-xs muted">Engine</div>
                            <div className="font-bold">Node + C++</div>
                        </div>
                        <div className="metric-card">
                            <div className="text-xs muted">Observability</div>
                            <div className="font-bold">Meta + Warnings</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="panel p-5 relative overflow-hidden"
                >
                    <div className="hero-glow hero-glow-c" />
                    <div className="text-xs uppercase tracking-[0.12em] muted font-semibold">
                        Engine Architecture
                    </div>
                    <h2 className="text-xl font-bold mt-1">Equation-to-solution execution flow</h2>
                    <div className="mt-4">
                        <FlowDiagram />
                    </div>
                </motion.div>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                {capabilities.map((item) => (
                    <div key={item.title} className="panel p-4">
                        <h3 className="font-bold">{item.title}</h3>
                        <p className="text-sm muted mt-1">{item.text}</p>
                    </div>
                ))}
            </section>
        </div>
    );
}
