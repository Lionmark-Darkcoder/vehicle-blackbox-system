const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data", "violations.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CHALLAN_DIR = path.join(__dirname, "challans");

const VEHICLE_NO = "KL59AB1234";

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(CHALLAN_DIR)) fs.mkdirSync(CHALLAN_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage: storage });

function getTime() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post("/violation", upload.single("image"), (req, res) => {

  let violations = readData();

  const type = req.body.type || "Unknown Violation";
  const evidence = req.file ? req.file.filename : null;

  const score = violations.length + 1;

  const violation = {
    vehicle: VEHICLE_NO,
    type: type,
    score: score,
    time: getTime(),
    evidence: evidence
  };

  violations.push(violation);
  writeData(violations);

  console.log("Violation logged:", violation);

  if (score >= 5) {

    const challan = {
      vehicle: VEHICLE_NO,
      totalScore: score,
      violation: type,
      date: getTime(),
      evidence: evidence,
      authority: "MVD",
      system: "SafeDrive"
    };

    const challanFile = "challan_" + Date.now() + ".json";

    fs.writeFileSync(
      path.join(CHALLAN_DIR, challanFile),
      JSON.stringify(challan, null, 2)
    );

    return res.json({
      status: "Violation logged and challan generated",
      score: score,
      popup: true
    });

  }

  res.json({
    status: "Violation logged",
    score: score,
    popup: false
  });

});

app.get("/violations", (req, res) => {
  res.json(readData());
});

app.get("/score", (req, res) => {
  res.json({ score: readData().length });
});

app.listen(PORT, () => {
  console.log("SafeDrive Server Running on port", PORT);
});