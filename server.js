const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { Resend } = require("resend");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- EMAIL API ----------------

const resend = new Resend("re_HpL7HyqZ_L6QyjWqBhCzSFW2UTekt1EuV");


// ---------------- FILE PATHS ----------------

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


// ---------------- DATABASE ----------------

function readData() {
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
 fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


// ---------------- SCORING ----------------

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


// ---------------- FINE ----------------

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


// ---------------- SERVER ROUTES ----------------

app.get("/", (req, res) => {

 res.send("SAFEWAY Vehicle Blackbox Server Running");

});


// GET ALL VIOLATIONS

app.get("/log", (req, res) => {

 const data = readData();

 res.json(data);

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


  // SEND EMAIL IF HIGH RISK VIOLATION

  if (v.score >= 5) {

   await resend.emails.send({

    from: "onboarding@resend.dev",

    to: "sjthirtysix@gmail.com",

    subject: "SAFEWAY Challan Generated",

    html: `
    <h2>Traffic Violation Detected</h2>

    <p><b>Vehicle:</b> ${v.vehicleNo}</p>

    <p><b>Violation:</b> ${v.violationType}</p>

    <p><b>Fine:</b> ₹${v.fine}</p>

    <p>
    Visit dashboard for details:
    https://vehicle-blackbox-system-1.onrender.com
    </p>
    `
   });

  }

  res.json({
   status: "ok",
   violation: v
  });

 } catch (err) {

  console.log(err);

  res.status(500).json({
   error: err.message
  });

 }

});


// ---------------- TEST ROUTE ----------------

app.get("/testViolation", async (req, res) => {

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


  await resend.emails.send({

   from: "onboarding@resend.dev",

   to: "sjthirtysix@gmail.com",

   subject: "SAFEWAY Test Challan",

   html: `
   <h2>Test Violation Generated</h2>

   <p><b>Vehicle:</b> ${v.vehicleNo}</p>

   <p><b>Violation:</b> ${v.violationType}</p>

   <p><b>Fine:</b> ₹${v.fine}</p>
   `
  });

  res.json({
   message: "Test violation created and email sent",
   data: v
  });

 } catch (err) {

  console.log(err);

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