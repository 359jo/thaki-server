const express = require('express');
const bodyParser = require("body-parser");
const exec = require('child_process').exec;
const app = express();
const morgan = require("morgan");
const fs = require('fs');
const db = require("./DataBase/index.mongo");
const bcrypt = require("bcrypt");
const AWS = require('aws-sdk');
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');
app.use(morgan('combined'));

// ------------------------------------------MIDDLE_WARES-----------------------------------------
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json());
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

const SALT_ROUNDS = 10;

// For dev purposes only

AWS.config.update({
  accessKeyId: 'AKIAIR2SUDEWJCYE555Q',
  secretAccessKey: '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',
});

const s3 = new AWS.S3();
const BUCKET = 'admin-upload-test';
const REGION = 'us-east-2';

const ADMIN = {
  email: "Admin@thaki.org",
  password: 'admin'
};


// -----------------------------------------------------
app.get("/", (req, res) => {
  res.send("get at path '/' ")
});
// cridential APIs
// ------------------------------- ADMIN API------------------------------------------------------------------
app.post("/api/v1/addAdmin", (req, res) => {
  const { email, password } = req.body;
  //find all admins in db
  db.Admin.find({ email: email }, (err, data) => {
    if (err) {
      //handle error
      res.send(`error while finding ${email}`);
    } else if (data.length > 0) {
      //check if an admin with the same credintial already exists
      res.send(`admin ${email} already exists`);
    }
    //if no admin found hash password and store in db
    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
      if (err) {
        // handle error
        console.log(err);
      } else {
        // create admin with password hashed
        const admin = new db.Admin({
          email: email,
          password: hash
        });
        // save admin in db
        admin.save((err, data) => {
          if (err) {
            res.send(`error while savind admin ${email}`);
          } else {
            console.log(data);
            res.send(` Admin ${email} has been saved`);
          };
        });
      };
    });
  });
});



app.post("/api/v1/login", (req, res) => {
  const { email, password } = req.body;
  // check if the credintials belong to the super admin
  if (email === ADMIN.email && password === ADMIN.password) {
    // authinticate and grant access
    res.send(ADMIN);
  } else {
    // check if the admin trying to log in is regesterd
    db.Admin.findOne({ email: email }, (err, data) => {
      console.log(data);
      if (err) {
        // handle error
        res.send("Error while finding Admin " + email);
      }
      // check if admin exists
      // if not
      else if (!data) {
        //admin does not exists
        res.send(`Admin ${email} does not exist`);
      }
      //admin exists
      else {
        // compare password to authintcate
        bcrypt.compare(password, data.password, (err, match) => {
          console.log(match);
          console.log(err);
          // if the password matches the password in te db
          //grant access
          if (match) {
            res.send(data);
          }
          else {
            res.send("password doesn't match");
          };
        });
      };
    });
  };
});


app.post("/api/v1/delete/admin", (req, res) => {
  const { id } = req.body;
  console.log(req.body);
  // find admin with the same id and delete from the db
  db.Admin.findOneAndRemove({ _id: id }, (err, data) => {
    if (err) {
      // handle error
      res.send(`Error while deleting admin ${data.email}`);
    }
    res.send(`Admin ${data.email} has been deleted`);
  });
})


app.get("/api/v1/analytics/admins", (req, res) => {
  // get all damins
  db.Admin.find({}, (err, data) => {
    if (err)
      res.send("error while fetching the data");
    else
      res.send(data);
  });
});

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
      Key: FILE.originalname,
      Body: base64data,
      ACL: 'public-read'
    }, (resp) => {
      console.log('Successfully uploaded package.');
      console.log(arguments);
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
    console.log('data from aws');
    console.log(data);
    // send data to the client and the download url
    res.json({ data , objectSize:data.ContentLength , url: `https://s3.${REGION}.amazonaws.com/${BUCKET}/${fileName}` });
  });
});



app.get('/api/v1/get/all/objects', (req, res) => {
  // find all objects in aws s3 bucket
  s3.listObjects({
    Bucket: BUCKET,
  }, (err, data) => {
    if (err) {
      console.log(err);
    }
    res.send(data.Contents);
  });
});

// the PORT variable is for connecting the server to the localhost (127.0.0.1)
const PORT = process.env.PORT || 3000;


app.listen(PORT
  // connect server to the localhost on the PORT 3000 for development and the env variable PORT for the deployment
  , () => {
    console.log(`server running on port ${PORT}`);
  });

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
