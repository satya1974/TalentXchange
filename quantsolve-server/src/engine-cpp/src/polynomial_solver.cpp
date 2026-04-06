// polynomial_solver.cpp
// Solves polynomial equations (both single-variable and multi-variable)
// by scanning integer domains and evaluating the AST at each candidate point.
//
// Single-variable: Converts AST to polynomial map, scans [lo, hi].
// Multi-variable:  DFS over Cartesian product of domains, evaluates full AST.
//
// Error encoding: uses total_found sentinel values instead of throwing across
// DLL boundaries:
//   total_found == -1  →  NO_SOLUTIONS
//   total_found == -2  →  UNBOUNDED_SEARCH
//   total_found == -3  →  POLYNOMIAL_UNSUPPORTED
// engine_runner.cpp checks these and throws the correct EngineError locally.

#include "quantsolve/polynomial_solver.hpp"

#include "quantsolve/errors.hpp"
#include "quantsolve/types.hpp"

#include <algorithm>
#include <cmath>
#include <functional>
#include <limits>
#include <map>
#include <set>
#include <stdexcept>
#include <string>
#include <unordered_map>

namespace quantsolve {

namespace {

// ── Configuration ─────────────────────────────────────────────────────────
constexpr int    MAX_EXPONENT      = 8;
constexpr Int    MAX_SCAN_RANGE    = 200'000;
constexpr Int    MAX_COMBINATIONS  = 2'000'000;
constexpr Int    SOLUTION_CAP      = 500'000;
constexpr Int    DEFAULT_HI        = 100;  // default upper bound (non-negative)

// Error sentinels encoded in total_found
constexpr Int    SENTINEL_NO_SOLUTIONS      = -1;
constexpr Int    SENTINEL_UNBOUNDED_SEARCH  = -2;
constexpr Int    SENTINEL_POLY_UNSUPPORTED  = -3;

// ─── Helpers ──────────────────────────────────────────────────────────────

bool has_power(const ASTPtr& node) {
    if (!node) return false;
    if (node->type == NodeType::BinaryOp && node->op == '^') return true;
    if (node->type == NodeType::UnaryOp) return has_power(node->operand);
    if (node->type == NodeType::BinaryOp)
        return has_power(node->left) || has_power(node->right);
    return false;
}

bool has_var_multiply(const ASTPtr& node) {
    if (!node) return false;
    if (node->type == NodeType::BinaryOp && node->op == '*') {
        std::function<bool(const ASTPtr&)> has_var = [&](const ASTPtr& n) -> bool {
            if (!n) return false;
            if (n->type == NodeType::Variable) return true;
            if (n->type == NodeType::UnaryOp) return has_var(n->operand);
            if (n->type == NodeType::BinaryOp) return has_var(n->left) || has_var(n->right);
            return false;
        };
        if (has_var(node->left) && has_var(node->right)) return true;
    }
    if (node->type == NodeType::UnaryOp) return has_var_multiply(node->operand);
    if (node->type == NodeType::BinaryOp)
        return has_var_multiply(node->left) || has_var_multiply(node->right);
    return false;
}

void collect_variables(const ASTPtr& node, std::set<std::string>& vars) {
    if (!node) return;
    if (node->type == NodeType::Variable) { vars.insert(node->name); return; }
    if (node->type == NodeType::UnaryOp) { collect_variables(node->operand, vars); return; }
    if (node->type == NodeType::BinaryOp) {
        collect_variables(node->left, vars);
        collect_variables(node->right, vars);
    }
}

// Forward declaration for mutual recursion
double eval_const_node(const ASTPtr& n);

double eval_const_node(const ASTPtr& n) {
    if (!n) return 0.0;
    if (n->type == NodeType::Number) return static_cast<double>(n->value);
    if (n->type == NodeType::UnaryOp && n->op == '-') return -eval_const_node(n->operand);
    if (n->type == NodeType::BinaryOp) {
        double l = eval_const_node(n->left), r = eval_const_node(n->right);
        switch (n->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r != 0.0 ? l / r : 0.0;
        case '^': return std::pow(l, r);
        }
    }
    // Variable in expression → not a constant, signal via NaN
    return std::numeric_limits<double>::quiet_NaN();
}

// Returns the maximum exponent that 'var_name' appears with in the AST.
// e.g. x²+x → 2,  x³ → 3,  x (linear) → 1
// Used to decide if default domain should be symmetric (even) or ≥0 (odd/linear).
int max_exponent_for_var(const ASTPtr& node, const std::string& var_name) {
    if (!node) return 0;
    switch (node->type) {
    case NodeType::Number:
        return 0;
    case NodeType::Variable:
        return (node->name == var_name) ? 1 : 0;
    case NodeType::UnaryOp:
        return max_exponent_for_var(node->operand, var_name);
    case NodeType::BinaryOp:
        switch (node->op) {
        case '+': case '-':
            return std::max(max_exponent_for_var(node->left,  var_name),
                            max_exponent_for_var(node->right, var_name));
        case '*':
            return max_exponent_for_var(node->left,  var_name)
                 + max_exponent_for_var(node->right, var_name);
        case '^': {
            int base_exp = max_exponent_for_var(node->left, var_name);
            if (base_exp == 0) return 0; // var not in base
            double exp_val = eval_const_node(node->right);
            if (!std::isnan(exp_val)) {
                int exp_int = static_cast<int>(exp_val);
                if (std::abs(exp_val - exp_int) < 1e-9 && exp_int >= 0 && exp_int <= MAX_EXPONENT)
                    return base_exp * exp_int;
            }
            return base_exp;
        }
        default:
            return 0;
        }
    }
    return 0;
}

// Decide the default lo for a variable given its max exponent in the equation.
// Even degree (x², x⁴…): negatives get absorbed by squaring → symmetric [-hi, hi]
// Odd / linear (x, x³…): per PS, stock units are non-negative → [0, hi]
Int default_lo_for_var(
    const ASTPtr& left, const ASTPtr& right,
    const std::string& var_name)
{
    int max_exp = std::max(max_exponent_for_var(left,  var_name),
                           max_exponent_for_var(right, var_name));
    if (max_exp >= 2 && max_exp % 2 == 0) return -DEFAULT_HI;
    return 0;
}

// ── Polynomial arithmetic helpers ─────────────────────────────────────────

double evaluate_ast(const ASTPtr& node,
                    const std::unordered_map<std::string, Int>& assignment) {
    if (!node) throw std::runtime_error("null node");
    switch (node->type) {
    case NodeType::Number:   return static_cast<double>(node->value);
    case NodeType::Variable: {
        auto it = assignment.find(node->name);
        if (it == assignment.end()) throw std::runtime_error("unassigned: " + node->name);
        return static_cast<double>(it->second);
    }
    case NodeType::UnaryOp:
        if (node->op == '-') return -evaluate_ast(node->operand, assignment);
        throw std::runtime_error("unknown unary op");
    case NodeType::BinaryOp: {
        double l = evaluate_ast(node->left,  assignment);
        double r = evaluate_ast(node->right, assignment);
        switch (node->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': if (r == 0.0) throw EngineError(ErrorCode::DIVISION_BY_ZERO); return l / r;
        case '^': return std::pow(l, r);
        default:  throw std::runtime_error("unknown binary op");
        }
    }
    }
    throw std::runtime_error("unknown node type");
}

using PolynomialMap = std::map<int, double>;

bool ast_to_poly(const ASTPtr& node, const std::string& var,
                 PolynomialMap& out, double multiplier) {
    if (!node) return false;
    switch (node->type) {
    case NodeType::Number:
        out[0] += static_cast<double>(node->value) * multiplier;
        return true;
    case NodeType::Variable:
        if (node->name == var) { out[1] += multiplier; return true; }
        return false; // another variable — not a single-var polynomial
    case NodeType::UnaryOp:
        if (node->op == '-') return ast_to_poly(node->operand, var, out, -multiplier);
        return false;
    case NodeType::BinaryOp:
        switch (node->op) {
        case '+': return ast_to_poly(node->left,  var, out,  multiplier)
                      && ast_to_poly(node->right, var, out,  multiplier);
        case '-': return ast_to_poly(node->left,  var, out,  multiplier)
                      && ast_to_poly(node->right, var, out, -multiplier);
        case '*': {
            PolynomialMap lp, rp;
            if (!ast_to_poly(node->left, var, lp, 1.0)) return false;
            if (!ast_to_poly(node->right, var, rp, 1.0)) return false;
            for (const auto& [dl, cl] : lp)
                for (const auto& [dr, cr] : rp) {
                    int deg = dl + dr;
                    if (deg > MAX_EXPONENT) return false;
                    out[deg] += cl * cr * multiplier;
                }
            return true;
        }
        case '/': {
            PolynomialMap rp;
            if (!ast_to_poly(node->right, var, rp, 1.0)) return false;
            double denom = 0.0; bool all_const = true;
            for (const auto& [d, c] : rp) { if (d != 0) { all_const = false; break; } denom = c; }
            if (!all_const || denom == 0.0) return false;
            return ast_to_poly(node->left, var, out, multiplier / denom);
        }
        case '^': {
            std::unordered_map<std::string, Int> empty;
            double exp_val;
            try { exp_val = evaluate_ast(node->right, empty); } catch (...) { return false; }
            int exp_int = static_cast<int>(exp_val);
            if (std::abs(exp_val - exp_int) > 1e-9 || exp_int < 0 || exp_int > MAX_EXPONENT) return false;
            PolynomialMap bp;
            if (!ast_to_poly(node->left, var, bp, 1.0)) return false;
            PolynomialMap result; result[0] = 1.0;
            for (int i = 0; i < exp_int; ++i) {
                PolynomialMap temp;
                for (const auto& [d1, c1] : result)
                    for (const auto& [d2, c2] : bp) {
                        int deg = d1 + d2;
                        if (deg > MAX_EXPONENT) return false;
                        temp[deg] += c1 * c2;
                    }
                result = std::move(temp);
            }
            for (const auto& [d, c] : result) out[d] += c * multiplier;
            return true;
        }
        default: return false;
        }
    }
    return false;
}

double evaluate_poly(const PolynomialMap& poly, double x) {
    double total = 0.0;
    for (const auto& [deg, coeff] : poly) total += coeff * std::pow(x, deg);
    return total;
}

int poly_degree(const PolynomialMap& poly) {
    int max_deg = 0;
    for (const auto& [deg, coeff] : poly)
        if (std::abs(coeff) > 1e-12 && deg > max_deg) max_deg = deg;
    return max_deg;
}

// ─── Single-variable solver ───────────────────────────────────────────────

PolynomialResult solve_single_variable(
    const ASTPtr& left, const ASTPtr& right,
    const std::string& var_name,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
    PolynomialMap left_poly, right_poly, diff_poly;
    bool l_ok = ast_to_poly(left,  var_name, left_poly,  1.0);
    bool r_ok = ast_to_poly(right, var_name, right_poly, 1.0);

    if (!l_ok || !r_ok) {
        PolynomialResult err;
        err.total_found = SENTINEL_POLY_UNSUPPORTED;
        return err;
    }

    for (const auto& [d, c] : left_poly)  diff_poly[d] += c;
    for (const auto& [d, c] : right_poly) diff_poly[d] -= c;
    for (auto it = diff_poly.begin(); it != diff_poly.end(); )
        if (std::abs(it->second) < 1e-12) it = diff_poly.erase(it); else ++it;

    int degree = poly_degree(diff_poly);
    if (degree == 0) {
        PolynomialResult err; err.total_found = SENTINEL_NO_SOLUTIONS; return err;
    }

    // ── Determine search bounds with parity-smart defaults ────────────────
    // Even degree: negative inputs still valid (e.g. x²=4 → x=±2)
    // Odd / linear: non-negative only (stock units per PS)
    Int lo = default_lo_for_var(left, right, var_name);
    Int hi = DEFAULT_HI;

    auto cit = constraints.find(var_name);
    if (cit != constraints.end()) {
        if (cit->second.min.has_value()) lo = *cit->second.min; // user overrides
        if (cit->second.max.has_value()) hi = *cit->second.max;
        if (cit->second.exact.has_value()) lo = hi = *cit->second.exact;
    }

    if (hi - lo + 1 > MAX_SCAN_RANGE) {
        PolynomialResult err; err.total_found = SENTINEL_UNBOUNDED_SEARCH; return err;
    }

    Solutions all_solutions;
    for (Int x = lo; x <= hi; ++x) {
        if (std::abs(evaluate_poly(diff_poly, static_cast<double>(x))) < 0.5) {
            Assignment a; a[var_name] = x;
            all_solutions.push_back(std::move(a));
            if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) break;
        }
    }

