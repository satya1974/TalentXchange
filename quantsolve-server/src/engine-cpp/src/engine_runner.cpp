#include "quantsolve/engine_runner.hpp"

#include "quantsolve/error_handler.hpp"
#include "quantsolve/lexer.hpp"
#include "quantsolve/normalizer.hpp"
#include "quantsolve/parser.hpp"
#include "quantsolve/polynomial_solver.hpp"
#include "quantsolve/result_formatter.hpp"
#include "quantsolve/solver.hpp"

#include <algorithm>
#include <cctype>

namespace quantsolve {

namespace {

std::string clean_whitespace(const std::string& in) {
    std::string out;
    out.reserve(in.size());
    bool prev_space = false;
    for (unsigned char c : in) {
        if (std::isspace(c)) {
            if (!prev_space) out.push_back(' ');
            prev_space = true;
        } else {
            out.push_back(static_cast<char>(c));
            prev_space = false;
        }
    }
    if (!out.empty() && out.front() == ' ') out.erase(out.begin());
    if (!out.empty() && out.back() == ' ') out.pop_back();
    return out;
}

int tree_depth(const ASTPtr& node) {
    if (!node) return 0;
    if (node->type == NodeType::Number || node->type == NodeType::Variable) return 1;
    if (node->type == NodeType::UnaryOp) return 1 + tree_depth(node->operand);
    return 1 + std::max(tree_depth(node->left), tree_depth(node->right));
}

} // namespace

EngineResponse run_engine(const std::string& input,
                          const UserConstraints& user_constraints,
                          const SolveOptions& options) {
    try {
        if (input.empty()) {
            throw EngineError(ErrorCode::EMPTY_INPUT);
        }

        const std::string cleaned_input = clean_whitespace(input);
        if (cleaned_input.empty()) {
            throw EngineError(ErrorCode::EMPTY_INPUT);
        }

        const auto tokens = lexer(cleaned_input);
        Parser parser(tokens);
        auto [left, right] = parser.parse_equation();

        SolveOptions worker_options = options;
        if (worker_options.page <= 0) worker_options.page = 1;
        if (worker_options.page_size <= 0) worker_options.page_size = 50;

        // Try polynomial path first.
        // try_solve_polynomial NEVER throws — errors are sentinel negative values in total_found:
        //   -1 = NO_SOLUTIONS,  -2 = UNBOUNDED_SEARCH,  -3 = POLYNOMIAL_UNSUPPORTED
        // We build the error EngineResponse with raw string literals — no exceptions,
        // no RTTI, no EngineError construction — 100% cross-ABI safe.
        auto poly_result = try_solve_polynomial(left, right, user_constraints, worker_options);

        if (poly_result.has_value()) {
            if (poly_result->total_found < 0) {
                // Build error payload directly — no throw, no EngineError needed
                ErrorPayload ep;
                ep.success = false;
                if (poly_result->total_found == -1) {
                    ep.code     = "NO_SOLUTIONS";
                    ep.error    = "No whole-number solutions exist in the search domain.";
                    ep.category = "solver";
                } else if (poly_result->total_found == -2) {
                    ep.code     = "UNBOUNDED_SEARCH";
                    ep.error    = "Infinite answers detected. Please apply market limits.";
                    ep.category = "semantic";
                } else {
                    ep.code     = "POLYNOMIAL_UNSUPPORTED";
                    ep.error    = "Cannot convert equation to polynomial form.";
                    ep.category = "semantic";
                }
                EngineResponse err;
                err.success          = false;
                err.input            = cleaned_input;
                err.solutions        = {};
                err.formatted_result = FormattedResult{};
                err.warnings         = {};
                err.meta             = EngineMeta{};
                err.error_payload    = ep;
                return err;
            }

            auto& poly = *poly_result;
            FormattedResult formatted = format_results(
                poly.solutions,
                poly.variable_order,
                poly.total_found,
                poly.page,
                poly.page_size,
                poly.total_pages,
                poly.has_more
            );

            EngineResponse response;
            response.success = true;
            response.input = cleaned_input;
            response.coeffs = {};
            response.target = 0;
            response.variable_order = poly.variable_order;
            response.total_found = poly.total_found;
            response.page = poly.page;
            response.page_size = poly.page_size;
            response.total_pages = poly.total_pages;
            response.has_more = poly.has_more;
            response.solutions = poly.solutions;
            response.formatted_result = formatted;
            response.warnings = formatted.warnings;
            response.polynomial = poly.polynomial;
            response.meta = EngineMeta{
                static_cast<Int>(poly.variable_order.size()),
                static_cast<Int>(user_constraints.size()),
                tree_depth(left),
                "polynomial",
                static_cast<Int>(poly.polynomial.degree),
                poly.search_bounds,
            };

            return response;
        }


        auto norm = normalize_equation(left, right);

        std::vector<std::string> variable_order;
        variable_order.reserve(norm.coeffs.size());
        for (const auto& [k, _] : norm.coeffs) variable_order.push_back(k);
        std::sort(variable_order.begin(), variable_order.end()); // deterministic

        SolveResult solve_result = solve(norm.coeffs, norm.target, user_constraints, worker_options);

        FormattedResult formatted = format_results(
            solve_result.solutions,
            variable_order,
            solve_result.total_found,
            solve_result.page,
            solve_result.page_size,
            solve_result.total_pages,
            solve_result.has_more
        );

        EngineResponse response;
        response.success = true;
        response.input = cleaned_input;
        response.coeffs = norm.coeffs;
        response.target = norm.target;
        response.variable_order = variable_order;
        response.total_found = solve_result.total_found;
        response.page = solve_result.page;
        response.page_size = solve_result.page_size;
        response.total_pages = solve_result.total_pages;
        response.has_more = solve_result.has_more;
        response.solutions = solve_result.solutions;
        response.formatted_result = formatted;
        response.warnings = formatted.warnings;
        response.meta = EngineMeta{
            static_cast<Int>(norm.coeffs.size()),
            static_cast<Int>(user_constraints.size()),
            tree_depth(left),
            "linear",
            1,
        };

        return response;
    } catch (const std::exception& err) {
        EngineResponse response;
        response.success = false;
        response.input = input;
        response.solutions = {};
        response.formatted_result = FormattedResult{};
        response.warnings = {};
        response.meta = EngineMeta{};
        response.error_payload = handle_error(err);
        return response;
    }
}

} // namespace quantsolve
