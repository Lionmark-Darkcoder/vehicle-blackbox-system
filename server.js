const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ================= PATHS =================
const UPLOADS = path.join(__dirname, 'uploads');
const DATA = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA, 'violations.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// ================= STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});

const upload = multer({ storage });

// ================= SCORING =================
const SCORE_MAP = {
  SEATBELT: 1,
  DOOR: 1,
  ALCOHOL: 3,
  HARSH_BRAKING: 3,
  DROWSINESS: 5,
  HARSH_DRIVING: 5,
  ACCIDENT: 5,
  OVERSPEED: 5   // 🔥 added
};

// ================= STATE =================
let currentScore = 0;
let cycleViolations = [];

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send("✅ SafeDrive AI Server Running");
});

// ================= UPLOAD =================
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    const type = req.body.type || "UNKNOWN";
    const vehicle = req.body.vehicle || "KL59AB1234";

    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      vehicle,
      image: `/uploads/${req.file.filename}`,
      location: "9.9312,76.2673"
    };

    // ===== SAVE DATA =====
    let data = JSON.parse(fs.readFileSync(DB_FILE));
    data.push(record);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    // ===== SCORE =====
    const score = SCORE_MAP[type] || 0;
    currentScore += score;
    cycleViolations.push(record);

    let challan = null;
    let emergency = null;

    // 🚨 ACCIDENT ALERT SYSTEM
    if (type === "ACCIDENT") {
      emergency = {
        alert: true,
        message: "🚨 ACCIDENT DETECTED!",
        vehicle,
        location: record.location,
        image: record.image,
        time: record.timestamp
      };
    }

    // 🚨 CHALLAN LOGIC (cycle of 5)
    if (currentScore >= 5) {
      challan = {
        vehicle,
        totalScore: currentScore,
        violations: cycleViolations,
        totalFine: currentScore * 1000,
        latestImage: record.image,
        date: new Date().toLocaleString()
      };

      // RESET AFTER CHALLAN
      currentScore = 0;
      cycleViolations = [];
    }

    res.json({
      success: true,
      record,
      currentScore,
      challan,
      emergency
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// ================= GET VIOLATIONS =================
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(data);
  } catch {
    res.json([]);
  }
});

// ================= STATS API (FOR DASHBOARD FIX) =================
app.get('/api/stats', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE));

  let totalViolations = data.length;
  let accidentCount = data.filter(v => v.type === "ACCIDENT").length;

  res.json({
    totalViolations,
    accidentCount,
    systemStatus: "ACTIVE"
  });
});

// ================= STATIC =================
app.use('/uploads', express.static(UPLOADS));

// ================= START =================
app.listen(PORT, () => {
  console.log(`
==============================
🚀 SafeDrive Server Running
PORT: ${PORT}
==============================
`);
});