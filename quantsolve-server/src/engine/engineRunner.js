// engine/engineRunner.js
const { lexer, TokenType } = require("./lexer");
const Parser = require("./parser");
const normalizeEquation = require("./normalizer");
const solve = require("./solver");
const formatResults = require("./resultFormatter");
const handleError = require("./errorHandler");

function hasDivision(tokens) {
    return tokens.some((t) => t.type === TokenType.DIV);
}

function countTokens(tokens, type) {
    return tokens.filter((t) => t.type === type).length;
}

function validateNormalizedForm(coeffs, target) {
    const variables = Object.keys(coeffs);

    if (variables.length === 0) {
        if (target === 0) {
            return {
                valid: true,
                warning:
                    "Identity equation detected. Every assignment is valid only if constraints define bounds.",
            };
        }

        throw new Error("No variables found in equation.");
    }

    for (const [variable, coeff] of Object.entries(coeffs)) {
        if (!Number.isFinite(coeff)) {
            throw new Error(
                `Invalid coefficient detected for variable "${variable}".`,
            );
        }

        if (coeff === 0) {
            throw new Error(
                `Variable "${variable}" has zero coefficient after normalization.`,
            );
        }

        if (coeff < 0) {
            throw new Error(
                `Negative coefficient detected for "${variable}". Current solver V2 expects a non-negative linear form after normalization.`,
            );
        }
    }

    if (!Number.isFinite(target)) {
        throw new Error(
            "Invalid target constant detected after normalization.",
        );
    }

    if (target < 0) {
        throw new Error(
            "Negative target detected after normalization. Current solver V2 expects a non-negative target.",
        );
    }

    return { valid: true, warning: null };
}

function runEngine(input, constraints, options = {}) {
    try {
        if (typeof input !== "string" || !input.trim()) {
            throw new Error("Equation input is required.");
        }

        const cleanedInput = input.replace(/\s+/g, " ").trim();
        const tokens = lexer(cleanedInput);

        const equalCount = countTokens(tokens, TokenType.EQUAL);
        if (equalCount !== 1) {
            throw new Error('Equation must contain exactly one "=" sign.');
        }

        const parser = new Parser(tokens);
        const { left, right } = parser.parseEquation();

        if (parser.pos !== tokens.length) {
            throw new Error(
                "Unexpected trailing tokens after parsing the equation.",
            );
        }

        const { coeffs, target } = normalizeEquation(left, right);
        const formCheck = validateNormalizedForm(coeffs, target);

        const warnings = [];
        if (hasDivision(tokens)) {
            warnings.push(
                "Division token detected. Current engine parses it, but full rational-coefficient solving is not yet guaranteed.",
            );
        }

        if (formCheck.warning) {
            warnings.push(formCheck.warning);
        }

        const solutions = solve(coeffs, target, constraints);
        const formattedSolutions = formatResults(solutions);

        return {
            success: true,
            input: cleanedInput,
            tokens,
            coeffs,
            target,
            solutionCount: solutions.length,
            solutions,
            formattedSolutions,
            warnings,
            meta: {
                variableCount: Object.keys(coeffs).length,
                hasDivision: hasDivision(tokens),
                constraintCount: Object.keys(constraints || {}).length,
                debug: !!options.debug,
            },
        };
    } catch (err) {
        const errorPayload = handleError(err);
        return {
            ...errorPayload,
            input,
            solutions: [],
            formattedSolutions: [],
            warnings: [],
            meta: {
                debug: !!options.debug,
            },
        };
    }
}

module.exports = {
    runEngine,
};
