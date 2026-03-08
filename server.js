const express = require("express");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

let logs = [];

// --------------------
// Image Upload Setup
// --------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage: storage });

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// allow viewing uploaded images
app.use("/uploads", express.static("uploads"));

// --------------------
// HOME ROUTE
// --------------------
app.get("/", (req, res) => {
  res.send("Vehicle Blackbox Server Running");
});

// --------------------
// GET LOGS
// --------------------
app.get("/log", (req, res) => {
  res.json(logs);
});

// --------------------
// ESP SEND EVENT
// --------------------
app.post("/log", (req, res) => {

  const event = req.body.event || "UNKNOWN";

  const newLog = {
    id: logs.length + 1,
    event: event,
    time: new Date().toISOString()
  };

  logs.push(newLog);

  console.log("New Event Logged:", newLog);

  res.json({
    status: "success",
    log: newLog
  });
});

// --------------------
// ESP IMAGE UPLOAD
// --------------------
app.post("/upload", upload.single("image"), (req, res) => {

  if (!req.file) {
    return res.status(400).send("No image uploaded");
  }

  console.log("Image uploaded:", req.file.filename);

  res.json({
    status: "uploaded",
    file: req.file.filename
  });
});

// --------------------
// GENERATE CHALLAN PDF
// --------------------
app.get("/challan/:id", (req, res) => {

  const id = req.params.id;
  const log = logs.find(l => l.id == id);

  if (!log) {
    return res.send("Challan not found");
  }

  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=challan_" + id + ".pdf"
  );

  doc.pipe(res);

  doc.fontSize(22).text("Vehicle Violation Challan", { align: "center" });

  doc.moveDown();
  doc.fontSize(14).text("Violation ID: " + log.id);
  doc.text("Violation Type: " + log.event);
  doc.text("Date: " + log.time);
  doc.text("Fine Amount: ₹500");

  doc.moveDown();
  doc.text("Issued by: Smart Vehicle Monitoring System");

  doc.end();
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});