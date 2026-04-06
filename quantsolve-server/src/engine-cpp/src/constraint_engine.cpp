#include "quantsolve/constraint_engine.hpp"

#include "quantsolve/errors.hpp"

#include <algorithm>

namespace quantsolve {

ConstraintMap build_constraints(const CoeffMap& coeffs, Int target, const UserConstraints& user_constraints) {
    ConstraintMap result;

    for (const auto& [var_name, coeff] : coeffs) {
        ConstraintInput uc;
        if (const auto it = user_constraints.find(var_name); it != user_constraints.end()) {
            uc = it->second;
        }

        const Int default_upper = static_cast<Int>(target / std::llabs(coeff));

        if (uc.exact.has_value()) {
            const Int exact = *uc.exact;
            if (exact < 0) {
                throw EngineError(ErrorCode::INVALID_CONSTRAINT, {var_name, "exact value must be a non-negative integer"});
            }
            result[var_name] = Constraint{exact, exact, "any", exact, 1, exact};
            continue;
        }

        Int lo = uc.min.has_value() ? std::max<Int>(0, *uc.min) : 0;
        Int hi = uc.max.has_value() ? std::min<Int>(*uc.max, default_upper) : default_upper;

        if (lo > hi) {
            throw EngineError(ErrorCode::INVALID_CONSTRAINT, {
                var_name,
                "minimum (" + std::to_string(lo) + ") is greater than maximum (" + std::to_string(hi) + ")"
            });
        }

        std::string parity = "any";
        if (uc.even) parity = "even";
        if (uc.odd) parity = "odd";

        Int start = lo;
        Int step = 1;

        if (parity == "even") {
            step = 2;
            if (start % 2 != 0) ++start;
        } else if (parity == "odd") {
            step = 2;
            if (start % 2 == 0) ++start;
        }

        if (start > hi) start = hi + 1;

        result[var_name] = Constraint{lo, hi, parity, std::nullopt, step, start};
    }

    return result;
}

ExactReduced apply_exact_values(const CoeffMap& coeffs, Int target, const ConstraintMap& constraints) {
    Assignment fixed;
    Int reduced_target = target;
    CoeffMap reduced_coeffs = coeffs;

    for (const auto& [var_name, c] : constraints) {
        if (c.exact.has_value()) {
            const Int contribution = coeffs.at(var_name) * (*c.exact);
            reduced_target -= contribution;
            reduced_coeffs.erase(var_name);
            fixed[var_name] = *c.exact;
        }
    }

    if (reduced_target < 0) {
        throw EngineError(ErrorCode::NEGATIVE_TARGET);
    }

    return {reduced_coeffs, reduced_target, fixed};
}

} // namespace quantsolve
