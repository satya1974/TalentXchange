const { EngineError, ErrorCode } = require("./errors");

const MAX_EXPONENT = Number(process.env.POLYNOMIAL_MAX_EXPONENT || 8);
const MAX_SINGLE_SCAN_RANGE = Number(
    process.env.POLYNOMIAL_MAX_SCAN_RANGE || 200000,
);
const MAX_MULTI_COMBINATIONS = Number(
    process.env.POLYNOMIAL_MAX_COMBINATIONS || 2000000,
);

const SINGLE_DEFAULT_MIN = Number(process.env.POLYNOMIAL_DEFAULT_MIN ?? -100);
const SINGLE_DEFAULT_MAX = Number(process.env.POLYNOMIAL_DEFAULT_MAX || 10000);

const MULTI_DEFAULT_MIN = Number(process.env.POLYNOMIAL_MULTI_DEFAULT_MIN || 0);
const MULTI_DEFAULT_MAX = Number(process.env.POLYNOMIAL_MULTI_DEFAULT_MAX || 100);

function cleanPoly(poly) {
    const next = {};
    for (const [k, v] of Object.entries(poly)) {
        if (v !== 0) next[k] = v;
    }
    return next;
}

function addPoly(a, b) {
    const out = { ...a };
    for (const [dk, coeff] of Object.entries(b)) {
        out[dk] = (out[dk] || 0) + coeff;
    }
    return cleanPoly(out);
}

function subPoly(a, b) {
    const out = { ...a };
    for (const [dk, coeff] of Object.entries(b)) {
        out[dk] = (out[dk] || 0) - coeff;
    }
    return cleanPoly(out);
}

function mulPoly(a, b) {
    const out = {};
    for (const [daRaw, ca] of Object.entries(a)) {
        for (const [dbRaw, cb] of Object.entries(b)) {
            const da = Number(daRaw);
            const db = Number(dbRaw);
            const d = da + db;
            out[d] = (out[d] || 0) + ca * cb;
        }
    }
    return cleanPoly(out);
}

function divPolyByConstant(poly, denom, varName) {
    if (denom === 0) throw new EngineError(ErrorCode.DIVISION_BY_ZERO);
    const out = {};
    for (const [dRaw, c] of Object.entries(poly)) {
        const q = c / denom;
        if (!Number.isInteger(q)) {
            throw new EngineError(ErrorCode.FRACTIONAL_COEFFICIENT, varName, q);
        }
        out[dRaw] = q;
    }
    return cleanPoly(out);
}

function powPoly(poly, exp) {
    if (!Number.isInteger(exp) || exp < 0) {
        throw new EngineError(
            ErrorCode.POLYNOMIAL_UNSUPPORTED,
            "Exponent must be a non-negative integer",
        );
    }
    if (exp > MAX_EXPONENT) {
        throw new EngineError(
            ErrorCode.POLYNOMIAL_UNSUPPORTED,
            `Exponent exceeds max supported degree (${MAX_EXPONENT})`,
        );
    }
    let out = { 0: 1 };
    for (let i = 0; i < exp; i += 1) {
        out = mulPoly(out, poly);
    }
    return out;
}

function evaluateConstant(node) {
    if (!node) throw new Error("null node in evaluateConstant");
    if (node.type === "Number") return node.value;

    if (node.type === "UnaryOp" && node.op === "-") {
        return -evaluateConstant(node.operand);
    }

    if (node.type === "BinaryOp") {
        const l = evaluateConstant(node.left);
        const r = evaluateConstant(node.right);
        switch (node.operator) {
            case "+":
                return l + r;
            case "-":
                return l - r;
            case "*":
                return l * r;
            case "/":
                if (r === 0) throw new EngineError(ErrorCode.DIVISION_BY_ZERO);
                return l / r;
            case "^":
                if (!Number.isInteger(r) || r < 0) {
                    throw new EngineError(
                        ErrorCode.POLYNOMIAL_UNSUPPORTED,
                        "Exponent must be a non-negative integer",
                    );
                }
                return l ** r;
            default:
                throw new Error("unsupported operator in constant evaluator");
        }
    }

    throw new Error("variable in constant evaluator");
}

function collectVariables(node, vars = new Set()) {
    if (!node) return vars;
    if (node.type === "Variable") vars.add(node.name);
    if (node.type === "UnaryOp") collectVariables(node.operand, vars);
    if (node.type === "BinaryOp") {
        collectVariables(node.left, vars);
        collectVariables(node.right, vars);
    }
    return vars;
}

function subtreeContainsVariable(node) {
    return collectVariables(node, new Set()).size > 0;
}

