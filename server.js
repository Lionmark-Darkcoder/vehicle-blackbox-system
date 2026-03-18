const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'violations.json');

if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});

const upload = multer({ storage });

// ROOT
app.get('/', (req, res) => {
    res.send("Server Running");
});

// UPLOAD
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        console.log("UPLOAD RECEIVED");

        if (!req.file) {
            console.log("No file");
            return res.status(400).json({ error: "No file" });
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

        console.log("SAVED:", record);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET DATA
app.get('/api/violations', (req, res) => {
    try {
        const file = fs.readFileSync(DB_FILE, 'utf8');
        res.json(file ? JSON.parse(file) : []);
    } catch {
        res.json([]);
    }
});

// STATIC
app.use('/uploads', express.static(UPLOADS_FOLDER));

app.listen(PORT, () => {
    console.log("SERVER STARTED");
});