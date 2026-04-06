#pragma once

#include <memory>
#include <string>

namespace quantsolve {

enum class NodeType {
    Number,
    Variable,
    BinaryOp,
    UnaryOp,
};

struct ASTNode {
    NodeType type = NodeType::Number;
    long long value = 0;
    std::string name;
    char op = '\0';
    std::shared_ptr<ASTNode> left;
    std::shared_ptr<ASTNode> right;
    std::shared_ptr<ASTNode> operand;
};

using ASTPtr = std::shared_ptr<ASTNode>;

ASTPtr make_number(long long value);
ASTPtr make_variable(const std::string& name);
ASTPtr make_binary(ASTPtr left, char op, ASTPtr right);
ASTPtr make_unary(char op, ASTPtr operand);

} // namespace quantsolve
