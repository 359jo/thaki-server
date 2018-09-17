const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const fs = require('fs');
const AWS = require('aws-sdk')
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const path = require('path');
const session = require("express-session");
const s3alp = require('s3-access-log-parser');
const cors = require('cors')
// ------------------------------------------MIDDLE_WARES-----------------------------------------
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json

app.use(bodyParser.json())

app.use(cors())
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


var monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "Sep", "October", "November", "December"];
var monthsAr = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];


// For dev purposes only

AWS.config.update({

    accessKeyId: 'AKIAIMN6XX2R5Y2NL3SA',
    secretAccessKey: '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',
});
const s3 = new AWS.S3();
const BUCKET = 'admin-upload'
const REGION = 'us-east-2'

const ADMIN = {
    email: "Admin@thaki.org",
    password: "admin"
}




// -----------------------------------------------------
app.get("/", (req, res) => {
    // s3.listObjects({
    //     Bucket: BUCKET,
    // }, (err, data) => {
    //     if (err) {
    //         console.log(err);
    //     }
    //     res.send(data.Contents)
    // })
    const alo = ["GET AT path  \n '/'"]
    res.send(alo)
})
// cridential APIs
// --------------------------------LOGIN API-------------------------------------------
app.post("/api/v1/login", (req, res) => {

    if (req.body.email === ADMIN.email && req.body.password === ADMIN.password) {
        req.session.regenerate(() => {
            req.session.user = ADMIN.email
            res.sendStatus(200, ADMIN)
        })
    } else {
        res.sendStatus(403)
    }
})


// ----------------------------AWS APIs-------------------------------------

app.post("/api/v1/upload", upload.single('selectedFile'), (req, res) => {

    const FILE = req.file;

    const { cat } = req.body;
    console.log(FILE);
    // read the uploaded file from the admins
    fs.readFile(FILE.path, (err, data) => {
        if (err) { throw err; }
        // convert to 64base data
        var base64data = new Buffer(data, 'binary');
        // upload object to was s3 bucket
        s3.putObject({
            Bucket: cat,
            Key: FILE.originalname,
            Body: base64data,
            ACL: "public-read"
        }, (resp) => {
            console.log("FILE SAVED");
            res.sendStatus(201);
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
        res.send({
            data, objectSize: data.ContentLength,
            url: `https://s3.${REGION}.amazonaws.com/${BUCKET}/${fileName}`
        });
    });
});


app.get('/api/v1/get/all/objects', (req, res) => {
    // find all objects in aws s3 bucket

    const { cat } = req.body;
    
    s3.listObjects({
        Bucket: BUCKET,
        Prefix: "Test/"
    }, (err, { Contents }) => {
        if (err) {
            console.log(err);
        }
        Contents.splice(0, 1)
        res.send(Contents)
    })
})
// ATTENTION THIS API HAS A BUG IN IT WHICH MEANS IT DOES NOT WORK
app.post('/api/v1/analytics/monthly/col', (req, res) => {
    const resObj = { en: [], ar: [] }

    s3.listObjectsV2({
        Bucket: BUCKET,
        Prefix: "logs/",
    }, (err, { Contents }) => {
        if (err) { throw err }
        else {
            const keyObj = {}
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
                    Sep: 0,
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
            // loop over the Contents array from aws
            for (let i = 0; i < Contents.length; i++) {
                // store each key in an object for later usage
                // the key is the name of the log so we can read its body and parse it later
                keyObj[i.toString()] = Contents[i].Key
            }
            // loop over the keys of logs in the object
            for (let key in keyObj) {
                // get the logs body from aws s3 bucket
                s3.getObject({
                    // will be changed later to work on all categories
                    Bucket: BUCKET,
                    // key of the log
                    Key: keyObj[key]
                }, async (err, data) => {
                    if (err) { throw err }
                    // parse the body of the log for usage
                    const log = await s3alp(data.Body.toString("utf-8"))
                    // check if the operation is GET.OBJECT or download of content not logs
                    if (log && log.operation === 'REST.GET.OBJECT' && !log.request_uri.includes("logs")) {
                        // split the date for usage it can be viewed in this form ["day","month","date","year"]
                        const dateArr = await log.time.toString().split(" ")
                        // store the month in a variable
                        const monthEn = dateArr[1]
                        // get the month for usage
                        const monthAr = monthsAr[monthsEn.indexOf(dateArr[1])]
                        // inc the value of the download
                        console.log(obj.en[monthEn]++)
                        console.log("*******************************");
                        console.log(obj.ar[monthAr]++)
                    }
                })
            }
            // ADD the value to the response object in both english and arabic
            for (let key in obj.en) {
                resObj.en.push([key, obj.en[key]])
            }

            for (let key in obj.ar) {
                resObj.ar.push([key, obj.ar[key]])
            }
            // send the response object to the dashboard 
            res.send(resObj)
        }
    })

})




app.get('/favicon.ico:1', (req, res) => {
    res.send("ALO")
})


app.post("/api/v1/addCat", (req, res) => {
    const { cat } = req.body
    s3.createBucket({ Bucket: cat }, (err, data) => {
        if (err) {
            throw err;
            res.sendStatus(401)
        }
        res.send(data)
    })
})

app.get("/api/v1/get/cats", (req, res) => {
    s3.listBuckets((err, { Buckets }) => {
        if (err) {
            throw err;
            res.sendStatus(401)
        }
        res.send(Buckets)
    })
})



app.delete("/api/v1/delete/object", (req, res) => {
    const { cat, key } = req.body
    s3.deleteObject({
        Bucket: cat,
        Key: key
    }, (err, data) => {
        if (err) {
            throw err;
            res.sendStatus(401)
        }
        res.sendStatus(201)
    })
})



app.post("/api/v1/delete/cat", (req, res) => {
    const { cat } = req.body
    s3.deleteBucket({ Bucket: cat }, (err, data) => {
        if (err) {
            throw err;
            res.sendStatus(401)
        }
        res.sendStatus(201)
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
})

// zainzinc07907

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
