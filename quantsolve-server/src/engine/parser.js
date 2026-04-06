// engine/parser.js

const { TokenType } = require("./lexer");
const {
    NumberNode,
    VariableNode,
    BinaryOpNode,
    UnaryOpNode,
} = require("./ast");
const { EngineError, ErrorCode } = require("./errors");

function containsVariable(node) {
    if (!node) return false;
    if (node.type === "Variable") return true;
    if (node.type === "Number") return false;
    if (node.type === "UnaryOp") return containsVariable(node.operand);
    if (node.type === "BinaryOp") {
        return containsVariable(node.left) || containsVariable(node.right);
    }
    return false;
}

function evalConstant(node) {
    if (!node) return null;
    if (node.type === "Number") return node.value;
    if (node.type === "UnaryOp" && node.op === "-") {
        const v = evalConstant(node.operand);
        return v === null ? null : -v;
    }
    if (node.type === "BinaryOp") {
        const l = evalConstant(node.left);
        const r = evalConstant(node.right);
        if (l === null || r === null) return null;
        if (node.operator === "+") return l + r;
        if (node.operator === "-") return l - r;
        if (node.operator === "*") return l * r;
        if (node.operator === "/") return r === 0 ? null : l / r;
        if (node.operator === "^") {
            if (!Number.isInteger(r) || r < 0) return null;
            return l ** r;
        }
    }
    return null;
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return (
            this.tokens[this.pos] || {
                type: TokenType.EOF,
                value: "EOF",
                position: -1,
            }
        );
    }

    eat(expectedType) {
        const tok = this.peek();
        if (tok.type !== expectedType) {
            throw new EngineError(
                ErrorCode.UNEXPECTED_TOKEN,
                tok.value ?? tok.type,
                tok.position,
            );
        }
        this.pos += 1;
        return tok;
    }

    // atom = NUMBER | VARIABLE | "(" expression ")" | "-" atom
    parseFactor() {
        const tok = this.peek();

        if (tok.type === TokenType.MINUS) {
            this.eat(TokenType.MINUS);
            const operand = this.parseFactor();
            return new UnaryOpNode("-", operand);
        }

        if (tok.type === TokenType.NUMBER) {
            this.eat(TokenType.NUMBER);
            return new NumberNode(tok.value);
        }

        if (tok.type === TokenType.VARIABLE) {
            this.eat(TokenType.VARIABLE);
            return new VariableNode(tok.value);
        }

        if (tok.type === TokenType.LPAREN) {
            this.eat(TokenType.LPAREN);
            const inner = this.parseExpression();
            this.eat(TokenType.RPAREN);
            return inner;
        }

        throw new EngineError(
            ErrorCode.UNEXPECTED_TOKEN,
            tok.value ?? tok.type,
            tok.position,
        );
    }

    // power = factor ("^" factor)*
    parsePower() {
        let node = this.parseFactor();

        while (this.peek().type === TokenType.POW) {
            this.eat(TokenType.POW);
            node = new BinaryOpNode(node, "^", this.parseFactor());
        }

        return node;
    }

    // term = power (("*" | "/") power)*
    parseTerm() {
        let node = this.parsePower();

        while (
            this.peek().type === TokenType.MUL ||
            this.peek().type === TokenType.DIV
        ) {
            const opTok = this.peek();

            if (opTok.type === TokenType.MUL) {
                this.eat(TokenType.MUL);
                node = new BinaryOpNode(node, "*", this.parsePower());
            } else {
                this.eat(TokenType.DIV);
                const denomNode = this.parsePower();

                if (containsVariable(denomNode)) {
                    const varName =
                        denomNode.type === "Variable"
                            ? denomNode.name
                            : "unknown";
                    throw new EngineError(
                        ErrorCode.VARIABLE_IN_DENOMINATOR,
                        varName,
                    );
                }

                const denomValue = evalConstant(denomNode);
                if (denomValue === 0) {
                    throw new EngineError(ErrorCode.DIVISION_BY_ZERO);
                }

                node = new BinaryOpNode(node, "/", denomNode);
            }
        }

        return node;
    }

    // expression = term (("+" | "-") term)*
    parseExpression() {
        let node = this.parseTerm();

        while (
            this.peek().type === TokenType.PLUS ||
            this.peek().type === TokenType.MINUS
        ) {
            const opTok = this.peek();
            if (opTok.type === TokenType.PLUS) {
                this.eat(TokenType.PLUS);
                node = new BinaryOpNode(node, "+", this.parseTerm());
            } else {
                this.eat(TokenType.MINUS);
                node = new BinaryOpNode(node, "-", this.parseTerm());
            }
        }

        return node;
    }

    // equation = expression "=" expression EOF
    parseEquation() {
        const left = this.parseExpression();
        this.eat(TokenType.EQUAL);
        const right = this.parseExpression();

        if (this.peek().type !== TokenType.EOF) {
            throw new EngineError(ErrorCode.TRAILING_TOKENS);
        }

        return { left, right };
    }
}

module.exports = Parser;
