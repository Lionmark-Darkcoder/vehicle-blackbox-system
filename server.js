const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data", "violations.json");
const UPLOAD_FOLDER = path.join(__dirname, "uploads");
const CHALLAN_FOLDER = path.join(__dirname, "challans");

const VEHICLE_NO = "KL59AB1234";

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}

if (!fs.existsSync(CHALLAN_FOLDER)) {
  fs.mkdirSync(CHALLAN_FOLDER);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "_" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({ storage: storage });

function getDateTime() {
  const now = new Date();
  return now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

function readViolations() {
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

function saveViolations(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post("/violation", upload.single("image"), (req, res) => {

  let violations = readViolations();

  const violationType = req.body.type || "Unknown";

  const imageName = req.file ? req.file.filename : null;

  const score = violations.length + 1;

  const violation = {
    vehicle: VEHICLE_NO,
    type: violationType,
    score: score,
    time: getDateTime(),
    evidence: imageName,
  };

  violations.push(violation);

  saveViolations(violations);

  console.log("Violation Logged:", violation);

  if (score >= 5) {

    const challan = {
      vehicle: VEHICLE_NO,
      totalScore: score,
      date: getDateTime(),
      lastViolation: violationType,
      evidence: imageName,
      authority: "MVD",
      system: "SafeDrive",
    };

    const challanFile =
      "challan_" + Date.now() + ".json";

    fs.writeFileSync(
      path.join(CHALLAN_FOLDER, challanFile),
      JSON.stringify(challan, null, 2)
    );

    console.log("Challan Generated:", challanFile);

    return res.json({
      message: "Violation logged. Challan generated.",
      popup: true,
      score: score,
    });
  }

  res.json({
    message: "Violation logged",
    popup: false,
    score: score,
  });

});

app.get("/violations", (req, res) => {
  const data = readViolations();
  res.json(data);
});

app.get("/score", (req, res) => {
  const data = readViolations();
  res.json({ score: data.length });
});

app.listen(PORT, () => {
  console.log("SafeDrive Server Running on port " + PORT);
});