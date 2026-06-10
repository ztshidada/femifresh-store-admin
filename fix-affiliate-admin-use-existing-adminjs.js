const fs = require("fs");
const path = require("path");

const page = path.join(__dirname, "public", "admin", "affiliates.html");
let html = fs.readFileSync(page, "utf8");

/* Load original admin.js because the normal admin pages work with it */
if (!html.includes('/admin/js/admin.js')) {
  html = html.replace(
    "</body>",
    '<script src="/admin/js/admin.js"></script>\n</body>'
  );
}

/* Upgrade getToken to read common globals set by admin.js too */
html = html.replace(
/function getToken\(\) \{[\s\S]*?\n\}/,
`function getToken() {
  const keys = [
    "femifresh_admin_token",
    "ff_admin_token",
    "admin_token",
    "adminToken",
    "token",
    "authToken",
    "accessToken"
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }

  const objectKeys = ["femifresh_admin", "ff_admin", "admin", "adminUser", "user", "currentAdmin"];
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of objectKeys) {
      try {
        const obj = JSON.parse(storage.getItem(key) || "null");
        if (obj?.token) return obj.token;
        if (obj?.adminToken) return obj.adminToken;
        if (obj?.accessToken) return obj.accessToken;
      } catch (e) {}
    }
  }

  if (window.adminToken) return window.adminToken;
  if (window.token) return window.token;
  if (window.currentAdmin?.token) return window.currentAdmin.token;
  if (window.currentUser?.token) return window.currentUser.token;

  console.log("LOCAL STORAGE KEYS:", Object.keys(localStorage));
  console.log("SESSION STORAGE KEYS:", Object.keys(sessionStorage));
  console.log("WINDOW ADMIN VALUES:", {
    adminToken: window.adminToken,
    token: window.token,
    currentAdmin: window.currentAdmin,
    currentUser: window.currentUser
  });

  return "";
}`
);

fs.writeFileSync(page, html);

console.log("Affiliate admin page now checks admin.js/global tokens too.");
