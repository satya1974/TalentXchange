#pragma once

#include "quantsolve/ast.hpp"
#include "quantsolve/types.hpp"

#include <optional>

namespace quantsolve {

struct PolynomialResult {
    Solutions solutions;
    std::vector<std::string> variable_order;
    PolynomialInfo polynomial;
    PolynomialSearchBounds search_bounds;
    Int total_found = 0;
    Int page = 1;
    Int page_size = 50;
    Int total_pages = 1;
    bool has_more = false;
};

// Try to solve the equation as a polynomial.
// Returns std::nullopt if the equation is not a polynomial candidate.
// Throws EngineError on polynomial-specific errors.
std::optional<PolynomialResult> try_solve_polynomial(
    const ASTPtr& left, const ASTPtr& right,
    const UserConstraints& constraints,
    const SolveOptions& options);

} // namespace quantsolve
