#include <napi.h>

#include "quantsolve/engine_runner.hpp"

#include <optional>
#include <string>

namespace {

using quantsolve::ConstraintInput;
using quantsolve::EngineResponse;
using quantsolve::Int;
using quantsolve::SolveOptions;
using quantsolve::UserConstraints;

std::optional<Int> parse_optional_int(const Napi::Value& v) {
    if (v.IsUndefined() || v.IsNull()) return std::nullopt;

    if (v.IsNumber()) {
        return static_cast<Int>(v.As<Napi::Number>().Int64Value());
    }

    if (v.IsString()) {
        const std::string s = v.As<Napi::String>().Utf8Value();
        if (s.empty()) return std::nullopt;
        try {
            size_t consumed = 0;
            long long val = std::stoll(s, &consumed, 10);
            (void)consumed;
            return static_cast<Int>(val);
        } catch (...) {
            return std::nullopt;
        }
    }

    return std::nullopt;
}

bool parse_bool_like(const Napi::Value& v) {
    if (v.IsBoolean()) return v.As<Napi::Boolean>().Value();
    if (v.IsString()) return v.As<Napi::String>().Utf8Value() == "true";
    return false;
}

Napi::Object to_js_assignment(Napi::Env env, const quantsolve::Assignment& a) {
    Napi::Object obj = Napi::Object::New(env);
    for (const auto& [k, v] : a) {
        obj.Set(k, Napi::Number::New(env, static_cast<double>(v)));
    }
    return obj;
}

Napi::Array to_js_solutions(Napi::Env env, const quantsolve::Solutions& sols) {
    Napi::Array arr = Napi::Array::New(env, sols.size());
    for (size_t i = 0; i < sols.size(); ++i) {
        arr.Set(i, to_js_assignment(env, sols[i]));
    }
    return arr;
}

Napi::Object to_js_formatted_result(Napi::Env env, const quantsolve::FormattedResult& fr) {
    Napi::Object out = Napi::Object::New(env);

    Napi::Array rows = Napi::Array::New(env, fr.rows.size());
    for (size_t i = 0; i < fr.rows.size(); ++i) {
        Napi::Object row = Napi::Object::New(env);
        row.Set("index", Napi::Number::New(env, static_cast<double>(fr.rows[i].index)));
        row.Set("assignments", to_js_assignment(env, fr.rows[i].assignments));
        row.Set("display", Napi::String::New(env, fr.rows[i].display));
        rows.Set(i, row);
    }

    Napi::Array warnings = Napi::Array::New(env, fr.warnings.size());
    for (size_t i = 0; i < fr.warnings.size(); ++i) {
        warnings.Set(i, Napi::String::New(env, fr.warnings[i]));
    }

    out.Set("rows", rows);
    out.Set("count", Napi::Number::New(env, static_cast<double>(fr.count)));
    out.Set("totalFound", Napi::Number::New(env, static_cast<double>(fr.total_found)));
    out.Set("page", Napi::Number::New(env, static_cast<double>(fr.page)));
    out.Set("pageSize", Napi::Number::New(env, static_cast<double>(fr.page_size)));
    out.Set("totalPages", Napi::Number::New(env, static_cast<double>(fr.total_pages)));
    out.Set("hasMore", Napi::Boolean::New(env, fr.has_more));
    out.Set("warnings", warnings);

    return out;
}

Napi::Value RunEngineWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "runEngine(input, constraints?, options?) expects input string")
                .ThrowAsJavaScriptException();
            return env.Null();
        }

        const std::string input = info[0].As<Napi::String>().Utf8Value();

        UserConstraints constraints;
        if (info.Length() > 1 && info[1].IsObject()) {
            Napi::Object cobj = info[1].As<Napi::Object>();
            Napi::Array names = cobj.GetPropertyNames();

            for (uint32_t i = 0; i < names.Length(); ++i) {
                std::string var = names.Get(i).As<Napi::String>().Utf8Value();
                Napi::Value val = cobj.Get(var);
                if (!val.IsObject()) continue;

                Napi::Object rule = val.As<Napi::Object>();
                ConstraintInput ci;

                if (rule.Has("min")) ci.min = parse_optional_int(rule.Get("min"));
                if (rule.Has("max")) ci.max = parse_optional_int(rule.Get("max"));
                if (rule.Has("exact")) ci.exact = parse_optional_int(rule.Get("exact"));
                if (rule.Has("even")) ci.even = parse_bool_like(rule.Get("even"));
                if (rule.Has("odd")) ci.odd = parse_bool_like(rule.Get("odd"));

                constraints[var] = ci;
            }
        }

        SolveOptions options;
        if (info.Length() > 2 && info[2].IsObject()) {
            Napi::Object o = info[2].As<Napi::Object>();
            if (o.Has("page") && o.Get("page").IsNumber()) {
                options.page = static_cast<Int>(o.Get("page").As<Napi::Number>().Int64Value());
            }
            if (o.Has("pageSize") && o.Get("pageSize").IsNumber()) {
                options.page_size = static_cast<Int>(o.Get("pageSize").As<Napi::Number>().Int64Value());
            }
        }

        EngineResponse r = quantsolve::run_engine(input, constraints, options);

        Napi::Object out = Napi::Object::New(env);
        out.Set("success", Napi::Boolean::New(env, r.success));
        out.Set("input", Napi::String::New(env, r.input));

        if (r.success) {
            Napi::Object coeffs = Napi::Object::New(env);
            for (const auto& [k, v] : r.coeffs) {
                coeffs.Set(k, Napi::Number::New(env, static_cast<double>(v)));
            }

            Napi::Array var_order = Napi::Array::New(env, r.variable_order.size());
            for (size_t i = 0; i < r.variable_order.size(); ++i) {
                var_order.Set(i, Napi::String::New(env, r.variable_order[i]));
            }

            Napi::Array warnings = Napi::Array::New(env, r.warnings.size());
            for (size_t i = 0; i < r.warnings.size(); ++i) {
                warnings.Set(i, Napi::String::New(env, r.warnings[i]));
            }

            Napi::Object meta = Napi::Object::New(env);
            meta.Set("variableCount", Napi::Number::New(env, static_cast<double>(r.meta.variable_count)));
            meta.Set("constraintCount", Napi::Number::New(env, static_cast<double>(r.meta.constraint_count)));
            meta.Set("astDepth", Napi::Number::New(env, static_cast<double>(r.meta.ast_depth)));
            meta.Set("solverType", Napi::String::New(env, r.meta.solver_type));
            meta.Set("polynomialDegree", Napi::Number::New(env, static_cast<double>(r.meta.polynomial_degree)));

            if (r.meta.search_bounds.has_value()) {
                Napi::Object bounds = Napi::Object::New(env);
                bounds.Set("lo", Napi::Number::New(env, static_cast<double>(r.meta.search_bounds->lo)));
                bounds.Set("hi", Napi::Number::New(env, static_cast<double>(r.meta.search_bounds->hi)));
                meta.Set("searchBounds", bounds);
            }

            // Polynomial info (if present)
            if (r.polynomial.has_value()) {
                Napi::Object poly = Napi::Object::New(env);
                poly.Set("degree", Napi::Number::New(env, static_cast<double>(r.polynomial->degree)));
                poly.Set("mode", Napi::String::New(env, r.polynomial->mode));

                Napi::Object polyCoeffs = Napi::Object::New(env);
                for (const auto& [deg, coeff] : r.polynomial->coefficients) {
                    polyCoeffs.Set(std::to_string(deg), Napi::Number::New(env, coeff));
                }
                poly.Set("coefficients", polyCoeffs);
                out.Set("polynomial", poly);
            }

            out.Set("coeffs", coeffs);
            out.Set("target", Napi::Number::New(env, static_cast<double>(r.target)));
            out.Set("variableOrder", var_order);
            out.Set("totalFound", Napi::Number::New(env, static_cast<double>(r.total_found)));
            out.Set("page", Napi::Number::New(env, static_cast<double>(r.page)));
            out.Set("pageSize", Napi::Number::New(env, static_cast<double>(r.page_size)));
            out.Set("totalPages", Napi::Number::New(env, static_cast<double>(r.total_pages)));
            out.Set("hasMore", Napi::Boolean::New(env, r.has_more));
            out.Set("solutions", to_js_solutions(env, r.solutions));
            out.Set("formattedResult", to_js_formatted_result(env, r.formatted_result));
            out.Set("warnings", warnings);
            out.Set("meta", meta);
        } else {
            Napi::Object fr = Napi::Object::New(env);
            fr.Set("rows", Napi::Array::New(env));
            fr.Set("count", Napi::Number::New(env, 0));
            fr.Set("warnings", Napi::Array::New(env));

            Napi::Object meta = Napi::Object::New(env);

            if (r.error_payload.has_value()) {
                out.Set("error", Napi::String::New(env, r.error_payload->error));
                out.Set("code", Napi::String::New(env, r.error_payload->code));
                out.Set("category", Napi::String::New(env, r.error_payload->category));
            }

            out.Set("solutions", Napi::Array::New(env));
            out.Set("formattedResult", fr);
            out.Set("warnings", Napi::Array::New(env));
            out.Set("meta", meta);
        }

        return out;
    } catch (const Napi::Error& e) {
        e.ThrowAsJavaScriptException();
        return env.Null();
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Native addon error: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Null();
    } catch (...) {
        Napi::Error::New(env, "Native addon unknown error")
            .ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("runEngine", Napi::Function::New(env, RunEngineWrapped));
    return exports;
}

} // namespace

NODE_API_MODULE(quantsolve_engine, Init)
