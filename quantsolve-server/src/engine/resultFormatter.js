// engine/resultFormatter.js

function formatResults(results) {
    return results.map((r) => {
        return Object.entries(r)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
    });
}

module.exports = formatResults;
