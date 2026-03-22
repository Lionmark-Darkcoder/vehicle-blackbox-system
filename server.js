const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const UPLOADS = path.join(__dirname, 'uploads');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'violations.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);
if (!fs.existsSync(DB)) fs.writeFileSync(DB, "[]");

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + ".jpg")
});

const upload = multer({ storage });

let challanLock = false;

// SCORE
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

// UPLOAD
app.post('/upload', upload.single('image'), (req, res) => {

  const type =
    req.headers['type'] ||
    req.body.type ||
    "UNKNOWN";

  const isEmergency = ["ACCIDENT", "COLLISION"].includes(type);

  let data = JSON.parse(fs.readFileSync(DB));

  const record = {
    time: new Date(),
    type,
    category: isEmergency ? "EVENT" : "VIOLATION",
    score: isEmergency ? 0 : getScore(type),
    image: req.file ? `/uploads/${req.file.filename}` : null
  };

  data.push(record);
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

// GET
app.get('/api/violations', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB));
  res.json(data);
});

// RESET
app.post('/api/reset', (req, res) => {
  fs.writeFileSync(DB, "[]");
  challanLock = false;
  res.json({ ok: true });
});

app.listen(PORT, () => console.log("🚀 Server running"));