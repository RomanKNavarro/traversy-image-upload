const express = require('express');
const bodyParser = require('body-parser');  // core express module. For our middleware
// CORE NODE.JS MODULES:
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');

// What is this for again?
const {GridFsStorage} = require('multer-gridfs-storage');
// const Grid = require('gridfs-stream');     // DEPRECATED. WHAT DO WE USE INSTEAD?
const methodOverride = require('method-override')

const app = express();

// MIDDLEWARE
app.use(bodyParser.json())
app.use(methodOverride('_method')); 
/* this tells our app that we want to use a query string 
when we create our form in order to make a delete request */

app.set('view engine', 'ejs')   

const mongoURI = "mongodb+srv://ronnoverro:streets123@imagecluster.uwvcxj6.mongodb.net/?retryWrites=true&w=majority"
const conn = mongoose.createConnection(mongoURI); // mongo connection

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'uploads'});
})

// TODO: FIND OUT WHAT EXACTLY GRIDFSSTORAGE DOES AGAIN 
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // this func encrypts our filename
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        // if no error, create filename and fileInfo object. buckName should match collection name
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);    // PROMISE RESOLVED WITH FILEINFO
      });
    });
  }
});
const upload = multer({ storage });

// CREATING OUR ROUTES: '/' is our index route. Specifically, it will look through views/index.ejs

// @route GET /
// @desc Loads form 
app.get('/', (req, res) => {
  res.render('index');          // THIS IS NEEDED TO RENDER OUR PAGE YOU IDIOT.
});   

// @route POST /upload
// @desc Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file });
  //res.redirect('/') // Take us back to the homepage after uploading an image. 
})

// @route GET /files
// @desc Display all files in JSON.
app.get('/files', (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     // im sure both parts of this cond are the same?
      return res.status(404).json({
        err: 'no files exist'
      });
    }
    return res.json(files); 
  })
})

// @route GET /files/:filename
// @desc Display a single file in JSON. NEEDS TO GET PASSED THE (ENCRYPTED) FILENAME. 
// EG: localhost:5000/files/4039d3b7bc570a59b94bcb344c7ced52.jpg
app.get('/files/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {     // im sure both parts of this cond are the same?
      return res.status(404).json({
        err: 'no FILE exists'
      });
    }   
    return res.json(file); 
    
  })
})

// @route GET /image/:filename
// @desc Display image 
// EG: localhost:5000/image/4039d3b7bc570a59b94bcb344c7ced52.jpg
app.get('/image/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {     // im sure both parts of this cond are the same?
      return res.status(404).json({
        err: 'no FILE exists'
      });
    }
    // check if image:
    //  I SPELLED "contentType" correct. yes.
    // image objects have a property that looks like: contentType:	"image/jpeg"
    if (file[0].contentType === 'image/jpeg' || file[0].contentType === 'image/png') {
      // read output to browser:
      const readstream = GridFSBucket.openDownloadStreamByName(file.filename);  
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: `not an image. ${file[0].contentType} file passed`
        // I get this: "not an image. undefined file passed"
      })
    }
  })
})

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))   // LOOK: NOT ALL CALLBACKS ARE ERROR FUNCS