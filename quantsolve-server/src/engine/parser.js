// engine/parser.js

const { TokenType } = require("./lexer");
const {
    NumberNode,
    VariableNode,
    BinaryOpNode,
    UnaryOpNode,
} = require("./ast");
const { EngineError, ErrorCode } = require("./errors");

// Helper: check if an AST subtree contains any variable node
// Used to enforce the division policy: variable in denominator → reject
function containsVariable(node) {
    if (!node) return false;
    if (node.type === "Variable") return true;
    if (node.type === "Number") return false;
    if (node.type === "UnaryOp") return containsVariable(node.operand);
    if (node.type === "BinaryOp")
        return containsVariable(node.left) || containsVariable(node.right);
    return false;
}

// Helper: evaluate a pure-constant subtree to a number.
// Returns null if the subtree contains any variable.
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
        this.pos++;
        return tok;
    }

    // atom = NUMBER | VARIABLE | "(" expression ")"
    parseFactor() {
        const tok = this.peek();

        // Unary minus — handles: -x, -3, -(x+y), --x
        if (tok.type === TokenType.MINUS) {
            this.eat(TokenType.MINUS);
            const operand = this.parseFactor(); // recursive: handles --x correctly
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

    // term = factor (("*" | "/") factor)*
    parseTerm() {
        let node = this.parseFactor();

        while (
            this.peek().type === TokenType.MUL ||
            this.peek().type === TokenType.DIV
        ) {
            const opTok = this.peek();

            if (opTok.type === TokenType.MUL) {
                this.eat(TokenType.MUL);
                node = new BinaryOpNode(node, "*", this.parseFactor());
            } else {
                // Division — enforce the spec policy here at parse time
                this.eat(TokenType.DIV);
                const denomNode = this.parseFactor();

                // Policy 1: variable in denominator → non-linear, hard reject
                if (containsVariable(denomNode)) {
                    // Extract the variable name for the error message if possible
                    const varName =
                        denomNode.type === "Variable"
                            ? denomNode.name
                            : "unknown";
                    throw new EngineError(
                        ErrorCode.VARIABLE_IN_DENOMINATOR,
                        varName,
                    );
                }

                // Policy 2: zero denominator → division by zero
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

        // Must be at EOF now
        if (this.peek().type !== TokenType.EOF) {
            throw new EngineError(ErrorCode.TRAILING_TOKENS);
        }

        return { left, right };
    }
}

module.exports = Parser;
