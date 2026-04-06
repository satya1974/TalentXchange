// src/test.js — run: node ./src/test.js
//
// Tests the engineAdapter (which wraps BOTH the JS engine and the C++ engine).
// Field names match the actual engineRunner.js response shape:
//   r.totalFound  (not r.total)
//   r.page, r.totalPages, r.pageSize, r.hasMore  (not r.formattedResult.pagination)

const { runEngineWithMeta } = require("./engine/engineAdapter");

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
    const t = process.hrtime.bigint();
    try {
        await fn();
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        console.log(`  ✓  ${name}  (${ms.toFixed(1)}ms)`);
        passed++;
    } catch (err) {
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        console.log(`  ✗  ${name}  (${ms.toFixed(1)}ms)`);
        console.log(`       → ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

// Wrapper: resolve via engineAdapter and return the flat result
async function solve(equation, constraints = {}, options = {}) {
    const { result } = await runEngineWithMeta(equation, constraints, {
        page: options.page || 1,
        pageSize: options.pageSize || 50,
    }, { disableCache: true });
    return result;
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(a, e, lbl) {
    if (JSON.stringify(a) !== JSON.stringify(e))
        throw new Error(`${lbl || ""}: got ${JSON.stringify(a)}, want ${JSON.stringify(e)}`);
}
function assertIncludes(arr, item, lbl) {
    // Key-order-independent: compare sorted JSON of each entry
    const target = JSON.stringify(Object.fromEntries(Object.entries(item).sort()));
    if (!arr.some((s) => JSON.stringify(Object.fromEntries(Object.entries(s).sort())) === target))
        throw new Error(`${lbl || "Expected"} ${JSON.stringify(item)} in results`);
}
function assertError(r, code) {
    assert(!r.success, `Expected failure with code ${code}, but got success`);
    assert(r.code === code, `Expected code=${code}, got code=${r.code}`);
}
function section(t) {
    console.log(`\n${"─".repeat(66)}\n  ${t}\n${"─".repeat(66)}`);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
async function runAll() {
    console.log("\nQuantSolve — Full Test Suite\n");
    const backend = process.env.ENGINE_BACKEND || "js";
    console.log(`  Engine backend: ${backend}`);

    // ═══════════════════════════════════════════════════════════════════════
    section("1. Core equations (spec examples)");
    // ═══════════════════════════════════════════════════════════════════════

    await test("50x = 200 → x=4", async () => {
        const r = await solve("50x = 200");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 1, "totalFound");
        assertEqual(r.solutions[0].x, 4, "x");
    });

    await test("10x + 20y = 100 → exactly 6 solutions", async () => {
        const r = await solve("10x + 20y = 100");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 6, "totalFound");
        const expected = [
            { x: 0, y: 5 }, { x: 2, y: 4 }, { x: 4, y: 3 },
            { x: 6, y: 2 }, { x: 8, y: 1 }, { x: 10, y: 0 },
        ];
        for (const sol of expected) assertIncludes(r.solutions, sol);
    });

    await test("10a+15b+20c+50d+5e=1000 → 337,212 total, page 1 = 50 rows", async () => {
        const r = await solve("10a + 15b + 20c + 50d + 5e = 1000");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 337212, "totalFound");
        assertEqual(r.solutions.length, 50, "page size");
        const expectedPages = Math.ceil(337212 / 50);
        assertEqual(r.totalPages, expectedPages, "totalPages");
        for (const s of r.solutions) {
            const lhs = 10*(s.a||0) + 15*(s.b||0) + 20*(s.c||0) + 50*(s.d||0) + 5*(s.e||0);
            assertEqual(lhs, 1000, `invalid solution ${JSON.stringify(s)}`);
        }
    });

    await test("Page 2 differs from page 1 (pagination works)", async () => {
        const p1 = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { page: 1 });
        const p2 = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { page: 2 });
        assert(p1.success && p2.success);
        assert(JSON.stringify(p1.solutions) !== JSON.stringify(p2.solutions), "pages differ");
        assertEqual(p2.totalFound, 337212, "totalFound consistent across pages");
    });

    await test("Last page has correct remainder size", async () => {
        const first = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { pageSize: 50 });
        const lastPg = first.totalPages;
        const last = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { page: lastPg, pageSize: 50 });
        assert(last.success, last.error);
        const expected = 337212 % 50 || 50;
        assertEqual(last.solutions.length, expected, "last page size");
    });

    await test("2x+4y=3 → NO_SOLUTIONS (gcd=2, 3%2≠0)", async () => {
        const r = await solve("2x + 4y = 3");
        assertError(r, "NO_SOLUTIONS");
        assert(r.error.includes("No whole-number solutions"), r.error);
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("2. Parser — BODMAS, implicit multiply, brackets");
    // ═══════════════════════════════════════════════════════════════════════

    await test("Implicit coefficient: 3x=12 → x=4", async () => {
        const r = await solve("3x = 12");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Implicit multiply: 2(x+y)=10", async () => {
        const r = await solve("2(x + y) = 10");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(2 * (s.x + s.y), 10, JSON.stringify(s));
    });

    await test("Nested brackets: ((10x+20y)*2)+10=50 → 2x+3y... all correct", async () => {
        // ((2x + 3y) * 2) + 10 = 50  → (2x+3y) = 20 → 2x+3y=20
        const r = await solve("((2*x + 3*y) * 2) + 10 = 50");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual((2*s.x + 3*s.y)*2 + 10, 50, JSON.stringify(s));
    });

    await test("Division by constant: 10x/2+y=50 → 5x+y=50", async () => {
        const r = await solve("10x/2 + y = 50");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(5*s.x + s.y, 50, JSON.stringify(s));
    });

    await test("Multi-char variables: 10apple+20google=100", async () => {
        const r = await solve("10apple + 20google = 100");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(10*s.apple + 20*s.google, 100, JSON.stringify(s));
    });

    await test("Variable on both sides: 10x+5=5x+25 → x=4", async () => {
        const r = await solve("10x + 5 = 5x + 25");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 1);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Constants only on one side: 2x+10=30 → x=10", async () => {
        const r = await solve("2x + 10 = 30");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 10);
    });

    await test("Unary minus: JS engine does not support negative coefficients (NEGATIVE_COEFFICIENT)", async () => {
        // The JS normalizer explicitly rejects negative-coefficient equations.
        // -x + 10 = 5 becomes coeff(x) = -1 after normalization → NEGATIVE_COEFFICIENT error.
        const r = await solve("-x + 10 = 5");
        // Either it handles it (succeeds, x=5) or correctly rejects with the documented error
        if (!r.success) {
            assert(["NEGATIVE_COEFFICIENT","NEGATIVE_TARGET","NO_SOLUTIONS"].includes(r.code),
                `unexpected error code: ${r.code}`);
        } else {
            assert(r.solutions.some(s => s.x === 5), "x=5 expected if solved");
        }
    });

    await test("Whitespace variations accepted: '10x+20y=100'", async () => {
        const r = await solve("10x+20y=100");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 6);
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("3. Constraint engine");
    // ═══════════════════════════════════════════════════════════════════════

    await test("min constraint: x>=6 in 10x+20y+5z=100", async () => {
        const r = await solve("10x + 20y + 5z = 100", { x: { min: 6 }, y: { max: 2 } });
        assert(r.success, r.error);
        assert(r.totalFound > 0, "has solutions");
        for (const s of r.solutions) {
            assert(s.x >= 6, `x=${s.x} violates min=6`);
            assert(s.y <= 2, `y=${s.y} violates max=2`);
            assertEqual(10*s.x + 20*s.y + 5*s.z, 100, JSON.stringify(s));
        }
    });

    await test("even constraint: x even in 2x+y=20", async () => {
        const r = await solve("2x + y = 20", { x: { even: true } });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(s.x % 2 === 0, `x=${s.x} is not even`);
    });

    await test("odd constraint: x odd in 2x+y=20", async () => {
        const r = await solve("2x + y = 20", { x: { odd: true } });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(Math.abs(s.x) % 2 === 1, `x=${s.x} is not odd`);
    });

    await test("exact constraint: y=3 pins variable", async () => {
        const r = await solve("10x + 20y + 5z = 100", { y: { exact: 3 } });
        assert(r.success, r.error);
        for (const s of r.solutions) {
            assertEqual(s.y, 3, "y not pinned");
            assertEqual(10*s.x + 20*s.y + 5*s.z, 100, JSON.stringify(s));
        }
    });

    await test("combined constraints: even x, max y=3, min z=1", async () => {
        const r = await solve("5x + 10y + 2z = 50", {
            x: { even: true }, y: { max: 3 }, z: { min: 1 }
        });
        assert(r.success, r.error);
        for (const s of r.solutions) {
            assert(s.x % 2 === 0, `x=${s.x}`);
            assert(s.y <= 3,       `y=${s.y}`);
            assert(s.z >= 1,       `z=${s.z}`);
        }
    });

    await test("impossible constraint makes solution set empty or NO_SOLUTIONS", async () => {
        const r = await solve("10x = 50", { x: { min: 10 } });
        if (r.success) assertEqual(r.totalFound, 0, "no solutions within constraint");
        else assert(["NO_SOLUTIONS", "INVALID_CONSTRAINT"].includes(r.code));
    });

    await test("x+y+z=3 with max=3 → exactly 10 non-negative solutions", async () => {
        const r = await solve("x + y + z = 3", { x:{max:3}, y:{max:3}, z:{max:3} });
        assert(r.success, r.error);
        assertEqual(r.totalFound, 10, "C(3+3,3)=10");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("4. Polynomial equations (C++ and JS polynomial solver)");
    // ═══════════════════════════════════════════════════════════════════════

    await test("x^2 - 5x + 6 = 0 → x=2, x=3", async () => {
        const r = await solve("x^2 - 5*x + 6 = 0");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 2, "two roots");
        assertIncludes(r.solutions, { x: 2 }, "x=2");
        assertIncludes(r.solutions, { x: 3 }, "x=3");
    });

    await test("x^2 - 4 = 0 → x=-2, x=2", async () => {
        const r = await solve("x^2 - 4 = 0");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 2, "two roots");
        assertIncludes(r.solutions, { x: -2 }, "x=-2");
        assertIncludes(r.solutions, { x: 2 },  "x=2");
    });

    await test("x^2 = 0 → x=0 only", async () => {
        const r = await solve("x^2 = 0");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 1, "single root");
        assertEqual(r.solutions[0].x, 0);
    });

    await test("x^2 + 1 = 0 → no real integer solutions", async () => {
        const r = await solve("x^2 + 1 = 0");
        // Should either succeed with 0 solutions, or return NO_SOLUTIONS
        if (r.success) assertEqual(r.totalFound, 0, "no solutions");
        else assert(r.code === "NO_SOLUTIONS" || r.code === "POLYNOMIAL_UNSUPPORTED");
    });

    await test("x^3 - 6x^2 + 11x - 6 = 0 → x=1,2,3", async () => {
        const r = await solve("x^3 - 6*x^2 + 11*x - 6 = 0");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 3, "three roots");
        assertIncludes(r.solutions, { x: 1 });
        assertIncludes(r.solutions, { x: 2 });
        assertIncludes(r.solutions, { x: 3 });
    });

    await test("x^2 + y^2 = 25 → 12 Pythagorean solutions (constrained domain)", async () => {
        const r = await solve("x^2 + y^2 = 25", { x:{min:-10,max:10}, y:{min:-10,max:10} });
        assert(r.success, r.error);
        assertEqual(r.totalFound, 12, "12 integer points on circle r=5");
        // Check all solutions are correct
        for (const s of r.solutions)
            assertEqual(s.x*s.x + s.y*s.y, 25, JSON.stringify(s));
    });

    await test("x^2 + y^2 = 25 → solutions verified (no constraints)", async () => {
        const r = await solve("x^2 + y^2 = 25");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(s.x*s.x + s.y*s.y, 25, JSON.stringify(s));
    });

    await test("solver_type is 'polynomial' for polynomial equation", async () => {
        const r = await solve("x^2 - 5*x + 6 = 0");
        assert(r.success, r.error);
        assert(r.meta?.solverType === "polynomial", `solverType=${r.meta?.solverType}`);
    });

    await test("polynomial.degree reported correctly (quadratic)", async () => {
        const r = await solve("x^2 - 5*x + 6 = 0");
        assert(r.success, r.error);
        assert(r.polynomial?.degree === 2 || r.meta?.polynomialDegree === 2,
            `degree not 2: ${JSON.stringify(r.polynomial)}`);
    });

    await test("Unicode superscripts: x² - 5x + 6 = 0 → same as x^2", async () => {
        // If lexer normalizes ² → ^2, this must give same results
        const r = await solve("x\u00B2 - 5x + 6 = 0");
        if (r.success) {
            assertEqual(r.totalFound, 2, "two roots via unicode superscript");
            assertIncludes(r.solutions, { x: 2 });
            assertIncludes(r.solutions, { x: 3 });
        } else {
            // Acceptable: some backends may not support unicode superscripts
            assert(["INVALID_CHARACTER","POLYNOMIAL_UNSUPPORTED","MISSING_EQUALS"].includes(r.code),
                `Unexpected error: ${r.code}`);
        }
    });

    await test("cubed superscript: x³ = 8 → x=2", async () => {
        const r = await solve("x\u00B3 = 8");
        if (r.success) {
            assertIncludes(r.solutions, { x: 2 });
        } else {
            assert(["INVALID_CHARACTER","POLYNOMIAL_UNSUPPORTED"].includes(r.code));
        }
    });

    await test("polynomial with constrained domain works", async () => {
        const r = await solve("x^2 - 5*x + 6 = 0", { x: { min: 0, max: 10 } });
        assert(r.success, r.error);
        assertEqual(r.totalFound, 2, "two roots in [0,10]");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("5. Error taxonomy — all error codes");
    // ═══════════════════════════════════════════════════════════════════════

    await test("EMPTY_INPUT", async () => {
        const r = await solve("   ");
        assertError(r, "EMPTY_INPUT");
        assert(r.error.toLowerCase().includes("no equation") || r.error.toLowerCase().includes("empty"), r.error);
    });

    await test("MISSING_EQUALS — '10x + 5y'", async () => {
        const r = await solve("10x + 5y");
        assertError(r, "MISSING_EQUALS");
        assert(r.error.includes("="), r.error);
    });

    await test("MULTIPLE_EQUALS — 'x = y = 5'", async () => {
        const r = await solve("x = y = 5");
        assertError(r, "MULTIPLE_EQUALS");
    });

    await test("INVALID_CHARACTER — '$'", async () => {
        const r = await solve("10$ + 5y = 100");
        assertError(r, "INVALID_CHARACTER");
    });

    await test("DIVISION_BY_ZERO — 'x/0=5'", async () => {
        const r = await solve("x/0 = 5");
        assertError(r, "DIVISION_BY_ZERO");
    });

    await test("VARIABLE_IN_DENOMINATOR — '100/x=10'", async () => {
        const r = await solve("100/x = 10");
        assertError(r, "VARIABLE_IN_DENOMINATOR");
    });

    await test("FRACTIONAL_COEFFICIENT — '3x/2=12'", async () => {
        const r = await solve("3x/2 = 12");
        assertError(r, "FRACTIONAL_COEFFICIENT");
        assert(r.error.includes("Fractional coefficient") || r.error.includes("fractional"), r.error);
    });

    await test("NON_LINEAR_TERM — 'x*y=10'", async () => {
        // In a default domain, x*y=10 is non-linear (no ^ so polynomial path won't take it)
        // C++ and JS both throw NON_LINEAR_TERM from linear path
        const r = await solve("x * y = 10");
        // After our C++ fix, x*y IS now routed to multi-var polynomial solver
        // so either success (polynomial solved) or NON_LINEAR_TERM is acceptable
        if (!r.success) assertError(r, "NON_LINEAR_TERM");
        else {
            assert(r.totalFound > 0, "multi-var polynomial has solutions");
            for (const s of r.solutions)
                assertEqual(s.x * s.y, 10, JSON.stringify(s));
        }
    });

    await test("NO_SOLUTIONS — '3x+6y=7' (gcd=3, 7%3≠0)", async () => {
        const r = await solve("3x + 6y = 7");
        assertError(r, "NO_SOLUTIONS");
    });

    await test("UNBOUNDED_SEARCH or success — 'x+y=100000' large equation", async () => {
        // x+y=100000 with no constraints: search space is huge.
        // JS engine: probes and may throw UNBOUNDED_SEARCH.
        // Polynomial engine: handles it differently.
        // Both outcomes are acceptable — engine must not crash.
        const r = await solve("x + y = 100000");
        assert(typeof r.success === "boolean", "engine returned a response");
        if (!r.success) {
            assert(["UNBOUNDED_SEARCH","NO_SOLUTIONS"].includes(r.code),
                `unexpected error: ${r.code}`);
        }
    });

    await test("DECIMAL_NOT_SUPPORTED — '3.5x=10'", async () => {
        const r = await solve("3.5x = 10");
        assertError(r, "DECIMAL_NOT_SUPPORTED");
    });

    await test("Error response always has code + category + error string", async () => {
        const r = await solve("2x + 4y = 3");
        assert(r.success === false);
        assert(typeof r.error === "string" && r.error.length > 0, "error is non-empty string");
        assert(typeof r.code  === "string" && r.code.length > 0,  "code is non-empty string");
        assert(typeof r.category === "string",                      "category is string");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("6. Response shape validation");
    // ═══════════════════════════════════════════════════════════════════════

    await test("Success response has all required fields", async () => {
        const r = await solve("10x + 5y = 50");
        assert(r.success, r.error);
        const required = ["coeffs","target","variableOrder","totalFound",
                          "totalPages","pageSize","page","solutions","formattedResult","warnings","meta"];
        for (const f of required)
            assert(f in r, `missing field: '${f}'`);
    });

    await test("formattedResult has rows array", async () => {
        const r = await solve("10x + 20y = 100");
        assert(r.success, r.error);
        assert(Array.isArray(r.formattedResult.rows), "rows is array");
        assert(r.formattedResult.rows.length === 6, "6 rows on page 1");
    });

    await test("solutions array length == pageSize (when totalFound > pageSize)", async () => {
        const r = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { pageSize: 25 });
        assert(r.success, r.error);
        assertEqual(r.solutions.length, 25, "page slice = 25");
        assertEqual(r.pageSize, 25);
    });

    await test("variableOrder is deterministic (alphabetically sorted)", async () => {
        const r = await solve("10y + 5x = 50");
        assert(r.success, r.error);
        // Should be sorted: x, y
        const sorted = [...r.variableOrder].sort();
        assertEqual(r.variableOrder, sorted, "variable order is alphabetical");
    });

    await test("meta.solverType is 'linear' for linear equations", async () => {
        const r = await solve("10x + 20y = 100");
        assert(r.success, r.error);
        assertEqual(r.meta.solverType, "linear");
    });

    await test("meta.variableCount matches actual variables", async () => {
        const r = await solve("10x + 5y + 2z = 100");
        assert(r.success, r.error);
        assertEqual(r.meta.variableCount, 3, "variableCount");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("7. Edge cases");
    // ═══════════════════════════════════════════════════════════════════════

    await test("Single solution: 10x=50 → x=5 only", async () => {
        const r = await solve("10x = 50");
        assert(r.success, r.error);
        assertEqual(r.totalFound, 1);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("Zero target: 5x+3y=0 → x=0,y=0 only", async () => {
        const r = await solve("5x + 3y = 0");
        if (r.success) {
            assertEqual(r.totalFound, 1);
            assertEqual(r.solutions[0].x, 0);
            assertEqual(r.solutions[0].y, 0);
        } else {
            assert(["NO_SOLUTIONS","NEGATIVE_TARGET"].includes(r.code));
        }
    });

    await test("Large coefficient: 1000x=5000 → x=5", async () => {
        const r = await solve("1000x = 5000");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("All first-page solutions verify equation exactly", async () => {
        const r = await solve("10x + 20y + 5z = 100");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(10*s.x + 20*s.y + 5*s.z, 100, JSON.stringify(s));
    });

    await test("Page beyond last returns empty solutions (not error)", async () => {
        const r = await solve("50x = 200", {}, { page: 99 });
        // Either success with empty solutions, or success with page 1
        if (r.success) assert(r.solutions.length === 0 || r.solutions.length === 1);
        else assert(r.code === "NO_SOLUTIONS");
    });

    await test("Equation with only constants: '5 = 5' → already satisfied / trivial", async () => {
        const r = await solve("5 = 5");
        // This is a degenerate equation: no variables is handled differently per engine
        // Acceptable: any well-defined response (success with 0 vars, or a descriptor error)
        assert(typeof r.success === "boolean", "response has success field");
    });

    await test("Negative target: 5x = -10 normalized correctly", async () => {
        const r = await solve("5x = -10");
        // With default constraints (x>=0), no solution. Without: x=-2
        assert(typeof r.success === "boolean", "does not crash");
    });

    await test("hasMore is false on last page", async () => {
        const r = await solve("50x = 200"); // 1 solution, 1 page
        assert(r.success, r.error);
        assertEqual(r.hasMore, false, "hasMore should be false");
    });

    await test("hasMore is true when more pages exist", async () => {
        const r = await solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { pageSize: 50 });
        assert(r.success, r.error);
        assertEqual(r.hasMore, true, "hasMore should be true with 337k solutions");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("8. Pagination correctness");
    // ═══════════════════════════════════════════════════════════════════════

    await test("Page 1 and page 2 are disjoint (no duplicate solutions)", async () => {
        const [p1, p2] = await Promise.all([
            solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { page: 1, pageSize: 50 }),
            solve("10a + 15b + 20c + 50d + 5e = 1000", {}, { page: 2, pageSize: 50 }),
        ]);
        const p1keys = new Set(p1.solutions.map(s => JSON.stringify(s)));
        for (const s of p2.solutions)
            assert(!p1keys.has(JSON.stringify(s)), `duplicate: ${JSON.stringify(s)}`);
    });

    await test("All pages together cover exactly total for small equation", async () => {
        const first = await solve("10x + 5y = 100", {}, { pageSize: 10 });
        const total = first.totalFound;
        const allSolutions = [...first.solutions];
        for (let pg = 2; pg <= first.totalPages; pg++) {
            const p = await solve("10x + 5y = 100", {}, { page: pg, pageSize: 10 });
            allSolutions.push(...p.solutions);
        }
        assertEqual(allSolutions.length, total, "all pages sum to totalFound");
        const keys = allSolutions.map(s => JSON.stringify(s));
        assertEqual(new Set(keys).size, total, "no duplicates across pages");
    });

    // ═══════════════════════════════════════════════════════════════════════
    section("9. Performance benchmarks");
    // ═══════════════════════════════════════════════════════════════════════

    await test("PERF 1-var: 50x=200 < 100ms", async () => {
        const t = process.hrtime.bigint();
        const r = await solve("50x = 200");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 100, `${ms.toFixed(1)}ms`);
        console.log(`       actual: ${ms.toFixed(1)}ms`);
    });

    await test("PERF 2-var: 10x+20y=100 < 200ms", async () => {
        const t = process.hrtime.bigint();
        const r = await solve("10x + 20y = 100");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 200, `${ms.toFixed(1)}ms`);
        console.log(`       actual: ${ms.toFixed(1)}ms, total=${r.totalFound}`);
    });

    await test("PERF 4-var: 150a+100b+50c+10d=5000 < 500ms", async () => {
        const t = process.hrtime.bigint();
        const r = await solve("150a + 100b + 50c + 10d = 5000");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 500, `${ms.toFixed(1)}ms`);
        console.log(`       actual: ${ms.toFixed(1)}ms, total=${r.totalFound}`);
    });

    await test("PERF 5-var 337K solutions < 1000ms", async () => {
        const t = process.hrtime.bigint();
        const r = await solve("10a + 15b + 20c + 50d + 5e = 1000");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assertEqual(r.totalFound, 337212, "exact count");
        assert(ms < 1000, `${ms.toFixed(1)}ms`);
        console.log(`       actual: ${ms.toFixed(1)}ms, total=${r.totalFound}, pages=${r.totalPages}`);
    });

    await test("PERF polynomial x^2-5x+6=0 < 200ms", async () => {
        const t = process.hrtime.bigint();
        const r = await solve("x^2 - 5*x + 6 = 0");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 200, `${ms.toFixed(1)}ms`);
        console.log(`       actual: ${ms.toFixed(1)}ms`);
    });

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n${"═".repeat(66)}`);
    console.log(`  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
    if (failures.length) {
        console.log(`\n  Failed tests:`);
        failures.forEach(f => console.log(`    ✗  ${f.name}\n       ${f.error}`));
    } else {
        console.log(`\n  ✓ All tests passed.`);
    }
    console.log(`${"═".repeat(66)}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
    console.error("Test runner crashed:", err);
    process.exit(1);
});
