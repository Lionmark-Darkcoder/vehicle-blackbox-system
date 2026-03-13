const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- CONFIG ---------------- */

const VEHICLE_NO = "KL59AB1234";

const ACCIDENT_LAT = 12.0978888;
const ACCIDENT_LNG = 75.5605588;

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "violations.json");

/* ---------------- INITIAL SETUP ---------------- */

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

/* ---------------- REQUEST LOGGER ---------------- */

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ---------------- MULTER STORAGE ---------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "_evidence.jpg";
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  }
});

/* ---------------- SCORING SYSTEM ---------------- */

const scoreRules = {
  "Seatbelt Violation": 1,
  "Alcohol Violation": 2,
  "Drowsiness": 2,
  "Door Open While Driving": 2,
  "Harsh Braking": 3,
  "Harsh Driving": 3
};

const fineRules = {
  "Seatbelt Violation": 500,
  "Alcohol Violation": 500,
  "Drowsiness": 500,
  "Door Open While Driving": 500,
  "Harsh Braking": 1000,
  "Harsh Driving": 1000
};

/* ---------------- DATABASE FUNCTIONS ---------------- */

function readViolations() {
  try {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveViolation(record) {
  const logs = readViolations();
  logs.push(record);
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2));
}

/* ---------------- HEALTH CHECK ---------------- */

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "SafeDrive Backend" });
});

/* ---------------- RECEIVE VIOLATION ---------------- */

app.post("/violation", upload.single("image"), (req, res) => {

  try {

    const type = req.body.type;
    const camera = req.body.camera;

    if (!type) {
      return res.status(400).json({ error: "Violation type missing" });
    }

    if (!camera || !["INSIDE_CAMERA", "OUTSIDE_CAMERA"].includes(camera)) {
      return res.status(400).json({ error: "Invalid camera source" });
    }

    let score = 0;
    let fine = 0;
    let lat = null;
    let lng = null;

    const isIncident = type === "Accident" || type === "Collision";

    if (isIncident) {
      score = 0;
      fine = 0;
      lat = ACCIDENT_LAT;
      lng = ACCIDENT_LNG;
    } else {
      score = scoreRules[type] || 0;
      fine = fineRules[type] || 0;
    }

    const imageUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const record = {
      vehicleNo: VEHICLE_NO,
      cameraSource: camera,
      violationType: type,
      score: score,
      fine: fine,
      lat: lat,
      lng: lng,
      dateTime: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      }),
      imageUrl: imageUrl
    };

    saveViolation(record);

    console.log("Violation Logged:", record);

    res.status(201).json({
      success: true,
      record: record
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ---------------- FETCH ALL VIOLATIONS ---------------- */

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

/* ---------------- GLOBAL ERROR HANDLER ---------------- */

app.use((err, req, res, next) => {
  console.error(err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message });
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {

  console.log("=================================");
  console.log("SafeDrive Backend Server Running");
  console.log("Port:", PORT);
  console.log("Uploads:", UPLOAD_DIR);
  console.log("Database:", DATA_FILE);
  console.log("=================================");

});