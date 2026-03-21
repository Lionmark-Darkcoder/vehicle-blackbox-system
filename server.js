const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== PATHS =====
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'violations.json');
const CHALLAN_FOLDER = path.join(__dirname, 'challans');

// ===== INIT =====
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });
if (!fs.existsSync(CHALLAN_FOLDER)) fs.mkdirSync(CHALLAN_FOLDER, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_FOLDER));

// ===== MULTER =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});
const upload = multer({ storage });

// ===== SCORE MAP =====
const SCORE_MAP = {
    SEATBELT: 1,
    DOOR: 1,
    OVERSPEED: 3,
    HARSH: 3,
    ALCOHOL: 5,
    DROWSY: 5,
    ACCIDENT: 5,
    COLLISION: 5
};

// ===== HELPERS =====
function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getVehicleScore(vehicleId) {
    const data = readDB();
    return data
        .filter(v => v.vehicleId === vehicleId && !v.challanGenerated)
        .reduce((sum, v) => sum + v.score, 0);
}

// ===== ROOT =====
app.get('/', (req, res) => {
    res.send("✅ SafeDrive AI Server Running");
});

// ===== UPLOAD API =====
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image" });

        const { vehicleId, violationType } = req.body;

        const score = SCORE_MAP[violationType] || 1;

        const record = {
            id: uuidv4(),
            vehicleId: vehicleId || "UNKNOWN",
            type: violationType || "UNKNOWN",
            score,
            timestamp: new Date().toISOString(),
            imagePath: `/uploads/${req.file.filename}`,
            challanGenerated: false
        };

        let data = readDB();
        data.push(record);
        writeDB(data);

        const totalScore = getVehicleScore(record.vehicleId);

        console.log("📥 Violation:", record.type);
        console.log("📊 Score:", totalScore);

        // 🚨 AUTO CHALLAN
        if (totalScore >= 5) generateChallan(record.vehicleId);

        res.json({ success: true, totalScore });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ===== CHALLAN =====
function generateChallan(vehicleId) {
    let data = readDB();

    const violations = data.filter(v => v.vehicleId === vehicleId && !v.challanGenerated);

    let total = 0;

    violations.forEach(v => {
        total += v.score;
        v.challanGenerated = true;
    });

    writeDB(data);

    const challan = {
        id: uuidv4(),
        vehicleId,
        totalScore: total,
        violations,
        generatedAt: new Date().toISOString()
    };

    const filePath = path.join(CHALLAN_FOLDER, `${vehicleId}_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(challan, null, 2));

    console.log("🚨 CHALLAN GENERATED:", filePath);
}

// ===== GET APIs =====
app.get('/api/violations', (req, res) => {
    res.json(readDB());
});

app.get('/api/score/:vehicleId', (req, res) => {
    res.json({ score: getVehicleScore(req.params.vehicleId) });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`
==============================
🚀 Server Running
Port: ${PORT}
==============================
`);
});