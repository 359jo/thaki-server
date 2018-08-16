const express = require('express');
const bodyParser = require("body-parser")
const app = express();
const db = require("./DataBase/index.mongo")
const bcrypt = require("bcrypt")
const S3FS = require('s3fs');
const fs = require('fs')
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
// ----------------GLOBAL VARIABLES---------------------
const SALT_ROUNDS = 10
// var bucketPath = 'ADMIN_TEST_BUCKET';
// var s3Options = {
//   AccessKeyID: "AKIAIHRFUSIRJG3JGBLQ",
//   SecretAccessKey: "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"
// };
// const fsImpl = new S3FS(bucketPath, s3Options);
// fsImpl.create()
// -----------------------------------------------------
app.get("/", (req, res) => {
  res.send("get at path '/' ")
})
// cridential APIs
// -------------------------------ADD ADMIN API------------------------------------------------------------------
app.post("/api/v1/addAdmin", (req, res) => {
  bcrypt.hash(req.body.password, SALT_ROUNDS, (err, hash) => {
    if (hash) {
      var admin = new db.Admin({
        username: req.body.username,
        password: hash
      })
      admin.save((err, data) => {
        if (err) {
          res.send("Error while saving Admin Please try once more")
        }
        else {
          console.log("saved");
          res.send(`Admin saved with credintials ${data.username} and password "${req.body.password}"`)
        }
      })
    }
    else {
      res.send(err)
    }
  })

})
// --------------------------------LOGIN API-------------------------------------------
app.post("api/v1/login", (req, res) => {
  console.log("login");
  db.Admin.find({ username: req.body.username }, (err, data) => {
    if (err) {
      res.send("Error while finding Admin" + req.body.username)
    }
    else {
      bcrypt.compare(req.body.password, data.password, (err, Match) => {
        if (Match)
          res.send("Uthorized login Wlecome " + req.body.username)
        else
          res.send("password doesn't match")
      })
    }
  })
})

// ------------------------------------ADMIN ANALYTICS API---------------------------------------
app.get("/api/v1/analytics/admins", (req, res) => {
  db.Admin.find({}, (err, data) => {
    if (err)
      res.send("error while fetching the data")
    else
      res.send({
        Admins: data.length
      })
  })
})

// upload apis
// app.post("api/v1/upload", (req, res) => {
//   const FILE = req.files.file
//   const STREAM = fs.createReadStream(FILE.path)
//   fsImpl.writeFile(FILE.originalFilename, STREAM).then(function () {
//     fs.unlink(FILE.path, function (err) {
//       if (err) {
//         console.log("ERROR in save to s3 Bucket");
//       } else {
//         res.send("File Saved")
//       }
//     })
//   });
// })

// connect to development port 3000
const PORT = 3000 || process.env.PORT
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})