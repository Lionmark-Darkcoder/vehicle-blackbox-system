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


// 🔥 IMPORTANT FUNCTION
function getScore(type) {
  const scores = {
    SEATBELT: 1,
    DOOR: 1,
    ALCOHOL: 3,
    BRAKING: 3,
    DROWSINESS: 5,
    HARSH: 5,
    OVERSPEED: 5
  };
  return scores[type] || 0;
}


// 🚀 UPLOAD API
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    console.log("📥 Upload received");

    const violationType =
      req.body.type ||
      req.body.violation ||
      req.body.event ||
      "UNKNOWN";

    const record = {
      timestamp: new Date().toISOString(),
      violation_type: violationType,
      vehicle: "KL59AB1234",
      score: getScore(violationType),
      filename: req.file ? req.file.filename : null,
      path: req.file ? `/uploads/${req.file.filename}` : null
    };

    let data = [];

    try {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {}

    data.push(record);

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    console.log("✅ Saved:", record);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// 🔥 THIS WAS MISSING ❗
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