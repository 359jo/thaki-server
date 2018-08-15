const express = require('express');
const bodyParser = require("body-parser")
const app = express();
const db = require("./DataBase/index.mongo")
const bcrypt = require("bcrypt")
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// cridential APIs
app.get("/", (req, res) => {
  res.send("get at path '/' ")
})

app.post("/api/v1/addAdmin", (req, res) => {
  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (err)
      res.sendStatus(500)
    else
      var admin = db.Admin({
        username: req.body.username,
        password: req.body.password
      })
    admin.save((err, data) => {
      if (err)
        res.send(403, "Error while saving Admin Please try once more")
      else
        res.send(201, `Admin saved with credintials ${req.body.username} and password ${"*******"}`)
    })
  })

})

app.post("api/v1/login", (req, res) => {
 db.Admin.find({username:req.body.username},(err,data)=>{
   if(err)
   res.sendStatus(500)
   else
   bcrypt.compare(data.password,req.body.password,(err,Match)=>{
     if(err)
     res.send("password dont match")
     else
     res.send(200,"uthorized login Wlecome "+req.body.username)
   })
 })
})

app.get("/api/v1/analytics/admins", (req, res) => {
  db.Admin.find({},(err,data)=>{
    if(err)
    res.send(403,"error while fetching the data")
    else
    res.send(data.length)
  })
})

// upload apis
app.post("api/v1/upload", (req, res) => {
  // some s3fs logic
})

// connect to development port 3000
const PORT = 3000 || process.env.PORT
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})