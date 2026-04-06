#pragma once

#include "quantsolve/types.hpp"

namespace quantsolve {

SolveResult solve(const CoeffMap& coeffs, Int target, const UserConstraints& user_constraints = {}, const SolveOptions& options = {});

} // namespace quantsolve
