const express = require("express");
const app = express();
app.use(express.json());

const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:5173", // your React app
    methods: ["GET", "POST"],
    credentials: true
  })
);

module.exports = app;
