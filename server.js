const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// folders
const DATA_FILE = "./data/violations.json";
const UPLOAD_DIR = "./uploads";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// serve images
app.use("/uploads", express.static(UPLOAD_DIR));


// file upload
const storage = multer.diskStorage({
 destination: function (req, file, cb) {
  cb(null, UPLOAD_DIR);
 },
 filename: function (req, file, cb) {
  cb(null, Date.now() + path.extname(file.originalname));
 }
});

const upload = multer({ storage: storage });


// email setup
const transporter = nodemailer.createTransport({
 service: "gmail",
 auth: {
  user: "drivesafeplusoffical@gmail.com",
  pass: "bjorfludlgltrkzc"
 }
});


// helper functions
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


// home route
app.get("/", (req, res) => {
 res.send("SAFEWAY Vehicle Blackbox Server Running");
});


// get all violations
app.get("/log", (req, res) => {

 const violations = readData();
 res.json(violations);

});


// add violation (ESP will use this)
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

  // send email if serious violation
  if (v.score >= 5) {

   await transporter.sendMail({
    from: "drivesafeplusoffical@gmail.com",
    to: "sjthirtysix@gmail.com",
    subject: "Traffic Violation Alert",
    text: `
Vehicle: ${v.vehicleNo}
Violation: ${v.violationType}
Score: ${v.score}
Fine: ₹${v.fine}
`
   });

  }

  res.json({
   status: "ok",
   violation: v
  });

 } catch (err) {

  res.status(500).json({
   error: err.message
  });

 }

});


// test violation route
app.get("/testViolation", (req, res) => {

 try {

  const violations = readData();

  const v = {
   id: Date.now(),
   vehicleNo: "KL07AB1234",
   ownerName: "Test Owner",
   mobile: "9999999999",
   violationType: "seatbelt",
   score: 1,
   fine: 500,
   time: new Date(),
   imageUrl: "",
   status: "pending"
  };

  violations.push(v);
  saveData(violations);

  res.json({
   message: "Test violation added",
   data: v
  });

 } catch (err) {

  res.status(500).json({
   error: err.message
  });

 }

});


// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

 console.log("Server running on port", PORT);

});