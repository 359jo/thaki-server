var mongoose = require('mongoose');
mongoose.connect('mongodb://Nooreddein:thaki-dashboard@ds133622.mlab.com:33622/thaki-dashboard');
const bcrypt = require("bcrypt")
var db = mongoose.connection;

db.on('error', function () {
    console.log('mongoose connection error');
});

db.once('open', function () {
    console.log('mongoose connected successfully');
});

var AdminSchema = mongoose.Schema({
    email: String,
    password: String
});

var Admin = mongoose.model('Admin', AdminSchema);

module.exports.Admin = Admin;