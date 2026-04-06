// engine/errorHandler.js

const { ErrorCode } = require("./errors");

// Map error codes to the HTTP-friendly category shown in the UI
const categoryMap = {
    [ErrorCode.INVALID_CHARACTER]: "syntax",
    [ErrorCode.DECIMAL_NOT_SUPPORTED]: "syntax",
    [ErrorCode.MISSING_EQUALS]: "syntax",
    [ErrorCode.MULTIPLE_EQUALS]: "syntax",
    [ErrorCode.UNEXPECTED_TOKEN]: "syntax",
    [ErrorCode.EMPTY_INPUT]: "syntax",
    [ErrorCode.TRAILING_TOKENS]: "syntax",

    [ErrorCode.DIVISION_BY_ZERO]: "semantic",
    [ErrorCode.VARIABLE_IN_DENOMINATOR]: "semantic",
    [ErrorCode.FRACTIONAL_COEFFICIENT]: "semantic",
    [ErrorCode.NON_LINEAR_TERM]: "semantic",
    [ErrorCode.POLYNOMIAL_UNSUPPORTED]: "semantic",
    [ErrorCode.NO_VARIABLES]: "semantic",
    [ErrorCode.NEGATIVE_COEFFICIENT]: "semantic",

    [ErrorCode.NO_SOLUTIONS]: "solver",
    [ErrorCode.UNBOUNDED_SEARCH]: "solver",
    [ErrorCode.NEGATIVE_TARGET]: "solver",

    [ErrorCode.INVALID_CONSTRAINT]: "constraint",
    [ErrorCode.INTERNAL_ERROR]: "internal",
};

function handleError(err) {
    if (err.isEngineError) {
        return {
            success: false,
            error: err.message,
            code: err.code,
            category: categoryMap[err.code] || "internal",
        };
    }

    // Unexpected / unhandled error — don't expose raw stack to the client
    console.error("[QuantSolve unhandled error]", err);
    return {
        success: false,
        error: "An unexpected error occurred. Please check your equation and try again.",
        code: ErrorCode.INTERNAL_ERROR,
        category: "internal",
    };
}

module.exports = handleError;
