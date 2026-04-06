/* eslint-disable no-console */
const { runEngine } = require("../src/engine/engineRunner");

const CASES = [
    {
        name: "univariate-quadratic",
        equation: "x^2 - 5x + 6 = 0",
        constraints: {},
        expectTotal: 2,
    },
    {
        name: "univariate-cubic",
        equation: "x^3 - 6x^2 + 11x - 6 = 0",
        constraints: {},
        expectTotal: 3,
    },
    {
        name: "multivariable-product",
        equation: "(x + 5)(y + 5) = 100",
        constraints: {
            x: { min: -20, max: 20 },
            y: { min: -20, max: 20 },
        },
        expectTotal: 6,
    },
    {
        name: "multivariable-mixed-powers",
        equation: "x^2 + y^2 = 25",
        constraints: {
            x: { min: -10, max: 10 },
            y: { min: -10, max: 10 },
        },
        expectTotal: 12,
    },
];

async function run() {
    let failed = 0;

    for (const c of CASES) {
        const result = await runEngine(c.equation, c.constraints, {
            page: 1,
            pageSize: 200,
        });

        const ok =
            result.success &&
            result.meta?.solverType === "polynomial" &&
            result.totalFound === c.expectTotal;

        if (!ok) {
            failed += 1;
            console.log(`FAIL ${c.name}`);
            console.log(
                JSON.stringify(
                    {
                        equation: c.equation,
                        expectedTotal: c.expectTotal,
                        actual: {
                            success: result.success,
                            totalFound: result.totalFound,
                            code: result.code,
                            error: result.error,
                            meta: result.meta,
                        },
                    },
                    null,
                    2,
                ),
            );
        } else {
            console.log(
                `PASS ${c.name} totalFound=${result.totalFound} degree=${result.meta.polynomialDegree}`,
            );
        }
    }

    if (failed > 0) {
        process.exitCode = 1;
    } else {
        console.log("All polynomial tests passed.");
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

