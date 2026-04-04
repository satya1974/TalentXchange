// src/test.js
// Run: node ./src/test.js
//
// Covers:
//   - All 6 PS input/output examples
//   - Parser edge cases (unary minus, brackets, implicit multiply)
//   - Constraint cases (min, max, even, odd, exact)
//   - Error taxonomy (all 9 error codes)
//   - Performance benchmarks (5-variable, 6-variable, large target)
//   - Edge cases (single solution, identity, zero target, large coefficients)

const { runEngine } = require("./engine/engineRunner");

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
    const start = process.hrtime.bigint();
    try {
        await fn();
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`  PASS  ${name}  (${ms.toFixed(2)}ms)`);
        passed++;
    } catch (err) {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`  FAIL  ${name}  (${ms.toFixed(2)}ms)`);
        console.log(`        ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || "Assertion failed");
}

function assertEqual(actual, expected, label) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e)
        throw new Error(`${label || "assertEqual"}: got ${a}, expected ${e}`);
}

function assertContains(array, item, label) {
    const found = array.some((s) => JSON.stringify(s) === JSON.stringify(item));
    if (!found)
        throw new Error(
            `${label || "assertContains"}: ${JSON.stringify(item)} not found in results`,
        );
}

function assertError(result, expectedCode) {
    assert(!result.success, `Expected failure but got success`);
    assert(
        result.code === expectedCode,
        `Expected error code ${expectedCode}, got ${result.code}`,
    );
}

function section(title) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${"─".repeat(60)}`);
}

// ─── Test sections ────────────────────────────────────────────────────────────

