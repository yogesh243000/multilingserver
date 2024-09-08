//Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  message: String,
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  clickUpTaskId: String, // Optional, if you're linking to ClickUp tasks
});

module.exports = mongoose.model("Notification", notificationSchema);
