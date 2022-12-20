const express = require('express');
const path = require('path');   
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const methodOverride = require('method-override')
const app = express();

app.use(methodOverride('_method')); 
app.set('view engine', 'ejs');   // can't uncomment since I'm using ejs in index.ejs.

// const mongoURI = "mongodb+srv://ronnoverro:streets123@imagecluster.uwvcxj6.mongodb.net/?retryWrites=true&w=majority";
const mongoURI = process.env.MONGO_URI // did I put it right?

const conn = mongoose.createConnection(mongoURI); 

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'uploads'});  // HERE IS WHERE THE BUCKETNAME IS SET
});
// if our storage is defined below vvv, then what is "gfs"? 
//gfs is our bucket, composed of 2 collections, chunks and files. 

// Create a storage object with a given configuration (DOCS)
const storage = new GridFsStorage({
  url: mongoURI,
  // what is this file property?  it takes the given "file" and encrypts it. 
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      
      //  SIGNATURE: crypto.randomBytes( size, callback )
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);     
        }      
        /* if there's no error, go on to creating the file, using crypto.randomBytes to actually 
        create the filename (HOPE THAT MAKES SENSE) */
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
          /* I'm guessing this is part of the "uploads." part of the collection names: NOPE. It puts the newly created 
          file in the "uploads" bucket. 
          Can I add ANY property name? NOPE. There's a set amount of properties that can be added. I can't just create 
          my own. List of properties in the docs. 
          I UNDERSTAND: there's many properties, and all those we didn't included here are used with their default 
          values. */ 
        };
        resolve(fileInfo);    
      });
    });
  }
});

// Set multer storage engine to the newly created object
const upload = multer({ storage });

app.get('/', (req, res) => {
  // FIRST INSTANCE OF "FILES" USED IN AN ARROW FUNC. ---RESOLVED
  // what does '/' refer to again? localhost:5000/ (our main and only page)

  // I think this is supposed to be "gfs.files", but works for me nonetheless lol.
  // TOARRAY() IS SPECIFICALLY FOR CONVERTING COLLECTIONS TO ARRAYS WOOAHH
  // files refers to "uploads.files". gfs.find() simply returns ALL the files. 
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     
      res.render('index', {files: false});  
      // const templateHTML = document.getElementById("filess")
      //       .innerHTML
      //       .replace(/\&lt;/g, "<")
      //       .replace(/\&gt;/g, ">");
      // document.getElementById("target").innerHTML = ejs.render(templateHTML, {files: false});


    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
          file.isImage = true;    
        } else {
          file.isImage = false;   // we are simply setting variables here, not doing any actual displaying.
        }
      });
      res.render('index', {files: files});  
      // const templateHTML = document.getElementById("filess")
      //       .innerHTML
      //       .replace(/\&lt;/g, "<")
      //       .replace(/\&gt;/g, ">");
      // document.getElementById("target").innerHTML = ejs.render(templateHTML, {files: files});



      /* YO? how can this refer to index.ejs if that's in the views folder?
        From my understanding after reading online, "res.render" knows to look 
        in a folder specifically called "views". Nice ---RESOLVED FURTHER IN NOTES */ 
    } 
  })
});   

app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file }); 
  // if we were to leave this ^^^ in, it'd redirect us to http://localhost:5000/upload, showing us the json for the file
  res.redirect('/');
})

app.get('/files', (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     
      return res.status(404).json({
        err: 'no files exist'
      });
    }
    return res.json(files);   // this simply returns the files' json objects
  })
})

app.get('/files/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {     
      return res.status(404).json({
        err: 'no FILE exists'
      });
    }
    return res.json(file);    // straightforward
  })
})

app.get('/image/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {   
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    if (file[0].contentType === 'image/jpeg' || file[0].contentType === 'image/png') {
      const readstream = gfs.openDownloadStreamByName(file[0].filename);    
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: `Not an image!`
      });
    }
  });
});

app.delete('/files/:id', async (req, res) => {
  try {
    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    gfs.delete(obj_id);
    res.redirect('/');
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
})

//const port = 5000;
const port = process.env.PORT || 5000; 

app.listen(port, () => console.log(`Server started on port ${port}`))   