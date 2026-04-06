#include "quantsolve/result_formatter.hpp"

namespace quantsolve {

FormattedResult format_results(const Solutions& solutions, const std::vector<std::string>& variable_order,
                               Int total_found, Int page, Int page_size, Int total_pages, bool has_more) {
    std::vector<std::string> order = variable_order;

    if (order.empty() && !solutions.empty()) {
        for (const auto& [k, _] : solutions.front()) {
            order.push_back(k);
        }
    }

    std::vector<FormattedRow> rows;
    rows.reserve(solutions.size());

    for (std::size_t i = 0; i < solutions.size(); ++i) {
        const auto& sol = solutions[i];
        std::string display;
        bool first = true;
        for (const auto& k : order) {
            if (!sol.count(k)) continue;
            if (!first) display += ",  ";
            display += k + " = " + std::to_string(sol.at(k));
            first = false;
        }

        rows.push_back(FormattedRow{
            (page - 1) * page_size + static_cast<Int>(i) + 1,
            sol,
            display,
        });
    }

    std::vector<std::string> warnings;
    if (has_more) {
        warnings.push_back(
            "Showing page " + std::to_string(page) + " of " + std::to_string(total_pages) +
            " - " + std::to_string(total_found) + " total combinations found. Use ?page=N to navigate or apply tighter constraints to reduce results.");
    }

    return FormattedResult{
        rows,
        static_cast<Int>(solutions.size()),
        total_found,
        page,
        page_size,
        total_pages,
        has_more,
        warnings,
    };
}

} // namespace quantsolve
