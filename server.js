const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("BLACKBOX SERVER RUNNING");
});

// Upload route (TEXT ONLY)
app.post("/upload", (req, res) => {
  try {
    const violation = req.body.violation;

    if (!violation) {
      return res.status(400).send("No violation received");
    }

    let logs = [];

    if (fs.existsSync("logs.json")) {
      logs = JSON.parse(fs.readFileSync("logs.json"));
    }

    const logEntry = {
      time: new Date().toISOString(),
      violation: violation
    };

    logs.push(logEntry);

    fs.writeFileSync("logs.json", JSON.stringify(logs, null, 2));

    console.log("Logged:", violation);

    res.status(200).send("Logged successfully");

  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

// View logs
app.get("/logs", (req, res) => {
  if (fs.existsSync("logs.json")) {
    const logs = fs.readFileSync("logs.json");
    res.send(logs);
  } else {
    res.send([]);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});