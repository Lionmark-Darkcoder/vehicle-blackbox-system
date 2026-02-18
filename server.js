const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ==============================
   CREATE UPLOADS FOLDER
============================== */
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

/* ==============================
   ACCEPT RAW JPEG FROM ESP
============================== */
app.use(express.raw({
    type: "image/jpeg",
    limit: "10mb"
}));

/* ==============================
   TEST ROUTE
============================== */
app.get("/", (req, res) => {
    res.send("Vehicle Blackbox Server Running ✅");
});

/* ==============================
   UPLOAD ROUTE
============================== */
app.post("/upload", (req, res) => {

    console.log("=== VIOLATION RECEIVED ===");

    const eventType = req.headers["event-type"] || "UNKNOWN";
    const vehicleNo = req.headers["vehicle-no"] || "UNKNOWN";

    const fileName = `photo_${eventType}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    try {
        fs.writeFileSync(filePath, req.body);

        console.log("Event:", eventType);
        console.log("Vehicle:", vehicleNo);
        console.log("Saved:", fileName);

        res.status(200).send("UPLOAD SUCCESS");

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send("UPLOAD FAILED");
    }
});

/* ==============================
   START SERVER
============================== */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
