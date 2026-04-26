const mongoose = require("mongoose");

const connectDB = (url) => {
  console.log("Connected to MongoDB!!")
  return mongoose.connect(url);
};

module.exports = connectDB;