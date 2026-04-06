#pragma once

#include "quantsolve/types.hpp"

namespace quantsolve {

FormattedResult format_results(const Solutions& solutions, const std::vector<std::string>& variable_order,
                               Int total_found, Int page, Int page_size, Int total_pages, bool has_more);

} // namespace quantsolve
