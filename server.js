const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// --- CONFIGURATION ---
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'violations.json');

// --- INITIALIZATION ---
// Create uploads folder if it doesn't exist
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}

// Create violations.json if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MULTER STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        // Format: timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname || '.jpg'));
    }
});

const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

// 1. Root Endpoint
app.get('/', (req, res) => {
    res.send("SafeDrive Backend Server Running");
});

// 2. Image Upload Endpoint (POST /upload)
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: "error", message: "No image file provided" });
        }

        const violationCode = req.body.type || "Unknown";
        const newRecord = {
            timestamp: new Date().toISOString(),
            violation_code: violationCode,
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`
        };

        // Read existing records
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const violations = JSON.parse(data);

        // Add new record and save
        violations.push(newRecord);
        fs.writeFileSync(DB_FILE, JSON.stringify(violations, null, 2));

        console.log(`[EVENT] Violation ${violationCode} logged. Image: ${req.file.filename}`);

        res.json({
            status: "success",
            message: "Image uploaded",
            record: newRecord
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

// 3. Get All Violations (GET /api/violations)
app.get('/api/violations', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ status: "error", message: "Could not read database" });
    }
});

// 4. Serve Static Images (GET /uploads/:filename)
app.use('/uploads', express.static(UPLOADS_FOLDER));

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`
==============================
SafeDrive Backend Server Running
Port: ${PORT}
Uploads: ${UPLOADS_FOLDER}
Database: ${DB_FILE}
==============================
    `);
});
