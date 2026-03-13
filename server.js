const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* SERVE UPLOADED IMAGES */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* MULTER STORAGE */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_evidence.jpg");
  }
});

const upload = multer({ storage: storage });

/* DATABASE (IN MEMORY) */
let violations = [];
let emergencies = [];

/* FINE TABLE */
const fines = {
  "Seatbelt Violation": 500,
  "Alcohol Violation": 500,
  "Drowsiness": 500,
  "Harsh Braking": 1000,
  "Harsh Driving": 1000
};

/* SCORE TABLE */
const scores = {
  "Seatbelt Violation": 2,
  "Alcohol Violation": 1,
  "Drowsiness": 1,
  "Harsh Braking": 2,
  "Harsh Driving": 2
};

/* GPS LOCATION */
const accidentLocation = {
  latitude: 12.0978888,
  longitude: 75.5605588
};

/* VIOLATION ENDPOINT */
app.post("/violation", upload.single("image"), (req, res) => {

  const type = req.body.type || "Unknown";

  const imagePath = req.file
    ? "/uploads/" + req.file.filename
    : null;

  const now = new Date();

  /* ACCIDENT OR COLLISION → EMERGENCY EVENT */
  if (type === "Accident" || type === "Collision") {

    const emergency = {
      id: Date.now(),
      type: type,
      vehicle: "KL59AB1234",
      owner: "Mark",
      phone: "+91 8520649127",
      time: now.toLocaleString(),
      location: accidentLocation,
      camera: "Outside Cam",
      image: imagePath
    };

    emergencies.push(emergency);

    console.log("Emergency Event:", emergency);

    return res.json({
      status: "emergency_logged",
      event: emergency
    });
  }

  /* NORMAL VIOLATIONS */
  const violation = {
    id: Date.now(),
    type: type,
    fine: fines[type] || 0,
    score: scores[type] || 0,
    time: now.toLocaleString(),
    image: imagePath,
    camera: "Outside Cam",
    vehicle: "KL59AB1234"
  };

  violations.push(violation);

  console.log("Violation logged:", violation);

  res.json({
    status: "violation_logged",
    violation: violation
  });

});

/* GET VIOLATIONS */
app.get("/violations", (req, res) => {
  res.json(violations);
});

/* GET EMERGENCY EVENTS */
app.get("/emergencies", (req, res) => {
  res.json(emergencies);
});

/* ROOT */
app.get("/", (req, res) => {
  res.send("SAFEWAY Vehicle Blackbox Server Running");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});