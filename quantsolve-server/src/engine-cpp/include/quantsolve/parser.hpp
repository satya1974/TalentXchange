#pragma once

#include "quantsolve/ast.hpp"
#include "quantsolve/lexer.hpp"

namespace quantsolve {

class Parser {
public:
    explicit Parser(std::vector<Token> tokens);
    std::pair<ASTPtr, ASTPtr> parse_equation();

private:
    std::vector<Token> tokens_;
    std::size_t pos_ = 0;

    const Token& peek() const;
    Token eat(TokenType expected);

    ASTPtr parse_factor();
    ASTPtr parse_power();
    ASTPtr parse_term();
    ASTPtr parse_expression();
};

bool contains_variable(const ASTPtr& node);

} // namespace quantsolve
