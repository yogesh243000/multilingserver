const mongoose = require("mongoose");

const fileDetailsSchema = new mongoose.Schema({
  title: String,
  description: String,
  files: [String], // Array of file paths or filenames
  originalFilenames: [String], // Array of original filenames
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FileDetails", fileDetailsSchema);
