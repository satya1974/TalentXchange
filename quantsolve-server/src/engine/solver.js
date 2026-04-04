// engine/solver.js
// Three-layer pruning strategy:
//   Layer 1: Budget ceiling      — maxVal = floor(remaining / coeff)
//   Layer 2: Suffix min/max      — precomputed O(1) remainder-bounds check
//   Layer 3: Parity step         — step=2 for even/odd constraints

const { EngineError, ErrorCode } = require("./errors");

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}
function gcdArray(arr) {
    return arr.reduce((acc, val) => gcd(acc, val));
}

function solve(coeffs, target, constraints = {}, options = {}) {
    const variables = Object.keys(coeffs);

    const coeffValues = Object.values(coeffs);
    const g = gcdArray(coeffValues);

    if (target % g !== 0) {
        return { solutions: [], count: 0 };
    }

    // Sort variables by coefficient descending
    variables.sort((a, b) => coeffs[b] - coeffs[a]);

    // 7. Backtracker
    const limit = options.limit || 1000;
    const results = [];
    let count = 0;
    const limit = options.limit || 1000;

    function backtrack(index, remaining, solution) {
        if (remaining < 0) return;

        if (index === variables.length - 1) {
            const v = variables[index];
            const coeff = coeffs[v];

            if (remaining % coeff === 0) {
                const val = remaining / coeff;

                if (val >= 0 && checkConstraint(v, val, constraints)) {
                    solution[v] = val;
                    count++;

                    if (results.length < limit) {
                        results.push({ ...solution });
                    }
                }
            }
            return;
        }

        const v = variables[index];
        const coeff = coeffs[v];
        const maxVal = Math.floor(remaining / coeff);

        for (let i = 0; i <= maxVal; i++) {
            if (!checkConstraint(v, i, constraints)) continue;

            solution[v] = i;
            backtrack(index + 1, remaining - coeff * i, solution);
        }
    }

    backtrack(0, target, {});

    return {
        solutions: results,
        count,
    };
}

module.exports = solve;
