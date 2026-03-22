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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// STATIC
app.use('/uploads', express.static(UPLOADS_FOLDER));

// MULTER (fallback support)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + ".jpg")
});
const upload = multer({ storage });

// ROOT
app.get('/', (req, res) => {
  res.send("🚀 Vehicle Blackbox Server Running");
});


// 🔥 SCORE SYSTEM
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


// 🔥 FINE SYSTEM (Kerala style approx)
function getFine(score) {
  if (score >= 10) return 4000;
  if (score >= 5) return 2000;
  return 0;
}


// 🔥 MAIN UPLOAD (ESP RAW IMAGE)
app.post('/api/upload', async (req, res) => {
  try {

    console.log("📥 Upload request");

    const type =
      req.headers['x-type'] ||
      req.body.type ||
      "UNKNOWN";

    // SAVE IMAGE
    const filename = Date.now() + ".jpg";
    const filePath = path.join(UPLOADS_FOLDER, filename);

    const chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, buffer);

      console.log("📸 Image saved:", filename);

      // LOAD DB
      let data = [];
      try {
        data = JSON.parse(fs.readFileSync(DB_FILE));
      } catch {}

      const score = getScore(type);

      const record = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        violation_type: type,
        vehicle: "KL59AB1234",
        score: score,
        fine: getFine(score),
        image: `/uploads/${filename}`
      };

      data.push(record);

      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

      console.log("✅ Logged:", record);

      res.json({ success: true });

    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// 🔥 GET ALL VIOLATIONS
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(data);
  } catch {
    res.json([]);
  }
});


// 🔥 CLEAR DATA (TESTING)
app.get('/api/clear', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  res.send("🧹 Cleared");
});


// 🚨 ACCIDENT EVENTS (NO SCORE)
app.post('/api/event', (req, res) => {
  try {

    const type = req.body.type || "EVENT";

    let data = JSON.parse(fs.readFileSync(DB_FILE));

    data.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      violation_type: type,
      vehicle: "KL59AB1234",
      score: 0,
      fine: 0,
      emergency: true
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    console.log("🚨 EVENT:", type);

    res.json({ success: true });

  } catch {
    res.json({ error: true });
  }
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});