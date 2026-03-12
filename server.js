const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- CONFIG -------------------- */

const VEHICLE_NO = "KL59AB1234";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "violations.json");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const CHALLAN_DIR = path.join(__dirname, "challans");

/* -------------------- MIDDLEWARE -------------------- */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/uploads", express.static(UPLOAD_DIR));

/* -------------------- ENSURE FOLDERS -------------------- */

function ensureFolder(folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

ensureFolder(DATA_DIR);
ensureFolder(UPLOAD_DIR);
ensureFolder(CHALLAN_DIR);

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

/* -------------------- FILE UPLOAD -------------------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "_" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({ storage: storage });

/* -------------------- UTIL FUNCTIONS -------------------- */

function readViolations() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeViolations(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getTime() {
  const now = new Date();

  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB");

  return `${date} | ${time}`;
}

/* -------------------- POST /violation -------------------- */

app.post("/violation", upload.single("image"), (req, res) => {
  try {
    const violations = readViolations();

    const type = req.body.type || "Unknown Violation";

    const evidence = req.file ? req.file.filename : null;

    const score = violations.length + 1;

    const record = {
      vehicle: VEHICLE_NO,
      type: type,
      score: score,
      time: getTime(),
      evidence: evidence,
    };

    violations.push(record);

    writeViolations(violations);

    console.log("Violation Logged:", record);

    /* ---------- Challan Generation ---------- */

    if (score >= 5) {
      const challan = {
        vehicle: VEHICLE_NO,
        authority: "MVD",
        system: "SafeDrive",
        totalScore: score,
        lastViolation: type,
        date: getTime(),
        evidence: evidence,
      };

      const fileName = "challan_" + Date.now() + ".json";

      fs.writeFileSync(
        path.join(CHALLAN_DIR, fileName),
        JSON.stringify(challan, null, 2)
      );

      return res.json({
        status: "Violation logged and challan generated",
        score: score,
        popup: true,
      });
    }

    res.json({
      status: "Violation logged",
      score: score,
      popup: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET ENDPOINTS -------------------- */

app.get("/violations", (req, res) => {
  res.json(readViolations());
});

/* Alias endpoint used by some frontend versions */

app.get("/log", (req, res) => {
  res.json(readViolations());
});

/* Score endpoint */

app.get("/score", (req, res) => {
  const data = readViolations();
  res.json({ score: data.length });
});

/* Camera stream endpoint */

app.get("/stream", (req, res) => {
  res.json({
    stream: "http://ESP_CAMERA_IP:81/stream",
  });
});

/* Health check for uptime monitoring */

app.get("/health", (req, res) => {
  res.json({
    status: "Server running",
    time: new Date(),
  });
});

/* -------------------- START SERVER -------------------- */

app.listen(PORT, () => {
  console.log("SafeDrive Server Running on Port:", PORT);
});