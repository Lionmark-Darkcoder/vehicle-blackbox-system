const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== PATHS =====
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'violations.json');

// ===== INIT =====
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));

// ===== ROOT =====
app.get('/', (req, res) => res.send("🚀 Server Running"));


// ================= SCORE =================
function getScore(type) {
  return {
    SEATBELT: 1,
    DOOR: 1,
    ALCOHOL: 3,
    HARSH_BRAKING: 3,
    DROWSINESS: 5,
    HARSH_DRIVING: 5,
    OVERSPEED: 5
  }[type] || 0;
}


// ================= FINE =================
function getFine(type) {
  return {
    SEATBELT: 500,
    DOOR: 500,
    ALCOHOL: 1000,
    HARSH_BRAKING: 1000,
    DROWSINESS: 2000,
    HARSH_DRIVING: 2000,
    OVERSPEED: 2000
  }[type] || 0;
}


// ================= UPLOAD =================
app.post('/upload', (req, res) => {
  try {
    const type = req.headers['type'] || "UNKNOWN";

    // 🔥 FIXED LOCATION
    const location = "Chemperi";
    const lat = 12.0676;
    const lng = 75.5716;

    const filename = Date.now() + ".jpg";
    const filepath = path.join(UPLOADS_FOLDER, filename);

    let chunks = [];

    req.on('data', chunk => chunks.push(chunk));

    req.on('end', () => {

      // ===== SAVE IMAGE =====
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filepath, buffer);

      let data = [];
      try {
        data = JSON.parse(fs.readFileSync(DB_FILE));
      } catch {}

      const isEmergency = (type === "ACCIDENT" || type === "COLLISION");

      const record = {
        id: Date.now(),
        timestamp: new Date().toISOString(),

        violation_type: type,

        // 🔥 LOCATION FIX
        location,
        lat,
        lng,

        // 🔥 IMAGE FIX
        path: `/uploads/${filename}`,

        // 🔥 FLAG
        emergency: isEmergency
      };

      // 🔥 ONLY NORMAL VIOLATIONS GET SCORE/FINE
      if (!isEmergency) {
        record.score = getScore(type);
        record.fine = getFine(type);
      } else {
        record.score = 0;
        record.fine = 0;
      }

      data.push(record);

      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

      console.log("✅ Saved:", type);

      res.json({ success: true });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// ================= VIOLATIONS =================
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE));

    const filtered = data.filter(v => !v.emergency);

    res.json(filtered.reverse());

  } catch {
    res.json([]);
  }
});


// ================= EMERGENCY =================
app.get('/api/emergency', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE));

    const filtered = data.filter(v => v.emergency);

    res.json(filtered.reverse());

  } catch {
    res.json([]);
  }
});


// ================= START =================
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));