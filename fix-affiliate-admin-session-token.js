const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "public", "admin", "affiliates.html");
let html = fs.readFileSync(file, "utf8");

html = html.replace(
`function getToken() {
  const keys = [
    "femifresh_admin_token",
    "ff_admin_token",
    "admin_token",
    "adminToken",
    "token"
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const objectKeys = ["femifresh_admin", "ff_admin", "admin", "adminUser", "user"];
  for (const key of objectKeys) {
    try {
      const obj = JSON.parse(localStorage.getItem(key) || "null");
      if (obj?.token) return obj.token;
      if (obj?.adminToken) return obj.adminToken;
      if (obj?.accessToken) return obj.accessToken;
    } catch (e) {}
  }

  return "";
}`,
`function getToken() {
  const keys = [
    "femifresh_admin_token",
    "ff_admin_token",
    "admin_token",
    "adminToken",
    "token",
    "authToken",
    "accessToken",
    "femifresh_token",
    "femifreshAdminToken"
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }

  const objectKeys = [
    "femifresh_admin",
    "ff_admin",
    "admin",
    "adminUser",
    "user",
    "femifresh_user",
    "femifreshAdmin",
    "currentAdmin"
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of objectKeys) {
      try {
        const obj = JSON.parse(storage.getItem(key) || "null");
        if (obj?.token) return obj.token;
        if (obj?.adminToken) return obj.adminToken;
        if (obj?.accessToken) return obj.accessToken;
        if (obj?.jwt) return obj.jwt;
      } catch (e) {}
    }
  }

  console.log("LOCAL STORAGE KEYS:", Object.keys(localStorage));
  console.log("SESSION STORAGE KEYS:", Object.keys(sessionStorage));

  return "";
}`
);

fs.writeFileSync(file, html);

console.log("Affiliate admin token now checks localStorage and sessionStorage.");
