const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ================= PATHS =================
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'violations.json');

// ================= INIT =================
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC =================
app.use('/uploads', express.static(UPLOADS_FOLDER));

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send("🚀 Server Running");
});

// ================= SCORE =================
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

// ================= FINE =================
function getFine(type) {
  const fines = {
    SEATBELT: 500,
    DOOR: 500,
    ALCOHOL: 1000,
    HARSH_BRAKING: 1000,
    DROWSINESS: 2000,
    HARSH_DRIVING: 2000,
    OVERSPEED: 2000
  };
  return fines[type] || 0;
}

// ================= UPLOAD API (ESP RAW IMAGE FIXED) =================
app.post('/upload', (req, res) => {
  try {
    console.log("📥 Upload received");

    const type = req.headers['type'] || "UNKNOWN";
    const location = req.headers['location'] || "Chemperi";
    const lat = req.headers['lat'] || "12.0676";
    const lng = req.headers['lng'] || "75.5716";

    const filename = Date.now() + ".jpg";
    const filepath = path.join(UPLOADS_FOLDER, filename);

    let chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      // 🔥 Save image properly
      fs.writeFileSync(filepath, buffer);

      let data = [];
      try {
        data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch (e) {
        console.log("⚠️ DB read error");
      }

      const record = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        violation_type: type,
        vehicle: "KL59AB1234",
        score: getScore(type),
        fine: getFine(type),
        location,
        lat,
        lng,
        filename,
        path: `/uploads/${filename}`
      };

      data.push(record);

      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

      console.log("✅ Saved:", record);

      res.json({ success: true, path: record.path });
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ================= GET VIOLATIONS =================
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    res.json(data.reverse()); // latest first
  } catch {
    res.json([]);
  }
});

// ================= CLEAR DATA (OPTIONAL) =================
app.get('/clear', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  res.send("🧹 Data Cleared");
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});