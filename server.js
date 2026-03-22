const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// PATHS
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'violations.json');

// CREATE DIRS
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STATIC
app.use('/uploads', express.static(UPLOADS_FOLDER));

// MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + ".jpg")
});
const upload = multer({ storage });

// ROOT
app.get('/', (req, res) => {
  res.send("🚀 Server Running");
});


// 🔥 SCORE SYSTEM (FIXED)
function getScore(type) {
  const scores = {
    SEATBELT: 1,
    DOOR: 1,
    ALCOHOL: 3,
    HARSH_BRAKING: 3,
    DROWSINESS: 5,
    HARSH_DRIVING: 5,
    OVERSPEED: 5
  };
  return scores[type] || 0;
}


// 🔥 GET TOTAL SCORE
function getTotalScore(data) {
  return data.reduce((sum, v) => sum + (v.score || 0), 0);
}


// 🚀 UPLOAD API (FULL FIX)
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    console.log("📥 Upload received");

    const type =
      req.body.type ||
      req.body.violation ||
      req.body.event ||
      "UNKNOWN";

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {}

    // 🚨 EMERGENCY EVENTS
    if (type === "ACCIDENT" || type === "COLLISION") {
      const emergency = {
        timestamp: new Date().toISOString(),
        violation_type: type,
        emergency: true,
        image: imagePath
      };

      data.push(emergency);
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

      console.log("🚨 EMERGENCY:", emergency);

      return res.json({ status: "EMERGENCY" });
    }

    // NORMAL VIOLATION
    const record = {
      timestamp: new Date().toISOString(),
      violation_type: type,
      score: getScore(type),
      image: imagePath
    };

    data.push(record);

    // SAVE
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    const totalScore = getTotalScore(data);

    console.log("✅ Logged:", record);
    console.log("📊 Total Score:", totalScore);

    // 🚨 CHALLAN CONDITION
    if (totalScore >= 5) {

      const challan = {
        totalScore,
        fine: totalScore * 1000,
        violations: data,
        generatedAt: new Date().toISOString()
      };

      // RESET DB AFTER CHALLAN
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));

      return res.json({
        status: "CHALLAN",
        challan
      });
    }

    res.json({ status: "LOGGED" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// 🔥 GET VIOLATIONS (FIXED)
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    res.json(data);
  } catch {
    res.json([]);
  }
});


// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});