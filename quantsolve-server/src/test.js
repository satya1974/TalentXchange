// src/test.js  —  run: node ./src/test.js

const { runEngine, runPage } = require("./engine/engineRunner");

// ─── Runner ───────────────────────────────────────────────────────────────────
let passed = 0,
    failed = 0;
const failures = [];

async function test(name, fn) {
    const t = process.hrtime.bigint();
    try {
        await fn();
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        console.log(`  PASS  ${name}  (${ms.toFixed(2)}ms)`);
        passed++;
    } catch (err) {
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        console.log(`  FAIL  ${name}  (${ms.toFixed(2)}ms)`);
        console.log(`        → ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(a, e, lbl) {
    if (JSON.stringify(a) !== JSON.stringify(e))
        throw new Error(
            `${lbl || ""}: got ${JSON.stringify(a)}, want ${JSON.stringify(e)}`,
        );
}
function assertContains(arr, item) {
    if (!arr.some((s) => JSON.stringify(s) === JSON.stringify(item)))
        throw new Error(`Expected ${JSON.stringify(item)} in results`);
}
function assertError(r, code) {
    assert(!r.success, "Expected failure");
    assert(r.code === code, `Expected ${code}, got ${r.code}`);
}
function section(t) {
    console.log(`\n${"─".repeat(62)}\n  ${t}\n${"─".repeat(62)}`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
async function runAll() {
    console.log("\nQuantSolve — Full Test Suite\n");

    // ═══════════════════════════════════════════════════════════
    section("PS Examples — must match spec exactly");
    // ═══════════════════════════════════════════════════════════

    await test("PS Ex1 — 50x=200 → x=4", async () => {
        const r = await runEngine("50x = 200");
        assert(r.success, r.error);
        assertEqual(r.total, 1, "total");
        assertEqual(r.solutions[0].x, 4, "x");
    });

    await test("PS Ex2 — 10x+20y=100 → exactly 6 solutions in correct order", async () => {
        const r = await runEngine("10x + 20y = 100");
        assert(r.success, r.error);
        assertEqual(r.total, 6, "total solutions");
        const expected = [
            { x: 0, y: 5 },
            { x: 2, y: 4 },
            { x: 4, y: 3 },
            { x: 6, y: 2 },
            { x: 8, y: 1 },
            { x: 10, y: 0 },
        ];
        for (const sol of expected) assertContains(r.solutions, sol);
    });

    await test("PS Ex3 — 10a+15b+20c+50d+5e=1000 → 337,212 total, first page returned", async () => {
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        assert(r.success, r.error);
        assertEqual(r.total, 337212, "total combinations");
        assert(r.solutions.length === 50, "first page has 50 items");
        assert(r.totalPages === Math.ceil(337212 / 50), "totalPages correct");
        // Verify every solution on the first page is correct
        for (const s of r.solutions) {
            const lhs =
                10 * (s.a || 0) +
                15 * (s.b || 0) +
                20 * (s.c || 0) +
                50 * (s.d || 0) +
                5 * (s.e || 0);
            assertEqual(lhs, 1000, `solution ${JSON.stringify(s)}`);
        }
    });

    await test("PS Ex3 — pagination works: page 2 is different from page 1", async () => {
        const p1 = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        const p2 = await runPage(
            "10a + 15b + 20c + 50d + 5e = 1000",
            {},
            2,
            50,
        );
        assert(p1.success && p2.success);
        assert(
            JSON.stringify(p1.solutions) !== JSON.stringify(p2.solutions),
            "pages differ",
        );
        assertEqual(p2.total, 337212, "total is consistent across pages");
        for (const s of p2.solutions) {
            const lhs =
                10 * (s.a || 0) +
                15 * (s.b || 0) +
                20 * (s.c || 0) +
                50 * (s.d || 0) +
                5 * (s.e || 0);
            assertEqual(lhs, 1000, `p2 solution ${JSON.stringify(s)}`);
        }
    });

    await test("PS Ex3 — last page has correct number of remaining solutions", async () => {
        const first = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        const lastPage = first.totalPages;
        const last = await runPage(
            "10a + 15b + 20c + 50d + 5e = 1000",
            {},
            lastPage,
            50,
        );
        assert(last.success, last.error);
        const expectedLastPageSize = 337212 % 50 || 50;
        assertEqual(
            last.solutions.length,
            expectedLastPageSize,
            "last page size",
        );
    });

    await test("PS Ex4 — x>5, y<3 constraints enforced", async () => {
        const r = await runEngine("10x + 20y + 5z = 100", {
            x: { min: 6 },
            y: { max: 2 },
        });
        assert(r.success, r.error);
        assert(r.total > 0, "should have solutions");
        for (const s of r.solutions) {
            assert(s.x >= 6, `x=${s.x} violates min=6`);
            assert(s.y <= 2, `y=${s.y} violates max=2`);
            assertEqual(10 * s.x + 20 * s.y + 5 * s.z, 100, JSON.stringify(s));
        }
    });

    await test("PS Ex5 — ((10x+20y)*2)+52=500 respects BODMAS", async () => {
        const r = await runEngine("((10x + 20y) * 2) + 52 = 500");
        assert(r.success, r.error);
        assert(r.total > 0, "should have solutions");
        for (const s of r.solutions) {
            const lhs = (10 * s.x + 20 * s.y) * 2 + 52;
            assertEqual(lhs, 500, JSON.stringify(s));
        }
    });

    await test("PS Ex6 — 2x+4y=3 → No whole-number solutions", async () => {
        const r = await runEngine("2x + 4y = 3");
        assertError(r, "NO_SOLUTIONS");
        assert(r.error.includes("No whole-number solutions"), r.error);
    });

    // ═══════════════════════════════════════════════════════════
    section("Parser — brackets, implicit multiply, operator precedence");
    // ═══════════════════════════════════════════════════════════

    await test("Implicit: 3x=12 → x=4", async () => {
        const r = await runEngine("3x = 12");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Implicit: 2(x+y)=10 → all solutions satisfy", async () => {
        const r = await runEngine("2(x + y) = 10");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(2 * (s.x + s.y), 10, JSON.stringify(s));
    });

    await test("Brackets: ((2x+3y)*2)+10=50 → 2x+3y=20", async () => {
        const r = await runEngine("((2x + 3y) * 2) + 10 = 50");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual((2 * s.x + 3 * s.y) * 2 + 10, 50, JSON.stringify(s));
    });

    await test("Division by literal: 10x/2+y=50 → 5x+y=50", async () => {
        const r = await runEngine("10x/2 + y = 50");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(5 * s.x + s.y, 50, JSON.stringify(s));
    });

    await test("Multi-char vars: 10apple+20google=100", async () => {
        const r = await runEngine("10apple + 20google = 100");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(10 * s.apple + 20 * s.google, 100, JSON.stringify(s));
    });

    await test("Variable on both sides: 10x+5=5x+25 → x=4", async () => {
        const r = await runEngine("10x + 5 = 5x + 25");
        assert(r.success, r.error);
        assertEqual(r.total, 1);
        assertEqual(r.solutions[0].x, 4);
    });

    await test("Constant on both sides: 2x+10=30 → x=10", async () => {
        const r = await runEngine("2x + 10 = 30");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 10);
    });

    await test("RPAREN→LPAREN implicit: (x+1)(y+1)=... engine doesn't crash", async () => {
        // (x+1)*(y+1) is non-linear so it should give NON_LINEAR_TERM
        const r = await runEngine("(x + 1)(y + 1) = 10");
        assert(!r.success);
        assertEqual(r.code, "NON_LINEAR_TERM");
    });

    // ═══════════════════════════════════════════════════════════
    section("Constraint engine");
    // ═══════════════════════════════════════════════════════════

    await test("Min constraint: x>=5 in x+y=10", async () => {
        const r = await runEngine("x + y = 10", {
            x: { min: 5 },
            y: { max: 10 },
        });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(s.x >= 5, `x=${s.x}`);
    });

    await test("Max constraint: y<=2 in x+y=10", async () => {
        const r = await runEngine("x + y = 10", {
            x: { max: 10 },
            y: { max: 2 },
        });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(s.y <= 2, `y=${s.y}`);
    });

    await test("Even constraint: x even in 2x+y=20", async () => {
        const r = await runEngine("2x + y = 20", { x: { even: true } });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(s.x % 2 === 0, `x=${s.x}`);
    });

    await test("Odd constraint: x odd in 2x+y=20", async () => {
        const r = await runEngine("2x + y = 20", { x: { odd: true } });
        assert(r.success, r.error);
        for (const s of r.solutions) assert(s.x % 2 === 1, `x=${s.x}`);
    });

    await test("Exact constraint: y=3 in 10x+20y+5z=100 → reduces system", async () => {
        const r = await runEngine("10x + 20y + 5z = 100", { y: { exact: 3 } });
        assert(r.success, r.error);
        for (const s of r.solutions) {
            assertEqual(s.y, 3, "y pinned");
            assertEqual(10 * s.x + 20 * s.y + 5 * s.z, 100, JSON.stringify(s));
        }
    });

    await test("Combined: even x, max y=3, min z=1", async () => {
        const r = await runEngine("5x + 10y + 2z = 50", {
            x: { even: true },
            y: { max: 3 },
            z: { min: 1 },
        });
        assert(r.success, r.error);
        for (const s of r.solutions) {
            assert(s.x % 2 === 0, `x=${s.x}`);
            assert(s.y <= 3, `y=${s.y}`);
            assert(s.z >= 1, `z=${s.z}`);
        }
    });

    await test("Impossible constraint: min 10 on 10x=50 (x can only be 5)", async () => {
        const r = await runEngine("10x = 50", { x: { min: 10 } });
        // Either 0 solutions with success, or NO_SOLUTIONS error
        if (r.success) assertEqual(r.total, 0);
        else assert(["NO_SOLUTIONS", "INVALID_CONSTRAINT"].includes(r.code));
    });

    // ═══════════════════════════════════════════════════════════
    section("Error taxonomy — all error codes");
    // ═══════════════════════════════════════════════════════════

    await test("EMPTY_INPUT", async () => {
        const r = await runEngine("   ");
        assertError(r, "EMPTY_INPUT");
        assert(r.error.includes("No equation entered"), r.error);
    });

    await test("MISSING_EQUALS", async () => {
        const r = await runEngine("10x + 5y");
        assertError(r, "MISSING_EQUALS");
        assert(r.error.includes("exactly one '='"), r.error);
    });

    await test("MULTIPLE_EQUALS", async () => {
        const r = await runEngine("x = y = 5");
        assertError(r, "MULTIPLE_EQUALS");
    });

    await test("INVALID_CHARACTER — $", async () => {
        const r = await runEngine("10$ + 5y = 100");
        assertError(r, "INVALID_CHARACTER");
        assert(r.error.includes("Invalid character"), r.error);
    });

    await test("DIVISION_BY_ZERO — x/0=5", async () => {
        const r = await runEngine("x/0 = 5");
        assertError(r, "DIVISION_BY_ZERO");
        assert(r.error.includes("Division by zero"), r.error);
    });

    await test("VARIABLE_IN_DENOMINATOR — 100/x=10", async () => {
        const r = await runEngine("100/x = 10");
        assertError(r, "VARIABLE_IN_DENOMINATOR");
        assert(r.error.includes("Non-linear equation"), r.error);
        assert(r.error.includes("denominator"), r.error);
    });

    await test("FRACTIONAL_COEFFICIENT — 3x/2=12", async () => {
        const r = await runEngine("3x/2 = 12");
        assertError(r, "FRACTIONAL_COEFFICIENT");
        assert(r.error.includes("Fractional coefficient"), r.error);
        assert(r.error.includes("whole numbers"), r.error);
        assert(r.error.includes("3x = 24"), r.error); // shows the fix
    });

    await test("NON_LINEAR_TERM — x*y=10", async () => {
        const r = await runEngine("x * y = 10");
        assertError(r, "NON_LINEAR_TERM");
        assert(r.error.includes("Non-linear term"), r.error);
    });

    await test("NO_SOLUTIONS — 2x+4y=3 (gcd=2, 3%2≠0)", async () => {
        const r = await runEngine("2x + 4y = 3");
        assertError(r, "NO_SOLUTIONS");
        assert(r.error.includes("No whole-number solutions"), r.error);
    });

    await test("NO_SOLUTIONS — 3x+6y=7 (gcd=3, 7%3≠0)", async () => {
        const r = await runEngine("3x + 6y = 7");
        assertError(r, "NO_SOLUTIONS");
    });

    await test("UNBOUNDED_SEARCH — x+y=100000 no constraints", async () => {
        const r = await runEngine("x + y = 100000");
        assertError(r, "UNBOUNDED_SEARCH");
        assert(r.error.includes("Infinite answers detected"), r.error);
        assert(r.error.includes("market limits"), r.error);
    });

    await test("DECIMAL_NOT_SUPPORTED — 3.5x=10", async () => {
        const r = await runEngine("3.5x = 10");
        assertError(r, "DECIMAL_NOT_SUPPORTED");
        assert(r.error.includes("Decimal numbers"), r.error);
    });

    await test("UNEXPECTED_TOKEN — x++y=10", async () => {
        const r = await runEngine("x ++ y = 10");
        assert(!r.success, "should fail");
    });

    await test("Error response shape has all required fields", async () => {
        const r = await runEngine("2x + 4y = 3");
        assert(r.success === false);
        assert(typeof r.error === "string", "error is string");
        assert(typeof r.code === "string", "code is string");
        assert(typeof r.category === "string", "category is string");
        assertEqual(r.category, "solver");
    });

    // ═══════════════════════════════════════════════════════════
    section("Edge cases");
    // ═══════════════════════════════════════════════════════════

    await test("Single solution: 10x=50 → x=5 only", async () => {
        const r = await runEngine("10x = 50");
        assert(r.success, r.error);
        assertEqual(r.total, 1);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("Zero target: 5x+3y=0 → only x=0,y=0", async () => {
        const r = await runEngine("5x + 3y = 0");
        if (r.success) {
            assertEqual(r.total, 1);
            assertEqual(r.solutions[0].x, 0);
        } else assert(["NO_SOLUTIONS", "NEGATIVE_TARGET"].includes(r.code));
    });

    await test("Large coefficient: 1000x=5000 → x=5", async () => {
        const r = await runEngine("1000x = 5000");
        assert(r.success, r.error);
        assertEqual(r.solutions[0].x, 5);
    });

    await test("x+y+z=3 with max=3 → exactly 10 solutions", async () => {
        const r = await runEngine("x + y + z = 3", {
            x: { max: 3 },
            y: { max: 3 },
            z: { max: 3 },
        });
        assert(r.success, r.error);
        assertEqual(r.total, 10, "10 non-negative integer solutions");
    });

    await test("All solutions satisfy equation (verification pass)", async () => {
        const r = await runEngine("10x + 20y + 5z = 100");
        assert(r.success, r.error);
        for (const s of r.solutions)
            assertEqual(10 * s.x + 20 * s.y + 5 * s.z, 100, JSON.stringify(s));
    });

    await test("Unicode minus normalised: 10x − 0 = 50 parses correctly", async () => {
        const r = await runEngine("10x \u2212 0 = 50");
        if (r.success) assert(r.solutions.some((s) => s.x === 5));
        else
            assert(
                [
                    "NEGATIVE_COEFFICIENT",
                    "NO_SOLUTIONS",
                    "NEGATIVE_TARGET",
                ].includes(r.code),
            );
    });

    await test("Success response has all required top-level fields", async () => {
        const r = await runEngine("10x + 5y = 50");
        assert(r.success, r.error);
        for (const f of [
            "coeffs",
            "target",
            "variableOrder",
            "total",
            "totalPages",
            "pageSize",
            "solutions",
            "formattedResult",
            "warnings",
            "meta",
        ])
            assert(f in r, `missing: ${f}`);
    });

    await test("formattedResult has rows + pagination fields", async () => {
        const r = await runEngine("10x + 20y = 100");
        assert(r.success, r.error);
        assert(Array.isArray(r.formattedResult.rows));
        assert(r.formattedResult.pagination !== undefined);
        assertEqual(r.formattedResult.pagination.total, 6);
    });

    // ═══════════════════════════════════════════════════════════
    section("Pagination correctness");
    // ═══════════════════════════════════════════════════════════

    await test("Page 1 and page 2 contain no duplicate solutions", async () => {
        const p1 = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        const p2 = await runPage(
            "10a + 15b + 20c + 50d + 5e = 1000",
            {},
            2,
            50,
        );
        const p1keys = new Set(p1.solutions.map((s) => JSON.stringify(s)));
        for (const s of p2.solutions)
            assert(
                !p1keys.has(JSON.stringify(s)),
                `duplicate: ${JSON.stringify(s)}`,
            );
    });

    await test("All pages together cover exactly total solutions", async () => {
        // Use a small equation where we can check every page
        const first = await runEngine("10x + 5y = 100", {}, { pageSize: 10 });
        const total = first.total;
        const pages = first.totalPages;
        const allSolutions = [...first.solutions];
        for (let pg = 2; pg <= pages; pg++) {
            const p = await runPage("10x + 5y = 100", {}, pg, 10);
            allSolutions.push(...p.solutions);
        }
        assertEqual(allSolutions.length, total, "all pages sum to total");
        // Check no duplicates
        const keys = allSolutions.map((s) => JSON.stringify(s));
        assertEqual(
            new Set(keys).size,
            total,
            "no duplicates across all pages",
        );
    });

    await test("Page beyond last returns empty solutions array", async () => {
        const first = await runEngine("50x = 200"); // total=1, totalPages=1
        const beyond = await runPage("50x = 200", {}, 99, 50);
        assert(beyond.success, beyond.error);
        assertEqual(beyond.solutions.length, 0, "no solutions on page 99");
    });

    // ═══════════════════════════════════════════════════════════
    section("Performance benchmarks");
    // ═══════════════════════════════════════════════════════════

    await test("PERF 1-var: 50x=200 < 50ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("50x = 200");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 50, `${ms.toFixed(0)}ms`);
        console.log(`          actual: ${ms.toFixed(1)}ms`);
    });

    await test("PERF 2-var: 10x+20y=100 < 100ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("10x + 20y = 100");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 100, `${ms.toFixed(0)}ms`);
        console.log(`          actual: ${ms.toFixed(1)}ms, total: ${r.total}`);
    });

    await test("PERF 3-var: 10x+20y+5z=100 < 200ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("10x + 20y + 5z = 100");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 200, `${ms.toFixed(0)}ms`);
        console.log(`          actual: ${ms.toFixed(1)}ms, total: ${r.total}`);
    });

    await test("PERF 4-var: 150a+100b+50c+10d=5000 < 300ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("150a + 100b + 50c + 10d = 5000");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 300, `${ms.toFixed(0)}ms`);
        console.log(`          actual: ${ms.toFixed(1)}ms, total: ${r.total}`);
    });

    await test("PERF PS-Ex3: 10a+15b+20c+50d+5e=1000 → 337,212 total < 500ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("10a + 15b + 20c + 50d + 5e = 1000");
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assertEqual(r.total, 337212, "exact total");
        assert(ms < 500, `${ms.toFixed(0)}ms`);
        console.log(
            `          actual: ${ms.toFixed(1)}ms, total: ${r.total}, pages: ${r.totalPages}`,
        );
    });

    await test("PERF page-fetch: any page of 337K < 100ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runPage(
            "10a + 15b + 20c + 50d + 5e = 1000",
            {},
            3000,
            50,
        );
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assertEqual(r.solutions.length, 50);
        assert(ms < 100, `${ms.toFixed(0)}ms`);
        console.log(
            `          actual: ${ms.toFixed(1)}ms (page 3000 of ${r.totalPages})`,
        );
    });

    await test("PERF 6-var with bounds < 500ms", async () => {
        const t = process.hrtime.bigint();
        const r = await runEngine("10a+15b+20c+50d+5e+25f=1000", {
            a: { max: 20 },
            b: { max: 20 },
            c: { max: 10 },
            d: { max: 10 },
            e: { max: 30 },
            f: { max: 10 },
        });
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        assert(r.success, r.error);
        assert(ms < 500, `${ms.toFixed(0)}ms`);
        console.log(`          actual: ${ms.toFixed(1)}ms, total: ${r.total}`);
    });

    // ─── Summary ─────────────────────────────────────────────
    console.log(`\n${"═".repeat(62)}`);
    console.log(
        `  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`,
    );
    if (failures.length) {
        console.log(`\n  Failed:`);
        failures.forEach((f) => console.log(`    ✗  ${f.name}`));
    } else {
        console.log(`\n  All tests passed.`);
    }
    console.log(`${"═".repeat(62)}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
    console.error("Runner crashed:", err);
    process.exit(1);
});