function containsPower(node) {
    if (!node) return false;
    if (node.type === "UnaryOp") return containsPower(node.operand);
    if (node.type === "BinaryOp") {
        if (node.operator === "^") return true;
        return containsPower(node.left) || containsPower(node.right);
    }
    return false;
}

function containsNonlinearMultiply(node) {
    if (!node) return false;
    if (node.type === "UnaryOp") return containsNonlinearMultiply(node.operand);
    if (node.type === "BinaryOp") {
        if (node.operator === "*") {
            const leftHasVar = subtreeContainsVariable(node.left);
            const rightHasVar = subtreeContainsVariable(node.right);
            if (leftHasVar && rightHasVar) return true;
        }
        return (
            containsNonlinearMultiply(node.left) ||
            containsNonlinearMultiply(node.right)
        );
    }
    return false;
}

function isPolynomialCandidate(node) {
    return containsPower(node) || containsNonlinearMultiply(node);
}

function astToPoly(node, varName) {
    if (!node) return { 0: 0 };

    if (node.type === "Number") return { 0: node.value };
    if (node.type === "Variable") {
        if (node.name !== varName) {
            throw new EngineError(
                ErrorCode.POLYNOMIAL_UNSUPPORTED,
                "Single-variable conversion called with multiple variables",
            );
        }
        return { 1: 1 };
    }
    if (node.type === "UnaryOp") {
        if (node.op !== "-") {
            throw new EngineError(
                ErrorCode.POLYNOMIAL_UNSUPPORTED,
                "Unsupported unary operator",
            );
        }
        return mulPoly({ 0: -1 }, astToPoly(node.operand, varName));
    }

    if (node.type !== "BinaryOp") {
        throw new EngineError(
            ErrorCode.POLYNOMIAL_UNSUPPORTED,
            "Unsupported AST node for polynomial conversion",
        );
    }

    if (node.operator === "+") {
        return addPoly(astToPoly(node.left, varName), astToPoly(node.right, varName));
    }
    if (node.operator === "-") {
        return subPoly(astToPoly(node.left, varName), astToPoly(node.right, varName));
    }
    if (node.operator === "*") {
        return mulPoly(astToPoly(node.left, varName), astToPoly(node.right, varName));
    }
    if (node.operator === "/") {
        const rightConst = evaluateConstant(node.right);
        return divPolyByConstant(astToPoly(node.left, varName), rightConst, varName);
    }
    if (node.operator === "^") {
        const exp = evaluateConstant(node.right);
        const base = astToPoly(node.left, varName);
        return powPoly(base, exp);
    }

    throw new EngineError(
        ErrorCode.POLYNOMIAL_UNSUPPORTED,
        `Unsupported polynomial operator '${node.operator}'`,
    );
}

function polyDegree(poly) {
    const degrees = Object.keys(poly).map(Number);
    return degrees.length ? Math.max(...degrees) : 0;
}

function evaluatePoly(poly, x) {
    let total = 0;
    for (const [dRaw, c] of Object.entries(poly)) {
        const d = Number(dRaw);
        total += c * x ** d;
    }
    return total;
}

function evaluateAstWithAssignment(node, assignment) {
    if (!node) return 0;

    if (node.type === "Number") return node.value;
    if (node.type === "Variable") {
        if (!(node.name in assignment)) {
            throw new EngineError(
                ErrorCode.POLYNOMIAL_UNSUPPORTED,
                `Missing assignment for variable '${node.name}'`,
            );
        }
        return assignment[node.name];
    }
    if (node.type === "UnaryOp") {
        if (node.op !== "-") {
            throw new EngineError(
                ErrorCode.POLYNOMIAL_UNSUPPORTED,
                "Unsupported unary operator",
            );
        }
        return -evaluateAstWithAssignment(node.operand, assignment);
    }

    if (node.type !== "BinaryOp") {
        throw new EngineError(
            ErrorCode.POLYNOMIAL_UNSUPPORTED,
            "Unsupported AST node during evaluation",
        );
    }

    const l = evaluateAstWithAssignment(node.left, assignment);
    const r = evaluateAstWithAssignment(node.right, assignment);

    switch (node.operator) {
        case "+":
            return l + r;
        case "-":
            return l - r;
        case "*":
            return l * r;
        case "/": {
            if (r === 0) throw new EngineError(ErrorCode.DIVISION_BY_ZERO);
            return l / r;
        }
        case "^": {
            if (!Number.isInteger(r) || r < 0 || r > MAX_EXPONENT) {
                throw new EngineError(
                    ErrorCode.POLYNOMIAL_UNSUPPORTED,
                    `Exponent must be integer in range [0, ${MAX_EXPONENT}]`,
                );
            }
            return l ** r;
        }
        default:
            throw new EngineError(
                ErrorCode.POLYNOMIAL_UNSUPPORTED,
                `Unsupported operator '${node.operator}'`,
            );
    }
}

