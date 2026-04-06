#include "quantsolve/parser.hpp"

#include "quantsolve/errors.hpp"

#include <cmath>
#include <optional>

namespace quantsolve {

namespace {

std::optional<double> eval_constant_or_null(const ASTPtr& node) {
    if (!node) return std::nullopt;

    if (node->type == NodeType::Number) return static_cast<double>(node->value);

    if (node->type == NodeType::Variable) return std::nullopt;

    if (node->type == NodeType::UnaryOp && node->op == '-') {
        auto v = eval_constant_or_null(node->operand);
        if (!v.has_value()) return std::nullopt;
        return -(*v);
    }

    if (node->type == NodeType::BinaryOp) {
        auto l = eval_constant_or_null(node->left);
        auto r = eval_constant_or_null(node->right);
        if (!l.has_value() || !r.has_value()) return std::nullopt;

        switch (node->op) {
        case '+': return *l + *r;
        case '-': return *l - *r;
        case '*': return *l * *r;
        case '/':
            if (*r == 0.0) return std::nullopt;
            return *l / *r;
        case '^':
            if (*r < 0.0 || std::llround(*r) != *r) return std::nullopt;
            return std::pow(*l, *r);
        default: return std::nullopt;
        }
    }

    return std::nullopt;
}

} // namespace

bool contains_variable(const ASTPtr& node) {
    if (!node) return false;
    if (node->type == NodeType::Variable) return true;
    if (node->type == NodeType::Number) return false;
    if (node->type == NodeType::UnaryOp) return contains_variable(node->operand);
    if (node->type == NodeType::BinaryOp) {
        return contains_variable(node->left) || contains_variable(node->right);
    }
    return false;
}

Parser::Parser(std::vector<Token> tokens)
    : tokens_(std::move(tokens)) {}

const Token& Parser::peek() const {
    static const Token eof{TokenType::EOF_TOKEN, "EOF", -1};
    if (pos_ >= tokens_.size()) return eof;
    return tokens_[pos_];
}

Token Parser::eat(TokenType expected) {
    const Token tok = peek();
    if (tok.type != expected) {
        throw EngineError(ErrorCode::UNEXPECTED_TOKEN, {tok.value, std::to_string(tok.position)});
    }
    ++pos_;
    return tok;
}

ASTPtr Parser::parse_factor() {
    const Token tok = peek();

    if (tok.type == TokenType::MINUS) {
        eat(TokenType::MINUS);
        return make_unary('-', parse_factor());
    }

    if (tok.type == TokenType::NUMBER) {
        eat(TokenType::NUMBER);
        return make_number(std::stoll(tok.value));
    }

    if (tok.type == TokenType::VARIABLE) {
        eat(TokenType::VARIABLE);
        return make_variable(tok.value);
    }

    if (tok.type == TokenType::LPAREN) {
        eat(TokenType::LPAREN);
        auto inner = parse_expression();
        eat(TokenType::RPAREN);
        return inner;
    }

    throw EngineError(ErrorCode::UNEXPECTED_TOKEN, {tok.value, std::to_string(tok.position)});
}

ASTPtr Parser::parse_power() {
    ASTPtr node = parse_factor();

    while (peek().type == TokenType::POW) {
        eat(TokenType::POW);
        node = make_binary(node, '^', parse_factor());
    }

    return node;
}

ASTPtr Parser::parse_term() {
    ASTPtr node = parse_power();

    while (peek().type == TokenType::MUL || peek().type == TokenType::DIV) {
        Token op = peek();

        if (op.type == TokenType::MUL) {
            eat(TokenType::MUL);
            node = make_binary(node, '*', parse_power());
        } else {
            eat(TokenType::DIV);
            ASTPtr denom = parse_power();

            if (contains_variable(denom)) {
                std::string var_name = "unknown";
                if (denom && denom->type == NodeType::Variable) {
                    var_name = denom->name;
                }
                throw EngineError(ErrorCode::VARIABLE_IN_DENOMINATOR, {var_name});
            }

            auto denom_val = eval_constant_or_null(denom);
            if (denom_val.has_value() && *denom_val == 0.0) {
                throw EngineError(ErrorCode::DIVISION_BY_ZERO);
            }

            node = make_binary(node, '/', denom);
        }
    }

    return node;
}

ASTPtr Parser::parse_expression() {
    ASTPtr node = parse_term();

    while (peek().type == TokenType::PLUS || peek().type == TokenType::MINUS) {
        Token op = peek();
        if (op.type == TokenType::PLUS) {
            eat(TokenType::PLUS);
            node = make_binary(node, '+', parse_term());
        } else {
            eat(TokenType::MINUS);
            node = make_binary(node, '-', parse_term());
        }
    }

    return node;
}

std::pair<ASTPtr, ASTPtr> Parser::parse_equation() {
    ASTPtr left = parse_expression();
    eat(TokenType::EQUAL);
    ASTPtr right = parse_expression();

    if (peek().type != TokenType::EOF_TOKEN) {
        throw EngineError(ErrorCode::TRAILING_TOKENS);
    }

    return {left, right};
}

} // namespace quantsolve
