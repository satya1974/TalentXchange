// engine/solver.js

const checkConstraint = require("./constraintEngine");

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function gcdArray(arr) {
    return arr.reduce((a, b) => gcd(a, b));
}

function getMinMax(variable, remaining, coeff, constraints) {
    let min = 0;
    let max = Math.floor(remaining / coeff);

    if (constraints[variable]) {
        if (constraints[variable].min !== undefined) {
            min = constraints[variable].min;
        }

        if (constraints[variable].max !== undefined) {
            max = Math.min(max, constraints[variable].max);
        }
    }

    return { min, max };
}

function solve(coeffs, target, constraints) {
    const variables = Object.keys(coeffs);

    const coeffValues = Object.values(coeffs);
    const g = gcdArray(coeffValues);

    if (target % g !== 0) {
        return [];
    }

    variables.sort((a, b) => coeffs[b] - coeffs[a]);

    const results = [];

    function backtrack(index, remaining, solution) {
        if (index === variables.length - 1) {
            const v = variables[index];
            const coeff = coeffs[v];

            if (remaining % coeff === 0) {
                const val = remaining / coeff;

                if (
                    val >= 0 &&
                    Number.isInteger(val) &&
                    checkConstraint(v, val, constraints)
                ) {
                    solution[v] = val;
                    results.push({ ...solution });
                }
            }
            return;
        }

        const v = variables[index];
        const coeff = coeffs[v];

        const { min, max } = getMinMax(v, remaining, coeff, constraints);

        for (let i = min; i <= max; i++) {
            if (!checkConstraint(v, i, constraints)) continue;
            solution[v] = i;
            backtrack(index + 1, remaining - coeff * i, solution);
        }
    }

    backtrack(0, target, {});
    return results;
}

module.exports = solve;
