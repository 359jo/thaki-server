const express = require('express');
const bodyParser = require("body-parser")
const app = express();
const shell = require("shelljs")
const fs = require('fs');
const db = require("./DataBase/index.mongo")
const bcrypt = require("bcrypt")
const AWS = require('aws-sdk')
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');
// ------------------------------------------MIDDLE_WARES-----------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// ----------------GLOBAL VARIABLES---------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    /*
      Files will be saved in the 'uploads' directory. Make
      sure this directory already exists!
    */
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    /*
      uuidv4() will generate a random ID that we'll use for the
      new filename. We use path.extname() to get
      the extension from the original file name and add that to the new
      generated ID. These combined will create the file name used
      to save the file on the server and will be available as
      req.file.pathname in the router handler.
    */
    const newFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, newFilename);
  },
});
// create the multer instance that will be used to upload/save the file
const upload = multer({ storage });

const SALT_ROUNDS = 10
// For dev purposes only
AWS.config.update({
  accessKeyId: 'AKIAIR2SUDEWJCYE555Q',
  secretAccessKey: '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',
});
var s3 = new AWS.S3();
// -----------------------------------------------------
app.get("/", (req, res) => {
  res.send("get at path '/' ")
})
// cridential APIs
// -------------------------------ADD ADMIN API------------------------------------------------------------------
app.post("/api/v1/addAdmin", (req, res) => {
  console.log(req.body);

  bcrypt.genSalt(SALT_ROUNDS, function (err, salt) {
    if (err) {
      throw err
    }
    bcrypt.hash(req.body.password, salt, (err, hash) => {
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
            res.send(`Admin saved with credintials ${data.username} and password "${hash}"`)
          }
        })
      }
      else {
        res.send(err)
      }
    });
  });
})
// --------------------------------LOGIN API-------------------------------------------
app.post("/api/v1/login", (req, res) => {
  // console.log(req.body);
  db.Admin.find({ username: req.body.username }, (err, data) => {
    if (err) {
      res.send("Error while finding Admin " + req.body.username)
    }
    else {
      bcrypt.compare(req.body.password, data.password, (err, match) => {
        if (match)
          res.send(data)
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
      res.send(`${data.length}`)
  })
})

// upload APIs

app.post("/api/v1/upload", upload.single('selectedFile'), (req, res) => {
  const FILE = req.file

  fs.readFile(FILE.path, (err, data) => {
    if (err) { throw err; }
    var base64data = new Buffer(data, 'binary');
    s3.putObject({
      Bucket: 'admin-upload-test',
      Key: FILE.originalname,
      Body: base64data,
      ACL: 'public-read'
    }, (err, data) => {
      console.log('Successfully uploaded package.', data.Location);
      res.send("File Saved")
    });
  })



})

app.post('/api/v1/get/object', (req, res) => {
  const {fileName } = req.body
  s3.getObject({
    Bucket: 'admin-upload-test',
    Key: fileName,
  },(err,data)=>{
    if(err){throw err}
    console.log('data from aws');
    console.log(data);
    res.send(data)
  })
})
app.get('/api/v1/get/all/objects', (req, res) => {
  s3.listObjects({
    Bucket: 'admin-upload-test',
  }, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.log('data from aws');
    console.log(data);
    res.send(data.Contents)
  })
})


const PORT = 3000 || process.env.PORT
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})