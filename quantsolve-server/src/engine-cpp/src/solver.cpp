#include "quantsolve/solver.hpp"

#include "quantsolve/constraint_engine.hpp"
#include "quantsolve/errors.hpp"

#include <algorithm>
#include <numeric>
#include <functional>

namespace quantsolve {

namespace {

Int gcd(Int a, Int b) {
    a = std::llabs(a);
    b = std::llabs(b);
    while (b != 0) {
        Int t = a % b;
        a = b;
        b = t;
    }
    return a;
}

Int gcd_array(const std::vector<Int>& arr) {
    if (arr.empty()) return 1;
    return std::accumulate(arr.begin() + 1, arr.end(), arr.front(), [](Int acc, Int v) { return gcd(acc, v); });
}

bool is_search_space_viable(
    const std::vector<Int>& ordered_coeffs,
    const std::vector<Constraint>& ordered_constraints,
    Int target,
    const std::vector<Int>& suffix_max) {

    const std::size_t n = ordered_coeffs.size();
    long long nodes_visited = 0;
    constexpr long long NODE_LIMIT = 10'000'000;

    std::function<void(std::size_t, Int)> probe = [&](std::size_t depth, Int remaining) {
        ++nodes_visited;
        if (nodes_visited > NODE_LIMIT) return;
        if (remaining < 0 || remaining > suffix_max[depth]) return;
        if (depth == n - 1) return;

        const Constraint& c = ordered_constraints[depth];
        const Int coeff = ordered_coeffs[depth];
        const Int hi = std::min<Int>(c.hi, remaining / coeff);

        for (Int xi = c.start; xi <= hi; xi += c.step) {
            probe(depth + 1, remaining - coeff * xi);
            if (nodes_visited > NODE_LIMIT) return;
        }
    };

    probe(0, target);
    return nodes_visited <= NODE_LIMIT;
}

} // namespace

SolveResult solve(const CoeffMap& coeffs, Int target, const UserConstraints& user_constraints, const SolveOptions& options) {
    ConstraintMap raw_constraints = build_constraints(coeffs, target, user_constraints);
    ExactReduced reduced = apply_exact_values(coeffs, target, raw_constraints);

    if (reduced.reduced_coeffs.empty()) {
        if (reduced.reduced_target == 0) {
            return SolveResult{{reduced.fixed_assignments}, 1, 1, 1, 1, false, false};
        }
        return SolveResult{{}, 0, 1, 50, 0, false, false};
    }

    ConstraintMap constraints = build_constraints(reduced.reduced_coeffs, reduced.reduced_target, user_constraints);

    std::vector<Int> coeff_vals;
    coeff_vals.reserve(reduced.reduced_coeffs.size());
    for (const auto& [_, c] : reduced.reduced_coeffs) coeff_vals.push_back(c);

    const Int g = gcd_array(coeff_vals);
    if (reduced.reduced_target % g != 0) {
        throw EngineError(ErrorCode::NO_SOLUTIONS);
    }

    std::vector<std::string> ordered_vars;
    ordered_vars.reserve(reduced.reduced_coeffs.size());
    for (const auto& [v, _] : reduced.reduced_coeffs) ordered_vars.push_back(v);
    std::sort(ordered_vars.begin(), ordered_vars.end(), [&](const std::string& a, const std::string& b) {
        return reduced.reduced_coeffs.at(a) > reduced.reduced_coeffs.at(b);
    });

    const std::size_t n = ordered_vars.size();

    std::vector<Int> ordered_coeffs;
    std::vector<Constraint> ordered_constraints;
    ordered_coeffs.reserve(n);
    ordered_constraints.reserve(n);

    for (const auto& v : ordered_vars) {
        ordered_coeffs.push_back(reduced.reduced_coeffs.at(v));
        ordered_constraints.push_back(constraints.at(v));
    }

    std::vector<Int> suffix_min(n + 1, 0);
    std::vector<Int> suffix_max(n + 1, 0);

    for (long long i = static_cast<long long>(n) - 1; i >= 0; --i) {
        const Constraint& c = ordered_constraints[static_cast<std::size_t>(i)];
        suffix_min[static_cast<std::size_t>(i)] = suffix_min[static_cast<std::size_t>(i) + 1] + ordered_coeffs[static_cast<std::size_t>(i)] * c.lo;
        suffix_max[static_cast<std::size_t>(i)] = suffix_max[static_cast<std::size_t>(i) + 1] + ordered_coeffs[static_cast<std::size_t>(i)] * c.hi;
    }

    if (!is_search_space_viable(ordered_coeffs, ordered_constraints, reduced.reduced_target, suffix_max)) {
        throw EngineError(ErrorCode::UNBOUNDED_SEARCH);
    }

    Solutions all_results;
    constexpr Int SOLUTION_CAP = 500'000;

    // Use mutable assignment — copy only on solution capture (not on every recursive call)
    Assignment partial;
    partial.reserve(n + reduced.fixed_assignments.size());

    std::function<void(std::size_t, Int)> backtrack = [&](std::size_t depth, Int remaining) {
        if (static_cast<Int>(all_results.size()) >= SOLUTION_CAP) return;
        if (remaining < suffix_min[depth] || remaining > suffix_max[depth]) return;

        const std::string& v = ordered_vars[depth];
        const Int coeff = ordered_coeffs[depth];
        const Constraint& c = ordered_constraints[depth];

        const Int effective_hi = std::min<Int>(c.hi, remaining / coeff);
        if (c.start > effective_hi) return;

        if (depth == n - 1) {
            for (Int xi = c.start; xi <= effective_hi; xi += c.step) {
                if (remaining - coeff * xi == 0) {
                    partial[v] = xi;
                    Assignment result = partial; // copy only on valid solution
                    for (const auto& [k, val] : reduced.fixed_assignments) {
                        result[k] = val;
                    }
                    all_results.push_back(std::move(result));
                    if (static_cast<Int>(all_results.size()) >= SOLUTION_CAP) return;
                }
            }
            partial.erase(v);
            return;
        }

        for (Int xi = c.start; xi <= effective_hi; xi += c.step) {
            partial[v] = xi;
            backtrack(depth + 1, remaining - coeff * xi);
            if (static_cast<Int>(all_results.size()) >= SOLUTION_CAP) return;
        }
        partial.erase(v);
    };

    backtrack(0, reduced.reduced_target);

    std::vector<std::string> original_order;
    original_order.reserve(coeffs.size());
    for (const auto& [v, _] : coeffs) original_order.push_back(v);

    std::sort(all_results.begin(), all_results.end(), [&](const Assignment& a, const Assignment& b) {
        for (const auto& var_name : original_order) {
            const Int av = a.count(var_name) ? a.at(var_name) : 0;
            const Int bv = b.count(var_name) ? b.at(var_name) : 0;
            if (av != bv) return av < bv;
        }
        return false;
    });

    const Int total_found = static_cast<Int>(all_results.size());
    const Int page = std::max<Int>(1, options.page);
    const Int page_size = std::min<Int>(200, std::max<Int>(1, options.page_size));

    const Int start_idx = (page - 1) * page_size;
    Solutions page_solutions;

    if (start_idx < total_found) {
        const Int end_idx = std::min<Int>(total_found, start_idx + page_size);
        page_solutions.insert(page_solutions.end(), all_results.begin() + start_idx, all_results.begin() + end_idx);
    }

    const Int total_pages = total_found == 0 ? 1 : ((total_found + page_size - 1) / page_size);

    return SolveResult{
        page_solutions,
        total_found,
        page,
        page_size,
        total_pages,
        page < total_pages,
        false,
    };
}

} // namespace quantsolve


