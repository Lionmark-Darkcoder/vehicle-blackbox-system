const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// folders
const uploadDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const challanDir = path.join(__dirname, "challans");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(challanDir)) fs.mkdirSync(challanDir);

// serve files
app.use("/uploads", express.static(uploadDir));
app.use("/challans", express.static(challanDir));

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// data file
const dataFile = path.join(dataDir, "violations.json");

function readData() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// scoring
function getScore(type) {
  if (type === "seatbelt" || type === "door_open") return 1;
  if (type === "harsh_brake" || type === "alcohol_low") return 3;
  if (type === "drowsy" || type === "harsh_driving" || type === "alcohol_high") return 5;
  return 1;
}

// fine
function getFine(type) {
  if (type === "seatbelt") return 500;
  if (type === "door_open") return 500;
  if (type === "harsh_brake") return 1000;
  if (type === "alcohol_low") return 2000;
  if (type === "drowsy") return 3000;
  if (type === "harsh_driving") return 3000;
  if (type === "alcohol_high") return 5000;
  return 500;
}

// mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// root route
app.get("/", (req, res) => {
  res.send("SAFEWAY Vehicle Blackbox Server Running");
});

// get logs
app.get("/log", (req, res) => {
  res.json(readData());
});

// test violation
app.get("/testViolation", (req, res) => {

  const violations = readData();

  const v = {
    id: Date.now(),
    vehicleNo: "KL07AB1234",
    ownerName: "Test Owner",
    mobile: "9999999999",
    violationType: "seatbelt",
    score: getScore("seatbelt"),
    fine: getFine("seatbelt"),
    time: new Date(),
    imageUrl: "/uploads/sample.jpg",
    status: "pending"
  };

  violations.push(v);
  saveData(violations);

  res.json({
    message: "Test violation added",
    data: v
  });
});

// upload violation
app.post("/upload", upload.single("image"), async (req, res) => {

  try {

    const { vehicleNo, ownerName, mobile, violationType } = req.body;

    const score = getScore(violationType);
    const fine = getFine(violationType);

    const violations = readData();

    const v = {
      id: Date.now(),
      vehicleNo,
      ownerName,
      mobile,
      violationType,
      score,
      fine,
      time: new Date(),
      imageUrl: req.file ? "/uploads/" + req.file.filename : "",
      status: "pending"
    };

    violations.push(v);
    saveData(violations);

    // send mail if serious violation
    if (score >= 5) {

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ALERT_EMAIL,
        subject: "Traffic Violation Detected",
        text:
          "Vehicle: " + vehicleNo +
          "\nOwner: " + ownerName +
          "\nViolation: " + violationType +
          "\nFine: ₹" + fine
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

// server start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});