#include "quantsolve/engine_runner.hpp"

#include <algorithm>
#include <cctype>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

std::string json_escape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 16);
    for (unsigned char c : s) {
        switch (c) {
        case '"': out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\b': out += "\\b"; break;
        case '\f': out += "\\f"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:
            if (c < 0x20) {
                const char* hex = "0123456789abcdef";
                out += "\\u00";
                out.push_back(hex[(c >> 4) & 0x0F]);
                out.push_back(hex[c & 0x0F]);
            } else {
                out.push_back(static_cast<char>(c));
            }
        }
    }
    return out;
}

std::string q(const std::string& s) {
    return std::string("\"") + json_escape(s) + "\"";
}

bool parse_int64(const std::string& s, long long& out) {
    try {
        size_t idx = 0;
        long long v = std::stoll(s, &idx, 10);
        if (idx != s.size()) return false;
        out = v;
        return true;
    } catch (...) {
        return false;
    }
}

std::string bool_json(bool v) {
    return v ? "true" : "false";
}

std::string assignment_json(const quantsolve::Assignment& a) {
    std::vector<std::string> keys;
    keys.reserve(a.size());
    for (const auto& [k, _] : a) keys.push_back(k);
    std::sort(keys.begin(), keys.end());

    std::ostringstream os;
    os << "{";
    bool first = true;
    for (const auto& k : keys) {
        if (!first) os << ",";
        first = false;
        os << q(k) << ":" << a.at(k);
    }
    os << "}";
    return os.str();
}

std::string array_of_assignments_json(const quantsolve::Solutions& sols) {
    std::ostringstream os;
    os << "[";
    for (size_t i = 0; i < sols.size(); ++i) {
        if (i) os << ",";
        os << assignment_json(sols[i]);
    }
    os << "]";
    return os.str();
}

std::string string_array_json(const std::vector<std::string>& items) {
    std::ostringstream os;
    os << "[";
    for (size_t i = 0; i < items.size(); ++i) {
        if (i) os << ",";
        os << q(items[i]);
    }
    os << "]";
    return os.str();
}

std::string coeffs_json(const quantsolve::CoeffMap& coeffs) {
    std::vector<std::string> keys;
    keys.reserve(coeffs.size());
    for (const auto& [k, _] : coeffs) keys.push_back(k);
    std::sort(keys.begin(), keys.end());

    std::ostringstream os;
    os << "{";
    bool first = true;
    for (const auto& k : keys) {
        if (!first) os << ",";
        first = false;
        os << q(k) << ":" << coeffs.at(k);
    }
    os << "}";
    return os.str();
}

std::string formatted_json(const quantsolve::FormattedResult& fr) {
    std::ostringstream os;
    os << "{";
    os << q("rows") << ":[";
    for (size_t i = 0; i < fr.rows.size(); ++i) {
        if (i) os << ",";
        os << "{";
        os << q("index") << ":" << fr.rows[i].index << ",";
        os << q("assignments") << ":" << assignment_json(fr.rows[i].assignments) << ",";
        os << q("display") << ":" << q(fr.rows[i].display);
        os << "}";
    }
    os << "],";
    os << q("count") << ":" << fr.count << ",";
    os << q("totalFound") << ":" << fr.total_found << ",";
    os << q("page") << ":" << fr.page << ",";
    os << q("pageSize") << ":" << fr.page_size << ",";
    os << q("totalPages") << ":" << fr.total_pages << ",";
    os << q("hasMore") << ":" << bool_json(fr.has_more) << ",";
    os << q("warnings") << ":" << string_array_json(fr.warnings);
    os << "}";
    return os.str();
}

