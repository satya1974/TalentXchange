import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const stages = [
    {
        key: "input",
        tag: "Request",
        title: "Input",
        subtitle: "Equation + constraints",
        detail:
            "Receives user equation text, optional variable constraints, and pagination options.",
        emits: "Validated request payload",
    },
    {
        key: "lexer",
        tag: "Compiler",
        title: "Lexer",
        subtitle: "Tokenization",
        detail:
            "Normalizes unicode operators and converts raw text into validated token stream.",
        emits: "Typed token stream",
    },
    {
        key: "parser",
        tag: "Compiler",
        title: "Parser",
        subtitle: "AST build",
        detail:
            "Builds expression tree with precedence handling and denominator safety validation.",
        emits: "Verified AST",
    },
    {
        key: "normalizer",
        tag: "Math Core",
        title: "Normalizer",
        subtitle: "Linear reduction",
        detail:
            "Extracts coefficients, combines like terms, and computes canonical integer target.",
        emits: "Coefficient map + target",
    },
    {
        key: "constraints",
        tag: "Math Core",
        title: "Constraints",
        subtitle: "Range + parity",
        detail:
            "Applies min/max/exact/parity controls and simplifies variables with fixed values.",
        emits: "Reduced search space",
    },
    {
        key: "solver",
        tag: "Search",
        title: "Solver",
        subtitle: "Pruned traversal",
        detail:
            "Uses GCD rejection, suffix bounds, and parity stepping for efficient exhaustive search.",
        emits: "Deterministic assignments",
    },
    {
        key: "formatter",
        tag: "Response",
        title: "Formatter",
        subtitle: "Result shaping",
        detail:
            "Paginates rows, attaches metadata, and emits frontend-ready response payload.",
        emits: "Paginated response",
    },
];

export default function FlowDiagram() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setActive((prev) => (prev + 1) % stages.length);
        }, 2200);
        return () => clearInterval(id);
    }, []);

    const activeStage = useMemo(() => stages[active], [active]);

    return (
        <div className="space-y-5">
            <div className="panel-soft p-4 md:p-5">
                <div className="relative px-1">
                    <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--border)_66%,transparent)]" />
                    <motion.div
                        className="absolute top-0 h-1.5 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]"
                        initial={false}
                        animate={{
                            width: `${((active + 1) / stages.length) * 100}%`,
                        }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    <motion.div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-white/50 bg-[var(--accent)] shadow-[0_0_18px_rgba(14,165,233,0.65)]"
                        initial={false}
                        animate={{
                            left: `calc(${(active / (stages.length - 1)) * 100}% - 7px)`,
                        }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {stages.map((stage, index) => {
                        const isActive = index === active;
                        return (
                            <motion.button
                                key={stage.key}
                                type="button"
                                onClick={() => setActive(index)}
                                className={`text-left rounded-xl border p-3 transition ${
                                    isActive
                                        ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface))]"
                                        : "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-soft)_92%,transparent)]"
                                }`}
                                whileHover={{ y: -2 }}
                            >
                                <div className="text-[0.68rem] uppercase tracking-[0.08em] muted font-semibold">
                                    Step {index + 1}
                                </div>
                                <div className="font-bold mt-1">{stage.title}</div>
                                <div className="text-xs muted">{stage.subtitle}</div>
                                <div className="text-[0.68rem] uppercase tracking-[0.08em] mt-2 text-[var(--accent)] font-semibold">
                                    {stage.tag}
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="activePulse"
                                        className="mt-2 h-1.5 w-10 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]"
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <div className="panel-soft p-4 min-h-[140px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeStage.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="pill">Active Stage</div>
                        <h4 className="mt-2 text-lg font-bold">{activeStage.title}</h4>
                        <p className="text-sm muted mt-1">{activeStage.detail}</p>
                        <div className="mt-3 text-xs uppercase tracking-[0.08em] text-[var(--accent)] font-semibold">
                            Output: {activeStage.emits}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
