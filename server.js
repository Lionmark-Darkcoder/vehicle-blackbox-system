const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- PATH SETUP ----------------

const DATA_FILE = "./data/violations.json";
const UPLOAD_DIR = "./uploads";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

app.use("/uploads", express.static(UPLOAD_DIR));

// ---------------- FILE UPLOAD ----------------

const storage = multer.diskStorage({
 destination: function (req, file, cb) {
  cb(null, UPLOAD_DIR);
 },
 filename: function (req, file, cb) {
  cb(null, Date.now() + path.extname(file.originalname));
 }
});

const upload = multer({ storage });

// ---------------- EMAIL SETUP ----------------

const transporter = nodemailer.createTransport({

 service: "gmail",

 auth: {
  user: "drivesafeplusoffical@gmail.com",
  pass: "exwpsqlvmsvmlslk"
 }

});

// ---------------- DATA FUNCTIONS ----------------

function readData() {
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
 fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------------- SCORE SYSTEM ----------------

function getScore(type) {

 if (type === "seatbelt") return 1;
 if (type === "doorOpen") return 1;

 if (type === "harshBraking") return 3;
 if (type === "alcoholLow") return 3;

 if (type === "alcoholHigh") return 5;
 if (type === "drowsyDriving") return 5;
 if (type === "harshDriving") return 5;

 return 1;
}

// ---------------- FINE SYSTEM ----------------

function getFine(type) {

 if (type === "seatbelt") return 500;
 if (type === "doorOpen") return 500;

 if (type === "harshBraking") return 1000;
 if (type === "alcoholLow") return 2000;

 if (type === "alcoholHigh") return 5000;
 if (type === "drowsyDriving") return 5000;
 if (type === "harshDriving") return 5000;

 return 500;
}

// ---------------- PDF GENERATION ----------------

function generatePDF(v) {

 const file = `./data/challan_${v.id}.pdf`;

 const doc = new PDFDocument();

 doc.pipe(fs.createWriteStream(file));

 doc.fontSize(22).text("TRAFFIC VIOLATION CHALLAN", { align: "center" });

 doc.moveDown();

 doc.fontSize(14).text(`Vehicle Number: ${v.vehicleNo}`);
 doc.text(`Owner Name: ${v.ownerName}`);
 doc.text(`Violation Type: ${v.violationType}`);
 doc.text(`Fine Amount: ₹${v.fine}`);
 doc.text(`Date: ${new Date().toLocaleString()}`);

 doc.moveDown();

 doc.text("Issued by Motor Vehicle Department");

 doc.end();

 return file;
}

// ---------------- EMAIL FUNCTION ----------------

async function sendEmail(v, pdfFile) {

 try {

  await transporter.sendMail({

   from: "drivesafeplusoffical@gmail.com",

   to: "sjthirtysix@gmail.com",

   subject: "Traffic Violation Challan",

   text:
`Vehicle ${v.vehicleNo} committed ${v.violationType}.
Fine Amount: ₹${v.fine}

See attached challan.`,

   attachments: [
    {
     filename: "challan.pdf",
     path: pdfFile
    }
   ]

  });

  console.log("Email sent");

 } catch (err) {

  console.log("EMAIL ERROR:", err.message);

 }
}

// ---------------- HOME ----------------

app.get("/", (req, res) => {

 res.send("Vehicle Blackbox Server Running");

});

// ---------------- GET LOG ----------------

app.get("/log", (req, res) => {

 const violations = readData();

 res.json(violations);

});

// ---------------- ADD VIOLATION ----------------

app.post("/violation", upload.single("image"), async (req, res) => {

 try {

  const violations = readData();

  const type = req.body.type || "seatbelt";

  const v = {

   id: Date.now(),
   vehicleNo: req.body.vehicleNo || "KL07AB1234",
   ownerName: "Vehicle Owner",
   mobile: "9999999999",
   violationType: type,
   score: getScore(type),
   fine: getFine(type),
   time: new Date(),
   imageUrl: req.file ? "/uploads/" + req.file.filename : "",
   status: "pending"

  };

  violations.push(v);

  saveData(violations);

  if (v.score >= 5) {

   const pdf = generatePDF(v);

   sendEmail(v, pdf); // non-blocking

  }

  res.json({
   status: "ok",
   violation: v
  });

 } catch (err) {

  res.status(500).json({ error: err.message });

 }

});

// ---------------- TEST ROUTE ----------------

app.get("/testViolation", (req, res) => {

 try {

  const violations = readData();

  const v = {

   id: Date.now(),
   vehicleNo: "KL07AB1234",
   ownerName: "Test Owner",
   mobile: "9999999999",
   violationType: "drowsyDriving",
   score: 5,
   fine: 5000,
   time: new Date(),
   imageUrl: "",
   status: "pending"

  };

  violations.push(v);

  saveData(violations);

  const pdf = generatePDF(v);

  sendEmail(v, pdf);

  res.json({
   message: "Test violation created",
   data: v
  });

 } catch (err) {

  res.status(500).json({ error: err.message });

 }

});

// ---------------- SERVER ----------------

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

 console.log("Server running on port", PORT);

});