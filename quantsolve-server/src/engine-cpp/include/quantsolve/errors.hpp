#pragma once

#include <stdexcept>
#include <string>
#include <vector>

namespace quantsolve {

enum class ErrorCode {
    INVALID_CHARACTER,
    DECIMAL_NOT_SUPPORTED,
    MISSING_EQUALS,
    MULTIPLE_EQUALS,
    UNEXPECTED_TOKEN,
    EMPTY_INPUT,
    TRAILING_TOKENS,
    DIVISION_BY_ZERO,
    VARIABLE_IN_DENOMINATOR,
    FRACTIONAL_COEFFICIENT,
    NON_LINEAR_TERM,
    NO_VARIABLES,
    NEGATIVE_COEFFICIENT,
    NO_SOLUTIONS,
    UNBOUNDED_SEARCH,
    NEGATIVE_TARGET,
    INVALID_CONSTRAINT,
    POLYNOMIAL_UNSUPPORTED,
    INTERNAL_ERROR,
};

std::string to_code_string(ErrorCode code);
std::string build_error_message(ErrorCode code, const std::vector<std::string>& args = {});

class EngineError : public std::runtime_error {
public:
    explicit EngineError(ErrorCode code, std::vector<std::string> args = {});

    ErrorCode code() const noexcept { return code_; }

private:
    ErrorCode code_;
};

} // namespace quantsolve
