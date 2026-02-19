app.post("/upload", (req, res) => {

  try {

    const { camera, violation } = req.body;

    if (!camera || !violation) {
      return res.status(400).send("Invalid data");
    }

    let logs = [];

    if (fs.existsSync("logs.json")) {
      logs = JSON.parse(fs.readFileSync("logs.json"));
    }

    logs.push({
      time: new Date().toISOString(),
      camera: camera,
      violation: violation
    });

    fs.writeFileSync("logs.json", JSON.stringify(logs, null, 2));

    console.log("Logged:", camera, violation);

    res.status(200).send("Logged");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});