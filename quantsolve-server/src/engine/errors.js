// engine/errors.js
// Central error taxonomy - every error in the system originates here.
// Never throw plain strings. Always throw an EngineError.

const ErrorCode = {
    // Lexer errors
    INVALID_CHARACTER: "INVALID_CHARACTER",
    DECIMAL_NOT_SUPPORTED: "DECIMAL_NOT_SUPPORTED",

    // Parser / structural errors
    MISSING_EQUALS: "MISSING_EQUALS",
    MULTIPLE_EQUALS: "MULTIPLE_EQUALS",
    UNEXPECTED_TOKEN: "UNEXPECTED_TOKEN",
    EMPTY_INPUT: "EMPTY_INPUT",
    TRAILING_TOKENS: "TRAILING_TOKENS",

    // Semantic / normalizer errors
    DIVISION_BY_ZERO: "DIVISION_BY_ZERO",
    VARIABLE_IN_DENOMINATOR: "VARIABLE_IN_DENOMINATOR",
    FRACTIONAL_COEFFICIENT: "FRACTIONAL_COEFFICIENT",
    NON_LINEAR_TERM: "NON_LINEAR_TERM",
    POLYNOMIAL_UNSUPPORTED: "POLYNOMIAL_UNSUPPORTED",
    NO_VARIABLES: "NO_VARIABLES",
    NEGATIVE_COEFFICIENT: "NEGATIVE_COEFFICIENT",

    // Solver errors
    NO_SOLUTIONS: "NO_SOLUTIONS",
    UNBOUNDED_SEARCH: "UNBOUNDED_SEARCH",
    NEGATIVE_TARGET: "NEGATIVE_TARGET",

    // Constraint errors
    INVALID_CONSTRAINT: "INVALID_CONSTRAINT",

    // Generic fallback
    INTERNAL_ERROR: "INTERNAL_ERROR",
};

// User-facing messages - these are what the frontend displays
const ErrorMessages = {
    [ErrorCode.INVALID_CHARACTER]: (ch, pos) =>
        `Invalid character '${ch}' at position ${pos}. Only letters, digits, and operators (+, -, *, /, ^, =, parentheses) are allowed.`,

    [ErrorCode.DECIMAL_NOT_SUPPORTED]: (pos) =>
        `Decimal numbers are not supported at position ${pos}. This solver works with whole numbers only.`,

    [ErrorCode.MISSING_EQUALS]: () =>
        `Equation must contain exactly one '=' sign. Example: 10x + 5y = 100`,

    [ErrorCode.MULTIPLE_EQUALS]: () =>
        `Equation contains more than one '=' sign. Only one equality is allowed.`,

    [ErrorCode.UNEXPECTED_TOKEN]: (val, pos) =>
        `Unexpected token '${val}' at position ${pos}. Check your equation for misplaced operators or symbols.`,

    [ErrorCode.EMPTY_INPUT]: () =>
        `No equation entered. Please type an equation like: 10x + 20y = 100`,

    [ErrorCode.TRAILING_TOKENS]: () =>
        `Unexpected content after the equation ends. Make sure your equation is complete and has no extra characters.`,

    [ErrorCode.DIVISION_BY_ZERO]: () =>
        `Division by zero detected. Please check your equation.`,

    [ErrorCode.VARIABLE_IN_DENOMINATOR]: (varName) =>
        `Non-linear equation: variable '${varName}' appears in a denominator. This solver only supports linear equations.`,

    [ErrorCode.FRACTIONAL_COEFFICIENT]: (varName, coeff) =>
        `Fractional coefficient (${coeff}) produced for variable '${varName}'. All coefficients must be whole numbers. For example, 3x/2 = 12 is not valid - rewrite as 3x = 24.`,

    [ErrorCode.NON_LINEAR_TERM]: () =>
        `Non-linear term detected (e.g. x^2, x*y). This solver only handles linear equations where each variable appears with a fixed integer coefficient.`,

    [ErrorCode.POLYNOMIAL_UNSUPPORTED]: (reason) =>
        `Polynomial input not supported in this form${reason ? `: ${reason}` : ""}. Current support is single-variable integer polynomial equations (for example x^2 - 5x + 6 = 0).`,

    [ErrorCode.NO_VARIABLES]: () =>
        `No variables found in the equation. Please include at least one variable (e.g. x, y, apple).`,

    [ErrorCode.NEGATIVE_COEFFICIENT]: (varName, coeff) =>
        `Variable '${varName}' has a net negative coefficient (${coeff}) after simplification. The current solver requires all variable coefficients to be positive. Try rearranging your equation.`,

    [ErrorCode.NO_SOLUTIONS]: () =>
        `No whole-number solutions exist for this equation. The target value is not divisible by the GCD of the coefficients.`,

    [ErrorCode.UNBOUNDED_SEARCH]: () =>
        `Infinite answers detected. Please apply market limits. The solution space is too large to compute without variable constraints.`,

    [ErrorCode.NEGATIVE_TARGET]: () =>
        `No solutions exist - the equation simplifies to a negative right-hand side, which cannot be satisfied by non-negative integers.`,

    [ErrorCode.INVALID_CONSTRAINT]: (varName, reason) =>
        `Invalid constraint for variable '${varName}': ${reason}`,

    [ErrorCode.INTERNAL_ERROR]: (detail) =>
        `An unexpected error occurred${detail ? ": " + detail : ""}. Please check your equation and try again.`,
};

class EngineError extends Error {
    constructor(code, ...args) {
        const msgFn = ErrorMessages[code];
        const message = msgFn ? msgFn(...args) : `Error: ${code}`;
        super(message);
        this.name = "EngineError";
        this.code = code;
        this.isEngineError = true;
    }
}

module.exports = { ErrorCode, EngineError };