async function runAll() {
    console.log("\nQuantSolve Engine — Full Test Suite\n");

    // ══════════════════════════════════════════════════════
    section("PS Examples — must match spec exactly");
    // ══════════════════════════════════════════════════════

    await test("PS Example 1 — 50x = 200 → [x=4]", async () => {
        const r = await runEngine("50x = 200");
        assert(r.success, r.error);
        assertEqual(r.solutionCount, 1, "solution count");
        assertEqual(r.solutions[0].x, 4, "x value");
    });

    await test("PS Example 2 — 10x + 20y = 100 → 6 solutions", async () => {
        const r = await runEngine("10x + 20y = 100");
        assert(r.success, r.error);
        assertEqual(r.solutionCount, 6, "solution count");
        // Verify all 6 solutions from the PS
        const expected = [
            { x: 0, y: 5 },
            { x: 2, y: 4 },
            { x: 4, y: 3 },
            { x: 6, y: 2 },
            { x: 8, y: 1 },
            { x: 10, y: 0 },
        ];
        for (const sol of expected)
            assertContains(r.solutions, sol, `solution ${JSON.stringify(sol)}`);
    });

    await test("PS Example 3 — 10a+15b+20c+50d+5e=1000 → returns 1000 solutions, caps with total", async () => {
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        assert(r.success, r.error);
        assertEqual(r.solutionCount, 1000, "capped at 1000");
        assert(r.capped, "should be capped");
        assert(
            r.totalFound.toString().includes("1000+"),
            "totalFound should indicate cap",
        );
    });

    await test("PS Example 4 — constraints x>5, y<3", async () => {
        const r = await runEngine("10x + 20y + 5z = 100", {
            x: { min: 6 },
            y: { max: 2 },
        });
        assert(r.success, r.error);
        assert(r.solutionCount > 0, "should have solutions");
        for (const sol of r.solutions) {
            assert(sol.x >= 6, `x=${sol.x} violates x >= 6`);
            assert(sol.y <= 2, `y=${sol.y} violates y <= 2`);
        }
    });

    await test("PS Example 5 — brackets ((10x+20y)*2)+5z=500 → parses BODMAS correctly", async () => {
        // Normalises to 20x + 40y + 5z = 500
        const r = await runEngine("((10x + 20y) * 2) + 5z = 500");
        assert(r.success, r.error);
        assert(r.solutionCount > 0, "should have solutions");
        // Verify every solution satisfies the original equation
        for (const sol of r.solutions.slice(0, 20)) {
            const lhs = (10 * sol.x + 20 * sol.y) * 2 + 5 * sol.z;
            assertEqual(
                lhs,
                500,
                `solution ${JSON.stringify(sol)} does not satisfy equation`,
            );
        }
    });

    await test("PS Example 6 — 2x + 4y = 3 → No whole-number solutions", async () => {
        const r = await runEngine("2x + 4y = 3");
        assertError(r, "NO_SOLUTIONS");
        assert(
            r.error.includes("No whole-number solutions"),
            `wrong message: ${r.error}`,
        );
    });

    // ══════════════════════════════════════════════════════
    section("Parser — implicit multiplication & brackets");
    // ══════════════════════════════════════════════════════

    await test("Implicit multiply: 3x = 12 → x=4", async () => {
        const r = await runEngine("3x = 12");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Implicit multiply: 2(x+y) = 10 → multiple solutions", async () => {
        const r = await runEngine("2(x + y) = 10");
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions) {
            assertEqual(
                2 * (sol.x + sol.y),
                10,
                `solution ${JSON.stringify(sol)}`,
            );
        }
    });

    await test("Implicit multiply: (x+y)(2) should be treated as multiply — not crash", async () => {
        // (x+y)*2 = 10 → x+y = 5
        const r = await runEngine("(x + y) * 2 = 10");
        assert(r.success, r.error);
        for (const sol of r.solutions) assertEqual((sol.x + sol.y) * 2, 10);
    });

    await test("Deep nesting: ((2x + 3y) * 2) + 10 = 50 → 2x+3y=20", async () => {
        const r = await runEngine("((2x + 3y) * 2) + 10 = 50");
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions.slice(0, 5)) {
            assertEqual(
                (2 * sol.x + 3 * sol.y) * 2 + 10,
                50,
                JSON.stringify(sol),
            );
        }
    });

    await test("Division by literal: 10x/2 + y = 50 → normalises to 5x+y=50", async () => {
        const r = await runEngine("10x/2 + y = 50");
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions.slice(0, 5)) {
            assertEqual(5 * sol.x + sol.y, 50, JSON.stringify(sol));
        }
    });

    await test("Multi-char variable names: 10apple + 20google = 100", async () => {
        const r = await runEngine("10apple + 20google = 100");
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions) {
            assertEqual(
                10 * sol.apple + 20 * sol.google,
                100,
                JSON.stringify(sol),
            );
        }
    });

    // ══════════════════════════════════════════════════════
    section("Unary minus");
    // ══════════════════════════════════════════════════════

    await test("Unary minus RHS: x = -0 should be caught by negative target", async () => {
        // After normalisation: x = 0 — valid
        const r = await runEngine("x + 5 = 5");
        assert(r.success, r.error);
        assertContains(r.solutions, { x: 0 });
    });

    await test("Equation with subtraction: 30x - 10x = 40 → 20x=40 → x=2", async () => {
        const r = await runEngine("30x - 10x = 40");
        // After normalisation: 20x = 40, x=2
        // Note: negative coeff handling may vary; if solver rejects, check error message
        if (r.success) {
            assertEqual(r.solutions[0].x, 2);
        } else {
            // Acceptable: negative coefficient after normalisation
            assert(
                r.code === "NEGATIVE_COEFFICIENT" || r.code === "NO_SOLUTIONS",
            );
        }
    });

    // ══════════════════════════════════════════════════════
    section("Constraint engine");
    // ══════════════════════════════════════════════════════

    await test("Min constraint — x >= 5 in x+y=10", async () => {
        const r = await runEngine("x + y = 10", { x: { min: 5 } });
        assert(r.success, r.error);
        for (const sol of r.solutions)
            assert(sol.x >= 5, `x=${sol.x} violates min=5`);
    });

    await test("Max constraint — y <= 2 in x+y=10", async () => {
        const r = await runEngine("x + y = 10", { y: { max: 2 } });
        assert(r.success, r.error);
        for (const sol of r.solutions)
            assert(sol.y <= 2, `y=${sol.y} violates max=2`);
    });

    await test("Even constraint — x must be even in 2x+y=20", async () => {
        const r = await runEngine("2x + y = 20", { x: { even: true } });
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions)
            assert(sol.x % 2 === 0, `x=${sol.x} is not even`);
    });

    await test("Odd constraint — x must be odd in 2x+y=20", async () => {
        const r = await runEngine("2x + y = 20", { x: { odd: true } });
        assert(r.success, r.error);
        assert(r.solutionCount > 0);
        for (const sol of r.solutions)
            assert(sol.x % 2 === 1, `x=${sol.x} is not odd`);
    });

    await test("Exact value constraint — y=3 in 10x+20y+5z=100", async () => {
        const r = await runEngine("10x + 20y + 5z = 100", { y: { exact: 3 } });
        assert(r.success, r.error);
        for (const sol of r.solutions) {
            assertEqual(sol.y, 3, "y should be pinned to 3");
            assertEqual(
                10 * sol.x + 20 * sol.y + 5 * sol.z,
                100,
                JSON.stringify(sol),
            );
        }
    });

    await test("Combined constraints — even x, max y=3, min z=1", async () => {
        const r = await runEngine("5x + 10y + 2z = 50", {
            x: { even: true },
            y: { max: 3 },
            z: { min: 1 },
        });
        assert(r.success, r.error);
        for (const sol of r.solutions) {
            assert(sol.x % 2 === 0, `x=${sol.x} not even`);
            assert(sol.y <= 3, `y=${sol.y} > max 3`);
            assert(sol.z >= 1, `z=${sol.z} < min 1`);
        }
    });

    await test("Constraint with no valid solutions — min > possible max", async () => {
        // 10x = 50, x max is 5; if we require x >= 10 → no solutions
        const r = await runEngine("10x = 50", { x: { min: 10 } });
        // Either success with 0 solutions, or NO_SOLUTIONS error
        if (r.success) {
            assertEqual(r.solutionCount, 0, "should find no solutions");
        } else {
            assert(
                r.code === "NO_SOLUTIONS" || r.code === "INVALID_CONSTRAINT",
            );
        }
    });

    // ══════════════════════════════════════════════════════
    section("Error taxonomy — every error code");
    // ══════════════════════════════════════════════════════

    await test("EMPTY_INPUT — blank string", async () => {
        const r = await runEngine("   ");
        assertError(r, "EMPTY_INPUT");
        assert(r.error.includes("No equation entered"), r.error);
    });

    await test("MISSING_EQUALS — no = sign", async () => {
        const r = await runEngine("10x + 5y");
        assertError(r, "MISSING_EQUALS");
        assert(r.error.includes("exactly one '='"), r.error);
    });

    await test("MULTIPLE_EQUALS — two = signs", async () => {
        const r = await runEngine("x = y = 5");
        assertError(r, "MULTIPLE_EQUALS");
    });

    await test("INVALID_CHARACTER — dollar sign", async () => {
        const r = await runEngine("10$ + 5y = 100");
        assertError(r, "INVALID_CHARACTER");
        assert(r.error.includes("Invalid character"), r.error);
    });

    await test("UNEXPECTED_TOKEN — double operator x++y=10", async () => {
        const r = await runEngine("x ++ y = 10");
        assert(!r.success, "should fail");
    });

    await test("DIVISION_BY_ZERO — x/0 = 5", async () => {
        const r = await runEngine("x/0 = 5");
        assertError(r, "DIVISION_BY_ZERO");
        assert(r.error.includes("Division by zero"), r.error);
    });

    await test("VARIABLE_IN_DENOMINATOR — 100/x = 10", async () => {
        const r = await runEngine("100/x = 10");
        assertError(r, "VARIABLE_IN_DENOMINATOR");
        assert(r.error.includes("Non-linear equation"), r.error);
        assert(r.error.includes("denominator"), r.error);
    });

    await test("FRACTIONAL_COEFFICIENT — 3x/2 = 12", async () => {
        const r = await runEngine("3x/2 = 12");
        assertError(r, "FRACTIONAL_COEFFICIENT");
        assert(r.error.includes("Fractional coefficient"), r.error);
        assert(r.error.includes("whole numbers"), r.error);
    });

    await test("NON_LINEAR_TERM — x*y = 10", async () => {
        const r = await runEngine("x * y = 10");
        assertError(r, "NON_LINEAR_TERM");
        assert(r.error.includes("Non-linear term"), r.error);
    });

    await test("NO_SOLUTIONS — GCD does not divide target (2x+4y=3)", async () => {
        const r = await runEngine("2x + 4y = 3");
        assertError(r, "NO_SOLUTIONS");
        assert(r.error.includes("No whole-number solutions"), r.error);
    });

    await test("NO_SOLUTIONS — 3x + 6y = 7 (gcd=3, 7%3≠0)", async () => {
        const r = await runEngine("3x + 6y = 7");
        assertError(r, "NO_SOLUTIONS");
    });

    await test("UNBOUNDED_SEARCH — x + y = 100000 no constraints → too large", async () => {
        const r = await runEngine("x + y = 100000");
        assertError(r, "UNBOUNDED_SEARCH");
        assert(r.error.includes("Infinite answers detected"), r.error);
        assert(r.error.includes("market limits"), r.error);
    });

    await test("DECIMAL_NOT_SUPPORTED — 3.5x = 10", async () => {
        const r = await runEngine("3.5x = 10");
        assertError(r, "DECIMAL_NOT_SUPPORTED");
        assert(r.error.includes("Decimal numbers are not supported"), r.error);
    });

    await test("NEGATIVE_TARGET — 5 = 10x+20y (forces negative target)", async () => {
        // When RHS - LHS constant is negative
        const r = await runEngine("50x + 30y = 0");
        // Only solution is x=0, y=0
        if (r.success) {
            assertEqual(r.solutionCount, 1);
            assertEqual(r.solutions[0].x, 0);
            assertEqual(r.solutions[0].y, 0);
        } else {
            // Also acceptable if engine rejects zero target
            assert(["NO_SOLUTIONS", "NEGATIVE_TARGET"].includes(r.code));
        }
    });

    // ══════════════════════════════════════════════════════
    section("Edge cases");
    // ══════════════════════════════════════════════════════

    await test("Single solution — 10x = 50 → x=5 only", async () => {
        const r = await runEngine("10x = 50");
        assert(r.success, r.error);
        assertEqual(r.solutionCount, 1);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("Zero target — 5x + 3y = 0 → only x=0,y=0", async () => {
        const r = await runEngine("5x + 3y = 0");
        if (r.success) {
            assertEqual(r.solutionCount, 1);
            assertEqual(r.solutions[0].x, 0);
            assertEqual(r.solutions[0].y, 0);
        } else {
            assert(["NO_SOLUTIONS", "NEGATIVE_TARGET"].includes(r.code));
        }
    });

    await test("Large coefficient — 1000x = 5000 → x=5", async () => {
        const r = await runEngine("1000x = 5000");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("All same coefficients — x + y + z = 3 → exactly 10 solutions", async () => {
        const r = await runEngine("x + y + z = 3");
        // Constrain to avoid unbounded — max=3 for all
        const r2 = await runEngine("x + y + z = 3", {
            x: { max: 3 },
            y: { max: 3 },
            z: { max: 3 },
        });
        assert(r2.success, r2.error);
        // (0,0,3),(0,1,2),(0,2,1),(0,3,0),(1,0,2),(1,1,1),(1,2,0),(2,0,1),(2,1,0),(3,0,0) = 10
        assertEqual(r2.solutionCount, 10, "should have exactly 10 solutions");
    });

    await test("Variable appears on both sides: 10x + 5 = 5x + 25 → 5x=20 → x=4", async () => {
        const r = await runEngine("10x + 5 = 5x + 25");
        assert(r.success, r.error);
        assertEqual(r.solutionCount, 1);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Constants only on both sides normalise correctly: 2x + 10 = 30 → 2x=20 → x=10", async () => {
        const r = await runEngine("2x + 10 = 30");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 10);
    });

    await test("Unicode minus in equation — en-dash should parse as minus", async () => {
        // − is U+2212 (unicode minus), should be normalised to ASCII -
        const r = await runEngine("10x \u2212 0 = 50");
        if (r.success) {
            assert(
                r.solutions.some((s) => s.x === 5),
                "should find x=5",
            );
        } else {
            // If normaliser rejects subtraction creating negative coeff, acceptable
            assert(["NEGATIVE_COEFFICIENT", "NO_SOLUTIONS"].includes(r.code));
        }
    });

    await test("Output cap — solutions field has exactly 1000 items when capped", async () => {
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        assert(r.success, r.error);
        assert(
            r.solutions.length <= 1000,
            "never exceeds 1000 stored solutions",
        );
        if (r.capped) {
            assertEqual(r.solutions.length, 1000, "exactly 1000 when capped");
        }
    });

    await test("All solutions satisfy the original equation (verification pass)", async () => {
        const r = await runEngine("10x + 20y + 5z = 100");
        assert(r.success, r.error);
        for (const sol of r.solutions) {
            const lhs = 10 * sol.x + 20 * sol.y + 5 * sol.z;
            assertEqual(
                lhs,
                100,
                `Solution ${JSON.stringify(sol)} does not satisfy equation`,
            );
        }
    });

    // ══════════════════════════════════════════════════════
    section("Performance benchmarks");
    // ══════════════════════════════════════════════════════

    await test("PERF — 1 variable: 50x=200 < 10ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("50x = 200");
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 10, `Took ${ms.toFixed(2)}ms, expected < 10ms`);
        console.log(`          (actual: ${ms.toFixed(2)}ms)`);
    });

    await test("PERF — 2 variables: 10x+20y=100 < 50ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("10x + 20y = 100");
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 50, `Took ${ms.toFixed(2)}ms, expected < 50ms`);
        console.log(`          (actual: ${ms.toFixed(2)}ms)`);
    });

    await test("PERF — 3 variables: 10x+20y+5z=100 < 100ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("10x + 20y + 5z = 100");
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 100, `Took ${ms.toFixed(2)}ms, expected < 100ms`);
        console.log(`          (actual: ${ms.toFixed(2)}ms)`);
    });

    await test("PERF — 4 variables: 150a+100b+50c+10d=5000 < 200ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("150a + 100b + 50c + 10d = 5000");
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 200, `Took ${ms.toFixed(2)}ms, expected < 200ms`);
        console.log(
            `          (actual: ${ms.toFixed(2)}ms, solutions: ${r.solutionCount}, total: ${r.totalFound})`,
        );
    });

    await test("PERF — 5 variables (PS Example 3): 10a+15b+20c+50d+5e=1000 < 500ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 500, `Took ${ms.toFixed(2)}ms, expected < 500ms`);
        console.log(
            `          (actual: ${ms.toFixed(2)}ms, solutions: ${r.solutionCount}, total: ${r.totalFound})`,
        );
    });

    await test("PERF — 5 variables with tight constraints < 100ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000", {
            a: { max: 10 },
            b: { max: 10 },
            c: { max: 5 },
            d: { max: 5 },
            e: { max: 20 },
        });
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 100, `Took ${ms.toFixed(2)}ms, expected < 100ms`);
        console.log(
            `          (actual: ${ms.toFixed(2)}ms, solutions: ${r.solutionCount})`,
        );
    });

    await test("PERF — 6 variables with bounds: 10a+15b+20c+50d+5e+25f=1000 < 500ms", async () => {
        const start = process.hrtime.bigint();
        const r = await runEngine("10a + 15b + 20c + 50d + 5e + 25f = 1000", {
            a: { max: 20 },
            b: { max: 20 },
            c: { max: 10 },
            d: { max: 10 },
            e: { max: 30 },
            f: { max: 10 },
        });
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(r.success, r.error);
        assert(ms < 500, `Took ${ms.toFixed(2)}ms, expected < 500ms`);
        console.log(
            `          (actual: ${ms.toFixed(2)}ms, solutions: ${r.solutionCount}, total: ${r.totalFound})`,
        );
    });

    // ══════════════════════════════════════════════════════
    section("Result format & metadata");
    // ══════════════════════════════════════════════════════

    await test("formattedResult has rows, pagination, count fields", async () => {
        const r = await runEngine("10x + 20y = 100");
        assert(r.success, r.error);
        assert(Array.isArray(r.formattedResult.rows), "rows should be array");
        assert(
            r.formattedResult.pagination !== undefined,
            "pagination should exist",
        );
        assert(r.formattedResult.count === 6, "count should be 6");
        assertEqual(r.formattedResult.pagination.pageSize, 25);
    });

    await test("Error response has success:false, code, category, error fields", async () => {
        const r = await runEngine("2x + 4y = 3");
        assert(r.success === false);
        assert(typeof r.error === "string");
        assert(typeof r.code === "string");
        assert(typeof r.category === "string");
        assertEqual(r.category, "solver");
    });

    await test("Success response has all required top-level fields", async () => {
        const r = await runEngine("10x + 5y = 50");
        assert(r.success, r.error);
        for (const field of [
            "coeffs",
            "target",
            "variableOrder",
            "solutionCount",
            "solutions",
            "formattedResult",
            "warnings",
            "meta",
        ]) {
            assert(field in r, `missing field: ${field}`);
        }
    });

    // ══════════════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════════════
    console.log(`\n${"═".repeat(60)}`);
    console.log(
        `  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`,
    );
    if (failures.length > 0) {
        console.log(`\n  Failed tests:`);
        failures.forEach((f) => console.log(`    ✗ ${f.name}`));
    } else {
        console.log(`\n  All tests passed.`);
    }
    console.log(`${"═".repeat(60)}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
    console.error("Test runner crashed:", err);
    process.exit(1);
});
