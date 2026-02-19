const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// Ensure uploads folder exists
// ============================
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ============================
// Multer Storage Setup
// ============================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + ".jpg";
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// ============================
// Serve uploads publicly
// ============================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================
// ROOT ROUTE
// ============================
app.get('/', (req, res) => {
    res.send("BLACKBOX SERVER RUNNING");
});

// ============================
// UPLOAD ROUTE (ESP POST)
// ============================
app.post('/upload', upload.single('image'), (req, res) => {

    try {

        const violation = req.headers['violation'] || "UNKNOWN";
        const filename = req.file.filename;

        const logEntry = {
            time: new Date().toISOString(),
            violation: violation,
            image: filename
        };

        // Read existing logs
        let logs = [];
        if (fs.existsSync('logs.json')) {
            logs = JSON.parse(fs.readFileSync('logs.json'));
        }

        logs.push(logEntry);

        fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));

        console.log("Saved:", logEntry);

        res.status(200).send("Saved");

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// ============================
// VIEW LOGS ROUTE
// ============================
app.get('/logs', (req, res) => {
    if (fs.existsSync('logs.json')) {
        res.sendFile(path.join(__dirname, 'logs.json'));
    } else {
        res.json([]);
    }
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
    console.log(`SERVER RUNNING ON ${PORT}`);
});