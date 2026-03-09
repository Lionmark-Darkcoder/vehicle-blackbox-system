const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// folders
const uploadDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const challanDir = path.join(__dirname, "challans");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(challanDir)) fs.mkdirSync(challanDir);

// serve images
app.use("/uploads", express.static(uploadDir));
app.use("/challans", express.static(challanDir));

// storage
const storage = multer.diskStorage({
destination: (req, file, cb) => cb(null, uploadDir),
filename: (req, file, cb) =>
cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// violation storage
const dataFile = path.join(dataDir, "violations.json");

function readData() {
if (!fs.existsSync(dataFile)) return [];
return JSON.parse(fs.readFileSync(dataFile));
}

function saveData(data) {
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// scoring system
function getScore(type) {

switch(type){

case "seatbelt":
case "door_open":
return 1;

case "harsh_brake":
case "alcohol_low":
return 3;

case "drowsy":
case "harsh_driving":
case "alcohol_high":
return 5;

default:
return 1;
}
}

// fine table
function getFine(type){

switch(type){

case "seatbelt":
return 500;

case "door_open":
return 500;

case "harsh_brake":
return 1000;

case "alcohol_low":
return 2000;

case "drowsy":
return 3000;

case "harsh_driving":
return 3000;

case "alcohol_high":
return 5000;

default:
return 500;
}
}

// mail transporter
const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS
}
});

// root
app.get("/", (req,res)=>{
res.send("SAFEWAY Vehicle Blackbox Server Running");
});

// log violations
app.get("/log",(req,res)=>{
res.json(readData());
});

// test violation
app.get("/testViolation",(req,res)=>{

const violations = readData();

const v = {
id: Date.now(),
vehicleNo: "KL07AB1234",
ownerName: "Test Owner",
mobile: "9999999999",
violationType: "seatbelt",
score: getScore("seatbelt"),
fine: getFine("seatbelt"),
time: new Date(),
imageUrl: "/uploads/sample.jpg",
status: "pending"
};

violations.push(v);
saveData(violations);

res.json({message:"Test violation added",data:v});
});

// upload violation from ESP
app.post("/upload", upload.single("image"), async (req,res)=>{

try{

const {
vehicleNo,
ownerName,
mobile,
violationType
} = req.body;

const score = getScore(violationType);
const fine = getFine(violationType);

const violations = readData();

const v = {

id: Date.now(),
vehicleNo,
ownerName,
mobile,
violationType,
score,
fine,
time: new Date(),
imageUrl: "/uploads/" + req.file.filename,
status: "pending"

};

violations.push(v);

saveData(violations);

// auto challan if score >=5
if(score >=5){

const challan = {

vehicleNo,
ownerName,
mobile,
violationType,
fine,
date: new Date()

};

const challanFile =
"challan_" + Date.now() + ".json";

fs.writeFileSync(
path.join(challanDir, challanFile),
JSON.stringify(challan,null,2)
);

// send mail

await transporter.sendMail({

from: process.env.EMAIL_USER,
to: process.env.ALERT_EMAIL,
subject: "Traffic Violation Detected",

text: `
Vehicle : ${vehicleNo}

Owner : ${ownerName}

Violation : ${violationType}

Fine : ₹${fine}

Your challan has been generated.
`

});

}

res.json({
status:"ok",
violation:v
});

}catch(err){

res.status(500).json({
error:err.message
});

}

});

// server
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
console.log("Server running on port",PORT);
});