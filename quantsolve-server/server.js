// server.js
require("dotenv").config();
const app = require("./src/app");
const { runEngine } = require("./src/engine/engineRunner");

const PORT = process.env.PORT || 5500;

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "QuantSolve Engine" });
});

// POST /solve
// Body: { equation: string, constraints?: object }
//
// constraints shape (all fields optional):
// {
//   "x": { min: 1, max: 10, even: true },
//   "y": { exact: 3 },
//   "z": { odd: true }
// }
app.post("/solve", async (req, res) => {
    const { equation, constraints = {} } = req.body;

    if (!equation) {
        return res.status(400).json({
            success: false,
            error: "Request body must include an 'equation' field.",
            code: "EMPTY_INPUT",
            category: "syntax",
        });
    }

    // runEngine is async — solver runs in a worker thread
    const result = await runEngine(equation, constraints);

    // Mirror HTTP status to success state
    const status = result.success ? 200 : 422;
    return res.status(status).json(result);
});

app.listen(PORT, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`QuantSolve server running on port ${PORT}`);
});
