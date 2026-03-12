const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* serve frontend */
app.use(express.static("public"));

/* serve evidence images */
app.use("/uploads", express.static("uploads"));

/* ensure folders exist */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("data")) fs.mkdirSync("data");

const DATA_FILE = "data/violations.json";

/* Helper: READ DATA */
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    return [];
  }
}

/* Helper: SAVE DATA */
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* Helper: CREATE VIOLATION OBJECT */
function createViolationRecord(imagePath, body) {
  return {
    id: Date.now(),
    vehicleNo: body.vehicleNo || "KL59AB1234",
    violationType: body.type || "Seatbelt Violation",
    score: 1,
    fine: 500,
    lat: body.lat || "10.8505",
    lng: body.lng || "76.2711",
    dateTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    imageUrl: imagePath,
    status: "pending"
  };
}

/* STORAGE for multipart (Web Forms) */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

/* --- POST VIOLATION --- */
app.post("/violation", upload.single("image"), (req, res) => {
  let imagePath = "";

  // CASE 1: Image sent via Multer (Form-Data)
  if (req.file) {
    imagePath = "/uploads/" + req.file.filename;
    const data = readData();
    const violation = createViolationRecord(imagePath, req.body);
    data.push(violation);
    saveData(data);
    return res.json({ success: true, violation });
  } 

  // CASE 2: Image sent as Raw Binary (ESP32 standard POST)
  else if (req.headers["content-type"] === "image/jpeg") {
    const fileName = Date.now() + ".jpg";
    const filePath = path.join(__dirname, "uploads", fileName);
    imagePath = "/uploads/" + fileName;

    const stream = fs.createWriteStream(filePath);
    
    req.on("data", chunk => stream.write(chunk));

    req.on("end", () => {
      stream.end();
      const data = readData();
      const violation = createViolationRecord(imagePath, req.body);
      data.push(violation);
      saveData(data);
      console.log("Violation saved from raw buffer:", fileName);
      res.json({ success: true, violation });
    });

    req.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).json({ error: "Image upload failed" });
    });
  } 
  
  else {
    res.status(400).json({ error: "No image provided or wrong format" });
  }
});

/* GET LOG */
app.get("/log", (req, res) => {
  res.json(readData());
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Blackbox Server running at http://localhost:${PORT}`);
});
