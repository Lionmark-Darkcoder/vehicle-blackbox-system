const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* -----------------------------
   Ensure folders exist
----------------------------- */

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

/* -----------------------------
   Serve uploaded images
----------------------------- */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -----------------------------
   Multer config
----------------------------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_evidence.jpg");
  }
});

const upload = multer({ storage: storage });

/* -----------------------------
   Data file
----------------------------- */

const DATA_FILE = "./data/violations.json";

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* -----------------------------
   Fine rules
----------------------------- */

const fines = {
  "Seatbelt Violation": 500,
  "Alcohol Violation": 500,
  "Drowsiness": 500,
  "Harsh Braking": 1000,
  "Harsh Driving": 1000
};

/* -----------------------------
   GPS location for accident
----------------------------- */

const accidentLocation = {
  lat: 12.0978888,
  lng: 75.5605588
};

/* -----------------------------
   POST VIOLATION
----------------------------- */

app.post("/violation", upload.single("image"), (req, res) => {

  let violations = readData();

  const type = req.body.type || "Unknown";

  const imagePath = req.file
    ? `/uploads/${req.file.filename}`
    : null;

  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  /* -----------------------------
     Accident / Collision
  ----------------------------- */

  if (type === "Accident" || type === "Collision") {

    const event = {
      vehicleNo: "KL59AB1234",
      violationType: type,
      fine: 0,
      score: 0,
      lat: accidentLocation.lat,
      lng: accidentLocation.lng,
      dateTime: now,
      imageUrl: imagePath
    };

    violations.push(event);
    writeData(violations);

    return res.json({
      status: "emergency_logged",
      data: event
    });
  }

  /* -----------------------------
     Normal violation
  ----------------------------- */

  const fine = fines[type] || 0;

  const violation = {
    vehicleNo: "KL59AB1234",
    violationType: type,
    fine: fine,
    score: violations.length + 1,
    lat: null,
    lng: null,
    dateTime: now,
    imageUrl: imagePath
  };

  violations.push(violation);

  writeData(violations);

  res.json({
    status: "violation_logged",
    data: violation
  });

});

/* -----------------------------
   GET violations
----------------------------- */

app.get("/violations", (req, res) => {
  res.json(readData());
});

/* -----------------------------
   Score endpoint
----------------------------- */

app.get("/score", (req, res) => {
  const data = readData();
  res.json({ score: data.length });
});

/* -----------------------------
   Start server
----------------------------- */

app.listen(PORT, () => {
  console.log("SafeDrive Server Running on port", PORT);
});