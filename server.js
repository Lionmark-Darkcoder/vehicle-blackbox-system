const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + ".jpg");
  }
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), (req, res) => {

  console.log("NEW EVENT RECEIVED");

  console.log("Violation:", req.body.violation);
  console.log("Vehicle:", req.body.vehicle);
  console.log("Owner:", req.body.owner);
  console.log("Mobile:", req.body.mobile);

  res.send("UPLOAD SUCCESS");
});

app.listen(3000, () => {
  console.log("SERVER RUNNING ON 3000");
});