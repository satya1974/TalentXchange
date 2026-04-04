// engine/lexer.js

class Token {
    constructor(type, value = null) {
        this.type = type;
        this.value = value;
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
};

function isLetter(ch) {
    return /[a-zA-Z]/.test(ch);
}

function isDigit(ch) {
    return /[0-9]/.test(ch);
}

function insertImplicitMultiplication(tokens) {
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
        result.push(tokens[i]);

        if (i < tokens.length - 1) {
            const a = tokens[i];
            const b = tokens[i + 1];

            if (
                (a.type === TokenType.NUMBER &&
                    b.type === TokenType.VARIABLE) ||
                (a.type === TokenType.VARIABLE &&
                    b.type === TokenType.LPAREN) ||
                (a.type === TokenType.NUMBER && b.type === TokenType.LPAREN) ||
                (a.type === TokenType.RPAREN &&
                    b.type === TokenType.VARIABLE) ||
                (a.type === TokenType.RPAREN && b.type === TokenType.NUMBER)
            ) {
                result.push(new Token(TokenType.MUL));
            }
        }
    }

    return result;
}

function lexer(input) {
    let tokens = [];
    let i = 0;

    while (i < input.length) {
        let ch = input[i];

        if (ch === " ") {
            i++;
            continue;
        }

        if (isDigit(ch)) {
            let num = "";
            while (i < input.length && isDigit(input[i])) {
                num += input[i];
                i++;
            }
            tokens.push(new Token(TokenType.NUMBER, parseInt(num)));
            continue;
        }

        if (isLetter(ch)) {
            let name = "";
            while (i < input.length && isLetter(input[i])) {
                name += input[i];
                i++;
            }
            tokens.push(new Token(TokenType.VARIABLE, name));
            continue;
        }

        switch (ch) {
            case "+":
                tokens.push(new Token(TokenType.PLUS, "+"));
                break;
            case "-":
                tokens.push(new Token(TokenType.MINUS, "-"));
                break;
            case "*":
                tokens.push(new Token(TokenType.MUL, "*"));
                break;
            case "/":
                tokens.push(new Token(TokenType.DIV, "/"));
                break;
            case "(":
                tokens.push(new Token(TokenType.LPAREN, "("));
                break;
            case ")":
                tokens.push(new Token(TokenType.RPAREN, ")"));
                break;
            case "=":
                tokens.push(new Token(TokenType.EQUAL, "="));
                break;
            default:
                throw new Error("Invalid character: " + ch);
        }

        i++;
    }

    return insertImplicitMultiplication(tokens);
}

module.exports = { lexer, TokenType };
