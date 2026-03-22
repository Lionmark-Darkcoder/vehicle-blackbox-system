const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

let violations = [];
let accidents = [];
let currentScore = 0;
let challans = [];

// SCORE MAP
const scores = {
  SEATBELT: 1,
  DOOR: 1,
  ALCOHOL: 3,
  BRAKING: 3,
  DROWSINESS: 5,
  HARSH: 5,
  OVERSPEED: 5
};

// UPLOAD
app.post('/upload', upload.single('image'), (req, res) => {

  const type = req.headers['type'] || "UNKNOWN";
  const file = req.file ? `/uploads/${req.file.filename}` : null;

  // 🚨 ACCIDENT (NO SCORE)
  if (type === "ACCIDENT" || type === "COLLISION") {
    accidents.push({
      type,
      image: file,
      time: new Date()
    });

    return res.json({ success: true });
  }

  const score = scores[type] || 0;

  currentScore += score;

  violations.push({
    type,
    score,
    image: file,
    time: new Date()
  });

  // 🎯 CHALLAN LOGIC (EVERY 5)
  if (currentScore >= 5) {

    const group = violations.slice(-5);

    challans.push({
      id: Date.now(),
      violations: group,
      total: currentScore
    });

    currentScore = 0; // reset
  }

  res.json({ success: true });
});

// GET APIs
app.get('/api/violations', (req, res) => res.json(violations));
app.get('/api/accidents', (req, res) => res.json(accidents));
app.get('/api/challans', (req, res) => res.json(challans));

app.listen(PORT, () => console.log("Server running"));