let notification = [];

const addNotification = (type, message) => {
  notification.push({
    id: notifications.length + 1,
    type,
    message,
    timestamp: new Date(),
  });
};
addNotification("info", "Your profile was updated successfully.");
addNotification("warning", "Your subscription will expire in 3 days.");
addNotification("error", "Failed to upload the document.");
addNotification("success", "File uploaded successfully.");
addNotification("message", "You have a new message from the admin.");