    if (all_solutions.empty()) {
        PolynomialResult err; err.total_found = SENTINEL_NO_SOLUTIONS; return err;
    }

    Int total_found = static_cast<Int>(all_solutions.size());
    Int page       = std::max(static_cast<Int>(1), options.page);
    Int page_size  = std::clamp(options.page_size, static_cast<Int>(1), static_cast<Int>(200));
    Int start_idx  = (page - 1) * page_size;
    Int total_pages = std::max(static_cast<Int>(1),
                                (total_found + page_size - 1) / page_size);

    Solutions page_solutions;
    if (start_idx < total_found) {
        Int end_idx = std::min(start_idx + page_size, total_found);
        page_solutions.assign(all_solutions.begin() + start_idx,
                              all_solutions.begin() + end_idx);
    }

    PolynomialResult result;
    result.solutions     = std::move(page_solutions);
    result.variable_order = {var_name};
    result.polynomial    = PolynomialInfo{diff_poly, degree, "single_variable"};
    result.search_bounds = {lo, hi};
    result.total_found   = total_found;
    result.page          = page;
    result.page_size     = page_size;
    result.total_pages   = total_pages;
    result.has_more      = page < total_pages;
    return result;
}

// ─── Multi-variable solver ────────────────────────────────────────────────

PolynomialResult solve_multi_variable(
    const ASTPtr& left, const ASTPtr& right,
    const std::vector<std::string>& var_order,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
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
        // Parity-smart default: even-degree vars get symmetric range
        d.lo   = default_lo_for_var(left, right, v);
        d.hi   = DEFAULT_HI;
        d.step = 1;
        d.even = false;
        d.odd  = false;

        auto cit = constraints.find(v);
        if (cit != constraints.end()) {
            if (cit->second.min.has_value()) d.lo = *cit->second.min; // user overrides
            if (cit->second.max.has_value()) d.hi = *cit->second.max;
            if (cit->second.exact.has_value()) d.lo = d.hi = *cit->second.exact;
            d.even = cit->second.even;
            d.odd  = cit->second.odd;
            if (d.even || d.odd) d.step = 2;
        }

        Int range_count = (d.hi - d.lo) / d.step + 1;
        if (range_count <= 0) range_count = 0;

        if (range_count > 0) {
            if (total_combos > MAX_COMBINATIONS / range_count) {
                PolynomialResult err; err.total_found = SENTINEL_UNBOUNDED_SEARCH; return err;
            }
            total_combos *= range_count;
        }
        domains.push_back(std::move(d));
    }

