#pragma once

#include "quantsolve/types.hpp"

namespace quantsolve {

ConstraintMap build_constraints(const CoeffMap& coeffs, Int target, const UserConstraints& user_constraints = {});

struct ExactReduced {
    CoeffMap reduced_coeffs;
    Int reduced_target = 0;
    Assignment fixed_assignments;
};

ExactReduced apply_exact_values(const CoeffMap& coeffs, Int target, const ConstraintMap& constraints);

} // namespace quantsolve
