const fs = require("fs");
const path = require("path");

const adminPage = path.join(__dirname, "public", "admin", "affiliates.html");
let html = fs.readFileSync(adminPage, "utf8");

/* Make admin token detection stronger */
html = html.replace(
`function adminToken() {
  return localStorage.getItem("femifresh_admin_token") || localStorage.getItem("ff_admin_token") || localStorage.getItem("token") || "";
}`,
`function adminToken() {
  const direct =
    localStorage.getItem("femifresh_admin_token") ||
    localStorage.getItem("ff_admin_token") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    "";

  if (direct) return direct;

  const possibleObjects = [
    "femifresh_admin",
    "ff_admin",
    "admin",
    "user",
    "adminUser"
  ];

  for (const key of possibleObjects) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (value?.token) return value.token;
      if (value?.adminToken) return value.adminToken;
      if (value?.accessToken) return value.accessToken;
    } catch (e) {}
  }

  return "";
}`
);

/* Add better error handling so it does not stay on Loading */
html = html.replace(
`loadOverview();
loadAffiliatesNow();`,
`async function startAffiliateAdmin() {
  const rows = document.getElementById("rows");
  const errorBox = document.getElementById("errorBox");

  if (!adminToken()) {
    rows.innerHTML = '<tr><td colspan="9">Admin token missing. Please logout and login again.</td></tr>';
    errorBox.textContent = "Admin token missing. Please login again as Super Admin.";
    errorBox.style.display = "block";
    return;
  }

  try {
    await loadOverview();
  } catch (e) {
    console.error("Overview error:", e);
    errorBox.textContent = "Overview error: " + e.message;
    errorBox.style.display = "block";
  }

  try {
    await loadAffiliatesNow();
  } catch (e) {
    console.error("Affiliates error:", e);
    rows.innerHTML = '<tr><td colspan="9">Could not load affiliates.</td></tr>';
    errorBox.textContent = "Affiliates error: " + e.message;
    errorBox.style.display = "block";
  }
}

startAffiliateAdmin();`
);

fs.writeFileSync(adminPage, html);

console.log("Affiliate admin loading/token fix applied.");
