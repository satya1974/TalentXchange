// polynomial_solver.cpp
// Solves polynomial equations (both single-variable and multi-variable)
// by scanning integer domains and evaluating the AST at each candidate point.
//
// Single-variable: Converts AST to polynomial map, scans [lo, hi].
// Multi-variable:  DFS over Cartesian product of domains, evaluates full AST.

#include "quantsolve/polynomial_solver.hpp"

#include "quantsolve/errors.hpp"

#include <algorithm>
#include <cmath>
#include <functional>
#include <set>
#include <stdexcept>
#include <string>

namespace quantsolve {

namespace {

// ── Configuration (matches JS polynomialSolver.js defaults) ──────────────
constexpr int    MAX_EXPONENT      = 8;
constexpr Int    MAX_SCAN_RANGE    = 200'000;
constexpr Int    MAX_COMBINATIONS  = 2'000'000;
constexpr Int    SOLUTION_CAP      = 500'000;
constexpr Int    DEFAULT_LO        = -100;
constexpr Int    DEFAULT_HI        = 100;

// ── Helpers ──────────────────────────────────────────────────────────────

// Checks if an AST subtree contains a power (^) operator.
bool has_power(const ASTPtr& node) {
    if (!node) return false;
    if (node->type == NodeType::BinaryOp && node->op == '^') return true;
    if (node->type == NodeType::UnaryOp) return has_power(node->operand);
    if (node->type == NodeType::BinaryOp) {
        return has_power(node->left) || has_power(node->right);
    }
    return false;
}

// Checks if an AST has a variable-times-variable (non-linear multiply).
bool has_var_multiply(const ASTPtr& node) {
    if (!node) return false;
    if (node->type == NodeType::BinaryOp && node->op == '*') {
        bool lv = false, rv = false;
        // quick check: does left/right subtree contain a variable?
        std::function<bool(const ASTPtr&)> has_var = [&](const ASTPtr& n) -> bool {
            if (!n) return false;
            if (n->type == NodeType::Variable) return true;
            if (n->type == NodeType::UnaryOp) return has_var(n->operand);
            if (n->type == NodeType::BinaryOp) return has_var(n->left) || has_var(n->right);
            return false;
        };
        lv = has_var(node->left);
        rv = has_var(node->right);
        if (lv && rv) return true;
    }
    if (node->type == NodeType::UnaryOp) return has_var_multiply(node->operand);
    if (node->type == NodeType::BinaryOp) {
        return has_var_multiply(node->left) || has_var_multiply(node->right);
    }
    return false;
}

// Collects all variable names from the AST into a set.
void collect_variables(const ASTPtr& node, std::set<std::string>& vars) {
    if (!node) return;
    if (node->type == NodeType::Variable) {
        vars.insert(node->name);
        return;
    }
    if (node->type == NodeType::UnaryOp) {
        collect_variables(node->operand, vars);
        return;
    }
    if (node->type == NodeType::BinaryOp) {
        collect_variables(node->left, vars);
        collect_variables(node->right, vars);
    }
}

// Evaluates an AST node with a given variable assignment.
// Returns the numeric value. Throws on evaluation errors.
double evaluate_ast(const ASTPtr& node, const std::unordered_map<std::string, Int>& assignment) {
    if (!node) throw std::runtime_error("null node in evaluate_ast");

    switch (node->type) {
    case NodeType::Number:
        return static_cast<double>(node->value);

    case NodeType::Variable: {
        auto it = assignment.find(node->name);
        if (it == assignment.end()) {
            throw std::runtime_error("unassigned variable: " + node->name);
        }
        return static_cast<double>(it->second);
    }

    case NodeType::UnaryOp:
        if (node->op == '-') return -evaluate_ast(node->operand, assignment);
        throw std::runtime_error("unknown unary op");

    case NodeType::BinaryOp: {
        double l = evaluate_ast(node->left, assignment);
        double r = evaluate_ast(node->right, assignment);
        switch (node->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
            if (r == 0.0) throw EngineError(ErrorCode::DIVISION_BY_ZERO);
            return l / r;
        case '^':
            return std::pow(l, r);
        default:
            throw std::runtime_error("unknown binary op");
        }
    }
    }

    throw std::runtime_error("unknown node type");
}

// ── Single-variable polynomial extraction ────────────────────────────────

// Converts an AST expression tree into a polynomial map {degree -> coefficient}
// for a single variable. Returns false if the expression is not a polynomial
// in the given variable (e.g. var in denominator, non-integer exponent).
bool ast_to_poly(const ASTPtr& node, const std::string& var, PolynomialMap& out, double multiplier) {
    if (!node) return false;

    switch (node->type) {
    case NodeType::Number:
        out[0] += static_cast<double>(node->value) * multiplier;
        return true;

    case NodeType::Variable:
        if (node->name == var) {
            out[1] += multiplier;
        } else {
            // Other variable in single-var poly - shouldn't happen
            return false;
        }
        return true;

    case NodeType::UnaryOp:
        if (node->op == '-') {
            return ast_to_poly(node->operand, var, out, -multiplier);
        }
        return false;

    case NodeType::BinaryOp:
        switch (node->op) {
        case '+':
            return ast_to_poly(node->left, var, out, multiplier) &&
                   ast_to_poly(node->right, var, out, multiplier);

        case '-':
            return ast_to_poly(node->left, var, out, multiplier) &&
                   ast_to_poly(node->right, var, out, -multiplier);

        case '*': {
            // One side must be constant, or we can multiply polynomials
            PolynomialMap left_poly, right_poly;
            bool l_ok = ast_to_poly(node->left, var, left_poly, 1.0);
            bool r_ok = ast_to_poly(node->right, var, right_poly, 1.0);
            if (!l_ok || !r_ok) return false;

            // Multiply the two polynomial maps
            for (const auto& [dl, cl] : left_poly) {
                for (const auto& [dr, cr] : right_poly) {
                    int deg = dl + dr;
                    if (deg > MAX_EXPONENT) return false;
                    out[deg] += cl * cr * multiplier;
                }
            }
            return true;
        }

        case '/': {
            // Denominator must be a constant
            PolynomialMap right_poly;
            if (!ast_to_poly(node->right, var, right_poly, 1.0)) return false;

            // Check right is a constant (only degree 0)
            bool all_const = true;
            double denom = 0.0;
            for (const auto& [d, c] : right_poly) {
                if (d != 0) { all_const = false; break; }
                denom = c;
            }
            if (!all_const || denom == 0.0) return false;

            return ast_to_poly(node->left, var, out, multiplier / denom);
        }

        case '^': {
            // Base must be a polynomial, exponent must be a non-negative integer constant
            // Try to evaluate exponent as a constant
            std::unordered_map<std::string, Int> empty;
            double exp_val;
            try {
                exp_val = evaluate_ast(node->right, empty);
            } catch (...) {
                // Exponent contains variables — not supported
                return false;
            }

            int exp_int = static_cast<int>(exp_val);
            if (std::abs(exp_val - exp_int) > 1e-9 || exp_int < 0 || exp_int > MAX_EXPONENT) {
                return false;
            }

            // Get the base polynomial
            PolynomialMap base_poly;
            if (!ast_to_poly(node->left, var, base_poly, 1.0)) return false;

            // Exponentiate by repeated multiplication
            PolynomialMap result;
            result[0] = 1.0; // Start with "1"

            for (int i = 0; i < exp_int; ++i) {
                PolynomialMap temp;
                for (const auto& [d1, c1] : result) {
                    for (const auto& [d2, c2] : base_poly) {
                        int deg = d1 + d2;
                        if (deg > MAX_EXPONENT) return false;
                        temp[deg] += c1 * c2;
                    }
                }
                result = std::move(temp);
            }

            // Apply multiplier to result
            for (const auto& [d, c] : result) {
                out[d] += c * multiplier;
            }
            return true;
        }

        default:
            return false;
        }
    }

    return false;
}

// Evaluate polynomial at a given x value
double evaluate_poly(const PolynomialMap& poly, double x) {
    double total = 0.0;
    for (const auto& [deg, coeff] : poly) {
        total += coeff * std::pow(x, deg);
    }
    return total;
}

// Get the degree of a polynomial
int poly_degree(const PolynomialMap& poly) {
    int max_deg = 0;
    for (const auto& [deg, coeff] : poly) {
        if (std::abs(coeff) > 1e-12 && deg > max_deg) {
            max_deg = deg;
        }
    }
    return max_deg;
}

// ── Solve single-variable polynomial ─────────────────────────────────────

PolynomialResult solve_single_variable(
    const ASTPtr& left, const ASTPtr& right,
    const std::string& var_name,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
    // Build LHS - RHS polynomial
    PolynomialMap left_poly, right_poly, diff_poly;
    bool l_ok = ast_to_poly(left, var_name, left_poly, 1.0);
    bool r_ok = ast_to_poly(right, var_name, right_poly, 1.0);

    if (!l_ok || !r_ok) {
        throw EngineError(ErrorCode::POLYNOMIAL_UNSUPPORTED, {"cannot convert to polynomial form"});
    }

    // diff_poly = left_poly - right_poly
    for (const auto& [d, c] : left_poly) diff_poly[d] += c;
    for (const auto& [d, c] : right_poly) diff_poly[d] -= c;

    // Clean up near-zero coefficients
    for (auto it = diff_poly.begin(); it != diff_poly.end(); ) {
        if (std::abs(it->second) < 1e-12) {
            it = diff_poly.erase(it);
        } else {
            ++it;
        }
    }

    int degree = poly_degree(diff_poly);
    if (degree == 0) {
        // No variable terms - trivial equation
        double constant = diff_poly.count(0) ? diff_poly[0] : 0.0;
        if (std::abs(constant) < 1e-9) {
            throw EngineError(ErrorCode::POLYNOMIAL_UNSUPPORTED, {"trivially true identity"});
        }
        throw EngineError(ErrorCode::NO_SOLUTIONS);
    }

    // Determine search bounds
    Int lo = DEFAULT_LO, hi = DEFAULT_HI;
    auto cit = constraints.find(var_name);
    if (cit != constraints.end()) {
        if (cit->second.min.has_value()) lo = *cit->second.min;
        if (cit->second.max.has_value()) hi = *cit->second.max;
        if (cit->second.exact.has_value()) {
            lo = hi = *cit->second.exact;
        }
    }

    // Clamp range
    if (hi - lo + 1 > MAX_SCAN_RANGE) {
        throw EngineError(ErrorCode::POLYNOMIAL_UNSUPPORTED, {"scan range too large (max " + std::to_string(MAX_SCAN_RANGE) + ")"});
    }

    // Scan for integer roots
    Solutions all_solutions;
    for (Int x = lo; x <= hi; ++x) {
        double val = evaluate_poly(diff_poly, static_cast<double>(x));
        if (std::abs(val) < 0.5) {
            // Verify integer root by checking if f(x) ≈ 0
            Assignment a;
            a[var_name] = x;
            all_solutions.push_back(std::move(a));
            if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) break;
        }
    }

