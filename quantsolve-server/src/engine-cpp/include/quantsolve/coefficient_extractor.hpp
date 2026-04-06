#pragma once

#include "quantsolve/ast.hpp"

#include <unordered_map>

namespace quantsolve {

using DoubleCoeffMap = std::unordered_map<std::string, double>;

double evaluate_constant(const ASTPtr& node);
void extract(const ASTPtr& node, DoubleCoeffMap& out, double multiplier = 1.0);

} // namespace quantsolve
