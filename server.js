const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ===== PATHS =====
const UPLOADS = path.join(__dirname, 'uploads');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'violations.json');
const EVENTS = path.join(DATA, 'events.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify([], null, 2));
if (!fs.existsSync(EVENTS)) fs.writeFileSync(EVENTS, JSON.stringify([], null, 2));

app.use('/uploads', express.static(UPLOADS));

// ===== SCORE + FINE =====
const RULES = {
  SEATBELT: { score: 1, fine: 500 },
  DOOR: { score: 1, fine: 500 },
  ALCOHOL: { score: 3, fine: 2000 },
  HARSH_BRAKING: { score: 3, fine: 1500 },
  DROWSINESS: { score: 5, fine: 3000 },
  HARSH_DRIVING: { score: 5, fine: 3000 },
  OVERSPEED: { score: 5, fine: 2000 }
};

// ===== STATE (for batching) =====
let currentBatch = [];
let batchScore = 0;

// ===== UPLOAD =====
app.post('/api/upload', (req, res) => {
  try {
    const type = req.headers['x-type'] || "UNKNOWN";

    const rule = RULES[type] || { score: 0, fine: 0 };

    const filename = Date.now() + ".jpg";
    const filePath = path.join(UPLOADS, filename);

    const chunks = [];
    req.on('data', c => chunks.push(c));

    req.on('end', () => {

      fs.writeFileSync(filePath, Buffer.concat(chunks));

      const record = {
        id: Date.now(),
        type,
        score: rule.score,
        fine: rule.fine,
        image: `/uploads/${filename}`,
        time: new Date().toISOString()
      };

      currentBatch.push(record);
      batchScore += rule.score;

      let all = JSON.parse(fs.readFileSync(DB));

      let challanGenerated = false;

      // 🔥 GENERATE CHALLAN ONLY WHEN >=5
      if (batchScore >= 5) {
        all.push({
          id: Date.now(),
          challan: true,
          totalScore: batchScore,
          totalFine: currentBatch.reduce((a, b) => a + b.fine, 0),
          violations: currentBatch,
          paid: false,
          time: new Date().toISOString()
        });

        currentBatch = [];
        batchScore = 0;
        challanGenerated = true;
      } else {
        all.push(record);
      }

      fs.writeFileSync(DB, JSON.stringify(all, null, 2));

      res.json({
        success: true,
        challan: challanGenerated
      });
    });

  } catch (e) {
    res.status(500).json({ error: true });
  }
});

// ===== GET =====
app.get('/api/violations', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DB)));
});

// ===== EVENTS (ACCIDENT / COLLISION) =====
app.post('/api/event', (req, res) => {
  const type = req.body.type || "EVENT";

  let data = JSON.parse(fs.readFileSync(EVENTS));

  data.push({
    id: Date.now(),
    type,
    location: "KOCHI",
    image: req.body.image || null,
    time: new Date().toISOString()
  });

  fs.writeFileSync(EVENTS, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

app.get('/api/events', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(EVENTS)));
});

app.listen(PORT, () => console.log("🚀 Server Running"));