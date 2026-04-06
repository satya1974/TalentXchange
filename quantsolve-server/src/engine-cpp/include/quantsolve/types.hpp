#pragma once

#include <map>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace quantsolve {

using Int = long long;

struct ConstraintInput {
    std::optional<Int> min;
    std::optional<Int> max;
    std::optional<Int> exact;
    bool even = false;
    bool odd = false;
};

struct Constraint {
    Int lo = 0;
    Int hi = 0;
    std::string parity = "any";
    std::optional<Int> exact;
    Int step = 1;
    Int start = 0;
};

using CoeffMap = std::unordered_map<std::string, Int>;
using UserConstraints = std::unordered_map<std::string, ConstraintInput>;
using ConstraintMap = std::unordered_map<std::string, Constraint>;
using Assignment = std::unordered_map<std::string, Int>;
using Solutions = std::vector<Assignment>;

struct SolveOptions {
    Int page = 1;
    Int page_size = 50;
};

struct SolveResult {
    Solutions solutions;
    Int total_found = 0;
    Int page = 1;
    Int page_size = 50;
    Int total_pages = 1;
    bool has_more = false;
    bool capped = false;
};

struct FormattedRow {
    Int index = 0;
    Assignment assignments;
    std::string display;
};

struct FormattedResult {
    std::vector<FormattedRow> rows;
    Int count = 0;
    Int total_found = 0;
    Int page = 1;
    Int page_size = 50;
    Int total_pages = 1;
    bool has_more = false;
    std::vector<std::string> warnings;
};

// Polynomial-specific types
using PolynomialMap = std::map<int, double>; // degree -> coefficient

struct PolynomialInfo {
    PolynomialMap coefficients;
    int degree = 0;
    std::string mode; // "single_variable" or "multi_variable"
};

struct PolynomialSearchBounds {
    Int lo = -100;
    Int hi = 100;
};

struct EngineMeta {
    Int variable_count = 0;
    Int constraint_count = 0;
    Int ast_depth = 0;
    std::string solver_type = "linear";
    Int polynomial_degree = 1;
    std::optional<PolynomialSearchBounds> search_bounds;
};

struct ErrorPayload {
    bool success = false;
    std::string error;
    std::string code;
    std::string category;
};

struct EngineResponse {
    bool success = false;
    std::string input;
    CoeffMap coeffs;
    Int target = 0;
    std::vector<std::string> variable_order;
    Int total_found = 0;
    Int page = 1;
    Int page_size = 50;
    Int total_pages = 1;
    bool has_more = false;
    Solutions solutions;
    FormattedResult formatted_result;
    std::vector<std::string> warnings;
    EngineMeta meta;
    std::optional<PolynomialInfo> polynomial;
    std::optional<ErrorPayload> error_payload;
};

} // namespace quantsolve
