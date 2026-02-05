const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let violations = [];

// ESP Data Receive API
app.post("/api/vehicle-data", (req, res) => {
    const data = req.body;

    console.log("Received Data:", data);

    // Store violation
    if(data.violation){
        violations.push({
            time: new Date(),
            type: data.violation,
            vehicle: data.vehicle
        });
    }

    res.json({status:"Data received"});
});

// Get Violation List
app.get("/api/violations", (req,res)=>{
    res.json(violations);
});

// Auto Challan Check
app.get("/api/challan",(req,res)=>{
    if(violations.length >= 3){
        res.json({
            challan:"Generated",
            count:violations.length
        });
    } else {
        res.json({
            challan:"Not Generated",
            count:violations.length
        });
    }
});

app.listen(3000, ()=>{
    console.log("Server running on port 3000");
});