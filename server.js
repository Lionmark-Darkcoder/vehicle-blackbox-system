const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ================= PATHS =================
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'violations.json');
const CHALLAN_FILE = path.join(DATA_FOLDER, 'challans.json');

// ================= INIT =================
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(CHALLAN_FILE)) fs.writeFileSync(CHALLAN_FILE, JSON.stringify([], null, 2));

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_FOLDER));

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});
const upload = multer({ storage });

// ================= SCORING =================
function getScore(type) {
  switch (type) {
    case "SEATBELT": return 1;
    case "DOOR": return 1;
    case "ALCOHOL": return 3;
    case "HARSH_BRAKING": return 3;
    case "DROWSINESS": return 5;
    case "HARSH_DRIVING": return 5;
    default: return 0;
  }
}

// ================= FINES =================
function getFine(type) {
  switch (type) {
    case "SEATBELT": return 500;
    case "DOOR": return 500;
    case "ALCOHOL": return 2000;
    case "HARSH_BRAKING": return 1000;
    case "DROWSINESS": return 2000;
    case "HARSH_DRIVING": return 1500;
    default: return 0;
  }
}

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send("✅ SafeDrive AI Server Running");
});

// ================= UPLOAD =================
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const type = req.body.type || "UNKNOWN";
    const score = getScore(type);
    const fine = getFine(type);

    let data = JSON.parse(fs.readFileSync(DB_FILE));

    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      violation: type,
      score,
      fine,
      vehicle: "KL59AB1234",
      image: `/uploads/${req.file.filename}`
    };

    data.push(record);

    // ===== CALCULATE CURRENT CYCLE =====
    let cycleScore = 0;
    let cycleViolations = [];

    for (let i = data.length - 1; i >= 0; i--) {
      cycleScore += data[i].score;
      cycleViolations.push(data[i]);

      if (cycleScore >= 5) break;
    }

    // ===== CHALLAN GENERATION =====
    if (cycleScore >= 5) {
      let challans = JSON.parse(fs.readFileSync(CHALLAN_FILE));

      const challan = {
        id: Date.now(),
        vehicle: "KL59AB1234",
        totalScore: cycleScore,
        totalFine: cycleViolations.reduce((s, v) => s + v.fine, 0),
        violations: cycleViolations,
        date: new Date().toISOString()
      };

      challans.push(challan);
      fs.writeFileSync(CHALLAN_FILE, JSON.stringify(challans, null, 2));

      console.log("🚨 CHALLAN GENERATED:", challan);
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    console.log("✅ Saved:", record);

    res.json({ success: true, record });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Server error" });
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

// ================= GET CURRENT SCORE =================
app.get('/api/score', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE));

    let score = 0;

    for (let i = data.length - 1; i >= 0; i--) {
      score += data[i].score;
      if (score >= 5) break;
    }

    res.json({ score });

  } catch {
    res.json({ score: 0 });
  }
});

// ================= GET CHALLANS =================
app.get('/api/challans', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(CHALLAN_FILE));
    res.json(data);
  } catch {
    res.json([]);
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`
==============================
🚀 SERVER RUNNING
Port: ${PORT}
==============================
`);
});