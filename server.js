const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const cors = require("cors")

const app = express()

const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

/* FOLDERS */

const DATA_FILE = path.join(__dirname,"data","violations.json")
const UPLOAD_DIR = path.join(__dirname,"uploads")
const CHALLAN_DIR = path.join(__dirname,"challans")

if(!fs.existsSync("data")) fs.mkdirSync("data")
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR)
if(!fs.existsSync(CHALLAN_DIR)) fs.mkdirSync(CHALLAN_DIR)
if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE,"[]")

/* MULTER */

const storage = multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,UPLOAD_DIR)

},

filename:(req,file,cb)=>{

cb(null,Date.now()+"_"+file.originalname)

}

})

const upload = multer({storage:storage})

/* CAMERA IP */

let cameraIP = ""

/* UPDATE CAMERA IP */

app.post("/camera-ip",(req,res)=>{

cameraIP = req.body.ip

console.log("Camera IP Updated:",cameraIP)

res.json({status:"ok"})

})

/* STREAM URL */

app.get("/stream",(req,res)=>{

res.json({

stream:`http://${cameraIP}/stream`

})

})

/* READ DATA */

function readData(){

return JSON.parse(fs.readFileSync(DATA_FILE))

}

/* WRITE DATA */

function writeData(data){

fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2))

}

/* GET TIME */

function getTime(){

return new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})

}

/* VIOLATION API */

app.post("/violation",upload.single("image"),(req,res)=>{

let violations = readData()

const type = req.headers["violation-type"] || "Unknown"

const evidence = req.file ? req.file.filename : null

const score = violations.length + 1

const violation = {

vehicle:"KL59AB1234",
type:type,
score:score,
time:getTime(),
evidence:evidence

}

violations.push(violation)

writeData(violations)

console.log("Violation:",violation)

res.json({

status:"logged",
score:score

})

})

/* GET VIOLATIONS */

app.get("/violations",(req,res)=>{

res.json(readData())

})

/* SCORE */

app.get("/score",(req,res)=>{

const data = readData()

res.json({

score:data.length

})

})

app.listen(PORT,()=>{

console.log("Server running on",PORT)

})