const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let violations = [];

// Health check
app.get("/", (req, res) => {
  res.send("Vehicle Blackbox Backend Running");
});

// Receive violation data
app.post("/violation", (req, res) => {

  const data = {
    vehicleId: req.body.vehicleId,
    type: req.body.type,
    location: req.body.location,
    time: new Date()
  };

  violations.push(data);

  res.json({
    message: "Violation Logged",
    totalViolations: violations.length
  });

});

// View all violations
app.get("/violations", (req, res) => {
  res.json(violations);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});