    if (total_combos > MAX_COMBINATIONS) {
        PolynomialResult err; err.total_found = SENTINEL_UNBOUNDED_SEARCH; return err;
    }

    Solutions all_solutions;
    Assignment current;
    Int n = static_cast<Int>(domains.size());

    std::function<void(Int)> dfs = [&](Int depth) {
        if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) return;
        if (depth == n) {
            try {
                double lhs = evaluate_ast(left,  current);
                double rhs = evaluate_ast(right, current);
                if (std::abs(lhs - rhs) < 0.5) all_solutions.push_back(current);
            } catch (...) {}
            return;
        }
        const auto& d = domains[static_cast<size_t>(depth)];
        Int start = d.lo;
        if (d.even && start % 2 != 0) ++start;
        if (d.odd  && start % 2 == 0) ++start;
        for (Int val = start; val <= d.hi; val += d.step) {
            current[d.name] = val;
            dfs(depth + 1);
            if (static_cast<Int>(all_solutions.size()) >= SOLUTION_CAP) return;
        }
        current.erase(d.name);
    };

    dfs(0);

    if (all_solutions.empty()) {
        PolynomialResult err; err.total_found = SENTINEL_NO_SOLUTIONS; return err;
    }

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

    Int total_found = static_cast<Int>(all_solutions.size());
    Int page       = std::max(static_cast<Int>(1), options.page);
    Int page_size  = std::clamp(options.page_size, static_cast<Int>(1), static_cast<Int>(200));
    Int start_idx  = (page - 1) * page_size;
    Int total_pages = std::max(static_cast<Int>(1),
                                (total_found + page_size - 1) / page_size);

    Solutions page_solutions;
    if (start_idx < total_found) {
        Int end_idx = std::min(start_idx + page_size, total_found);
        page_solutions.assign(all_solutions.begin() + start_idx,
                              all_solutions.begin() + end_idx);
    }

    // Report degree from max exponent across all variables
    int max_deg = 0;
    for (const auto& v : var_order)
        max_deg = std::max(max_deg, std::max(max_exponent_for_var(left,  v),
                                             max_exponent_for_var(right, v)));

    PolynomialResult result;
    result.solutions      = std::move(page_solutions);
    result.variable_order = var_order;
    result.polynomial     = PolynomialInfo{{}, max_deg, "multi_variable"};
    result.search_bounds  = {domains.empty() ? Int(0) : domains[0].lo, DEFAULT_HI};
    result.total_found    = total_found;
    result.page           = page;
    result.page_size      = page_size;
    result.total_pages    = total_pages;
    result.has_more       = page < total_pages;
    return result;
}

} // anonymous namespace

// ── Public entry point ────────────────────────────────────────────────────

std::optional<PolynomialResult> try_solve_polynomial(
    const ASTPtr& left, const ASTPtr& right,
    const UserConstraints& constraints,
    const SolveOptions& options)
{
    bool is_poly = has_power(left)         || has_power(right) ||
                   has_var_multiply(left)  || has_var_multiply(right);
    if (!is_poly) return std::nullopt;

    std::set<std::string> var_set;
    collect_variables(left,  var_set);
    collect_variables(right, var_set);
    if (var_set.empty()) return std::nullopt;

    std::vector<std::string> var_order(var_set.begin(), var_set.end());
    std::sort(var_order.begin(), var_order.end());

    if (var_order.size() == 1)
        return solve_single_variable(left, right, var_order[0], constraints, options);
    else
        return solve_multi_variable(left, right, var_order, constraints, options);
}

} // namespace quantsolve
