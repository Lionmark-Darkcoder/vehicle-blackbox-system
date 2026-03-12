const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* SERVE PUBLIC FILES */
app.use(express.static("public"));

/* SERVE UPLOADED IMAGES */
app.use("/uploads", express.static("uploads"));

/* STORAGE CONFIG */
const storage = multer.diskStorage({
 destination: (req, file, cb) => {
  cb(null, "uploads/");
 },
 filename: (req, file, cb) => {
  const name = Date.now() + "-" + file.originalname;
  cb(null, name);
 }
});

const upload = multer({ storage: storage });

/* DATA FILE */
const DATA_FILE = "data/violations.json";

/* READ DATA */
function readData() {

 if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
 }

 const data = fs.readFileSync(DATA_FILE);
 return JSON.parse(data);

}

/* SAVE DATA */
function saveData(data) {

 fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

}

/* SCORE RULES */
function getScore(type) {

 if (type === "seatbelt") return 1;
 if (type === "mobile") return 2;
 if (type === "overspeed") return 3;

 return 1;

}

/* FINE RULES */
function getFine(type) {

 if (type === "seatbelt") return 500;
 if (type === "mobile") return 1000;
 if (type === "overspeed") return 1500;

 return 500;

}

/* VIOLATION API */
app.post("/violation", upload.single("image"), (req, res) => {

 try {

  const violations = readData();

  const type = req.body.type || "seatbelt";
  const vehicleNo = req.body.vehicleNo || "KL59AB1234";

  let imagePath = "";

  if (req.file) {
   imagePath = "/uploads/" + req.file.filename;
  }

  const score = getScore(type);
  const fine = getFine(type);

  const violation = {

   id: Date.now(),

   vehicleNo: vehicleNo,

   ownerName: "Mark",
   mobile: "+91 8520649127",

   violationType: type,

   score: score,
   fine: fine,

   emergency: false,

   lat: req.body.lat || "10.8505",
   lng: req.body.lng || "76.2711",

   dateTime: new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
   }),

   imageUrl: imagePath,

   status: "pending"

  };

  violations.push(violation);

  saveData(violations);

  res.json({
   success: true,
   violation: violation
  });

 } catch (err) {

  console.log(err);

  res.status(500).json({
   error: err.message
  });

 }

});

/* GET ALL VIOLATIONS */
app.get("/log", (req, res) => {

 const data = readData();

 res.json(data);

});

/* SERVER START */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

 console.log("Server running on port " + PORT);

});