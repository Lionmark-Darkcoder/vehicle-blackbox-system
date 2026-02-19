const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===========================
   CREATE UPLOADS FOLDER
=========================== */

const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

/* ===========================
   MULTER STORAGE
=========================== */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + ".jpg";
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

/* ===========================
   MIDDLEWARE
=========================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadPath));

/* ===========================
   HOME ROUTE
=========================== */

app.get("/", (req, res) => {
  res.send("BLACKBOX SERVER RUNNING");
});

/* ===========================
   UPLOAD ROUTE (ESP USES THIS)
=========================== */

app.post("/upload", upload.single("image"), (req, res) => {
  try {
    console.log("===== NEW VIOLATION RECEIVED =====");

    console.log("Vehicle:", req.headers.vehicle);
    console.log("Violation:", req.headers.violation);
    console.log("Owner:", req.headers.owner);
    console.log("Phone:", req.headers.phone);
    console.log("Latitude:", req.headers.latitude);
    console.log("Longitude:", req.headers.longitude);

    console.log("Saved File:", req.file.filename);

    res.status(200).send("UPLOAD SUCCESS");
  } catch (err) {
    console.log(err);
    res.status(500).send("UPLOAD FAILED");
  }
});

/* ===========================
   START SERVER
=========================== */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});