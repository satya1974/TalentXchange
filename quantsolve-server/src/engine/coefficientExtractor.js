// engine/coefficientExtractor.js

function extract(node, map = {}, multiplier = 1) {
    if (!node) return map;

    if (node.type === "Number") {
        map.constant = (map.constant || 0) + node.value * multiplier;
        return map;
    }

    if (node.type === "Variable") {
        map[node.name] = (map[node.name] || 0) + multiplier;
        return map;
    }

    if (node.type === "BinaryOp") {
        if (node.operator === "+") {
            extract(node.left, map, multiplier);
            extract(node.right, map, multiplier);
        } else if (node.operator === "-") {
            extract(node.left, map, multiplier);
            extract(node.right, map, -multiplier);
        } else if (node.operator === "*") {
            if (node.left.type === "Number") {
                extract(node.right, map, multiplier * node.left.value);
            } else if (node.right.type === "Number") {
                extract(node.left, map, multiplier * node.right.value);
            } else {
                throw new Error("Non-linear term detected");
            }
        }
    }

    return map;
}

module.exports = extract;
