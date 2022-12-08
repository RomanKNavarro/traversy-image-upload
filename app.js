const express = require('express');

const app = express();

app.set('view engine', 'ejs')   
// using ejs as our view engine. We can totally use react too, but ejs is quick. 
// Plus this isn't a frontend tutorial 

// CREATING OUR ROUTES: '/' is our index route. Specifically, it will look through views/index.ejs
app.get('/', (req, res) => {
  res.render('index');
});   

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))   // LOOK: NOT ALL CALLBACKS ARE ERROR FUNCS