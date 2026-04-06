#include "quantsolve/errors.hpp"

#include <sstream>

namespace quantsolve {

namespace {
std::string arg_at(const std::vector<std::string>& args, std::size_t i) {
    return i < args.size() ? args[i] : "";
}
} // namespace

std::string to_code_string(ErrorCode code) {
    switch (code) {
    case ErrorCode::INVALID_CHARACTER: return "INVALID_CHARACTER";
    case ErrorCode::DECIMAL_NOT_SUPPORTED: return "DECIMAL_NOT_SUPPORTED";
    case ErrorCode::MISSING_EQUALS: return "MISSING_EQUALS";
    case ErrorCode::MULTIPLE_EQUALS: return "MULTIPLE_EQUALS";
    case ErrorCode::UNEXPECTED_TOKEN: return "UNEXPECTED_TOKEN";
    case ErrorCode::EMPTY_INPUT: return "EMPTY_INPUT";
    case ErrorCode::TRAILING_TOKENS: return "TRAILING_TOKENS";
    case ErrorCode::DIVISION_BY_ZERO: return "DIVISION_BY_ZERO";
    case ErrorCode::VARIABLE_IN_DENOMINATOR: return "VARIABLE_IN_DENOMINATOR";
    case ErrorCode::FRACTIONAL_COEFFICIENT: return "FRACTIONAL_COEFFICIENT";
    case ErrorCode::NON_LINEAR_TERM: return "NON_LINEAR_TERM";
    case ErrorCode::NO_VARIABLES: return "NO_VARIABLES";
    case ErrorCode::NEGATIVE_COEFFICIENT: return "NEGATIVE_COEFFICIENT";
    case ErrorCode::NO_SOLUTIONS: return "NO_SOLUTIONS";
    case ErrorCode::UNBOUNDED_SEARCH: return "UNBOUNDED_SEARCH";
    case ErrorCode::NEGATIVE_TARGET: return "NEGATIVE_TARGET";
    case ErrorCode::INVALID_CONSTRAINT: return "INVALID_CONSTRAINT";
    case ErrorCode::POLYNOMIAL_UNSUPPORTED: return "POLYNOMIAL_UNSUPPORTED";
    case ErrorCode::INTERNAL_ERROR: return "INTERNAL_ERROR";
    }
    return "INTERNAL_ERROR";
}

std::string build_error_message(ErrorCode code, const std::vector<std::string>& args) {
    switch (code) {
    case ErrorCode::INVALID_CHARACTER:
        return "Invalid character '" + arg_at(args, 0) + "' at position " + arg_at(args, 1) + ". Only letters, digits, and operators (+, -, *, /, =, parentheses) are allowed.";
    case ErrorCode::DECIMAL_NOT_SUPPORTED:
        return "Decimal numbers are not supported at position " + arg_at(args, 0) + ". This solver works with whole numbers only.";
    case ErrorCode::MISSING_EQUALS:
        return "Equation must contain exactly one '=' sign. Example: 10x + 5y = 100";
    case ErrorCode::MULTIPLE_EQUALS:
        return "Equation contains more than one '=' sign. Only one equality is allowed.";
    case ErrorCode::UNEXPECTED_TOKEN:
        return "Unexpected token '" + arg_at(args, 0) + "' at position " + arg_at(args, 1) + ". Check your equation for misplaced operators or symbols.";
    case ErrorCode::EMPTY_INPUT:
        return "No equation entered. Please type an equation like: 10x + 20y = 100";
    case ErrorCode::TRAILING_TOKENS:
        return "Unexpected content after the equation ends. Make sure your equation is complete and has no extra characters.";
    case ErrorCode::DIVISION_BY_ZERO:
        return "Division by zero detected. Please check your equation.";
    case ErrorCode::VARIABLE_IN_DENOMINATOR:
        return "Non-linear equation: variable '" + arg_at(args, 0) + "' appears in a denominator. This solver only supports linear equations.";
    case ErrorCode::FRACTIONAL_COEFFICIENT:
        return "Fractional coefficient (" + arg_at(args, 1) + ") produced for variable '" + arg_at(args, 0) + "'. All coefficients must be whole numbers. For example, 3x/2 = 12 is not valid - rewrite as 3x = 24.";
    case ErrorCode::NON_LINEAR_TERM:
        return "Non-linear term detected (e.g. x^2, x*y). This solver only handles linear equations where each variable appears with a fixed integer coefficient.";
    case ErrorCode::NO_VARIABLES:
        return "No variables found in the equation. Please include at least one variable (e.g. x, y, apple).";
    case ErrorCode::NEGATIVE_COEFFICIENT:
        return "Variable '" + arg_at(args, 0) + "' has a net negative coefficient (" + arg_at(args, 1) + ") after simplification. The current solver requires all variable coefficients to be positive. Try rearranging your equation.";
    case ErrorCode::NO_SOLUTIONS:
        return "No whole-number solutions exist for this equation. The target value is not divisible by the GCD of the coefficients.";
    case ErrorCode::UNBOUNDED_SEARCH:
        return "Infinite answers detected. Please apply market limits. The solution space is too large to compute without variable constraints.";
    case ErrorCode::NEGATIVE_TARGET:
        return "No solutions exist - the equation simplifies to a negative right-hand side, which cannot be satisfied by non-negative integers.";
    case ErrorCode::INVALID_CONSTRAINT:
        return "Invalid constraint for variable '" + arg_at(args, 0) + "': " + arg_at(args, 1);
    case ErrorCode::POLYNOMIAL_UNSUPPORTED:
        return "Polynomial input not supported in this form" + (arg_at(args, 0).empty() ? std::string() : ": " + arg_at(args, 0)) + ". Current support is single-variable integer polynomial equations (for example x^2 - 5x + 6 = 0).";
    case ErrorCode::INTERNAL_ERROR:
        return "An unexpected error occurred" + (arg_at(args, 0).empty() ? std::string() : ": " + arg_at(args, 0)) + ". Please check your equation and try again.";
    }
    return "An unexpected error occurred. Please check your equation and try again.";
}

EngineError::EngineError(ErrorCode code, std::vector<std::string> args)
    : std::runtime_error(build_error_message(code, args)), code_(code) {}

} // namespace quantsolve