// Returns the maximum exponent that varName appears with in the AST.
// e.g. x^2 + x → 2,  x^3 → 3,  x (linear) → 1
// Used to decide if default domain should be symmetric (even degree) or ≥0 (odd/linear).
function getMaxExponentForVar(node, varName) {
    if (!node) return 0;
    if (node.type === 'Number') return 0;
    if (node.type === 'Variable') return node.name === varName ? 1 : 0;
    if (node.type === 'UnaryOp') return getMaxExponentForVar(node.operand, varName);
    if (node.type !== 'BinaryOp') return 0;
    switch (node.operator) {
        case '+': case '-':
            return Math.max(
                getMaxExponentForVar(node.left,  varName),
                getMaxExponentForVar(node.right, varName)
            );
        case '*':
            return getMaxExponentForVar(node.left, varName)
                 + getMaxExponentForVar(node.right, varName);
        case '^': {
            const baseExp = getMaxExponentForVar(node.left, varName);
            if (baseExp === 0) return 0;
            try {
                const expVal = evaluateConstant(node.right);
                if (Number.isInteger(expVal) && expVal >= 0) return baseExp * expVal;
            } catch (_) {}
            return baseExp;
        }
        default:
            return Math.max(
                getMaxExponentForVar(node.left,  varName),
                getMaxExponentForVar(node.right, varName)
            );
    }
}

// Decide the default lo for a variable given its max exponent in the equation.
// Even degree: negatives absorbed by squaring → symmetric [-defaultHi, defaultHi]
// Odd / linear: non-negative per PS (stock units can't be negative) → [0, defaultHi]
function defaultLoForVar(varName, leftAST, rightAST, isSingleVar) {
    const maxExp = Math.max(
        getMaxExponentForVar(leftAST,  varName),
        getMaxExponentForVar(rightAST, varName)
    );
    if (maxExp >= 2 && maxExp % 2 === 0) {
        // Even degree: symmetric range so we catch negative roots (e.g. x²=4 → x=±2)
        return isSingleVar ? -SINGLE_DEFAULT_MAX : -MULTI_DEFAULT_MAX;
    }
    // Odd / linear: stock units — non-negative only
    return 0;
}

function estimateDegree(node) {
    if (!node) return 0;
    if (node.type === "Number") return 0;
    if (node.type === "Variable") return 1;
    if (node.type === "UnaryOp") return estimateDegree(node.operand);
    if (node.type !== "BinaryOp") return 0;

    const dl = estimateDegree(node.left);
    const dr = estimateDegree(node.right);

    switch (node.operator) {
        case "+":
        case "-":
            return Math.max(dl, dr);
        case "*":
            return dl + dr;
        case "/":
            return dl;
        case "^": {
            try {
                const exp = evaluateConstant(node.right);
                if (!Number.isInteger(exp) || exp < 0) return dl;
                return dl * exp;
            } catch (_) {
                return dl;
            }
        }
        default:
            return Math.max(dl, dr);
    }
}

function normalizeConstraint(constraint = {}) {
    const toInt = (v) =>
        v === undefined || v === null || v === "" ? null : Number.parseInt(v, 10);

    return {
        min: toInt(constraint.min),
        max: toInt(constraint.max),
        exact: toInt(constraint.exact),
        even: constraint.even === true || constraint.even === "true",
        odd: constraint.odd === true || constraint.odd === "true",
    };
}

function buildDomainForVar(varName, userConstraints, leftAST, rightAST, isSingleVar) {
    const c = normalizeConstraint(userConstraints[varName] || {});

    // Parity-smart default lo: user can always override with explicit min
    const smartLo = defaultLoForVar(varName, leftAST, rightAST, isSingleVar);
    let lo = c.min !== null ? c.min : smartLo;
    let hi = c.max !== null ? c.max : (isSingleVar ? SINGLE_DEFAULT_MAX : MULTI_DEFAULT_MAX);

    if (c.exact !== null) {
        lo = c.exact;
        hi = c.exact;
    }

    if (lo > hi) {
        throw new EngineError(
            ErrorCode.INVALID_CONSTRAINT,
            varName,
            "min cannot be greater than max",
        );
    }

    const values = [];
    for (let x = lo; x <= hi; x += 1) {
        if (c.even && x % 2 !== 0) continue;
        if (c.odd  && x % 2 === 0) continue;
        values.push(x);
    }

    return { lo, hi, values };
}

