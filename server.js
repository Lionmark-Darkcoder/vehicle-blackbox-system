/**
 * SafeDrive Smart Vehicle Blackbox Monitoring System
 * Backend Server for ESP32-CAM Evidence Logging
 */

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- CONFIGURATION ---------------- */

const VEHICLE_NO = "KL59AB1234";
const ACCIDENT_LAT = 12.0978888;
const ACCIDENT_LNG = 75.5605588;

const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "violations.json");

/* ---------------- INITIALIZE FOLDERS ---------------- */

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static(UPLOADS_DIR));

/* ---------------- REQUEST LOGGER ---------------- */

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ---------------- MULTER CONFIG ---------------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `${timestamp}_evidence.jpg`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

/* ---------------- JSON DATABASE FUNCTIONS ---------------- */

function readViolations() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("JSON Read Error:", err);
    return [];
  }
}

function saveViolation(record) {
  const logs = readViolations();
  logs.push(record);
  fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2));
}

/* ---------------- HEALTH CHECK ---------------- */

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SafeDrive Backend" });
});

/* ---------------- RECEIVE VIOLATION ---------------- */

app.post("/violation", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image evidence missing" });
    }

    const type = req.body.type || "Unknown";

    let fine = 0;
    let score = 0;
    let lat = null;
    let lng = null;

    const fineRules = {
      "Seatbelt Violation": 500,
      "Alcohol Violation": 500,
      "Drowsiness": 500,
      "Harsh Braking": 1000,
      "Harsh Driving": 1000,
    };

    if (type === "Accident" || type === "Collision") {
      fine = 0;
      score = 0;
      lat = ACCIDENT_LAT;
      lng = ACCIDENT_LNG;
    } else {
      fine = fineRules[type] || 0;
      score = 1;
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const record = {
      vehicleNo: VEHICLE_NO,
      violationType: type,
      fine: fine,
      score: score,
      lat: lat,
      lng: lng,
      dateTime: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      imageUrl: imageUrl,
    };

    saveViolation(record);

    console.log("Violation Logged:", record);

    res.status(201).json({
      success: true,
      record: record,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- FETCH ALL LOGS ---------------- */

app.get("/violations", (req, res) => {
  const data = readViolations();
  res.json(data);
});

/* ---------------- TOTAL SCORE ---------------- */

app.get("/score", (req, res) => {
  const data = readViolations();
  const totalScore = data.reduce((sum, item) => sum + (item.score || 0), 0);
  res.json({ totalScore });
});

/* ---------------- ERROR HANDLER ---------------- */

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message });
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log("=====================================");
  console.log("SafeDrive Backend Server Running");
  console.log("PORT:", PORT);
  console.log("Uploads:", UPLOADS_DIR);
  console.log("Database:", DB_FILE);
  console.log("Health check: /health");
  console.log("=====================================");
});