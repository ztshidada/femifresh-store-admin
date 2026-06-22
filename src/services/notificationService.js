const { v4: uuid } = require("uuid");
const { read, write } = require("../db");

function createNotification({ audience, userId = "", title, message, type = "info", data = {} }) {
  const notifications = read("notifications", []);
  const row = {
    id: uuid(),
    audience,
    userId,
    title,
    message,
    type,
    data,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(row);
  write("notifications", notifications.slice(0, 2000));
  return row;
}

function listNotifications({ audience, userId = "" }) {
  return read("notifications", []).filter(n => {
    if (n.audience !== audience) return false;
    if (n.userId && userId && String(n.userId) !== String(userId)) return false;
    if (n.userId && !userId) return false;
    return true;
  });
}

function markNotificationRead(id) {
  const rows = read("notifications", []);
  const row = rows.find(n => n.id === id);
  if (!row) return null;
  row.read = true;
  row.readAt = new Date().toISOString();
  write("notifications", rows);
  return row;
}

module.exports = { createNotification, listNotifications, markNotificationRead };
