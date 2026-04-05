// engine/normalizer.js

const { extract } = require("./coefficientExtractor");
const { EngineError, ErrorCode } = require("./errors");

function normalizeEquation(leftAST, rightAST) {
    const leftMap = extract(leftAST);
    const rightMap = extract(rightAST);

    // Gather all variable names from both sides (excluding the __constant key)
    const variables = new Set([
        ...Object.keys(leftMap),
        ...Object.keys(rightMap),
    ]);
    variables.delete("__constant");

    const coeffs = {};
    for (const v of variables) {
        const coeff = (leftMap[v] || 0) - (rightMap[v] || 0);
        // Drop variables that cancel out on both sides
        if (coeff !== 0) coeffs[v] = coeff;
    }

    // C = rightConstant - leftConstant  (moves all constants to the RHS)
    const target = (rightMap.__constant || 0) - (leftMap.__constant || 0);

    // --- Post-normalisation validations ---

    if (Object.keys(coeffs).length === 0) {
        if (target === 0) {
            // 5 = 5, x - x = 0, etc. — trivially true but unsolvable for us
            throw new EngineError(ErrorCode.NO_VARIABLES);
        }
        throw new EngineError(ErrorCode.NO_VARIABLES);
    }

    if (!Number.isFinite(target)) {
        throw new EngineError(
            ErrorCode.INTERNAL_ERROR,
            "Non-finite target after normalization",
        );
    }

    if (target < 0) {
        throw new EngineError(ErrorCode.NEGATIVE_TARGET);
    }

    for (const [varName, coeff] of Object.entries(coeffs)) {
        if (!Number.isFinite(coeff)) {
            throw new EngineError(
                ErrorCode.INTERNAL_ERROR,
                `Non-finite coefficient for '${varName}'`,
            );
        }
        if (!Number.isInteger(coeff)) {
            throw new EngineError(
                ErrorCode.FRACTIONAL_COEFFICIENT,
                varName,
                coeff,
            );
        }
        if (coeff < 0) {
            throw new EngineError(
                ErrorCode.NEGATIVE_COEFFICIENT,
                varName,
                coeff,
            );
        }
    }

    return { coeffs, target };
}

module.exports = normalizeEquation;
