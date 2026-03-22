const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'violations.json');

/* CREATE FOLDERS */
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]');

/* MIDDLEWARE */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

/* TEST */
app.get('/', (req, res) => {
  res.send("🚀 SERVER WORKING");
});

/* SCORE */
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

/* FINE */
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

/* UPLOAD (STABLE VERSION) */
app.post('/upload', (req, res) => {
  try {
    const type = req.headers['type'] || "UNKNOWN";

    const filename = Date.now() + ".jpg";
    const filepath = path.join(uploadDir, filename);

    const chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filepath, buffer);

      let data = JSON.parse(fs.readFileSync(dbFile));

      const isEmergency = (type === "ACCIDENT" || type === "COLLISION");

      const record = {
        id: Date.now(),
        type,
        timestamp: new Date().toISOString(),
        location: "Chemperi",
        lat: "12.0676",
        lng: "75.5716",
        image: `/uploads/${filename}`
      };

      if (!isEmergency) {
        record.score = getScore(type);
        record.fine = getFine(type);
      }

      data.push(record);
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

      console.log("Saved:", type);

      res.json({ success: true });

    });

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* APIs */
app.get('/api/violations', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dbFile));
  res.json(data.filter(v => v.score).reverse());
});

app.get('/api/emergency', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dbFile));
  res.json(data.filter(v => !v.score).reverse());
});

app.listen(PORT, () => {
  console.log("🚀 Running on port", PORT);
});