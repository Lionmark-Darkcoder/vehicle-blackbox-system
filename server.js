const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- STORAGE ---------------- */

const DATA_FILE = "./data/violations.json";
const UPLOAD_DIR = "./uploads";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

/* IMPORTANT: serve uploaded images */
app.use("/uploads", express.static(UPLOAD_DIR));

/* serve dashboard */
app.use(express.static("public"));

/* ---------------- FILE UPLOAD ---------------- */

const storage = multer.diskStorage({
 destination: (req,file,cb)=> cb(null,UPLOAD_DIR),

 filename: (req,file,cb)=> cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

/* ---------------- DATA HELPERS ---------------- */

function readData(){
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data){
 fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

/* ---------------- VIOLATION RULES ---------------- */

const rules = {

 seatbelt: { score:1, fine:500 },
 doorOpen: { score:1, fine:500 },

 signalJump: { score:3, fine:1000 },
 overspeed: { score:3, fine:1500 },
 harshBraking: { score:3, fine:1000 },

 alcoholLow: { score:4, fine:2000 },

 alcoholHigh: { score:5, fine:10000 },
 drowsyDriving: { score:5, fine:5000 },
 harshDriving: { score:5, fine:5000 },

 collision: { score:5, fine:0 },
 accident: { score:5, fine:0 }

};

function getScore(type){
 return rules[type]?.score || 1;
}

function getFine(type){
 return rules[type]?.fine || 0;
}

/* ---------------- REALTIME EVENTS ---------------- */

let clients = [];

app.get("/events",(req,res)=>{

 res.set({
  "Content-Type":"text/event-stream",
  "Cache-Control":"no-cache",
  "Connection":"keep-alive"
 });

 res.flushHeaders();

 clients.push(res);

 req.on("close",()=>{
  clients = clients.filter(c => c !== res);
 });

});

function broadcast(data){
 clients.forEach(c=>{
  c.write(`data: ${JSON.stringify(data)}\n\n`);
 });
}

/* ---------------- ROOT ---------------- */

app.get("/",(req,res)=>{
 res.send("SAFEWAY Vehicle Blackbox Server Running");
});

/* ---------------- GET LOG ---------------- */

app.get("/log",(req,res)=>{

 const data = readData();

 const now = Date.now();

 const filtered = data.filter(v=>{
  const diff = now - new Date(v.dateTime).getTime();
  return diff < 12 * 60 * 60 * 1000;
 });

 saveData(filtered);

 res.json(filtered);

});

/* ---------------- CAMERA STREAM INFO ---------------- */

app.get("/camera",(req,res)=>{

 res.json({

  insideCam:"http://ESP_CAM_INSIDE_IP/stream",
  outsideCam:"http://ESP_CAM_OUTSIDE_IP/stream"

 });

});

/* ---------------- ADD VIOLATION ---------------- */

app.post("/violation", upload.single("image"), (req,res)=>{

 try{

  console.log("FILE:",req.file);
  console.log("BODY:",req.body);

  const violations = readData();

  const type = req.body.type || "seatbelt";
  const vehicleNo = req.body.vehicleNo || "KL59AB1234";

  let imagePath = "";

  if(req.file){
   imagePath = "/uploads/" + req.file.filename;
  }

  const score = getScore(type);
  const fine = getFine(type);

  const isEmergency = (type === "accident" || type === "collision");

  const v = {

   id: Date.now(),

   vehicleNo,
   ownerName:"Mark",
   mobile:"+91 8520649127",

   violationType:type,

   score,
   fine,

   emergency:isEmergency,

   lat:req.body.lat || "",
   lng:req.body.lng || "",

   /* FIXED DATE FIELD */
   dateTime:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),

   imageUrl:imagePath,

   status:"pending"

  };

  violations.push(v);

  /* ---------------- CHALLAN LOGIC ---------------- */

  const vehicleViolations = violations.filter(
   x => x.vehicleNo === vehicleNo && x.status === "pending"
  );

  const totalScore = vehicleViolations.reduce(
   (sum,v)=> sum + Number(v.score || 0) , 0
  );

  const challanExists = vehicleViolations.some(v => v.challan === true);

  if(totalScore >= 5 && !challanExists){

   vehicleViolations.forEach(v=>{
    v.challan = true;
   });

  }

  saveData(violations);

  broadcast(v);

  res.json({
   success:true,
   violation:v
  });

 }
 catch(err){

  console.log(err);

  res.status(500).json({
   error:err.message
  });

 }

});

/* ---------------- TEST VIOLATION ---------------- */

app.get("/testViolation",(req,res)=>{

 const violations = readData();

 const v = {

  id: Date.now(),

  vehicleNo:"KL59AB1234",
  ownerName:"Mark",
  mobile:"+91 8520649127",

  violationType:"seatbelt",

  score:1,
  fine:500,

  emergency:false,

  lat:"11.2588",
  lng:"75.7804",

  dateTime:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),

  imageUrl:"",

  status:"pending"

 };

 violations.push(v);

 saveData(violations);

 broadcast(v);

 res.json({
  message:"Test violation added",
  data:v
 });

});

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
 console.log("Server running on port",PORT);
});