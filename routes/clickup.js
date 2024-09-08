// routes/clickup.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
// const Notification = require("../models/Notification"); // Assuming you have a Notification model

// Fetch notifications from ClickUp and save to DB
router.get("/fetch-from-clickup", async (req, res) => {
  try {
    const { CLICKUP_CLIENT_ID, CLICKUP_CLIENT_SECRET } = process.env;

    // Get access token from ClickUp
    const tokenResponse = await axios.post(
      "https://app.clickup.com/api/v2/oauth/token",
      {
        client_id: CLICKUP_CLIENT_ID,
        client_secret: CLICKUP_CLIENT_SECRET,
        grant_type: "client_credentials",
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch tasks from ClickUp (adjust URL as needed)
    const clickUpResponse = await axios.get(
      "https://api.clickup.com/api/v2/team/[team_id]/task", // Replace [team_id] with your actual team ID
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const tasks = clickUpResponse.data.tasks;

    // Save tasks as notifications in MongoDB
    for (const task of tasks) {
      const newNotification = new Notification({
        message: task.name,
        date: new Date(task.date_created),
        clickUpTaskId: task.id,
      });
      await newNotification.save();
    }

    res.json({ message: "Notifications fetched and saved successfully" });
  } catch (err) {
    console.error("Error fetching from ClickUp:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
