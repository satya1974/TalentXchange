// engine/resultFormatter.js
//
// Solutions are already paginated by the solver.
// This formatter adds display strings and passes pagination metadata through.

function formatResults(solutions, meta = {}) {
    const {
        totalFound = solutions.length,
        variableOrder = [],
        page = 1,
        pageSize = 50,
        totalPages = 1,
        hasMore = false,
    } = meta;

    const order =
        variableOrder.length > 0
            ? variableOrder
            : solutions.length > 0
              ? Object.keys(solutions[0]).sort()
              : [];

    const formattedRows = solutions.map((sol, idx) => {
        const parts = order
            .filter((k) => k in sol)
            .map((k) => `${k} = ${sol[k]}`);
        return {
            index: (page - 1) * pageSize + idx + 1, // global index, not page-local
            assignments: sol,
            display: parts.join(",  "),
        };
    });

    const warnings = [];
    if (hasMore) {
        warnings.push(
            `Showing page ${page} of ${totalPages} — ${totalFound} total combinations found. ` +
                `Use ?page=N to navigate or apply tighter constraints to reduce results.`,
        );
    }

    return {
        rows: formattedRows,
        count: solutions.length, // rows on this page
        totalFound, // true total across all pages
        page,
        pageSize,
        totalPages,
        hasMore,
        warnings,
    };
}

module.exports = formatResults;
