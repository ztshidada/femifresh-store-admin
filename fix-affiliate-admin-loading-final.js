const fs = require("fs");
const path = require("path");

const adminPage = path.join(__dirname, "public", "admin", "affiliates.html");
let html = fs.readFileSync(adminPage, "utf8");

/* Replace bottom startup so errors are visible */
html = html.replace(
`loadOverview();
loadAffiliatesNow();`,
`async function startAffiliateAdminPage() {
  const rows = document.getElementById("rows");
  const errorBox = document.getElementById("errorBox");

  try {
    await loadOverview();
  } catch (e) {
    console.error("Affiliate overview failed:", e);
    errorBox.textContent = "Overview error: " + e.message;
    errorBox.style.display = "block";
  }

  try {
    await loadAffiliatesNow();
  } catch (e) {
    console.error("Affiliate list failed:", e);
    rows.innerHTML = '<tr><td colspan="9">Could not load affiliates. Check error above.</td></tr>';
    errorBox.textContent = "Affiliate list error: " + e.message;
    errorBox.style.display = "block";
  }
}

startAffiliateAdminPage();`
);

/* Make token detection stronger */
html = html.replace(
`function adminToken() {
  return localStorage.getItem("femifresh_admin_token") || localStorage.getItem("ff_admin_token") || localStorage.getItem("token") || "";
}`,
`function adminToken() {
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

  const objectKeys = [
    "femifresh_admin",
    "ff_admin",
    "admin",
    "adminUser",
    "user"
  ];

  for (const key of objectKeys) {
    try {
      const obj = JSON.parse(localStorage.getItem(key) || "null");
      if (obj?.token) return obj.token;
      if (obj?.adminToken) return obj.adminToken;
      if (obj?.accessToken) return obj.accessToken;
    } catch (e) {}
  }

  return "";
}`
);

fs.writeFileSync(adminPage, html);

console.log("Affiliate admin loading final fix applied.");
