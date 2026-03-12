const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// folders
const DATA_FILE = "./data/violations.json";
const UPLOAD_DIR = "./uploads";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// serve files
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static("public"));

function readData(){
 return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data){
 fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

// ROOT
app.get("/",(req,res)=>{
 res.send("Vehicle Blackbox Server Running");
});

// GET LOG
app.get("/log",(req,res)=>{
 const data = readData();
 res.json(data);
});

// ADD VIOLATION
app.post("/violation",(req,res)=>{

 const chunks=[];

 req.on("data",(chunk)=>{
  chunks.push(chunk);
 });

 req.on("end",()=>{

  const buffer = Buffer.concat(chunks);

  const filename = Date.now()+".jpg";
  const filepath = path.join(UPLOAD_DIR,filename);

  fs.writeFileSync(filepath,buffer);

  const violations = readData();

  const v = {

   id:Date.now(),

   vehicleNo:"KL59AB1234",

   violationType:"seatbelt",

   time:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),

   imageUrl:"/uploads/"+filename

  };

  violations.push(v);

  saveData(violations);

  res.json({
   success:true,
   violation:v
  });

 });

});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
 console.log("Server running on port",PORT);
});