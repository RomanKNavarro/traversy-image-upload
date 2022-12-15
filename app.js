const express = require('express');
const path = require('path');   
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const methodOverride = require('method-override')
const app = express();

app.use(methodOverride('_method')); 
app.set('view engine', 'ejs')   // can't uncomment since I'm using ejs in index.ejs.

const mongoURI = "mongodb+srv://ronnoverro:streets123@imagecluster.uwvcxj6.mongodb.net/?retryWrites=true&w=majority";
const conn = mongoose.createConnection(mongoURI); 

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'uploads'});
})

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);    
      });
    });
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     
      res.render('index', {files: false});  
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
          file.isImage = true;    
        } else {
          files.isImage = false;
        }
      });
      res.render('index', {files: files}); 
    } 
  })
});   

app.post('/upload', upload.single('file'), (req, res) => {
  //res.json({ file: req.file });
  res.redirect('/') 
})


app.get('/files', (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {     
      return res.status(404).json({
        err: 'no files exist'
      });
    }
    return res.json(files); 
  })
})

app.get('/files/:filename', (req, res) => {
  
  
  gfs.find({filename: req.params.filename}).toArray((err, file) => {
    if (!file || file.length === 0) {     
      return res.status(404).json({
        err: 'no FILE exists'
      });
    }
    return res.json(file);
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

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))   