app.post("/upload", (req, res) => {

  try {

    const { camera, violation, vehicle, owner, photo } = req.body;

    if (!camera || !violation || !vehicle || !owner) {
      return res.status(400).send("Missing data");
    }

    const logs = JSON.parse(fs.readFileSync("logs.json"));

    // Save photo if exists
    let photoFile = null;

    if (photo) {
      const photoName = `photo_${Date.now()}.jpg`;
      const photoPath = path.join("photos", photoName);

      const imageBuffer = Buffer.from(photo, "base64");
      fs.writeFileSync(photoPath, imageBuffer);

      photoFile = photoName;
    }

    const challanFile = generateChallan({ camera, violation });

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

    // 🔥 TERMINAL LOG
    console.log("================================");
    console.log("New Violation Detected");
    console.log("Camera:", camera);
    console.log("Violation:", violation);
    console.log("Vehicle:", vehicle);
    console.log("Owner:", owner);
    console.log("Photo Saved:", photoFile);
    console.log("Challan Generated:", challanFile);
    console.log("================================");

    res.status(200).send("Logged Successfully");

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});