const express = require('express');
const bodyParser = require("body-parser");
const exec = require('child_process').exec;
const app = express();
const fs = require('fs');
const AWS = require('aws-sdk')
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');
const session = require("express-session");

// ------------------------------------------MIDDLE_WARES-----------------------------------------
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


var monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var monthsAr = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];


// For dev purposes only

AWS.config.update({

  accessKeyId: '',
  secretAccessKey: '',
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
      res.send(ADMIN)
    })
  } else {
    res.send("password doesn't match")
  }
})


// ----------------------------AWS APIs-------------------------------------

app.post("/api/v1/upload", upload.single('selectedFile'), (req, res) => {
  const FILE = req.file;
  // read the uploaded file from the admins
  fs.readFile(FILE.path, (err, data) => {
    if (err) { throw err; }
    // convert to 64base data
    var base64data = new Buffer(data, 'binary');
    // upload object to was s3 bucket

    s3.putObject({
      Bucket: BUCKET,
      Delimiter: '/Test',
      Key: FILE.originalname,
      Body: base64data,
      ACL: 'public-read'
    }, (resp) => {
      console.log('Successfully uploaded package.');
      res.send("File Saved!");
    });
  });
});



app.post('/api/v1/get/object', (req, res) => {
  const { fileName } = req.body;
  // find object with the same neame provideed by the client or admin
  s3.getObject({
    Bucket: BUCKET,
    Key: fileName,
  }, (err, data) => {
    if (err) { throw err; }
    // send data to the client and the download url
    res.json({ data, objectSize: data.ContentLength, url: `https://s3.${REGION}.amazonaws.com/${BUCKET}/${fileName}` });
  });
});



app.get('/api/v1/get/all/objects', (req, res) => {
  // find all objects in aws s3 bucket
  s3.listObjects({
    Bucket: BUCKET,
    Prefix: "Test"
  }, (err, { Contents }) => {
    if (err) {
      console.log(err);
    }

    res.send({ Contents })
  })
})

app.get("/api/v1/analytics/downloads", (req, res) => {
  s3.listObjectsV2({
    Bucket: BUCKET,
    Prefix: "/"
  }, (err, data) => {
    if (err) { throw err }
    res.send(data)
  })
})

app.post('/api/v1/analytics/monthly/col', (req, res) => {
  s3.listObjectsV2({
    Bucket: BUCKET,
    Prefix: "logs/",
  }, (err, { Contents }) => {
    if (err) { throw err }
    else {
      const resObj = { en: [], ar: [] }

      const obj = {
        en: {
          January: 0,
          February: 0,
          March: 0,
          April: 0,
          May: 0,
          June: 0,
          July: 0,
          August: 0,
          September: 0,
          October: 0,
          November: 0,
          December: 0
        },
        ar: {
          يناير: 0,
          فبراير: 0,
          مارس: 0,
          إبريل: 0,
          مايو: 0,
          يونيو: 0,
          يوليو: 0,
          أغسطس: 0,
          سبتمبر: 0,
          أكتوبر: 0,
          نوفمبر: 0,
          ديسمبر: 0
        }
      }
      for (let i = 0; i < Contents.length; i++) {
        const dateArr = Contents[i]["Key"].split("s")[1].split("-")
        const monthEn = monthsEn[parseInt(dateArr[1]) - 1]
        const monthAr = monthsAr[parseInt(dateArr[1] - 1)]
        obj.en[monthEn]++
        obj.ar[monthAr]++
      }

      for (let key in obj.en) {
        resObj.en.push([key, obj.en[key]])
      }

      for (let key in obj.ar) {
        resObj.ar.push([key, obj.ar[key]])
      }
      res.send(resObj)
    }
  })

})




const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
})

// zainzinc079079


// coments for usage forward-------------------------------------------------------------------------------------------------


/*
const distFolderPath = path.join(__dirname, config.folderPath);

// get of list of files from 'dist' directory
fs.readdir(distFolderPath, (err, files) => {

  if(!files || files.length === 0) {
    console.log(`provided folder '${distFolderPath}' is empty or does not exist.`);
    console.log('Make sure your project was compiled!');
    return;
  }

  // for each file in the directory
  for (const fileName of files) {

    // get the full path of the file
    const filePath = path.join(distFolderPath, fileName);
    
    // ignore if directory
    if (fs.lstatSync(filePath).isDirectory()) {
      continue;
    }

    // read file contents
    fs.readFile(filePath, (error, fileContent) => {
      // if unable to read file contents, throw exception
      if (error) { throw error; }

      // upload file to S3
      s3.putObject({
        Bucket: config.s3BucketName,
        Key: fileName,
        Body: fileContent
      }, (res) => {
        console.log(`Successfully uploaded '${fileName}'!`);
      });

    });
  }
});
*/
