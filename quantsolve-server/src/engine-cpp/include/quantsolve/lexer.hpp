#pragma once

#include <string>
#include <vector>

namespace quantsolve {

enum class TokenType {
    NUMBER,
    VARIABLE,
    PLUS,
    MINUS,
    MUL,
    DIV,
    POW,
    LPAREN,
    RPAREN,
    EQUAL,
    EOF_TOKEN,
};

struct Token {
    TokenType type;
    std::string value;
    long long position;
};

std::vector<Token> lexer(const std::string& input);

} // namespace quantsolve
