// test.js

const { runEngine } = require("./engine/engineRunner");

function runTest(equation, constraints = {}) {
    console.log("====================================");
    console.log("Equation:", equation);
    console.log("Constraints:", constraints);

    const start = Date.now();

    const result = runEngine(equation, constraints);

    const end = Date.now();

    console.log("Time Taken:", end - start, "ms");
    console.log("Solutions Found:", result.count);
    console.log("Sample Output:", result.solutions.slice(0, 5));
    console.log("====================================\n");
}

// TEST CASES

runTest("x + y = 100");

runTest("10x + 20y = 200");

runTest("10a + 15b + 20c = 500");

runTest("10a + 15b + 20c + 25d = 800");

runTest("10a + 15b + 20c + 50d + 5e = 1000");

runTest("10a + 15b + 20c + 25d + 5e + 2f = 1200");

runTest("10x + 20y + 5z = 200", {
    x: { min: 2 },
    y: { max: 5 },
    z: { even: true },
});
