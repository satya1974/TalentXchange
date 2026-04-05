// server.js
require("dotenv").config();
const app = require("./src/app");
const { runEngine } = require("./src/engine/engineRunner");

const PORT = process.env.PORT || 5500;

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "QuantSolve Engine" });
});

// POST /solve
//
// Body:
// {
//   "equation": "10a+15b+20c+50d+5e=1000",
//   "constraints": {                          // optional
//     "a": { "min": 1, "max": 10 },
//     "b": { "exact": 3 },
//     "c": { "even": true },
//     "d": { "odd": true },
//     "e": { "min": 0, "max": 20 }
//   },
//   "page": 1,        // optional, default 1
//   "pageSize": 50    // optional, default 50, max 200
// }
//
// Strict inequality translation (PS Example 4):
//   "x > 5"  →  { "x": { "min": 6 } }
//   "y < 3"  →  { "y": { "max": 2 } }
//
// Response always includes:
//   totalFound  — true count of ALL valid combinations (e.g. 352,800)
//   page        — current page
//   totalPages  — total pages
//   hasMore     — boolean
//   solutions   — only this page's rows (keeps response small)
//
// The solver computes ALL combinations internally, then slices the requested page.
// Use page/pageSize to paginate through the full result set from the frontend.

app.post("/solve", async (req, res) => {
    const { equation, constraints = {}, page = 1, pageSize = 50 } = req.body;
    // const { page = 1 } = req.params;

    if (!equation) {
        return res.status(400).json({
            success: false,
            error: "Request body must include an 'equation' field.",
            code: "EMPTY_INPUT",
            category: "syntax",
        });
    }

    const options = {
        page: Math.max(1, parseInt(page, 10) || 1),
        pageSize: Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50)),
    };

    const result = await runEngine(equation, constraints, options);

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
