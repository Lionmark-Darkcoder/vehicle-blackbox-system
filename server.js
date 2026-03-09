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

// folders
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
  pass: "bjorfludlgltrkzc"
 }
});


// ---------------- HELPER FUNCTIONS ----------------

function readData() {
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
 fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


// scoring system

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


// fine system

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


// ---------------- CHALLAN PDF ----------------

function generatePDF(v) {

 const file = `./data/challan_${v.id}.pdf`;

 const doc = new PDFDocument();

 doc.pipe(fs.createWriteStream(file));

 doc.fontSize(20).text("SAFEWAY TRAFFIC CHALLAN", { align: "center" });

 doc.moveDown();

 doc.fontSize(14).text("Vehicle Number: " + v.vehicleNo);
 doc.text("Owner Name: " + v.ownerName);
 doc.text("Violation Type: " + v.violationType);
 doc.text("Score: " + v.score);
 doc.text("Fine Amount: ₹" + v.fine);
 doc.text("Date: " + new Date().toLocaleString());

 doc.moveDown();

 doc.text("Multiple violations detected.");
 doc.text("Data forwarded to authorities.");

 doc.end();

 return file;
}


// ---------------- ROUTES ----------------

app.get("/", (req, res) => {

 res.send("SAFEWAY Vehicle Blackbox Server Running");

});


// get all violations

app.get("/log", (req, res) => {

 const violations = readData();

 res.json(violations);

});


// add violation

app.post("/violation", upload.single("image"), async (req, res) => {

 try {

  const violations = readData();

  const type = req.body.type || "seatbelt";

  const imagePath = req.file ? "/uploads/" + req.file.filename : "";

  const v = {

   id: Date.now(),
   vehicleNo: req.body.vehicleNo || "KL07AB1234",
   ownerName: "Vehicle Owner",
   mobile: "9999999999",
   violationType: type,
   score: getScore(type),
   fine: getFine(type),
   time: new Date(),
   imageUrl: imagePath,
   status: "pending"

  };

  violations.push(v);

  saveData(violations);


  // send response immediately

  res.json({
   status: "ok",
   violation: v
  });


  // generate challan + email only if serious violation

  if (v.score >= 5) {

   const pdf = generatePDF(v);

   transporter.sendMail({

    from: "drivesafeplusoffical@gmail.com",
    to: "sjthirtysix@gmail.com",

    subject: "SAFEWAY Challan Generated",

    text: `
Multiple violations detected.

A traffic challan has been generated.

Vehicle: ${v.vehicleNo}
Violation: ${v.violationType}
Fine: ₹${v.fine}

Visit dashboard:
https://vehicle-blackbox-system-1.onrender.com
`,

    attachments: [
     {
      filename: "challan.pdf",
      path: pdf
     }
    ]

   }).catch(err => console.log(err));

  }

 } catch (err) {

  res.status(500).json({
   error: err.message
  });

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


  // send response first

  res.json({
   message: "Test violation added",
   data: v
  });


  const pdf = generatePDF(v);


  transporter.sendMail({

   from: "drivesafeplusoffical@gmail.com",
   to: "sjthirtysix@gmail.com",

   subject: "SAFEWAY Test Challan",

   text: "Multiple violations detected. Challan generated. See attachment.",

   attachments: [
    {
     filename: "challan.pdf",
     path: pdf
    }
   ]

  }).catch(err => console.log(err));


 } catch (err) {

  res.status(500).json({
   error: err.message
  });

 }

});


// ---------------- SERVER ----------------

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

 console.log("Server running on port", PORT);

});