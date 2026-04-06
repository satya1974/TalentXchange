import { motion } from "framer-motion";

// Detect the max exponent for a variable from the equation string (lightweight heuristic).
// Returns the highest power seen: e.g. "x^2 + y^2 = 25" → x:2, y:2
function detectMaxExponent(equation, varName) {
    const re = new RegExp(
        `(?:^|[^a-zA-Z0-9])${varName}\\s*\\^\\s*(\\d+)`,
        "g"
    );
    let max = 0;
    let m;
    while ((m = re.exec(equation)) !== null) {
        const exp = parseInt(m[1], 10);
        if (exp > max) max = exp;
    }
    // If variable appears without exponent, it's at least degree 1
    const plain = new RegExp(`(?:^|[^a-zA-Z0-9])${varName}(?![a-zA-Z0-9^])`, "g");
    if (max === 0 && plain.test(equation)) max = 1;
    return max;
}

// Based on parity of max exponent, return the smart default domain label.
function smartDomainHint(equation, varName) {
    const exp = detectMaxExponent(equation, varName);
    if (exp >= 2 && exp % 2 === 0) {
        return { lo: "−100", hi: "100", note: "Symmetric (even degree)" };
    }
    return { lo: "0", hi: "100", note: "Non-negative (linear/odd)" };
}

function Field({ label, value, onChange, placeholder, disabled = false, type = "text" }) {
    return (
        <label className="grid gap-1">
            <span className="text-[0.68rem] uppercase tracking-[0.08em] muted font-semibold">
                {label}
            </span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="field text-sm"
            />
        </label>
    );
}

export default function ConstraintBuilder({
    variables,
    constraints,
    setConstraints,
    equation = "",
}) {
    const update = (name, patch) => {
        setConstraints((prev) => ({
            ...prev,
            [name]: {
                ...(prev[name] || {}),
                ...patch,
            },
        }));
    };

    if (!variables.length) {
        return <div className="text-sm muted">Enter equation to detect variables.</div>;
    }

    return (
        <div className="grid gap-3">
            {variables.map((v, i) => {
                const c = constraints[v] || {};
                const exactOn = c.exact !== "" && c.exact !== undefined;
                const hint = smartDomainHint(equation, v);
                return (
                    <motion.div
                        key={v}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="panel-soft p-3"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <div className="font-semibold">{v}</div>
                                <div className="text-xs muted">
                                    Auto domain:{" "}
                                    <span className="text-accent font-mono">
                                        [{hint.lo}, {hint.hi}]
                                    </span>{" "}
                                    — {hint.note}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost !py-1 !px-2 !text-xs"
                                onClick={() =>
                                    update(v, {
                                        min: "",
                                        max: "",
                                        exact: "",
                                        even: false,
                                        odd: false,
                                    })
                                }
                            >
                                Reset
                            </button>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                            <Field
                                label={`Min (lo) — default ${hint.lo}`}
                                type="number"
                                value={c.min ?? ""}
                                onChange={(value) => update(v, { min: value })}
                                placeholder={hint.lo}
                                disabled={exactOn}
                            />
                            <Field
                                label={`Max (hi) — default ${hint.hi}`}
                                type="number"
                                value={c.max ?? ""}
                                onChange={(value) => update(v, { max: value })}
                                placeholder={hint.hi}
                                disabled={exactOn}
                            />
                            <Field
                                label="Exact"
                                type="number"
                                value={c.exact ?? ""}
                                onChange={(value) =>
                                    update(v, {
                                        exact: value,
                                        ...(value !== "" ? { even: false, odd: false } : {}),
                                    })
                                }
                                placeholder="e.g. 3"
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[0.68rem] uppercase tracking-[0.08em] muted font-semibold">
                                Parity
                            </span>
                            <button
                                type="button"
                                className={`btn !py-1 !px-2 !text-xs ${c.even ? "btn-primary" : "btn-ghost"}`}
                                disabled={exactOn}
                                onClick={() =>
                                    update(v, {
                                        even: !c.even,
                                        odd: c.even ? c.odd : false,
                                    })
                                }
                            >
                                Even
                            </button>
                            <button
                                type="button"
                                className={`btn !py-1 !px-2 !text-xs ${c.odd ? "btn-primary" : "btn-ghost"}`}
                                disabled={exactOn}
                                onClick={() =>
                                    update(v, {
                                        odd: !c.odd,
                                        even: c.odd ? c.even : false,
                                    })
                                }
                            >
                                Odd
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
