const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const adminDir = path.join(__dirname, "public", "admin");
const adminCssFile = path.join(adminDir, "css", "admin.css");

let server = fs.readFileSync(serverFile, "utf8");

/* 1) Replace weak affiliate admin auth with stronger token check */
if (!server.includes("AFFILIATE_ADMIN_AUTH_V2")) {
  const authV2 = `

// AFFILIATE_ADMIN_AUTH_V2
function affiliateAdminAuthV2(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin login required." });
    }

    let payload = null;

    try {
      if (typeof jwt !== "undefined") {
        payload = jwt.verify(token, process.env.JWT_SECRET || "femifresh_super_secure_secret_2026_change_later");
      }
    } catch (e) {
      try {
        if (typeof jwt !== "undefined") payload = jwt.decode(token);
      } catch (_) {}
    }

    const role = payload?.role || payload?.adminRole || payload?.type || "";
    if (role === "super_admin" || role === "superadmin" || role === "admin") {
      req.adminUser = payload;
      return next();
    }

    const storesToCheck = ["users", "adminUsers", "admins"];
    for (const storeName of storesToCheck) {
      const users = read(storeName, []);
      const found = users.find(u =>
        u.token === token ||
        u.adminToken === token ||
        u.sessionToken === token ||
        (payload?.email && String(u.email).toLowerCase() === String(payload.email).toLowerCase()) ||
        (payload?.id && u.id === payload.id)
      );

      if (found) {
        const foundRole = found.role || found.adminRole || found.type || "";
        if (foundRole === "super_admin" || foundRole === "superadmin" || foundRole === "admin") {
          req.adminUser = found;
          return next();
        }
      }
    }

    return res.status(403).json({ success: false, message: "Super Admin only." });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
// END AFFILIATE_ADMIN_AUTH_V2
`;

  server = server.replace(/\/\/ AFFILIATE_ADMIN_API_V1/, authV2 + "\n// AFFILIATE_ADMIN_API_V1");
}

/* Replace old middleware names with V2 */
server = server.replaceAll("affiliateAdminSafeAuth,", "affiliateAdminAuthV2,");
server = server.replaceAll('requireAdmin, requireRole(["super_admin"]),', 'affiliateAdminAuthV2,');

fs.writeFileSync(serverFile, server);

/* 2) Fix visible \\n text in admin HTML pages */
for (const fileName of fs.readdirSync(adminDir)) {
  if (!fileName.endsWith(".html")) continue;
  const file = path.join(adminDir, fileName);
  let html = fs.readFileSync(file, "utf8");
  html = html.replaceAll("\\n", "\n");
  fs.writeFileSync(file, html);
}

/* 3) Rewrite affiliates page with stronger layout + better error messages */
const affiliatesPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Affiliates - FemiFresh Admin</title>
  <link rel="stylesheet" href="/admin/css/admin.css">
</head>
<body>
<div class="admin-shell">
  <aside class="sidebar">
    <h2>FemiFresh<br>Admin</h2>
    <a href="/admin/dashboard.html">Dashboard</a>
    <a href="/admin/orders.html">Orders</a>
    <a href="/admin/affiliates.html">Affiliates</a>
    <a href="/admin/products.html">Products</a>
    <a href="/admin/delivery.html">Delivery Methods</a>
    <a href="/admin/users.html">Admin Users</a>
    <a href="/admin/logs.html">Payment & Email Logs</a>
    <button id="logoutBtn">Logout</button>
  </aside>

  <main class="admin-main">
    <div class="admin-top">
      <div>
        <p class="muted">Super Admin Only</p>
        <h1>Affiliate Admin</h1>
      </div>
      <button class="primary" onclick="loadAffiliates()">Refresh</button>
    </div>

    <section class="panel">
      <h2>Affiliate Accounts</h2>
      <p class="muted">Manage joining fee status, active status, referral codes, sponsor tracking and target bonus qualification.</p>

      <div id="affiliateError" class="admin-alert" style="display:none;"></div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Referral Code</th>
              <th>Sponsor</th>
              <th>Joining Fee</th>
              <th>Active</th>
              <th>Directs</th>
              <th>Target Bonus</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="affiliateRows">
            <tr><td colspan="9">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</div>

<script src="/admin/js/admin.js"></script>
<script>
const money = n => "R" + Number(n || 0).toFixed(2);

