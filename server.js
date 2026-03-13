const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DIRECTORY & FILE PATHS ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'violations.json');

// --- INITIALIZE SYSTEM DIRECTORIES ---
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/**

Safe JSON initialization and corruption recovery
*/
const initializeDB = () => {
try {
if (!fs.existsSync(DB_FILE)) {
fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
} else {
const content = fs.readFileSync(DB_FILE, 'utf8');
JSON.parse(content || '[]');
}
} catch (e) {
console.error("[ERROR] DB Corrupted. Resetting violations.json");
fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}
};
initializeDB();


// --- MIDDLEWARE ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());
app.use('/uploads', express.static(UPLOADS_DIR));

// Improved Request Logging
app.use((req, res, next) => {
const timestamp = new Date().toISOString();
console.log([${timestamp}] ${req.method} ${req.url} from ${req.ip});
next();
});

// --- MULTER CONFIGURATION (SECURITY IMPROVED) ---
const storage = multer.diskStorage({
destination: (req, file, cb) => cb(null, 'uploads/'),
filename: (req, file, cb) => {
const timestamp = Date.now();
cb(null, ${timestamp}_evidence.jpg);
}
});

const fileFilter = (req, file, cb) => {
if (file.mimetype.startsWith("image/")) {
cb(null, true);
} else {
cb(new Error("Only image files are allowed!"), false);
}
};

const upload = multer({
storage: storage,
fileFilter: fileFilter,
limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// --- HELPER FUNCTIONS ---
const getViolations = () => {
try {
const data = fs.readFileSync(DB_FILE, 'utf8');
return JSON.parse(data || '[]');
} catch (e) {
return [];
}
};

const saveViolation = (record) => {
const records = getViolations();
records.push(record);
fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2));
};

// --- API ENDPOINTS ---

/**

@route   GET /health
*/
app.get('/health', (req, res) => {
res.status(200).json({ status: "ok", service: "SafeDrive Backend" });
});


/**

@route   POST /violation

@desc    Receives multipart data from ESP32-CAM
*/
app.post('/violation', upload.single('image'), (req, res) => {
try {
if (!req.file) {
return res.status(400).json({ error: "No valid image evidence provided" });
}

const { type } = req.body;  
 const violationType = type || "Unknown Violation";  
 const istDateTime = new Date().toLocaleString("en-IN", {   
     timeZone: "Asia/Kolkata",  
     hour12: false   
 }).replace(/-/g, '/');  

 // Dynamic Full URL Generation  
 const fullImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;  

 let fine = 0;  
 let score = 0;  
 let lat = null;  
 let lng = null;  

 // Logic for Accident/Collision vs Normal Violations  
 if (violationType === "Accident" || violationType === "Collision") {  
     fine = 0;  
     score = 0;  
     lat = 12.0978888;  
     lng = 75.5605588;  
 } else {  
     const fineRules = {  
         "Seatbelt Violation": 500,  
         "Alcohol Violation": 500,  
         "Drowsiness": 500,  
         "Harsh Braking": 1000,  
         "Harsh Driving": 1000  
     };  
     fine = fineRules[violationType] || 0;  
     score = 1;  
 }  

 const newRecord = {  
     vehicleNo: "KL59AB1234",  
     violationType,  
     fine,  
     score,  
     lat,  
     lng,  
     dateTime: istDateTime,  
     imageUrl: fullImageUrl  
 };  

 saveViolation(newRecord);  
 res.status(201).json({ success: true, record: newRecord });

} catch (error) {
console.error("[ERROR]", error.message);
res.status(500).json({ error: error.message });
}
});


/**

@route   GET /violations
*/
app.get('/violations', (req, res) => {
res.json(getViolations());
});


/**

@route   GET /score
*/
app.get('/score', (req, res) => {
const records = getViolations();
const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
res.json({ totalScore });
});


// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
if (err instanceof multer.MulterError) {
return res.status(400).json({ error: Multer Error: ${err.message} });
}
res.status(500).json({ error: err.message });
});

// --- START SERVER ---
app.listen(PORT, () => {
console.log(\n================================================);
console.log(SafeDrive Backend running on port ${PORT});
console.log(Uploads directory: ${UPLOADS_DIR});
console.log(Database file: ${DB_FILE});
console.log(Example URL: http://localhost:${PORT}/uploads/sample.jpg);
console.log(================================================\n);
});