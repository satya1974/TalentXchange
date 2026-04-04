// engine/lexer.js

const { EngineError, ErrorCode } = require("./errors");

class Token {
    constructor(type, value = null, position = -1) {
        this.type = type;
        this.value = value;
        this.position = position; // 0-indexed character position in original input
    }
}

const TokenType = {
    NUMBER: "NUMBER",
    VARIABLE: "VARIABLE",
    PLUS: "PLUS",
    MINUS: "MINUS",
    MUL: "MUL",
    DIV: "DIV",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    EQUAL: "EQUAL",
    EOF: "EOF",
};

function isLetter(ch) {
    return /[a-zA-Z]/.test(ch);
}
function isDigit(ch) {
    return /[0-9]/.test(ch);
}
function isAlphaNum(ch) {
    return /[a-zA-Z0-9]/.test(ch);
}

// Pre-pass: normalise unicode operators to ASCII equivalents
function normaliseUnicode(input) {
    return input
        .replace(/\u2212/g, "-") // Unicode minus sign −
        .replace(/\u2013/g, "-") // en-dash –
        .replace(/\u2014/g, "-") // em-dash —
        .replace(/\u00D7/g, "*") // multiplication sign ×
        .replace(/\u00B7/g, "*") // middle dot ·
        .replace(/\u22C5/g, "*") // dot operator ⋅
        .trim();
}

function insertImplicitMultiplication(tokens) {
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
        result.push(tokens[i]);

        if (i < tokens.length - 1) {
            const a = tokens[i];
            const b = tokens[i + 1];

            // All 6 implicit multiply cases from the spec:
            const needs =
                (a.type === TokenType.NUMBER &&
                    b.type === TokenType.VARIABLE) || // 10x
                (a.type === TokenType.NUMBER && b.type === TokenType.LPAREN) || // 2(x+y)
                (a.type === TokenType.VARIABLE &&
                    b.type === TokenType.LPAREN) || // f(x+y)
                (a.type === TokenType.RPAREN &&
                    b.type === TokenType.VARIABLE) || // (x+y)z
                (a.type === TokenType.RPAREN && b.type === TokenType.NUMBER) || // (x+y)2
                (a.type === TokenType.RPAREN && b.type === TokenType.LPAREN); // (x)(y) ← was missing

            if (needs) {
                // Inject synthetic MUL at the gap position
                result.push(new Token(TokenType.MUL, "*", a.position));
            }
        }
    }

    return result;
}

function lexer(input) {
    if (typeof input !== "string" || !input.trim()) {
        throw new EngineError(ErrorCode.EMPTY_INPUT);
    }

    // Unicode normalisation pre-pass
    const src = normaliseUnicode(input);

    if (!src) throw new EngineError(ErrorCode.EMPTY_INPUT);

    let tokens = [];
    let i = 0;

    while (i < src.length) {
        const ch = src[i];

        // Whitespace — skip
        if (ch === " " || ch === "\t" || ch === "\n") {
            i++;
            continue;
        }

        // Number — integers only, no decimals
        if (isDigit(ch)) {
            const start = i;
            let num = "";
            while (i < src.length && isDigit(src[i])) {
                num += src[i];
                i++;
            }

            // Reject decimals
            if (i < src.length && src[i] === ".") {
                throw new EngineError(ErrorCode.DECIMAL_NOT_SUPPORTED, i);
            }

            tokens.push(new Token(TokenType.NUMBER, parseInt(num, 10), start));
            continue;
        }

        // Identifier — letters followed by letters or digits (e.g. tsla, a1, apple)
        if (isLetter(ch)) {
            const start = i;
            let name = "";
            while (i < src.length && isAlphaNum(src[i])) {
                name += src[i];
                i++;
            }
            tokens.push(
                new Token(TokenType.VARIABLE, name.toLowerCase(), start),
            );
            continue;
        }

        // Single-character operators
        const pos = i;
        switch (ch) {
            case "+":
                tokens.push(new Token(TokenType.PLUS, "+", pos));
                break;
            case "-":
                tokens.push(new Token(TokenType.MINUS, "-", pos));
                break;
            case "*":
                tokens.push(new Token(TokenType.MUL, "*", pos));
                break;
            case "/":
                tokens.push(new Token(TokenType.DIV, "/", pos));
                break;
            case "(":
                tokens.push(new Token(TokenType.LPAREN, "(", pos));
                break;
            case ")":
                tokens.push(new Token(TokenType.RPAREN, ")", pos));
                break;
            case "=":
                tokens.push(new Token(TokenType.EQUAL, "=", pos));
                break;
            default:
                throw new EngineError(ErrorCode.INVALID_CHARACTER, ch, i);
        }
        i++;
    }

    // Add EOF sentinel — parser uses this as a clean termination signal
    tokens.push(new Token(TokenType.EOF, "EOF", src.length));

    // Validate equals count before injection
    const equalCount = tokens.filter((t) => t.type === TokenType.EQUAL).length;
    if (equalCount === 0) throw new EngineError(ErrorCode.MISSING_EQUALS);
    if (equalCount > 1) throw new EngineError(ErrorCode.MULTIPLE_EQUALS);

    return insertImplicitMultiplication(tokens);
}

module.exports = { lexer, Token, TokenType };
