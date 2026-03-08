const express = require("express")
const cors = require("cors")
const multer = require("multer")
const fs = require("fs")
const PDFDocument = require("pdfkit")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/uploads", express.static("uploads"))
app.use("/challans", express.static("challans"))

const storage = multer.diskStorage({
 destination: "uploads/",
 filename: (req,file,cb)=>{
  cb(null,Date.now()+"_"+file.originalname)
 }
})

const upload = multer({storage})

const DB_FILE = "data/violations.json"

function loadDB(){
 return JSON.parse(fs.readFileSync(DB_FILE))
}

function saveDB(data){
 fs.writeFileSync(DB_FILE,JSON.stringify(data,null,2))
}

function generateChallan(vehicle){
 const doc = new PDFDocument()

 const file = `challans/challan_${Date.now()}.pdf`

 doc.pipe(fs.createWriteStream(file))

 doc.fontSize(20).text("Motor Vehicle Department",{align:"center"})
 doc.moveDown()

 doc.text("Vehicle No: "+vehicle.vehicleNo)
 doc.text("Owner: "+vehicle.ownerName)
 doc.text("Mobile: "+vehicle.mobile)

 doc.moveDown()

 let total=0

 vehicle.violations.forEach(v=>{
  doc.text(`${v.type} | ₹${v.amount} | ${v.time}`)
  total+=v.amount
 })

 doc.moveDown()
 doc.text("Total Fine: ₹"+total)

 doc.end()

 return file
}

app.post("/upload", upload.single("image"), (req,res)=>{

 const {vehicleNo,ownerName,mobile,violationType} = req.body

 const db = loadDB()

 const score = db.scores[violationType] || 1
 const fine = db.fine[violationType] || 100

 const violation = {
  vehicleNo,
  ownerName,
  mobile,
  type:violationType,
  score,
  amount:fine,
  time:new Date().toISOString(),
  image:`/uploads/${req.file.filename}`
 }

 db.violations.push(violation)

 saveDB(db)

 res.json({status:"logged",violation})

})

app.get("/log",(req,res)=>{
 const db = loadDB()
 res.json(db.violations)
})

app.listen(process.env.PORT || 10000,()=>{
 console.log("Server running")
})