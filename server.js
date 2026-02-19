app.use(express.json());

app.post('/upload', (req, res) => {
    try {
        const violation = req.body.violation;

        if (!violation) {
            return res.status(400).send("No violation received");
        }

        let logs = [];

        if (fs.existsSync('logs.json')) {
            logs = JSON.parse(fs.readFileSync('logs.json'));
        }

        const logEntry = {
            time: new Date().toISOString(),
            violation: violation
        };

        logs.push(logEntry);

        fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));

        console.log("Logged:", violation);

        res.status(200).send("Logged successfully");

    } catch (error) {
        console.log("Error:", error);
        res.status(500).send("Server error");
    }
});