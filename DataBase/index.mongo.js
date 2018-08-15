var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;

db.on('error', function() {
  console.log('mongoose connection error');
});

db.once('open', function() {
  console.log('mongoose connected successfully');
});

var AdminSchema = mongoose.Schema({
  username: String,
  password: String
});

var Admin = mongoose.model('Admin', AdminSchema);



module.exports.Admin = Admin;