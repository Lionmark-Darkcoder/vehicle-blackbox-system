const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let violations = [];

// Home Route
app.get("/", (req, res) => {
  res.send("Vehicle Blackbox Backend Running");
});

// Add Violation
app.post("/api/violation", (req, res) => {

  const data = req.body;

  violations.push(data);

  res.json({
    message: "Violation stored successfully",
    total: violations.length
  });
});

// View Violations
app.get("/violations", (req, res) => {
  res.json(violations);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});