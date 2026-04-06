import { motion } from "framer-motion";
import FlowDiagram from "../components/FlowDiagram";

const notes = [
    {
        title: "1) Structural validation",
        text: "Input is validated early to fail fast on syntax and unsupported constructs.",
    },
    {
        title: "2) Semantic normalization",
        text: "AST terms are converted into integer coefficient maps and canonical target values.",
    },
    {
        title: "3) Constraint consolidation",
        text: "Variable constraints are merged and exact assignments reduce solving dimensions.",
    },
    {
        title: "4) Optimized exhaustive search",
        text: "Pruning layers keep traversal bounded while preserving full solution correctness.",
    },
];

export default function HowItWorks() {
    return (
        <div className="container-pro py-8 md:py-12 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl"
            >
                <span className="pill">Engine Design</span>
                <h1 className="section-title mt-2">Live execution trace of QuantSolve</h1>
                <p className="muted mt-1">
                    This animation simulates the same internal stage flow used by
                    the engine per solve request.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="panel p-5 md:p-6"
            >
                <FlowDiagram />
            </motion.div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-3">
                <div className="panel p-4 md:p-5">
                    <h3 className="font-bold text-lg">Runtime Guarantees</h3>
                    <p className="text-sm muted mt-1">
                        The engine preserves equation logic exactly while using pruning only for search-space reduction.
                    </p>
                    <div className="grid md:grid-cols-2 gap-2 mt-3">
                        <div className="panel-soft p-3">
                            <div className="text-xs muted uppercase tracking-[0.08em]">Correctness</div>
                            <div className="font-bold mt-1">No heuristic approximations</div>
                        </div>
                        <div className="panel-soft p-3">
                            <div className="text-xs muted uppercase tracking-[0.08em]">Stability</div>
                            <div className="font-bold mt-1">Graceful JS fallback path</div>
                        </div>
                        <div className="panel-soft p-3">
                            <div className="text-xs muted uppercase tracking-[0.08em]">Output</div>
                            <div className="font-bold mt-1">Pagination + metadata</div>
                        </div>
                        <div className="panel-soft p-3">
                            <div className="text-xs muted uppercase tracking-[0.08em]">Observability</div>
                            <div className="font-bold mt-1">Per-request diagnostics</div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3">
                    {notes.map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.04 }}
                            className="panel p-4"
                        >
                            <h3 className="font-bold">{item.title}</h3>
                            <p className="text-sm muted mt-1">{item.text}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

        </div>
    );
}
