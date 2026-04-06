#include "quantsolve/normalizer.hpp"

#include "quantsolve/coefficient_extractor.hpp"
#include "quantsolve/errors.hpp"

#include <cmath>
#include <unordered_set>

namespace quantsolve {

NormalizedEquation normalize_equation(const ASTPtr& left, const ASTPtr& right) {
    DoubleCoeffMap left_map;
    DoubleCoeffMap right_map;

    extract(left, left_map, 1.0);
    extract(right, right_map, 1.0);

    std::unordered_set<std::string> variables;
    for (const auto& [k, _] : left_map) variables.insert(k);
    for (const auto& [k, _] : right_map) variables.insert(k);
    variables.erase("__constant");

    CoeffMap coeffs;
    for (const auto& var : variables) {
        const double l = left_map.count(var) ? left_map[var] : 0.0;
        const double r = right_map.count(var) ? right_map[var] : 0.0;
        const double coeff = l - r;
        const double rounded = std::round(coeff);
        if (std::abs(coeff - rounded) > 1e-9) {
            throw EngineError(ErrorCode::FRACTIONAL_COEFFICIENT, {var, std::to_string(coeff)});
        }
        if (rounded != 0.0) coeffs[var] = static_cast<Int>(rounded);
    }

    const double lc = left_map.count("__constant") ? left_map["__constant"] : 0.0;
    const double rc = right_map.count("__constant") ? right_map["__constant"] : 0.0;
    const double target_d = rc - lc;

    if (coeffs.empty()) {
        throw EngineError(ErrorCode::NO_VARIABLES);
    }

    if (!std::isfinite(target_d)) {
        throw EngineError(ErrorCode::INTERNAL_ERROR, {"Non-finite target after normalization"});
    }

    const Int target = static_cast<Int>(std::llround(target_d));

    if (target < 0) {
        throw EngineError(ErrorCode::NEGATIVE_TARGET);
    }

    for (const auto& [var_name, coeff] : coeffs) {
        if (coeff < 0) {
            throw EngineError(ErrorCode::NEGATIVE_COEFFICIENT, {var_name, std::to_string(coeff)});
        }
    }

    return {coeffs, target};
}

} // namespace quantsolve

