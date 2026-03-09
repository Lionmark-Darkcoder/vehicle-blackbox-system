const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// folders
const DATA_FILE = "./data/violations.json";
const UPLOAD_DIR = "./uploads";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// static files
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static("public"));

// upload setup
const storage = multer.diskStorage({
 destination: function(req,file,cb){
  cb(null,UPLOAD_DIR);
 },
 filename: function(req,file,cb){
  cb(null,Date.now()+path.extname(file.originalname));
 }
});

const upload = multer({ storage: storage });

// helper functions
function readData(){
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data){
 fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));
}

// scoring system
function getScore(type){

 if(type==="seatbelt") return 1;
 if(type==="doorOpen") return 1;

 if(type==="harshBraking") return 3;
 if(type==="alcoholLow") return 3;

 if(type==="alcoholHigh") return 5;
 if(type==="drowsyDriving") return 5;
 if(type==="harshDriving") return 5;

 if(type==="accident") return 5;
 if(type==="collision") return 5;

 return 1;
}

// fine system
function getFine(type){

 if(type==="seatbelt") return 500;
 if(type==="doorOpen") return 500;

 if(type==="harshBraking") return 1000;
 if(type==="alcoholLow") return 2000;

 if(type==="alcoholHigh") return 5000;
 if(type==="drowsyDriving") return 5000;
 if(type==="harshDriving") return 5000;

 if(type==="accident") return 0;
 if(type==="collision") return 0;

 return 500;
}

// home route
app.get("/",(req,res)=>{
 res.send("SAFEWAY Vehicle Blackbox Server Running");
});

// get logs
app.get("/log",(req,res)=>{
 res.json(readData());
});

// add violation
app.post("/violation",upload.single("image"),(req,res)=>{

 try{

  const violations = readData();

  const type = req.body.type || "seatbelt";

  const imagePath = req.file ? "/uploads/"+req.file.filename : "";

  const v = {

   id: Date.now(),
   vehicleNo: req.body.vehicleNo || "KL07AB1234",
   ownerName: "Vehicle Owner",
   mobile: "9999999999",

   violationType: type,
   score: getScore(type),
   fine: getFine(type),

   lat: req.body.lat || "",
   lng: req.body.lng || "",

   time: new Date(),
   imageUrl: imagePath,

   status: "pending"

  };

  violations.push(v);
  saveData(violations);

  res.json({
   success:true,
   violation:v
  });

 }
 catch(err){

  res.status(500).json({
   error:err.message
  });

 }

});

// test route
app.get("/testViolation",(req,res)=>{

 const violations = readData();

 const v = {

  id: Date.now(),
  vehicleNo:"KL07AB1234",
  ownerName:"Test Owner",
  mobile:"9999999999",

  violationType:"seatbelt",
  score:1,
  fine:500,

  time:new Date(),
  imageUrl:"",

  status:"pending"

 };

 violations.push(v);
 saveData(violations);

 res.json({
  message:"Test violation added",
  data:v
 });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
 console.log("Server running on port",PORT);
});