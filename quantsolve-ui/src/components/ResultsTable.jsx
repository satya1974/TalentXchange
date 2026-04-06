import { motion } from "framer-motion";

export default function ResultsTable({ result }) {
    const rows = result?.formattedResult?.rows || [];
    const totalFound = result?.totalFound ?? 0;
    const page = result?.page ?? 1;
    const totalPages = result?.totalPages ?? 1;
    const warnings = result?.warnings || [];
    const variableOrder = result?.variableOrder || [];

    return (
        <div className="panel p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                    <h3 className="text-lg font-bold">Solutions</h3>
                    <p className="text-sm muted">
                        {totalFound.toLocaleString()} combinations • page {page}/{totalPages}
                    </p>
                </div>
                <motion.span
                    key={rows.length}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="pill"
                >
                    {rows.length} rows
                </motion.span>
            </div>

            {warnings.length > 0 && (
                <div className="mb-3 rounded-xl border border-amber-300/50 bg-amber-100/60 dark:bg-amber-600/20 dark:border-amber-500/30 p-3 text-sm">
                    {warnings[0]}
                </div>
            )}

            {rows.length === 0 ? (
                <div className="panel-soft p-6 text-center">
                    <div className="text-2xl mb-2">📭</div>
                    <div className="text-sm muted">No solutions on this page.</div>
                </div>
            ) : (
                <div className="table-wrap" style={{ maxHeight: "480px", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                {variableOrder.map((v) => (
                                    <th key={v}>{v}</th>
                                ))}
                                <th>Display</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <motion.tr
                                    key={`${row.index}-${idx}`}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.008, 0.3) }}
                                >
                                    <td className="muted text-sm">{row.index}</td>
                                    {variableOrder.map((v) => (
                                        <td key={v} className="font-semibold tabular-nums">
                                            {row.assignments?.[v] ?? "-"}
                                        </td>
                                    ))}
                                    <td className="muted text-sm">{row.display}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
