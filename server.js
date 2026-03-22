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

// ================= INIT =================
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
  ACCIDENT: 5
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
      location: "9.9312,76.2673" // fake GPS
    };

    // SAVE
    let data = JSON.parse(fs.readFileSync(DB_FILE));
    data.push(record);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    // SCORE ADD
    const score = SCORE_MAP[type] || 0;
    currentScore += score;
    cycleViolations.push(record);

    let challan = null;

    // 🚨 CHALLAN CONDITION
    if (currentScore >= 5) {
      challan = {
        vehicle,
        totalScore: currentScore,
        violations: cycleViolations,
        totalFine: currentScore * 1000,
        latestImage: record.image,
        date: new Date().toLocaleString()
      };

      // RESET CYCLE
      currentScore = 0;
      cycleViolations = [];
    }

    res.json({
      success: true,
      record,
      currentScore,
      challan
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// ================= GET VIOLATIONS =================
app.get('/api/violations', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE));
  res.json(data);
});

// ================= STATIC =================
app.use('/uploads', express.static(UPLOADS));

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});