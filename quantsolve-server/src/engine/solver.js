// engine/solver.js

const checkConstraint = require("./constraintEngine");

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function gcdArray(arr) {
    return arr.reduce((a, b) => gcd(a, b));
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
