import { motion } from "framer-motion";

function Field({ label, value, onChange, placeholder, disabled = false }) {
    return (
        <label className="grid gap-1">
            <span className="text-[0.68rem] uppercase tracking-[0.08em] muted font-semibold">
                {label}
            </span>
            <input
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
                                <div className="text-xs muted">Variable constraint set</div>
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
                                label="Min"
                                value={c.min || ""}
                                onChange={(value) => update(v, { min: value })}
                                placeholder="0"
                                disabled={exactOn}
                            />
                            <Field
                                label="Max"
                                value={c.max || ""}
                                onChange={(value) => update(v, { max: value })}
                                placeholder="100"
                                disabled={exactOn}
                            />
                            <Field
                                label="Exact"
                                value={c.exact || ""}
                                onChange={(value) =>
                                    update(v, {
                                        exact: value,
                                        ...(value !== "" ? { even: false, odd: false } : {}),
                                    })
                                }
                                placeholder="3"
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
