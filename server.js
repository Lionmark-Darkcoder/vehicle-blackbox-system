const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

/* expose folders */

app.use("/uploads", express.static(path.join(__dirname,"uploads")));
app.use("/challans", express.static(path.join(__dirname,"challans")));

/* create folders */

["uploads","challans","data"].forEach(folder=>{
if(!fs.existsSync(folder)){
fs.mkdirSync(folder);
}
});

/* database */

const DB_FILE="data/violations.json";

if(!fs.existsSync(DB_FILE)){
fs.writeFileSync(DB_FILE,JSON.stringify({violations:[]},null,2));
}

function readDB(){
return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data){
fs.writeFileSync(DB_FILE,JSON.stringify(data,null,2));
}

/* violation scoring */

const violationScores={
seatbelt:1,
dooropen:1,
alcohol_low:3,
harshbrake:3,
overspeed:3,
alcohol_high:5,
rashdriving:5,
drowsy:5
};

/* multer upload */

const storage=multer.diskStorage({

destination:function(req,file,cb){
cb(null,"uploads/");
},

filename:function(req,file,cb){
cb(null,Date.now()+path.extname(file.originalname));
}

});

const upload=multer({storage:storage});

/* mail system */

const transporter=nodemailer.createTransport({

service:"gmail",

auth:{
user:"yourmail@gmail.com",
pass:"your_app_password"
}

});

/* home */

app.get("/",(req,res)=>{

res.send("SAFEWAY Vehicle Blackbox Server Running");

});

/* fetch violations */

app.get("/log",(req,res)=>{

const db=readDB();

res.json(db.violations);

});

/* upload violation */

app.post("/upload",upload.single("image"),(req,res)=>{

const db=readDB();

const {
vehicleNo,
ownerName,
mobile,
ownerEmail,
violationType
}=req.body;

const score=violationScores[violationType]||1;

const violation={

id:Date.now(),

vehicleNo,

ownerName,

mobile,

ownerEmail,

violationType,

score,

time:new Date(),

image:req.file?"/uploads/"+req.file.filename:null

};

db.violations.push(violation);

/* check last 12 hours */

const twelveHoursAgo=Date.now()-(126060*1000);

const recent=db.violations.filter(v=>

v.vehicleNo===vehicleNo &&
new Date(v.time).getTime()>twelveHoursAgo

);

let totalScore=0;

recent.forEach(v=>{

totalScore+=v.score;

});

/* challan trigger */

if(totalScore>=5){

const challanName="challan_"+Date.now()+".txt";

const challanContent=`

SAFEWAY TRAFFIC VIOLATION CHALLAN

Vehicle No: ${vehicleNo}
Owner: ${ownerName}
Mobile: ${mobile}

Violations:

${recent.map(v=>

v.violationType+
" | Score:"+v.score+
" | "+v.time

).join("\n")}

Total Score: ${totalScore}

Fine Amount: ₹2000

Status: Multiple Violations
Reported By SAFEWAY Smart Transport System

`;

fs.writeFileSync("challans/"+challanName,challanContent);

violation.challan="/challans/"+challanName;

violation.status="Challan Generated";

/* send email */

if(ownerEmail){

transporter.sendMail({

from:"yourmail@gmail.com",

to:ownerEmail,

subject:"Traffic Violation Alert",

text:`

Multiple violations detected.

Vehicle: ${vehicleNo}

A challan has been generated.

Please check the attachment or visit dashboard.
`,

attachments:[

 {
  filename:challanName,
  path:path.join(__dirname,"challans",challanName)
 }

]

});

}

}

saveDB(db);

res.json({

message:"Violation Logged",

popup:true,

violation

});

});

/* fake payment */

app.post("/pay/:id",(req,res)=>{

const db=readDB();

const violation=db.violations.find(v=>v.id==req.params.id);

if(violation){

violation.payment="PAID";

}

saveDB(db);

res.json({

message:"Payment Successful"

});

});

/* start server */

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{

console.log("SAFEWAY Server Running on "+PORT);

});