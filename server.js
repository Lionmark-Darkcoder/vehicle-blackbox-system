const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== PATHS =====
const UPLOADS = path.join(__dirname, 'uploads');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'violations.json');

// ===== INIT =====
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);
if (!fs.existsSync(DB)) fs.writeFileSync(DB, "[]");

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS));

// ===== MULTER =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + ".jpg")
});
const upload = multer({ storage });

// ===== DEMO GPS LOCATION =====
const DEMO_LOCATION = {
  name: "Chemperi, Kannur, Kerala",
  lat: 12.0676,
  lng: 75.5716
};

// ===== SCORE SYSTEM =====
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

// ===== FINAL FINE SYSTEM (YOUR RULES) =====
function getFine(type) {
  return {
    SEATBELT: 500,
    DOOR: 500,

    HARSH_BRAKING: 1000,
    ALCOHOL: 1000,

    DROWSINESS: 2000,
    HARSH_DRIVING: 2000,
    OVERSPEED: 2000
  }[type] || 0;
}

// ===== UPLOAD API =====
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    const type = req.headers['type'] || req.body.type || "UNKNOWN";

    const isEmergency = ["ACCIDENT", "COLLISION"].includes(type);

    let data = JSON.parse(fs.readFileSync(DB));

    const record = {
      id: Date.now(),
      time: new Date(),

      // ===== VEHICLE DETAILS =====
      vehicle: "KL59AB1234",
      owner: "Mark",
      mobile: "+918520649127",

      // ===== VIOLATION =====
      type,
      category: isEmergency ? "EVENT" : "VIOLATION",
      score: isEmergency ? 0 : getScore(type),
      fine: isEmergency ? 0 : getFine(type),

      // ===== LOCATION =====
      location: DEMO_LOCATION.name,
      lat: DEMO_LOCATION.lat,
      lng: DEMO_LOCATION.lng,

      // ===== IMAGE =====
      image: req.file ? `/uploads/${req.file.filename}` : null
    };

    data.push(record);

    fs.writeFileSync(DB, JSON.stringify(data, null, 2));

    console.log("✅ Saved:", record);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ===== GET ALL DATA =====
app.get('/api/violations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB));
    res.json(data);
  } catch {
    res.json([]);
  }
});

// ===== RESET =====
app.post('/api/reset', (req, res) => {
  fs.writeFileSync(DB, "[]");
  res.json({ ok: true });
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("🚀 Vehicle Blackbox Server Running with Final Fine System");
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});