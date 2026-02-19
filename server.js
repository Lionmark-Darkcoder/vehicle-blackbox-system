const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = 3000;

// Allow large image data
app.use(express.json({ limit: "20mb" }));

// Create folders if not exist
if (!fs.existsSync("photos")) fs.mkdirSync("photos");
if (!fs.existsSync("challans")) fs.mkdirSync("challans");
if (!fs.existsSync("logs.json")) fs.writeFileSync("logs.json", "[]");

// ================= PDF GENERATOR =================
function generateChallan(data) {

  const fileName = `challan_${Date.now()}.pdf`;
  const filePath = path.join("challans", fileName);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("TRAFFIC VIOLATION CHALLAN", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Date: ${new Date().toLocaleString()}`);
  doc.text(`Camera: ${data.camera}`);
  doc.text(`Violation: ${data.violation}`);
  doc.text(`Vehicle: ${data.vehicle}`);
  doc.text(`Owner: ${data.owner}`);

  doc.moveDown();
  doc.text("Fine Amount: ₹1000");

  doc.end();

  return fileName;
}

// ================= UPLOAD ROUTE =================
app.post("/upload", (req, res) => {

  try {

    const { camera, violation, vehicle, owner, photo } = req.body;

    if (!camera || !violation || !vehicle || !owner) {
      return res.status(400).send("Missing Data");
    }

    const logs = JSON.parse(fs.readFileSync("logs.json"));

    let photoFile = null;

    if (photo) {
      const photoName = `photo_${Date.now()}.jpg`;
      const photoPath = path.join("photos", photoName);

      const buffer = Buffer.from(photo, "base64");
      fs.writeFileSync(photoPath, buffer);

      photoFile = photoName;
    }

    const challanFile = generateChallan({
      camera,
      violation,
      vehicle,
      owner
    });

    const entry = {
      time: new Date().toISOString(),
      camera,
      violation,
      vehicle,
      owner,
      photo: photoFile,
      challan: challanFile
    };

    logs.push(entry);
    fs.writeFileSync("logs.json", JSON.stringify(logs, null, 2));

    console.log("=====================================");
    console.log("NEW VIOLATION DETECTED");
    console.log("Camera:", camera);
    console.log("Violation:", violation);
    console.log("Vehicle:", vehicle);
    console.log("Owner:", owner);
    console.log("Photo Saved:", photoFile);
    console.log("Challan Generated:", challanFile);
    console.log("=====================================");

    res.status(200).send("Logged Successfully");

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

// View Logs in browser
app.get("/logs", (req, res) => {
  const logs = JSON.parse(fs.readFileSync("logs.json"));
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});