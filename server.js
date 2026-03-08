const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* IMPORTANT: allow access to uploads folder */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/challans", express.static(path.join(__dirname, "challans")));

/* create folders if not exist */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("challans")) fs.mkdirSync("challans");
if (!fs.existsSync("data")) fs.mkdirSync("data");

/* database file */
const DB_FILE = "data/violations.json";

/* initialize db */
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ violations: [] }, null, 2));
}

/* file upload config */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const name = Date.now() + path.extname(file.originalname);
    cb(null, name);
  }
});

const upload = multer({ storage: storage });

/* helper functions */

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* scoring system */

const violationScores = {
  seatbelt: 1,
  dooropen: 1,
  harshbrake: 3,
  alcohol_low: 3,
  overspeed: 3,
  alcohol_high: 5,
  drowsy: 5,
  rashdriving: 5
};

/* home route */

app.get("/", (req, res) => {
  res.send("SAFEWAY Vehicle Blackbox Server Running");
});

/* get violations */

app.get("/log", (req, res) => {
  const db = readDB();
  res.json(db.violations);
});

/* upload violation */

app.post("/upload", upload.single("image"), (req, res) => {

  const db = readDB();

  const {
    vehicleNo,
    ownerName,
    mobile,
    violationType
  } = req.body;

  const score = violationScores[violationType] || 1;

  const violation = {
    id: Date.now(),
    vehicleNo,
    ownerName,
    mobile,
    violationType,
    score,
    time: new Date(),
    image: req.file ? "/uploads/" + req.file.filename : null
  };

  db.violations.push(violation);

  /* check last 12 hours violations */

  const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);

  const recent = db.violations.filter(v =>
    v.vehicleNo === vehicleNo &&
    new Date(v.time).getTime() > twelveHoursAgo
  );

  let totalScore = 0;

  recent.forEach(v => totalScore += v.score);

  if (totalScore >= 5) {

    const challanName = "challan_" + Date.now() + ".txt";

    const challanData = `
SAFEWAY TRAFFIC VIOLATION CHALLAN

Vehicle: ${vehicleNo}
Owner: ${ownerName}
Mobile: ${mobile}

Violations:

${recent.map(v =>
      v.violationType + " | Score: " + v.score + " | " + v.time
    ).join("\n")}

Total Score: ${totalScore}

Fine Amount: ₹2000

Reported by SAFEWAY Smart Transport Safety System
`;

    fs.writeFileSync("challans/" + challanName, challanData);

    violation.challan = "/challans/" + challanName;
    violation.status = "Challan Generated";
  }

  writeDB(db);

  res.json({
    status: "Violation logged",
    violation
  });

});

/* start server */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SAFEWAY server running on port " + PORT);
});