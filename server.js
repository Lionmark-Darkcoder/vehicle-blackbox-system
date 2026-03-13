const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------ MIDDLEWARE ------------------ */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ------------------ FOLDERS ------------------ */

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "violations.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CHALLAN_DIR = path.join(__dirname, "challans");

/* ensure folders exist */

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(CHALLAN_DIR)) fs.mkdirSync(CHALLAN_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

/* ------------------ FILE STORAGE ------------------ */

const storage = multer.diskStorage({
destination: function (req, file, cb) {
cb(null, UPLOAD_DIR);
},
filename: function (req, file, cb) {
cb(null, Date.now() + "_" + file.originalname);
}
});

const upload = multer({ storage: storage });

/* ------------------ VEHICLE INFO ------------------ */

const VEHICLE_NO = "KL59AB1234";

/* ------------------ CAMERA IP ------------------ */

let cameraIP = "";

/* ------------------ FINE TABLE ------------------ */

const fines = {
Seatbelt: 500,
Alcohol: 2000,
Drowsiness: 1000,
"Harsh Brake": 500,
"Harsh Driving": 1000,
Collision: 3000,
Accident: 5000
};

/* ------------------ UTIL FUNCTIONS ------------------ */

function getTime() {

return new Date().toLocaleString("en-IN", {
timeZone: "Asia/Kolkata",
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
second: "2-digit"
});

}

function readData() {

return JSON.parse(fs.readFileSync(DATA_FILE));

}

function writeData(data) {

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

}

/* ------------------ CAMERA IP UPDATE ------------------ */

app.post("/camera-ip", (req, res) => {

cameraIP = req.body.ip;

console.log("Camera IP updated:", cameraIP);

res.json({
status: "camera ip stored",
ip: cameraIP
});

});

/* ------------------ STREAM ENDPOINT ------------------ */

app.get("/stream", (req, res) => {

if (!cameraIP) {

return res.json({
stream: null,
status: "camera offline"
});

}

res.json({
stream: `http://${cameraIP}/stream`
});

});

/* ------------------ VIOLATION API ------------------ */

app.post("/violation", upload.single("image"), (req, res) => {

let violations = readData();

const type = req.body.type || "Unknown";
const evidence = req.file ? req.file.filename : null;

const score = violations.length + 1;

const fine = fines[type] || 500;

const violation = {

vehicle: VEHICLE_NO,
type: type,
score: score,
fine: fine,
time: getTime(),
evidence: evidence

};

violations.push(violation);

writeData(violations);

console.log("Violation Logged:", violation);

/* -------- CHALLAN GENERATION -------- */

if (score >= 5) {

const challan = {

vehicle: VEHICLE_NO,
authority: "MVD",
system: "SafeDrive",
totalScore: score,
lastViolation: type,
fine: fine,
time: getTime(),
evidence: evidence

};

const file = "challan_" + Date.now() + ".json";

fs.writeFileSync(

path.join(CHALLAN_DIR, file),
JSON.stringify(challan, null, 2)

);

return res.json({

status: "Violation logged and challan generated",
score: score,
fine: fine,
popup: true

});

}

/* normal response */

res.json({

status: "Violation logged",
score: score,
fine: fine,
popup: false

});

});

/* ------------------ GET VIOLATIONS ------------------ */

app.get("/violations", (req, res) => {

res.json(readData());

});

/* ------------------ SCORE API ------------------ */

app.get("/score", (req, res) => {

res.json({
score: readData().length
});

});

/* ------------------ SERVER START ------------------ */

app.listen(PORT, () => {

console.log("SafeDrive server running on port", PORT);

});