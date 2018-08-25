const express = require('express');
const bodyParser = require("body-parser")
const app = express();
// const shell = require("shelljs")
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
// const multipleUpload = multer({storage}).array('file')

const SALT_ROUNDS = 10
// For dev purposes only
AWS.config.update({
  accessKeyId: 'AKIAIR2SUDEWJCYE555Q',
  secretAccessKey: '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',
});
const s3 = new AWS.S3();
const BUCKET = 'admin-upload-test'
const REGION = 'us-east-2'
const ADMIN = {
  email: "Admin@thaki.org",
  password: 'admin'
}


// -----------------------------------------------------
app.get("/", (req, res) => {
  res.send("get at path '/' ")
})
// cridential APIs
// -------------------------------ADD ADMIN API------------------------------------------------------------------
app.post("/api/v1/addAdmin", (req, res) => {
  console.log(req.body)
  db.Admin.find({ email: req.body.email }, (err, data) => {
    if (err) {
      res.send(`error while finding ${req.body.email}`)
    } else if (data) {
      res.send(`admin ${req.body.email} already exists`)
    }
    bcrypt.hash(req.body.password, SALT_ROUNDS, (err, hash) => {
      if (err) {
        console.log(err)
      } else {
        const admin = new db.Admin({
          email: req.body.email,
          password: hash
        })
        admin.save((err, data) => {
          if (err) {
            res.send(`error while savind admin ${req.body.email}`)
          } else {
            console.log(data);
          }
        })
      }
    })
  })
})
// --------------------------------LOGIN API-------------------------------------------
app.post("/api/v1/login", (req, res) => {
  // console.log(req.body);
  if (req.body.email === ADMIN.email && req.body.password === ADMIN.password) {
    res.send(ADMIN)
  } else {
    db.Admin.findOne({ email: req.body.email }, (err, data) => {
      console.log(data);
      if (err) {
        res.send("Error while finding Admin " + req.body.email)
      }
      else if (data) {
        bcrypt.compare(req.body.password, data.password, (err, match) => {
          console.log(match);
          if (match) {
            res.send(data)
          }
          else {
            res.send("password doesn't match")
          }
        })
      } else {
        res.sendStatus(401)
      }
    })
  }
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

// ----------------------------AWS APIs-------------------------------------

app.post("/api/v1/upload", upload.single('selectedFile'), (req, res) => {
  const FILE = req.file
  fs.readFile(FILE.path, (err, data) => {
    if (err) { throw err; }
    var base64data = new Buffer(data, 'binary');
    s3.putObject({
      Bucket: BUCKET,
      Key: FILE.originalname,
      Body: base64data,
      ACL: 'public-read'
    }, (resp) => {
      console.log('Successfully uploaded package.');
      console.log(arguments);

      res.send("File Saved!")
    });
  })
})

app.post('/api/v1/get/object', (req, res) => {
  const { fileName } = req.body
  s3.getObject({
    Bucket: BUCKET,
    Key: fileName,
  }, (err, data) => {
    if (err) { throw err }
    console.log('data from aws');
    console.log(data);
    res.json({ data: data, url: `https://s3.${REGION}.amazonaws.com/${BUCKET}/${fileName}` })
  })
})


app.get('/api/v1/get/all/objects', (req, res) => {
  s3.listObjects({
    Bucket: BUCKET,
  }, (err, data) => {
    if (err) {
      console.log(err);
    }
    res.send(data.Contents)
  })
})


const PORT = 3000 || process.env.PORT
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})

