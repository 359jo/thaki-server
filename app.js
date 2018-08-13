const express = require('express');
const bodyParser = require("body-parser")
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

// APIs
app.get("/",(req,res)=>{
  res.send("get at path '/' ")
})

app.get("/api/v1/test",(req,res)=>{
  res.send("get at path '/api/v1/test' ")
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next("404 page not found");
});

// connect to port
const PORT = 3000
app.listen(PORT , ()=>{
  console.log("server running on port "+PORT);
})