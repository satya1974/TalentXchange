#pragma once

#include "quantsolve/ast.hpp"
#include "quantsolve/types.hpp"

namespace quantsolve {

struct NormalizedEquation {
    CoeffMap coeffs;
    Int target = 0;
};

NormalizedEquation normalize_equation(const ASTPtr& left, const ASTPtr& right);

} // namespace quantsolve
