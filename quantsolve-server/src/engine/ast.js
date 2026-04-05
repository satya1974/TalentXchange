// engine/ast.js

class NumberNode {
    constructor(value) {
        this.type = "Number";
        this.value = value;
    }
}

class VariableNode {
    constructor(name) {
        this.type = "Variable";
        this.name = name;
    }
}

class BinaryOpNode {
    constructor(left, operator, right) {
        this.type = "BinaryOp";
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

// Added: required for -x, -(x+y), leading minus in any expression
class UnaryOpNode {
    constructor(op, operand) {
        this.type = "UnaryOp";
        this.op = op; // always "-"
        this.operand = operand;
    }
}

module.exports = { NumberNode, VariableNode, BinaryOpNode, UnaryOpNode };