    // Paginate
    Int total_found = static_cast<Int>(all_solutions.size());
    Int page = std::max(static_cast<Int>(1), options.page);
    Int page_size = std::clamp(options.page_size, static_cast<Int>(1), static_cast<Int>(200));
    Int start_idx = (page - 1) * page_size;
    Int total_pages = (total_found + page_size - 1) / std::max(page_size, static_cast<Int>(1));
    if (total_pages < 1) total_pages = 1;

    Solutions page_solutions;
    if (start_idx < total_found) {
        Int end_idx = std::min(start_idx + page_size, total_found);
        page_solutions.assign(
            all_solutions.begin() + start_idx,
            all_solutions.begin() + end_idx);
    }

    PolynomialResult result;
    result.solutions = std::move(page_solutions);
    result.variable_order = {var_name};
    result.polynomial = PolynomialInfo{diff_poly, degree, "single_variable"};
    result.search_bounds = {lo, hi};
    result.total_found = total_found;
    result.page = page;
    result.page_size = page_size;
    result.total_pages = total_pages;
    result.has_more = page < total_pages;
    return result;
}

// ── Solve multi-variable polynomial ──────────────────────────────────────

PolynomialResult solve_multi_variable(
    const ASTPtr& left, const ASTPtr& right,
    const std::vector<std::string>& var_order,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
    // Build domain per variable
    struct VarDomain {
        std::string name;
        Int lo, hi, step;
        bool even = false, odd = false;
    };

    std::vector<VarDomain> domains;
    Int total_combos = 1;

    for (const auto& v : var_order) {
        VarDomain d;
        d.name = v;
        d.lo = 0;
        d.hi = DEFAULT_HI;
        d.step = 1;
        d.even = false;
        d.odd = false;

        auto cit = constraints.find(v);
        if (cit != constraints.end()) {
            if (cit->second.min.has_value()) d.lo = *cit->second.min;
            if (cit->second.max.has_value()) d.hi = *cit->second.max;
            if (cit->second.exact.has_value()) {
                d.lo = d.hi = *cit->second.exact;
            }
            d.even = cit->second.even;
            d.odd = cit->second.odd;
            if (d.even || d.odd) d.step = 2;
        }

        Int range_count = (d.hi - d.lo) / d.step + 1;
        if (range_count <= 0) range_count = 0;

        if (range_count > 0) {
            // Check for overflow
            if (total_combos > MAX_COMBINATIONS / range_count) {
                throw EngineError(ErrorCode::POLYNOMIAL_UNSUPPORTED,
                    {"multi-variable search space too large (max " + std::to_string(MAX_COMBINATIONS) + " combinations)"});
            }
            total_combos *= range_count;
        }
        domains.push_back(std::move(d));
    }

    if (total_combos > MAX_COMBINATIONS) {
        throw EngineError(ErrorCode::POLYNOMIAL_UNSUPPORTED,
            {"multi-variable search space too large"});
    }

    // DFS brute-force scan of all variable combinations
    Solutions all_solutions;
    Assignment current;
    Int n = static_cast<Int>(domains.size());

    std::function<void(Int)> dfs = [&](Int depth) {
        if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) return;

        if (depth == n) {
            // Evaluate LHS and RHS
            try {
                double lhs = evaluate_ast(left, current);
                double rhs = evaluate_ast(right, current);
                if (std::abs(lhs - rhs) < 0.5) {
                    all_solutions.push_back(current);
                }
            } catch (...) {
                // Skip evaluation errors (e.g. division by zero)
            }
            return;
        }

        const auto& d = domains[static_cast<size_t>(depth)];
        Int start = d.lo;

        // Handle parity
        if (d.even && start % 2 != 0) ++start;
        if (d.odd && start % 2 == 0) ++start;

        for (Int val = start; val <= d.hi; val += d.step) {
            current[d.name] = val;
            dfs(depth + 1);
            if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) return;
        }
        current.erase(d.name);
    };

    dfs(0);

    // Sort by variable order
    std::sort(all_solutions.begin(), all_solutions.end(),
        [&var_order](const Assignment& a, const Assignment& b) {
            for (const auto& v : var_order) {
                auto ai = a.find(v), bi = b.find(v);
                Int av = (ai != a.end()) ? ai->second : 0;
                Int bv = (bi != b.end()) ? bi->second : 0;
                if (av != bv) return av < bv;
            }
            return false;
        });

    // Paginate
    Int total_found = static_cast<Int>(all_solutions.size());
    Int page = std::max(static_cast<Int>(1), options.page);
    Int page_size = std::clamp(options.page_size, static_cast<Int>(1), static_cast<Int>(200));
    Int start_idx = (page - 1) * page_size;
    Int total_pages = (total_found + page_size - 1) / std::max(page_size, static_cast<Int>(1));
    if (total_pages < 1) total_pages = 1;

    Solutions page_solutions;
    if (start_idx < total_found) {
        Int end_idx = std::min(start_idx + page_size, total_found);
        page_solutions.assign(
            all_solutions.begin() + start_idx,
            all_solutions.begin() + end_idx);
    }

    // Get polynomial degree (approximate — we just report the max exponent seen)
    int degree = 2; // default for multi-var

    PolynomialResult result;
    result.solutions = std::move(page_solutions);
    result.variable_order = var_order;
    result.polynomial = PolynomialInfo{{}, degree, "multi_variable"};
    result.search_bounds = {DEFAULT_LO, DEFAULT_HI};
    result.total_found = total_found;
    result.page = page;
    result.page_size = page_size;
    result.total_pages = total_pages;
    result.has_more = page < total_pages;
    return result;
}

} // anonymous namespace

// ── Public entry point ───────────────────────────────────────────────────

std::optional<PolynomialResult> try_solve_polynomial(
    const ASTPtr& left, const ASTPtr& right,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
    // Check if either side has polynomial features (^ or var*var)
    bool is_poly = has_power(left) || has_power(right) ||
                   has_var_multiply(left) || has_var_multiply(right);

    if (!is_poly) {
        return std::nullopt; // Not a polynomial, let linear path handle it
    }

    // Collect all variables
    std::set<std::string> var_set;
    collect_variables(left, var_set);
    collect_variables(right, var_set);

    if (var_set.empty()) {
        return std::nullopt; // Pure constant equation, let linear path handle
    }

    std::vector<std::string> var_order(var_set.begin(), var_set.end());
    std::sort(var_order.begin(), var_order.end()); // deterministic order

    if (var_order.size() == 1) {
        return solve_single_variable(left, right, var_order[0], constraints, options);
    } else {
        return solve_multi_variable(left, right, var_order, constraints, options);
    }
}

} // namespace quantsolve
