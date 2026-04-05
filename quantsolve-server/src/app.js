const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(
    cors({
        origin: "http://localhost:5173", // your React app
        methods: ["GET", "POST"],
        credentials: true,
    }),
);

module.exports = app;
