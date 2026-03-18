const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CORRECT PATHS
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'data', 'violations.json'); // ✅ FIXED

// ✅ CREATE FOLDERS / FILES
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// ✅ MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ MULTER CONFIG
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '.jpg');
    }
});

const upload = multer({ storage });

// ✅ ROOT
app.get('/', (req, res) => {
    res.send("✅ SafeDrive Server Running");
});

// ✅ UPLOAD API
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        console.log("📥 Upload received");

        if (!req.file) {
            return res.status(400).json({ error: "No image" });
        }

        const record = {
            timestamp: new Date().toISOString(),
            violation_code: req.body.type || "Unknown",
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`
        };

        let data = [];

        try {
            const file = fs.readFileSync(DB_FILE, 'utf8');
            data = file ? JSON.parse(file) : [];
        } catch {
            data = [];
        }

        data.push(record);

        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

        console.log("✅ Saved:", record);

        res.json({ success: true, record });

    } catch (err) {
        console.error("❌ Upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ GET VIOLATIONS
app.get('/api/violations', (req, res) => {
    try {
        const file = fs.readFileSync(DB_FILE, 'utf8');
        res.json(file ? JSON.parse(file) : []);
    } catch {
        res.json([]);
    }
});

// ✅ STATIC FILES
app.use('/uploads', express.static(UPLOADS_FOLDER));

// ✅ START SERVER
app.listen(PORT, () => {
    console.log(`
==============================
🚀 Server Running
Port: ${PORT}
DB: ${DB_FILE}
==============================
`);
});