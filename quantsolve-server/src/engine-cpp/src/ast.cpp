#include "quantsolve/ast.hpp"

namespace quantsolve {

ASTPtr make_number(long long value) {
    auto n = std::make_shared<ASTNode>();
    n->type = NodeType::Number;
    n->value = value;
    return n;
}

ASTPtr make_variable(const std::string& name) {
    auto n = std::make_shared<ASTNode>();
    n->type = NodeType::Variable;
    n->name = name;
    return n;
}

ASTPtr make_binary(ASTPtr left, char op, ASTPtr right) {
    auto n = std::make_shared<ASTNode>();
    n->type = NodeType::BinaryOp;
    n->left = std::move(left);
    n->op = op;
    n->right = std::move(right);
    return n;
}

ASTPtr make_unary(char op, ASTPtr operand) {
    auto n = std::make_shared<ASTNode>();
    n->type = NodeType::UnaryOp;
    n->op = op;
    n->operand = std::move(operand);
    return n;
}

} // namespace quantsolve
