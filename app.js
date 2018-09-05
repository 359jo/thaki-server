const express = require('express');
const bodyParser = require("body-parser")
const app = express();
const fs = require('fs');
const AWS = require('aws-sdk')
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');
const session = require("express-session");
// ------------------------------------------MIDDLE_WARES-----------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(session({
  secret: "thaki",
  resave: true,
  saveUninitialized: true
}))

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



// For dev purposes only
AWS.config.update({
  accessKeyId: 'AKIAIT2B6GC2D2PU7AJQ',
  secretAccessKey: '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',
});
AWS.config.logger = console;
const s3 = new AWS.S3();
const BUCKET = 'admin-upload'
const REGION = 'us-east-2'

const ADMIN = {
  email: "Admin@thaki.org",
  password: "admin"
}


// -----------------------------------------------------
app.get("/", (req, res) => {
  s3.listObjects({
    Bucket: BUCKET,
  }, (err, data) => {
    if (err) {
      console.log(err);
    }
    res.send(data.Contents)
  })
})
// cridential APIs
// --------------------------------LOGIN API-------------------------------------------
app.post("/api/v1/login", (req, res) => {

  if (req.body.email === ADMIN.email && req.body.password === ADMIN.password) {
    req.session.regenerate(() => {
      req.session.user = ADMIN.email
      console.log(req.session);
      res.send(ADMIN)
    })
  } else {
    res.send("password doesn't match")
  }
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
      res.send("File Saved!");
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
  }, (err, { Contents }) => {
    if (err) {
      console.log(err);
    }
    res.send({ ...Contents })
  })
})



app.post('/api/v1/analytics/pie', (req, res) => {
  s3.listObjectsV2({
    Bucket: BUCKET,
    Prefix: "/",
  }, (err, { Contents }) => {
    if (err) { throw err }
    else{
      console.log(Contents);
      const resArrEn = []
      const resArrAR = []
      res.send(Contents)
      for (let i = 0; i < Contents.length; i++) {
        const date = Contents[i]["Key"].split("s")[1].split("-")
        console.log(date);
        
      }
    }
    
  })
  // res.send({
  //   en: [
  //     ["Successful Downloads", 44],
  //     ["Paused Downloads", 23],
  //     ["Failed Downloads", 12]
  //   ], ar: [
  //     ["التحميلات الناجحة", 44],
  //     ["التحميلات الموقفة", 23],
  //     ["التحميلات الفاشلة", 12]
  //   ]
  // })
})




const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})

// zainzinc079079

