const app = require("./src/app");
require("dotenv").config();
const { runEngine } = require("./src/engine/engineRunner.js");

const PORT = 5500;

app.get("/", (req, res) => {
    res.send("Server is working!!");
});

app.post("/solve", (req, res) => {
    const { equation, constraints } = req.body;
    const result = runEngine(equation, constraints, false);
    res.json(result);
});

app.listen(PORT, (err) => {
    if (err) throw err.message;
    console.log(`Server is running on ${PORT}`);
});
