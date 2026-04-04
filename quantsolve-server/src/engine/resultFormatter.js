// engine/resultFormatter.js

/**
 * Format raw solutions into the structure the frontend consumes.
 *
 * @param {Object[]} solutions  - array of { varName: value } objects
 * @param {Object}   meta       - { count, totalFound, capped, variableOrder }
 * @returns {Object}
 */
function formatResults(solutions, meta = {}) {
    const {
        totalFound = solutions.length,
        capped = false,
        variableOrder = [],
    } = meta;

    // Determine display order — prefer original equation order if provided
    const order =
        variableOrder.length > 0
            ? variableOrder
            : solutions.length > 0
              ? Object.keys(solutions[0]).sort()
              : [];

    // Formatted rows: each solution as a sorted key=value string
    const formattedRows = solutions.map((sol, idx) => {
        const parts = order
            .filter((k) => k in sol)
            .map((k) => `${k} = ${sol[k]}`);
        return {
            index: idx + 1,
            assignments: sol,
            display: parts.join(",  "),
        };
    });

    // Build warning messages
    const warnings = [];
    if (capped) {
        warnings.push(
            `Showing first ${solutions.length} of ${totalFound} — apply tighter constraints to see all results.`,
        );
    }

    return {
        rows: formattedRows,
        count: solutions.length,
        totalFound,
        capped,
        warnings,
        // Pagination metadata — frontend can use this to slice rows
        pagination: {
            totalRows: solutions.length,
            pageSize: 25,
            totalPages: Math.ceil(solutions.length / 25),
        },
    };
}

module.exports = formatResults;
