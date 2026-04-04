// engine/parser.js

const { TokenType } = require("./lexer");
const { NumberNode, VariableNode, BinaryOpNode } = require("./ast");

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.tokens[this.pos];
    }

    eat(type) {
        if (this.peek() && this.peek().type === type) {
            return this.tokens[this.pos++];
        }
        throw new Error("Unexpected token: " + JSON.stringify(this.peek()));
    }

    parseFactor() {
        let token = this.peek();

        if (token.type === TokenType.NUMBER) {
            this.eat(TokenType.NUMBER);
            return new NumberNode(token.value);
        }

        if (token.type === TokenType.VARIABLE) {
            this.eat(TokenType.VARIABLE);
            return new VariableNode(token.value);
        }

        if (token.type === TokenType.LPAREN) {
            this.eat(TokenType.LPAREN);
            let node = this.parseExpression();
            this.eat(TokenType.RPAREN);
            return node;
        }

        throw new Error("Invalid factor");
    }

    parseTerm() {
        let node = this.parseFactor();

        while (
            this.peek() &&
            (this.peek().type === TokenType.MUL ||
                this.peek().type === TokenType.DIV)
        ) {
            let token = this.peek();
            if (token.type === TokenType.MUL) {
                this.eat(TokenType.MUL);
                node = new BinaryOpNode(node, "*", this.parseFactor());
            } else {
                this.eat(TokenType.DIV);
                node = new BinaryOpNode(node, "/", this.parseFactor());
            }
        }

        return node;
    }

    parseExpression() {
        let node = this.parseTerm();

        while (
            this.peek() &&
            (this.peek().type === TokenType.PLUS ||
                this.peek().type === TokenType.MINUS)
        ) {
            let token = this.peek();
            if (token.type === TokenType.PLUS) {
                this.eat(TokenType.PLUS);
                node = new BinaryOpNode(node, "+", this.parseTerm());
            } else {
                this.eat(TokenType.MINUS);
                node = new BinaryOpNode(node, "-", this.parseTerm());
            }
        }

        return node;
    }

    parseEquation() {
        let left = this.parseExpression();
        this.eat(TokenType.EQUAL);
        let right = this.parseExpression();

        return { left, right };
    }
}

module.exports = Parser;
