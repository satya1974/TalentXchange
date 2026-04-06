#include "quantsolve/error_handler.hpp"

#include <unordered_map>

namespace quantsolve {

ErrorPayload handle_error(const std::exception& err) {
    if (const auto* ee = dynamic_cast<const EngineError*>(&err)) {
        static const std::unordered_map<ErrorCode, std::string> category_map = {
            {ErrorCode::INVALID_CHARACTER, "syntax"},
            {ErrorCode::DECIMAL_NOT_SUPPORTED, "syntax"},
            {ErrorCode::MISSING_EQUALS, "syntax"},
            {ErrorCode::MULTIPLE_EQUALS, "syntax"},
            {ErrorCode::UNEXPECTED_TOKEN, "syntax"},
            {ErrorCode::EMPTY_INPUT, "syntax"},
            {ErrorCode::TRAILING_TOKENS, "syntax"},
            {ErrorCode::DIVISION_BY_ZERO, "semantic"},
            {ErrorCode::VARIABLE_IN_DENOMINATOR, "semantic"},
            {ErrorCode::FRACTIONAL_COEFFICIENT, "semantic"},
            {ErrorCode::NON_LINEAR_TERM, "semantic"},
            {ErrorCode::NO_VARIABLES, "semantic"},
            {ErrorCode::NEGATIVE_COEFFICIENT, "semantic"},
            {ErrorCode::POLYNOMIAL_UNSUPPORTED, "semantic"},
            {ErrorCode::NO_SOLUTIONS, "solver"},
            {ErrorCode::UNBOUNDED_SEARCH, "solver"},
            {ErrorCode::NEGATIVE_TARGET, "solver"},
            {ErrorCode::INVALID_CONSTRAINT, "constraint"},
            {ErrorCode::INTERNAL_ERROR, "internal"},
        };

        std::string category = "internal";
        if (const auto it = category_map.find(ee->code()); it != category_map.end()) {
            category = it->second;
        }

        return ErrorPayload{
            false,
            ee->what(),
            to_code_string(ee->code()),
            category,
        };
    }

    return ErrorPayload{
        false,
        "An unexpected error occurred. Please check your equation and try again.",
        to_code_string(ErrorCode::INTERNAL_ERROR),
        "internal",
    };
}

} // namespace quantsolve
