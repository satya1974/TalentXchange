const express = require("express");
const cors = require("cors");

const corsOptions = {
    origin: "*",
};

const app = express();
app.use(express.json());
app.use(cors(corsOptions));

module.exports = app;
