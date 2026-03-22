const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS = path.join(__dirname, 'uploads');
const DB = path.join(__dirname, 'data/violations.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify([]));

const storage = multer.diskStorage({
  destination: UPLOADS,
  filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});

const upload = multer({ storage });

// FINAL SCORE MAP
const SCORE_MAP = {
  SEATBELT: 1,
  DOOR: 1,
  ALCOHOL: 3,
  HARSH_BRAKING: 3,
  DROWSINESS: 5,
  HARSH_DRIVING: 5,
  OVERSPEED: 5,
  ACCIDENT: 0,
  COLLISION: 0
};

let score = 0;
let cycle = [];

app.post('/upload', upload.single('image'), (req, res) => {

  const type = req.body.type;

  const record = {
    time: new Date(),
    type,
    image: `/uploads/${req.file.filename}`,
    location: "9.9312,76.2673"
  };

  let data = JSON.parse(fs.readFileSync(DB));
  data.push(record);
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));

  let emergency = null;

  if (type === "ACCIDENT" || type === "COLLISION") {
    emergency = record;
  }

  let add = SCORE_MAP[type] || 0;
  score += add;

  if (add > 0) cycle.push(record);

  let challan = null;

  if (score >= 5) {
    challan = {
      totalScore: score,
      violations: cycle,
      fine: score * 1000,
      image: record.image,
      date: new Date().toLocaleString()
    };

    score = 0;
    cycle = [];
  }

  res.json({
    record,
    score,
    challan,
    emergency
  });
});

app.use('/uploads', express.static(UPLOADS));

app.listen(10000, () => console.log("🚀 Server Ready"));