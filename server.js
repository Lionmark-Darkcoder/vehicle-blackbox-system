const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();

app.use(cors());
app.use(express.json());

/* IMPORTANT: serve folders */
app.use("/uploads", express.static("uploads"));
app.use("/challans", express.static("challans"));

/* storage for uploaded images */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage: storage });

const DB_FILE = "data/violations.json";

/* read database */
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

/* save database */
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* homepage */
app.get("/", (req, res) => {
  res.send("SAFEWAY Vehicle Blackbox Server Running");
});

/* get all violations */
app.get("/log", (req, res) => {
  const db = loadDB();
  res.json(db.violations);
});

/* upload violation with image */
app.post("/upload", upload.single("image"), (req, res) => {

  const { vehicleNo, ownerName, mobile, violationType } = req.body;

  const db = loadDB();

  const score = db.scores[violationType] || 1;
  const fine = db.fine[violationType] || 100;

  const violation = {
    vehicleNo: vehicleNo,
    ownerName: ownerName,
    mobile: mobile,
    type: violationType,
    score: score,
    amount: fine,
    time: new Date().toISOString(),
    image: `/uploads/${req.file.filename}`
  };

  db.violations.push(violation);

/* calculate total score within last 12 hours */
const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);

const recentViolations = db.violations.filter(v => {
  return (
    v.vehicleNo === vehicleNo &&
    new Date(v.time).getTime() >= twelveHoursAgo
  );
});

let totalScore = 0;

recentViolations.forEach(v => {
  totalScore += v.score;
});

/* auto challan trigger */
if (totalScore >= db.scoreThreshold) {

  const challanData = {
    vehicleNo,
    ownerName,
    mobile,
    violations: recentViolations
  };

  const challanFile = generateChallan(challanData);

  violation.challan = challanFile;
  violation.status = "Challan Generated";
}

saveDB(db);
  res.json({
    status: "violation logged",
    data: violation
  });
});

/* challan generator */
app.post("/generate-challan", (req, res) => {

  const { vehicleNo, ownerName, mobile, violations } = req.body;

  const doc = new PDFDocument();

  const fileName = `challans/challan_${Date.now()}.pdf`;

  doc.pipe(fs.createWriteStream(fileName));

  /* LOGO */
  doc.image("uploads/177298282796.png", 50, 40, { width: 100 });

  doc.fontSize(20).text("SAFEWAY Smart Transportation Safety", 200, 50);

  doc.moveDown();

  doc.fontSize(16).text("Traffic Violation Challan", { align: "center" });

  doc.moveDown();

  doc.text(`Vehicle No: ${vehicleNo}`);
  doc.text(`Owner Name: ${ownerName}`);
  doc.text(`Mobile: ${mobile}`);

  doc.moveDown();

  let total = 0;

  violations.forEach(v => {
    doc.text(`${v.type}  |  ₹${v.amount}  |  ${v.time}`);
    total += v.amount;
  });

  doc.moveDown();

  doc.fontSize(16).text(`Total Fine: ₹${total}`);

  doc.moveDown();

  doc.text("Reported by SAFEWAY Smart Transportation Safety");

  doc.end();

  res.json({
    message: "Challan generated",
    challan: fileName
  });
});

/* start server */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("SAFEWAY server running on port " + PORT);
});