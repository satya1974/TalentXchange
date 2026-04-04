// engine/solverWorker.js
// Runs inside a worker_threads Worker — completely isolated from the main thread.
// Receives solve parameters via parentPort.once("message"), posts result back.

const { workerData, parentPort } = require("worker_threads");
const solve = require("./solver");
const handleError = require("./errorHandler");

const { coeffs, target, constraints, options } = workerData;

try {
    const result = solve(coeffs, target, constraints, options);
    parentPort.postMessage({ success: true, ...result });
} catch (err) {
    parentPort.postMessage({ success: false, ...handleError(err) });
}
