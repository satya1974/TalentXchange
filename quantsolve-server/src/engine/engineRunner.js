// engine/engineRunner.js
// Orchestrates the full QuantSolve pipeline:
//   Input → Lexer → Parser → Normalizer → Solver (worker thread) → Formatter
//
// Solver runs in a worker_threads Worker so it never blocks the main event loop.
// Response is PAGINATED — solver finds all solutions, sends only the requested page.

const { Worker } = require("worker_threads");
const path = require("path");

const { lexer } = require("./lexer");
const Parser = require("./parser");
const normalizeEquation = require("./normalizer");
const formatResults = require("./resultFormatter");
const handleError = require("./errorHandler");
const { EngineError, ErrorCode } = require("./errors");
const { trySolvePolynomial } = require("./polynomialSolver");

const SOLVE_TIMEOUT_MS = 8000;

function runSolverInWorker(coeffs, target, constraints, options) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "solverWorker.js"), {
            workerData: { coeffs, target, constraints, options },
        });

        const timer = setTimeout(() => {
            worker.terminate();
            reject(new EngineError(ErrorCode.UNBOUNDED_SEARCH));
        }, SOLVE_TIMEOUT_MS);

        worker.once("message", (result) => {
            clearTimeout(timer);
            if (result.success) {
                resolve(result);
            } else {
                reject(
                    Object.assign(new Error(result.error), {
                        isEngineError: true,
                        code: result.code,
                    }),
                );
            }
        });

        worker.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });

        worker.once("exit", (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                reject(
                    new EngineError(
                        ErrorCode.INTERNAL_ERROR,
                        `Worker exited with code ${code}`,
                    ),
                );
            }
        });
    });
}

async function runEngine(input, userConstraints = {}, options = {}) {
    try {
        if (typeof input !== "string" || !input.trim()) {
            throw new EngineError(ErrorCode.EMPTY_INPUT);
        }

        const cleanedInput = input.replace(/\s+/g, " ").trim();

        // Phase 1: Lex
        const tokens = lexer(cleanedInput);

        // Phase 2: Parse
        const parser = new Parser(tokens);
        const { left, right } = parser.parseEquation();

        // Solver options are shared by linear and polynomial paths.
        const workerOptions = {
            page: options.page || 1,
            pageSize: options.pageSize || 50,
        };

        // Optional polynomial path (currently single-variable integer polynomial support).
        const polyResult = trySolvePolynomial(
            left,
            right,
            userConstraints,
            workerOptions,
        );

        if (polyResult) {
            const formatted = formatResults(polyResult.solutions, {
                totalFound: polyResult.totalFound,
                variableOrder: polyResult.variableOrder,
                page: polyResult.page,
                pageSize: polyResult.pageSize,
                totalPages: polyResult.totalPages,
                hasMore: polyResult.hasMore,
            });

            function treeDepth(node) {
                if (!node) return 0;
                if (node.type === "Number" || node.type === "Variable") return 1;
                if (node.type === "UnaryOp") return 1 + treeDepth(node.operand);
                return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
            }

            return {
                success: true,
                input: cleanedInput,
                coeffs: {},
                target: 0,
                variableOrder: polyResult.variableOrder,
                polynomial: polyResult.polynomial,
                ast: { left, right },
                totalFound: polyResult.totalFound,
                page: polyResult.page,
                pageSize: polyResult.pageSize,
                totalPages: polyResult.totalPages,
                hasMore: polyResult.hasMore,
                solutions: polyResult.solutions,
                formattedResult: formatted,
                warnings: formatted.warnings,
                meta: {
                    variableCount: polyResult.variableOrder.length,
                    constraintCount: Object.keys(userConstraints).length,
                    astDepth: treeDepth(left),
                    solverType: "polynomial",
                    polynomialDegree: polyResult.polynomial.degree,
                    searchBounds: polyResult.searchBounds,
                },
            };
        }

        // Phase 3: Normalize (linear path)
        const { coeffs, target } = normalizeEquation(left, right);
        const variableOrder = Object.keys(coeffs);

        // Phase 4: Solve (worker thread)
        // Pass page + pageSize so solver returns only the requested slice.
        // totalFound in the response is always the TRUE full count.
        const solveResult = await runSolverInWorker(
            coeffs,
            target,
            userConstraints,
            workerOptions,
        );

        // Phase 5: Format
        const formatted = formatResults(solveResult.solutions, {
            totalFound: solveResult.totalFound,
            capped: false,
            variableOrder,
            page: solveResult.page,
            pageSize: solveResult.pageSize,
            totalPages: solveResult.totalPages,
            hasMore: solveResult.hasMore,
        });

        function treeDepth(node) {
            if (!node) return 0;
            if (node.type === "Number" || node.type === "Variable") return 1;
            if (node.type === "UnaryOp") return 1 + treeDepth(node.operand);
            return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
        }

        return {
            success: true,
            input: cleanedInput,
            coeffs,
            target,
            variableOrder,
            ast: { left, right },
            // Pagination metadata
            totalFound: solveResult.totalFound, // true total e.g. 352,800
            page: solveResult.page,
            pageSize: solveResult.pageSize,
            totalPages: solveResult.totalPages,
            hasMore: solveResult.hasMore,
            // This page's solutions
            solutions: solveResult.solutions,
            formattedResult: formatted,
            warnings: formatted.warnings,
            meta: {
                variableCount: Object.keys(coeffs).length,
                constraintCount: Object.keys(userConstraints).length,
                astDepth: treeDepth(left),
                solverType: "linear",
            },
        };
    } catch (err) {
        const errorPayload = handleError(err);
        return {
            ...errorPayload,
            input,
            solutions: [],
            formattedResult: { rows: [], count: 0, warnings: [] },
            warnings: [],
            meta: {},
        };
    }
}

module.exports = { runEngine };
