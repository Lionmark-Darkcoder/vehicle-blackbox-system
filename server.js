const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* serve frontend */
app.use(express.static("public"));

/* serve uploaded images */
app.use("/uploads", express.static("uploads"));

/* ---------------- FILE PATHS ---------------- */

const DATA_FILE = path.join(__dirname, "data", "violations.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CHALLAN_DIR = path.join(__dirname, "challans");

/* ---------------- VEHICLE ---------------- */

const VEHICLE_NO = "KL59AB1234";

/* ---------------- STARTUP CHECKS ---------------- */

if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(CHALLAN_DIR)) fs.mkdirSync(CHALLAN_DIR);

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

/* ---------------- MULTER ---------------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "_" + file.originalname;
    cb(null, name);
  }
});

const upload = multer({ storage: storage });

/* ---------------- TIME ---------------- */

function getTime() {
  const now = new Date();

  return now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/* ---------------- FILE HANDLING ---------------- */

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ---------------- POST VIOLATION ---------------- */

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

  console.log("Violation Logged:", violation);

  /* -------- MULTIPLE VIOLATION -------- */

  if (score >= 5) {

    const challan = {
      vehicle: VEHICLE_NO,
      authority: "MVD",
      system: "SafeDrive",
      totalScore: score,
      lastViolation: type,
      date: getTime(),
      evidence: evidence
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

/* ---------------- GET ALL VIOLATIONS ---------------- */

app.get("/violations", (req, res) => {

  res.json(readData());

});

/* ---------------- GET SCORE ---------------- */

app.get("/score", (req, res) => {

  const data = readData();

  res.json({
    score: data.length
  });

});

/* ---------------- CAMERA STREAM URL ---------------- */

app.get("/stream", (req, res) => {

  res.json({
    inside: "http://INSIDE_CAMERA_IP/stream",
    outside: "http://OUTSIDE_CAMERA_IP/stream"
  });

});

/* ---------------- SERVER START ---------------- */

app.listen(PORT, () => {

  console.log("SafeDrive Server Running on Port", PORT);

});