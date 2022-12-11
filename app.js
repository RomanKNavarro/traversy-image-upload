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
/* this tells our app that we want to use a query string when we create our form in order to make 
a delete request. Where do we use it? In Index.ejs when we want to override our delete POSTS */

app.set('view engine', 'ejs')   
// using ejs as our view engine. We can totally use react too, but ejs is quick. 
// Plus this isn't a frontend tutorial 

// MONGO URI (made sure to select "connect from application")
const mongoURI = "mongodb+srv://ronnoverro:streets123@imagecluster.uwvcxj6.mongodb.net/?retryWrites=true&w=majority"
const conn = mongoose.createConnection(mongoURI); // mongo connection
// I AM SUPPOSED TO CONNECT TO THE DATABASE, NOT THE CLUSTER

// This is to set the collection name. ERROR HERE:
let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'uploads'});
})
// let gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'files'});    // FROM SUPPORT COMMENT
// what exactly is gfs? it has all the objects in the "files" document in our database

// CREATE STORAGE ENGINE (OR OBJECT. Pasted from multer-grid-fs github docs). 
// Here is where we use "crypto" for file encryption:
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
// we can now use this 'upload' var as our middleware for our post route. 

// CREATING OUR ROUTES: '/' is our index route. Specifically, it will look through views/index.ejs
//  ALL THESE ROUTES ARE WHAT HANDLE OUR REQUESTS

// @route GET /
// @desc Loads form page
app.get('/', (req, res) => {
  // res.render('index');          // THIS IS NEEDED TO RENDER OUR PAGE YOU IDIOT.
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     // im sure both parts of this cond are the same?
      res.render('index', {files: false});  // if no files, return empty page. Why is the object arg. needed?
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
          file.isImage = true;    // we create a new isImage property and set it to true. 
        } else {
          files.isImage = false;
        }
      });
      res.render('index', {files: files}); // this will render WITH the files
    } 
  })
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
// @desc Display a single file (NOT IMAGE ITSELF) in JSON. NEEDS TO GET PASSED THE (ENCRYPTED) FILENAME. 
// EG: localhost:5000/files/4039d3b7bc570a59b94bcb344c7ced52.jpg

/* I FIGURED OUT THIS REQ.PARAMS THING: refers to the file object found using the ":filename" requirement 
provided by the user (the arg itself in our endpoint, not the actual "filename" property. */
app.get('/files/:filename', (req, res) => {
  // To find files you will have to use gfs.find() as "GridFSBucket" does not support a .findOne() type 
  // of query. But his works fine, you can just use a toArray() on the find() -SUPPORT COMMENT
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {     // im sure both parts of this cond are the same?  
      return res.status(404).json({
        err: 'no FILE exists'
      });
    }
    // file exists:
    return res.json(file);
  })
})

// @route GET /image/:filename
// @desc Display Image
// CONTENTTYPE: "image/jpeg" and "image/png" (directly copied over)
app.get('/image/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    // Check if file
    if (!file || file.length === 0) {   // THE LENGTH PROP. CAN BE READ.
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // return res.status(200).json({
    //   message: JSON.stringify(file.filename)     // I GET "1", WHEN THE LENGTH PROP. IS 	697592. file['filename']
    // });    

    // Check if image
    if (file[0].contentType === 'image/jpeg' || file[0].contentType === 'image/png') {
      // Read output to browser
      // const readstream = gfs.createReadStream(file[0].filename);
      const readstream = gfs.openDownloadStreamByName(file[0].filename);    // GOT IMAGES TO FINALLY SHOW!!!!
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: `Not an image!`
      });
    }
  });
});
// SECOND ARG (optional), upload.single('file'), is our middleware. We use "single" b/c we are uploading a 
// single file. We pass to single() the name we used for the "file" field needs to be the same as our html 
// "input" element's "name" property. 

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id', (req, res) => {
  /* v What's this? we call the (normal js) func. remove() on gfs (our database) to remove the object with 
  matching id property. We also need to include the collection via the "root" property. Why do we pass
  "gridStore" if we're not even using it? */ 
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect('/');  // what's the point of redirecting if we're already on the main page?
  });

})

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))   // LOOK: NOT ALL CALLBACKS ARE ERROR FUNCS