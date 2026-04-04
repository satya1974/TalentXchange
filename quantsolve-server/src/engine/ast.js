// ast.js

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

module.exports = {
    NumberNode,
    VariableNode,
    BinaryOpNode,
};
