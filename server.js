const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let violations = [];
let challans = [];

// Home
app.get("/", (req, res) => {
  res.send("Vehicle Blackbox Backend Running");
});

// Add Violation
app.post("/api/violation", (req, res) => {

  const data = req.body;
  violations.push(data);

  // Challan rule
  if (violations.length >= 3) {
    const challan = {
      challanId: "CH-" + Date.now(),
      totalViolations: violations.length,
      fine: violations.length * 500,
      generatedAt: new Date().toISOString(),
      violations: [...violations]
    };

    challans.push(challan);
  }

  res.json({
    message: "Violation stored",
    totalViolations: violations.length,
    challanGenerated: challans.length > 0
  });
});

// View Violations
app.get("/violations", (req, res) => {
  res.json(violations);
});

// View Challans
app.get("/challans", (req, res) => {
  res.json(challans);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});