function paginateSolutions(solutions, options) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(options.pageSize || 50)));
    const totalFound = solutions.length;
    const totalPages = Math.max(1, Math.ceil(totalFound / pageSize));
    const start = (page - 1) * pageSize;

    return {
        solutions: solutions.slice(start, start + pageSize),
        totalFound,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
    };
}

function solveSingleVariable(leftAST, rightAST, varName, userConstraints, options) {
    const leftPoly = astToPoly(leftAST, varName);
    const rightPoly = astToPoly(rightAST, varName);
    const equationPoly = subPoly(leftPoly, rightPoly);
    const degree = polyDegree(equationPoly);

    if (degree === 0) {
        // Constant equation — trivially true or impossible
        const constant = equationPoly[0] ?? 0;
        if (constant === 0) {
            // e.g. x^2 - x^2 = 0 — infinitely true, treat as unsolvable for domain
            throw new EngineError(ErrorCode.UNBOUNDED_SEARCH);
        }
        throw new EngineError(ErrorCode.NO_SOLUTIONS);
    }

    const domain = buildDomainForVar(varName, userConstraints, leftAST, rightAST, true);
    if (domain.values.length > MAX_SINGLE_SCAN_RANGE) {
        throw new EngineError(ErrorCode.UNBOUNDED_SEARCH);
    }

    const roots = [];
    for (const x of domain.values) {
        if (evaluatePoly(equationPoly, x) === 0) {
            roots.push({ [varName]: x });
        }
    }

    // No integer roots found in the scan domain
    if (roots.length === 0) {
        throw new EngineError(
            ErrorCode.NO_SOLUTIONS,
        );
    }

    const paged = paginateSolutions(roots, options);

    return {
        ...paged,
        variableOrder: [varName],
        searchBounds: { [varName]: { lo: domain.lo, hi: domain.hi, count: domain.values.length } },
        scannedCombinations: domain.values.length,
        polynomial: {
            variable: varName,
            variables: [varName],
            degree,
            mode: "univariate_scan",
            coefficientsByDegree: equationPoly,
        },
    };
}

function solveMultivariable(leftAST, rightAST, variableOrder, userConstraints, options) {
    const domains = {};
    let totalCombinations = 1;

    for (const v of variableOrder) {
        const domain = buildDomainForVar(v, userConstraints, leftAST, rightAST, false);
        domains[v] = domain;
        totalCombinations *= domain.values.length;

        if (totalCombinations > MAX_MULTI_COMBINATIONS) {
            throw new EngineError(ErrorCode.UNBOUNDED_SEARCH);
        }
    }

    const solutions = [];
    const assignment = {};

    function dfs(depth) {
        if (depth === variableOrder.length) {
            const lv = evaluateAstWithAssignment(leftAST, assignment);
            const rv = evaluateAstWithAssignment(rightAST, assignment);
            if (lv === rv) {
                solutions.push({ ...assignment });
            }
            return;
        }

        const varName = variableOrder[depth];
        for (const value of domains[varName].values) {
            assignment[varName] = value;
            dfs(depth + 1);
        }
    }

    dfs(0);

    // No integer solutions found in the scan domain
    if (solutions.length === 0) {
        throw new EngineError(ErrorCode.NO_SOLUTIONS);
    }

    const paged = paginateSolutions(solutions, options);

    const searchBounds = {};
    for (const [k, d] of Object.entries(domains)) {
        searchBounds[k] = { lo: d.lo, hi: d.hi, count: d.values.length };
    }

    return {
        ...paged,
        variableOrder,
        searchBounds,
        scannedCombinations: totalCombinations,
        polynomial: {
            variables: variableOrder,
            degree: Math.max(estimateDegree(leftAST), estimateDegree(rightAST)),
            mode: "multivariate_bruteforce",
        },
    };
}

function trySolvePolynomial(leftAST, rightAST, userConstraints = {}, options = {}) {
    const hasPolyCandidate =
        isPolynomialCandidate(leftAST) || isPolynomialCandidate(rightAST);

    if (!hasPolyCandidate) return null;

    const vars = new Set([
        ...collectVariables(leftAST, new Set()),
        ...collectVariables(rightAST, new Set()),
    ]);

    if (vars.size === 0) return null;

    const variableOrder = Array.from(vars).sort();

    if (variableOrder.length === 1) {
        return solveSingleVariable(
            leftAST,
            rightAST,
            variableOrder[0],
            userConstraints,
            options,
        );
    }

    return solveMultivariable(
        leftAST,
        rightAST,
        variableOrder,
        userConstraints,
        options,
    );
}

module.exports = { trySolvePolynomial };