function getAdminToken() {
  return (
    localStorage.getItem("femifresh_admin_token") ||
    localStorage.getItem("ff_admin_token") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getAdminToken(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({
    success: false,
    message: "Server returned an invalid response."
  }));

  if (!res.ok) {
    throw new Error(data.message || "Request failed with status " + res.status);
  }

  return data;
}

async function loadAffiliates() {
  const rows = document.getElementById("affiliateRows");
  const errBox = document.getElementById("affiliateError");

  errBox.style.display = "none";
  rows.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';

  try {
    const data = await adminFetch("/api/admin/affiliates");

    if (!data.success) {
      throw new Error(data.message || "Failed to load affiliates.");
    }

    if (!data.affiliates || !data.affiliates.length) {
      rows.innerHTML = '<tr><td colspan="9">No affiliates yet.</td></tr>';
      return;
    }

    rows.innerHTML = data.affiliates.map(a => {
      const fullName = a.fullName || ((a.firstName || "") + " " + (a.lastName || "")).trim() || "---";
      const activeText = a.selfActive ? "Active" : "Inactive";
      const joining = a.joiningFeeStatus || "pending";

      return \`
        <tr>
          <td>
            <strong>\${fullName}</strong><br>
            <small>\${a.accountStatus || ""}</small>
          </td>
          <td>
            \${a.email || ""}<br>
            <small>\${a.phone || ""}</small>
          </td>
          <td><strong>\${a.referralCode || "---"}</strong></td>
          <td>\${a.sponsorCode || "---"}</td>
          <td><span class="status-pill">\${joining}</span></td>
          <td><span class="status-pill">\${activeText}</span></td>
          <td>\${a.activeDirectRecruits || 0} / \${a.directRecruits || 0}</td>
          <td>
            Counted: \${money(a.targetBonusCounted)}<br>
            Payable: \${money(a.targetBonusPayable)}
          </td>
          <td class="action-stack">
            <button onclick="markJoiningPaid('\${a.id}')">Mark Joining Paid</button>
            <button onclick="toggleActive('\${a.id}')">Toggle Active</button>
          </td>
        </tr>
      \`;
    }).join("");
  } catch (e) {
    rows.innerHTML = '<tr><td colspan="9">Could not load affiliates.</td></tr>';
    errBox.textContent = e.message;
    errBox.style.display = "block";
  }
}

async function markJoiningPaid(id) {
  if (!confirm("Mark this affiliate joining fee as paid?")) return;

  try {
    const data = await adminFetch("/api/admin/affiliates/" + id + "/mark-joining-paid", {
      method: "POST",
      body: JSON.stringify({})
    });

    if (!data.success) throw new Error(data.message || "Failed.");
    loadAffiliates();
  } catch (e) {
    alert(e.message);
  }
}

async function toggleActive(id) {
  const month = new Date().toISOString().slice(0, 7);

  try {
    const data = await adminFetch("/api/admin/affiliates/" + id + "/toggle-active", {
      method: "POST",
      body: JSON.stringify({ month })
    });

    if (!data.success) throw new Error(data.message || "Failed.");
    loadAffiliates();
  } catch (e) {
    alert(e.message);
  }
}

loadAffiliates();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(adminDir, "affiliates.html"), affiliatesPage);

/* 4) Add strong CSS for admin-shell if missing */
const cssAdd = `

/* Admin layout repair */
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #fbf3fa;
}

.sidebar {
  background: #2a0d27;
  color: white;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar h2 {
  color: white;
  margin: 0 0 24px;
  font-size: 28px;
  line-height: 1.05;
}

.sidebar a,
.sidebar button {
  color: white;
  text-align: left;
  background: transparent;
  border: 0;
  font: inherit;
  font-weight: 700;
  padding: 10px 0;
  cursor: pointer;
}

.sidebar a:hover,
.sidebar button:hover {
  color: #ffc6ef;
}

.admin-main {
  padding: 55px 48px;
}

.admin-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 34px;
}

.admin-top h1 {
  margin: 0;
  font-size: 40px;
  color: #2a162f;
}

.panel {
  background: white;
  border: 1px solid rgba(107, 31, 100, 0.12);
  border-radius: 26px;
  padding: 26px;
  box-shadow: 0 18px 45px rgba(107, 31, 100, 0.08);
}

.panel h2 {
  margin-top: 0;
}

.primary {
  border: 0;
  background: #6b1f64;
  color: white;
  padding: 12px 18px;
  border-radius: 999px;
  font-weight: 900;
  cursor: pointer;
}

.admin-alert {
  background: #fff0f0;
  color: #9d1c1c;
  border: 1px solid #f1b7b7;
  padding: 14px 16px;
  border-radius: 14px;
  margin: 18px 0;
  font-weight: 800;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
}

.admin-table th,
.admin-table td {
  text-align: left;
  padding: 14px;
  border-bottom: 1px solid rgba(107, 31, 100, 0.12);
  vertical-align: top;
}

.admin-table th {
  color: #6b1f64;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.status-pill {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f7e6f4;
  color: #6b1f64;
  font-weight: 800;
  font-size: 12px;
}

.action-stack {
  display: grid;
  gap: 8px;
}

.action-stack button {
  border: 0;
  border-radius: 10px;
  padding: 9px 10px;
  background: #6b1f64;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 850px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .admin-main {
    padding: 28px 18px;
  }
}
`;

let css = fs.readFileSync(adminCssFile, "utf8");
if (!css.includes("Admin layout repair")) {
  fs.appendFileSync(adminCssFile, cssAdd);
}

console.log("Affiliate admin UI and auth fixed.");