std::string response_json(const quantsolve::EngineResponse& r) {
    std::ostringstream os;
    os << "{";
    os << q("success") << ":" << bool_json(r.success) << ",";
    os << q("input") << ":" << q(r.input) << ",";

    if (r.success) {
        os << q("coeffs") << ":" << coeffs_json(r.coeffs) << ",";
        os << q("target") << ":" << r.target << ",";
        os << q("variableOrder") << ":" << string_array_json(r.variable_order) << ",";
        os << q("totalFound") << ":" << r.total_found << ",";
        os << q("page") << ":" << r.page << ",";
        os << q("pageSize") << ":" << r.page_size << ",";
        os << q("totalPages") << ":" << r.total_pages << ",";
        os << q("hasMore") << ":" << bool_json(r.has_more) << ",";
        os << q("solutions") << ":" << array_of_assignments_json(r.solutions) << ",";
        os << q("formattedResult") << ":" << formatted_json(r.formatted_result) << ",";
        os << q("warnings") << ":" << string_array_json(r.warnings) << ",";
        os << q("meta") << ":{";
        os << q("variableCount") << ":" << r.meta.variable_count << ",";
        os << q("constraintCount") << ":" << r.meta.constraint_count << ",";
        os << q("astDepth") << ":" << r.meta.ast_depth << ",";
        os << q("solverType") << ":" << q(r.meta.solver_type) << ",";
        os << q("polynomialDegree") << ":" << r.meta.polynomial_degree;
        if (r.meta.search_bounds.has_value()) {
            os << "," << q("searchBounds") << ":{";
            os << q("lo") << ":" << r.meta.search_bounds->lo << ",";
            os << q("hi") << ":" << r.meta.search_bounds->hi;
            os << "}";
        }
        os << "}";

        // Polynomial info
        if (r.polynomial.has_value()) {
            os << "," << q("polynomial") << ":{";
            os << q("degree") << ":" << r.polynomial->degree << ",";
            os << q("mode") << ":" << q(r.polynomial->mode) << ",";
            os << q("coefficients") << ":{";
            bool pfirst = true;
            for (const auto& [deg, coeff] : r.polynomial->coefficients) {
                if (!pfirst) os << ",";
                pfirst = false;
                os << q(std::to_string(deg)) << ":" << coeff;
            }
            os << "}}";
        }
    } else {
        const auto e = r.error_payload;
        os << q("error") << ":" << q(e.has_value() ? e->error : std::string("An unexpected error occurred.")) << ",";
        os << q("code") << ":" << q(e.has_value() ? e->code : std::string("INTERNAL_ERROR")) << ",";
        os << q("category") << ":" << q(e.has_value() ? e->category : std::string("internal")) << ",";
        os << q("solutions") << ":[] ,";
        os << q("formattedResult") << ":{" << q("rows") << ":[] ," << q("count") << ":0," << q("warnings") << ":[]} ,";
        os << q("warnings") << ":[],";
        os << q("meta") << ":{}";
    }

    os << "}";
    return os.str();
}

} // namespace

int main(int argc, char** argv) {
    std::string equation;
    quantsolve::UserConstraints constraints;
    quantsolve::SolveOptions options;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];

        if (arg == "--equation" && i + 1 < argc) {
            equation = argv[++i];
            continue;
        }
        if (arg == "--page" && i + 1 < argc) {
            long long v = 1;
            if (parse_int64(argv[++i], v)) options.page = v;
            continue;
        }
        if (arg == "--pageSize" && i + 1 < argc) {
            long long v = 50;
            if (parse_int64(argv[++i], v)) options.page_size = v;
            continue;
        }
        if (arg == "--constraint" && i + 7 < argc) {
            std::string var = argv[++i];
            std::string smin = argv[++i];
            std::string smax = argv[++i];
            std::string sexact = argv[++i];
            std::string seven = argv[++i];
            std::string sodd = argv[++i];
            std::string _reserved = argv[++i];
            (void)_reserved;

            quantsolve::ConstraintInput ci;
            long long v = 0;
            if (smin != "-" && parse_int64(smin, v)) ci.min = v;
            if (smax != "-" && parse_int64(smax, v)) ci.max = v;
            if (sexact != "-" && parse_int64(sexact, v)) ci.exact = v;
            ci.even = (seven == "1" || seven == "true");
            ci.odd = (sodd == "1" || sodd == "true");
            constraints[var] = ci;
            continue;
        }
    }

    quantsolve::EngineResponse r = quantsolve::run_engine(equation, constraints, options);
    std::cout << response_json(r);
    return r.success ? 0 : 2;
}
