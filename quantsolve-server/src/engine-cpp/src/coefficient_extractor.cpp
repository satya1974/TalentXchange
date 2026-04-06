#include "quantsolve/coefficient_extractor.hpp"

#include "quantsolve/errors.hpp"

#include <cmath>
#include <stdexcept>

namespace quantsolve {

double evaluate_constant(const ASTPtr& node) {
    if (!node) {
        throw std::runtime_error("null node in evaluateConstant");
    }

    if (node->type == NodeType::Number) return static_cast<double>(node->value);

    if (node->type == NodeType::UnaryOp && node->op == '-') {
        return -evaluate_constant(node->operand);
    }

    if (node->type == NodeType::BinaryOp) {
        const double l = evaluate_constant(node->left);
        const double r = evaluate_constant(node->right);
        switch (node->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
            if (r == 0.0) throw EngineError(ErrorCode::DIVISION_BY_ZERO);
            return l / r;
        case '^': {
            if (r < 0.0 || std::llround(r) != static_cast<long long>(r)) {
                throw std::runtime_error("non-integer or negative exponent in constant");
            }
            return std::pow(l, r);
        }
        default:
            break;
        }
    }

    throw std::runtime_error("variable encountered in constant evaluation");
}

void extract(const ASTPtr& node, DoubleCoeffMap& out, double multiplier) {
    if (!node) return;

    switch (node->type) {
    case NodeType::Number:
        out["__constant"] += static_cast<double>(node->value) * multiplier;
        return;

    case NodeType::Variable:
        out[node->name] += multiplier;
        return;

    case NodeType::UnaryOp:
        if (node->op == '-') {
            extract(node->operand, out, -multiplier);
            return;
        }
        throw EngineError(ErrorCode::INTERNAL_ERROR, {std::string("Unknown unary op: ") + node->op});

    case NodeType::BinaryOp:
        switch (node->op) {
        case '+':
            extract(node->left, out, multiplier);
            extract(node->right, out, multiplier);
            return;

        case '-':
            extract(node->left, out, multiplier);
            extract(node->right, out, -multiplier);
            return;

        case '*': {
            double const_val = 0.0;
            ASTPtr var_side;
            bool ok = false;

            try {
                const_val = evaluate_constant(node->left);
                var_side = node->right;
                ok = true;
            } catch (...) {
                try {
                    const_val = evaluate_constant(node->right);
                    var_side = node->left;
                    ok = true;
                } catch (...) {
                    throw EngineError(ErrorCode::NON_LINEAR_TERM);
                }
            }

            if (!ok) {
                throw EngineError(ErrorCode::NON_LINEAR_TERM);
            }

            extract(var_side, out, multiplier * const_val);
            return;
        }

        case '/': {
            double denom_val = 0.0;
            try {
                denom_val = evaluate_constant(node->right);
            } catch (...) {
                const std::string var_name = (node->right && node->right->type == NodeType::Variable)
                    ? node->right->name
                    : "expression";
                throw EngineError(ErrorCode::VARIABLE_IN_DENOMINATOR, {var_name});
            }

            if (denom_val == 0.0) {
                throw EngineError(ErrorCode::DIVISION_BY_ZERO);
            }

            DoubleCoeffMap scratch;
            extract(node->left, scratch, multiplier / denom_val);

            for (const auto& [key, val] : scratch) {
                if (key != "__constant") {
                    const double rounded = std::round(val);
                    if (std::abs(val - rounded) > 1e-9) {
                        throw EngineError(ErrorCode::FRACTIONAL_COEFFICIENT, {key, std::to_string(val)});
                    }
                }
                out[key] += val;
            }
            return;
        }

        case '^':
            // Power with variable → non-linear; reject from linear path
            throw EngineError(ErrorCode::NON_LINEAR_TERM);

        default:
            throw EngineError(ErrorCode::INTERNAL_ERROR, {std::string("Unknown operator: ") + node->op});
        }

    default:
        throw EngineError(ErrorCode::INTERNAL_ERROR, {"Unknown AST node type"});
    }
}

} // namespace quantsolve
