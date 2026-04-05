// engine/constraintEngine.js

const { EngineError, ErrorCode } = require("./errors");

/**
 * Build and validate the final constraint set for all variables.
 *
 * @param {Object} coeffs   - { varName: coefficient }
 * @param {number} target   - the RHS constant C
 * @param {Object} userConstraints - raw user input from the API
 * @returns {Object} - normalised constraint map keyed by variable name
 *
 * Each entry: { lo, hi, parity, exact, step, start }
 *   lo     : effective lower bound (integer)
 *   hi     : effective upper bound (integer)
 *   parity : "any" | "even" | "odd"
 *   exact  : number | null
 */
function buildConstraints(coeffs, target, userConstraints = {}) {
    const result = {};

    for (const [varName, coeff] of Object.entries(coeffs)) {
        const uc = userConstraints[varName] || {};

        // Default bounds per spec: floor(C / |coeff|)
        const defaultUpper = Math.floor(target / Math.abs(coeff));

        // Resolve exact value first — it overrides everything
        const exact =
            uc.exact !== undefined && uc.exact !== null && uc.exact !== ""
                ? parseInt(uc.exact, 10)
                : null;

        if (exact !== null) {
            if (!Number.isInteger(exact) || exact < 0) {
                throw new EngineError(
                    ErrorCode.INVALID_CONSTRAINT,
                    varName,
                    "exact value must be a non-negative integer",
                );
            }
            result[varName] = {
                lo: exact,
                hi: exact,
                parity: "any",
                exact,
                step: 1,
                start: exact,
            };
            continue;
        }

        // Resolve bounds
        let lo =
            uc.min !== undefined && uc.min !== null && uc.min !== ""
                ? Math.max(0, parseInt(uc.min, 10))
                : 0;

        let hi =
            uc.max !== undefined && uc.max !== null && uc.max !== ""
                ? Math.min(parseInt(uc.max, 10), defaultUpper)
                : defaultUpper;

        if (lo > hi) {
            throw new EngineError(
                ErrorCode.INVALID_CONSTRAINT,
                varName,
                `minimum (${lo}) is greater than maximum (${hi})`,
            );
        }

        // Resolve parity
        let parity = "any";
        if (uc.even === true || uc.even === "true") parity = "even";
        if (uc.odd === true || uc.odd === "true") parity = "odd";

        // Compute loop start and step — integrating parity into the loop
        // avoids iterating over half the values in the parity-constrained case
        let start = lo;
        let step = 1;

        if (parity === "even") {
            step = 2;
            if (start % 2 !== 0) start++; // advance to first even value
        } else if (parity === "odd") {
            step = 2;
            if (start % 2 === 0) start++; // advance to first odd value
        }

        // If start pushed past hi, the range is empty (no valid values)
        if (start > hi) start = hi + 1; // signals empty range to solver

        result[varName] = { lo, hi, parity, exact: null, step, start };
    }

    return result;
}

/**
 * Apply exact-value substitutions, reducing the system before solving.
 * Variables with exact values are removed from the coefficient map and
 * their contribution is subtracted from the target.
 *
 * Returns:
 *   reducedCoeffs       : coeffs without exact-pinned variables
 *   reducedTarget       : target after subtracting pinned contributions
 *   fixedAssignments    : { varName: exactValue } for pinned variables
 */
function applyExactValues(coeffs, target, constraints) {
    const fixedAssignments = {};
    let reducedTarget = target;
    const reducedCoeffs = { ...coeffs };

    for (const [varName, c] of Object.entries(constraints)) {
        if (c.exact !== null) {
            const contribution = coeffs[varName] * c.exact;
            reducedTarget -= contribution;
            delete reducedCoeffs[varName];
            fixedAssignments[varName] = c.exact;
        }
    }

    if (reducedTarget < 0) {
        throw new EngineError(ErrorCode.NEGATIVE_TARGET);
    }

    return { reducedCoeffs, reducedTarget, fixedAssignments };
}

module.exports = { buildConstraints, applyExactValues };
