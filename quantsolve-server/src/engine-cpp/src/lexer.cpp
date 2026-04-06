#include "quantsolve/lexer.hpp"

#include "quantsolve/errors.hpp"

#include <algorithm>
#include <cctype>

namespace quantsolve {

namespace {

bool is_letter(char ch) {
    return std::isalpha(static_cast<unsigned char>(ch)) != 0;
}

bool is_digit(char ch) {
    return std::isdigit(static_cast<unsigned char>(ch)) != 0;
}

bool is_alnum(char ch) {
    return std::isalnum(static_cast<unsigned char>(ch)) != 0;
}

void replace_all(std::string& s, const std::string& from, const std::string& to) {
    if (from.empty()) return;
    std::size_t pos = 0;
    while ((pos = s.find(from, pos)) != std::string::npos) {
        s.replace(pos, from.size(), to);
        pos += to.size();
    }
}

std::string normalize_unicode(std::string input) {
    replace_all(input, "\xE2\x88\x92", "-");
    replace_all(input, "\xE2\x80\x93", "-");
    replace_all(input, "\xE2\x80\x94", "-");
    replace_all(input, "\xC3\x97", "*");
    replace_all(input, "\xC2\xB7", "*");
    replace_all(input, "\xE2\x8B\x85", "*");
    // Unicode superscripts → ^N
    replace_all(input, "\xC2\xB2", "^2"); // ²
    replace_all(input, "\xC2\xB3", "^3"); // ³
    return input;
}

std::vector<Token> insert_implicit_multiplication(const std::vector<Token>& tokens) {
    std::vector<Token> out;
    out.reserve(tokens.size() * 2);

    for (std::size_t i = 0; i < tokens.size(); ++i) {
        out.push_back(tokens[i]);
        if (i + 1 >= tokens.size()) continue;

        const auto& a = tokens[i];
        const auto& b = tokens[i + 1];

        const bool needs =
            (a.type == TokenType::NUMBER && b.type == TokenType::VARIABLE) ||
            (a.type == TokenType::NUMBER && b.type == TokenType::LPAREN) ||
            (a.type == TokenType::VARIABLE && b.type == TokenType::LPAREN) ||
            (a.type == TokenType::RPAREN && b.type == TokenType::VARIABLE) ||
            (a.type == TokenType::RPAREN && b.type == TokenType::NUMBER) ||
            (a.type == TokenType::RPAREN && b.type == TokenType::LPAREN);

        if (needs) {
            out.push_back(Token{TokenType::MUL, "*", a.position});
        }
    }

    return out;
}

} // namespace

std::vector<Token> lexer(const std::string& input) {
    if (input.empty()) {
        throw EngineError(ErrorCode::EMPTY_INPUT);
    }

    std::string src = normalize_unicode(input);

    // trim
    src.erase(src.begin(), std::find_if(src.begin(), src.end(), [](unsigned char c) { return !std::isspace(c); }));
    src.erase(std::find_if(src.rbegin(), src.rend(), [](unsigned char c) { return !std::isspace(c); }).base(), src.end());

    if (src.empty()) {
        throw EngineError(ErrorCode::EMPTY_INPUT);
    }

    std::vector<Token> tokens;
    std::size_t i = 0;

    while (i < src.size()) {
        char ch = src[i];

        if (ch == ' ' || ch == '\t' || ch == '\n') {
            ++i;
            continue;
        }

        if (is_digit(ch)) {
            std::size_t start = i;
            std::string num;
            while (i < src.size() && is_digit(src[i])) {
                num.push_back(src[i]);
                ++i;
            }
            if (i < src.size() && src[i] == '.') {
                throw EngineError(ErrorCode::DECIMAL_NOT_SUPPORTED, {std::to_string(i)});
            }
            tokens.push_back(Token{TokenType::NUMBER, num, static_cast<long long>(start)});
            continue;
        }

        if (is_letter(ch)) {
            std::size_t start = i;
            std::string name;
            while (i < src.size() && is_alnum(src[i])) {
                name.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(src[i]))));
                ++i;
            }
            tokens.push_back(Token{TokenType::VARIABLE, name, static_cast<long long>(start)});
            continue;
        }

        TokenType t;
        switch (ch) {
        case '+': t = TokenType::PLUS; break;
        case '-': t = TokenType::MINUS; break;
        case '*': t = TokenType::MUL; break;
        case '/': t = TokenType::DIV; break;
        case '^': t = TokenType::POW; break;
        case '(': t = TokenType::LPAREN; break;
        case ')': t = TokenType::RPAREN; break;
        case '=': t = TokenType::EQUAL; break;
        default:
            throw EngineError(ErrorCode::INVALID_CHARACTER, {std::string(1, ch), std::to_string(i)});
        }
        tokens.push_back(Token{t, std::string(1, ch), static_cast<long long>(i)});
        ++i;
    }

    tokens.push_back(Token{TokenType::EOF_TOKEN, "EOF", static_cast<long long>(src.size())});

    long long equal_count = 0;
    for (const auto& t : tokens) {
        if (t.type == TokenType::EQUAL) {
            ++equal_count;
        }
    }

    if (equal_count == 0) throw EngineError(ErrorCode::MISSING_EQUALS);
    if (equal_count > 1) throw EngineError(ErrorCode::MULTIPLE_EQUALS);

    return insert_implicit_multiplication(tokens);
}

} // namespace quantsolve

