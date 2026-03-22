const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ================= PATHS =================
const UPLOADS = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'violations.json');
const SCORE_FILE = path.join(DATA_DIR, 'scores.json');
const CHALLAN_DIR = path.join(__dirname, 'challans');

// ================= INIT =================
[UPLOADS, DATA_DIR, CHALLAN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(SCORE_FILE)) fs.writeFileSync(SCORE_FILE, JSON.stringify({}, null, 2));

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS));

// ================= MULTER =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS),
    filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});
const upload = multer({ storage });

// ================= SCORE ENGINE =================
function getScore(type) {
    type = type.toUpperCase();

    if (["SEATBELT", "DOOR"].includes(type)) return 1;
    if (["OVERSPEED", "HARSH_DRIVING", "HARSH_BRAKING"].includes(type)) return 3;
    if (["ALCOHOL", "DROWSINESS", "ACCIDENT", "COLLISION"].includes(type)) return 5;

    return 0;
}

// ================= ROOT =================
app.get('/', (req, res) => {
    res.send("🚀 SafeDrive AI Server Running");
});

// ================= UPLOAD =================
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        const type = (req.body.type || "UNKNOWN").toUpperCase();
        const vehicle = req.body.vehicle || "UNKNOWN";
        const lat = req.body.lat || "N/A";
        const lon = req.body.lon || "N/A";

        const record = {
            id: Date.now(),
            vehicle,
            type,
            score: getScore(type),
            lat,
            lon,
            timestamp: new Date().toISOString(),
            image: `/uploads/${req.file.filename}`
        };

        // Save violation
        let violations = JSON.parse(fs.readFileSync(DB_FILE));
        violations.push(record);
        fs.writeFileSync(DB_FILE, JSON.stringify(violations, null, 2));

        // Update score
        let scores = JSON.parse(fs.readFileSync(SCORE_FILE));
        if (!scores[vehicle]) scores[vehicle] = 0;
        scores[vehicle] += record.score;

        // Challan trigger
        if (scores[vehicle] >= 5) {
            const challan = {
                vehicle,
                totalScore: scores[vehicle],
                fine: scores[vehicle] * 500,
                violations: violations.filter(v => v.vehicle === vehicle).slice(-5),
                timestamp: new Date().toISOString()
            };

            const file = path.join(CHALLAN_DIR, `${vehicle}_${Date.now()}.json`);
            fs.writeFileSync(file, JSON.stringify(challan, null, 2));

            scores[vehicle] = 0; // reset after challan
        }

        fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2));

        console.log("✅ Saved:", record);

        res.json({ success: true, record });

    } catch (err) {
        console.error("❌ Upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ================= GET VIOLATIONS =================
app.get('/api/violations', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE));
        res.json(data.reverse());
    } catch {
        res.json([]);
    }
});

// ================= GET SCORE =================
app.get('/api/score/:vehicle', (req, res) => {
    try {
        const scores = JSON.parse(fs.readFileSync(SCORE_FILE));
        res.json({
            vehicle: req.params.vehicle,
            score: scores[req.params.vehicle] || 0
        });
    } catch {
        res.json({ score: 0 });
    }
});

// ================= STATS =================
app.get('/api/stats', (req, res) => {
    try {
        const violations = JSON.parse(fs.readFileSync(DB_FILE));
        const scores = JSON.parse(fs.readFileSync(SCORE_FILE));

        const total = violations.length;
        const accidentCount = violations.filter(v => v.type === "ACCIDENT").length;

        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

        res.json({
            totalViolations: total,
            totalScore,
            accidents: accidentCount
        });
    } catch {
        res.json({});
    }
});

// ================= START =================
app.listen(PORT, () => {
    console.log(`
==============================
🚀 SERVER RUNNING
PORT: ${PORT}
==============================
`);
});