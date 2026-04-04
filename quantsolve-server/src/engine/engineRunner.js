// engine/engineRunner.js
// Orchestrates the full QuantSolve pipeline:
//   Input → Lexer → Parser → Normalizer → Solver (worker thread) → Formatter
//
// The solver runs in a worker_threads Worker so it never blocks the main
// Node.js event loop. A configurable timeout kills runaway solves.

const { Worker } = require("worker_threads");
const path = require("path");

const { lexer } = require("./lexer");
const Parser = require("./parser");
const normalizeEquation = require("./normalizer");
const formatResults = require("./resultFormatter");
const handleError = require("./errorHandler");
const { EngineError, ErrorCode } = require("./errors");

// How long (ms) to wait for the worker before killing it
const SOLVE_TIMEOUT_MS = 8000;

// Run the solver in a worker thread, returning a Promise
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
                // Worker posted a structured error — re-throw as EngineError if possible
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
        // --- Phase 0: Input validation ---
        if (typeof input !== "string" || !input.trim()) {
            throw new EngineError(ErrorCode.EMPTY_INPUT);
        }

        const cleanedInput = input.replace(/\s+/g, " ").trim();

        // --- Phase 1: Lex ---
        const tokens = lexer(cleanedInput);

        // --- Phase 2: Parse ---
        const parser = new Parser(tokens);
        const { left, right } = parser.parseEquation();

        // --- Phase 3: Normalize ---
        const { coeffs, target } = normalizeEquation(left, right);

        const variableOrder = Object.keys(coeffs); // capture original order before solver reorders

        // --- Phase 4: Solve (worker thread) ---
        const solveResult = await runSolverInWorker(
            coeffs,
            target,
            userConstraints,
            { limit: options.limit || 1000 },
        );

        const solutions = solve(coeffs, target, constraints);
        const formattedSolutions = formatResults(solutions.solutions);

        return {
            success: true,
            input: cleanedInput,
            coeffs,
            target,
            solutionCount: solutions.solutions.length,
            solutions: solutions.solutions,
            formattedSolutions,
            warnings,
            meta: {
                variableCount: Object.keys(coeffs).length,
                constraintCount: Object.keys(userConstraints).length,
                astDepth: treeDepth(left),
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
