const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

if (!fs.existsSync("photos")) fs.mkdirSync("photos");
if (!fs.existsSync("challans")) fs.mkdirSync("challans");

let violationCount = 0;

// ================= CHALLAN GENERATOR =================
function generateChallan(data, imagePath) {

  const fileName = `RTO_CHALLAN_${Date.now()}.pdf`;
  const filePath = path.join("challans", fileName);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text("GOVERNMENT OF INDIA", { align: "center" });
  doc.fontSize(16).text("REGIONAL TRANSPORT OFFICE (RTO)", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text("TRAFFIC VIOLATION CHALLAN", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(12);
  doc.text(`Challan No: ${Date.now()}`);
  doc.text(`Date & Time: ${data.time}`);
  doc.moveDown();

  doc.text(`Vehicle Number: ${data.vehicle}`);
  doc.text(`Owner Name: ${data.owner}`);
  doc.moveDown();

  doc.text("Violation Details:");
  doc.text(data.violationSentence);
  doc.moveDown();

  doc.text("Evidence Image:");
  doc.image(imagePath, { fit: [250, 200], align: "center" });
  doc.moveDown();

  doc.text("Fine Amount: ₹ 2000", { underline: true });

  doc.end();

  return fileName;
}

// ================= ROUTE =================
app.post("/upload", (req, res) => {

  const { violation, vehicle, owner, image } = req.body;

  if (!violation || !vehicle || !owner || !image) {
    return res.status(400).send("Missing Data");
  }

  const time = new Date().toLocaleString();

  const imageBuffer = Buffer.from(image, "base64");
  const photoName = `photo_${Date.now()}.jpg`;
  const photoPath = path.join("photos", photoName);

  fs.writeFileSync(photoPath, imageBuffer);

  violationCount++;

  console.log("=====================================");
  console.log("Violation:", violation);
  console.log("Time:", time);
  console.log("Vehicle:", vehicle);
  console.log("Owner:", owner);
  console.log("Violation Count:", violationCount);
  console.log("=====================================");

  let violationSentence = "";

  if (violation === "ALCOHOL")
    violationSentence = "Driver was operating the vehicle under the influence of alcohol.";

  if (violation === "SEATBELT")
    violationSentence = "Driver was found driving without wearing a seatbelt.";

  if (violation === "DROWSINESS")
    violationSentence = "Driver was driving in a drowsy condition posing public safety risk.";

  if (violationCount >= 3) {

    const challanFile = generateChallan(
      { time, vehicle, owner, violationSentence },
      photoPath
    );

    console.log("******** CHALLAN GENERATED ********");
    console.log("File:", challanFile);
    console.log("Violation counter reset.");
    console.log("***********************************");

    violationCount = 0;
  }

  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});