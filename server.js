const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const UPLOADS = path.join(__dirname, 'uploads');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'db.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify([]));

app.use(cors());
app.use('/uploads', express.static(UPLOADS));

// ROOT
app.get('/', (req, res) => {
  res.send("🚀 SERVER RUNNING");
});

// ✅ UPLOAD ROUTE
app.post('/upload', (req, res) => {
  console.log("📸 Upload received");

  const type = req.headers['type'] || "UNKNOWN";
  const location = "Chemperi";
  const lat = "12.0676";
  const lng = "75.5716";

  const filename = Date.now() + ".jpg";
  const filepath = path.join(UPLOADS, filename);

  let chunks = [];

  req.on('data', chunk => chunks.push(chunk));

  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filepath, buffer);

    let db = JSON.parse(fs.readFileSync(DB));

    db.push({
      id: Date.now(),
      type,
      location,
      lat,
      lng,
      image: `/uploads/${filename}`,
      time: new Date().toISOString()
    });

    fs.writeFileSync(DB, JSON.stringify(db, null, 2));

    console.log("✅ Saved:", filename);

    res.status(200).json({ success: true });
  });
});

// GET DATA
app.get('/api/data', (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB));
  res.json(db.reverse());
});

app.listen(PORT, () => console.log("🚀 Server running on port", PORT));