// engine/normalizer.js

const extract = require("./coefficientExtractor");

function normalizeEquation(leftAST, rightAST) {
    const leftMap = extract(leftAST);
    const rightMap = extract(rightAST);

    const coeffs = {};
    let constant = (rightMap.constant || 0) - (leftMap.constant || 0);

    const variables = new Set([
        ...Object.keys(leftMap),
        ...Object.keys(rightMap),
    ]);

    variables.forEach((v) => {
        if (v === "constant") return;
        coeffs[v] = (leftMap[v] || 0) - (rightMap[v] || 0);
    });

    return { coeffs, target: constant };
}

module.exports = normalizeEquation;
