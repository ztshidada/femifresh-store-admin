const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const adminDir = path.join(__dirname, "public", "admin");
const cssFile = path.join(__dirname, "public", "admin", "css", "admin.css");

let server = fs.readFileSync(serverFile, "utf8");

/* =========================
   1) Affiliate admin API
========================= */
if (!server.includes("AFFILIATE_ADMIN_API_V1")) {
  const apiCode = `

// AFFILIATE_ADMIN_API_V1
function safeAffiliateAdmin(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

app.get("/api/admin/affiliates", requireAdmin, requireRole(["super_admin"]), (req, res) => {
  const affiliates = read("affiliates", []);
  const month = new Date().toISOString().slice(0, 7);

  const list = affiliates.map(a => {
    const directs = affiliates.filter(x => x.sponsorId === a.id);
    const activeDirects = directs.filter(x => Array.isArray(x.activeMonths) && x.activeMonths.includes(month));

    return {
      ...safeAffiliateAdmin(a),
      directRecruits: directs.length,
      activeDirectRecruits: activeDirects.length,
      selfActive: Array.isArray(a.activeMonths) && a.activeMonths.includes(month),
      targetBonusCounted: activeDirects.length >= 10 ? 1000 : 0,
      targetBonusPayable: (Array.isArray(a.activeMonths) && a.activeMonths.includes(month) && activeDirects.length >= 10) ? 1000 : 0
    };
  });

  res.json({ success: true, affiliates: list });
});

app.post("/api/admin/affiliates/:id/mark-joining-paid", requireAdmin, requireRole(["super_admin"]), (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliate.joiningFeeStatus = "paid";
  affiliate.accountStatus = "approved";
  affiliate.joiningFeePaidAt = new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: safeAffiliateAdmin(affiliate) });
});

app.post("/api/admin/affiliates/:id/toggle-active", requireAdmin, requireRole(["super_admin"]), (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  const month = (req.body && req.body.month) || new Date().toISOString().slice(0, 7);
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];

  if (affiliate.activeMonths.includes(month)) {
    affiliate.activeMonths = affiliate.activeMonths.filter(m => m !== month);
  } else {
    affiliate.activeMonths.push(month);
  }

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: safeAffiliateAdmin(affiliate) });
});
// END AFFILIATE_ADMIN_API_V1
`;

  server = server.replace(/app\.listen\(/, apiCode + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
}

/* =========================
   2) Affiliate admin page
========================= */
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
    <h2>FemiFresh</h2>
    <a href="/admin/dashboard.html">Dashboard</a>
    <a href="/admin/orders.html">Orders</a>
    <a href="/admin/affiliates.html" data-super-only>Affiliates</a>
    <a href="/admin/products.html" data-super-only>Products</a>
    <a href="/admin/delivery.html" data-super-only>Delivery</a>
    <a href="/admin/users.html" data-super-only>Users</a>
    <a href="/admin/logs.html" data-super-only>Logs</a>
    <a href="/admin/settings.html" data-super-only>Settings</a>
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
      <p class="muted">Manage joining fee status, active status, referral codes and sponsor tracking.</p>

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

function token() {
  return localStorage.getItem("femifresh_admin_token");
}

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token(),
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    alert("You are not allowed to access this page.");
    location.href = "/admin/login.html";
    return {};
  }

  return res.json();
}

async function loadAffiliates() {
  const data = await adminFetch("/api/admin/affiliates");
  const rows = document.getElementById("affiliateRows");

  if (!data.success) {
    rows.innerHTML = '<tr><td colspan="9">Failed to load affiliates.</td></tr>';
    return;
  }

  if (!data.affiliates.length) {
    rows.innerHTML = '<tr><td colspan="9">No affiliates yet.</td></tr>';
    return;
  }

  rows.innerHTML = data.affiliates.map(a => {
    const activeText = a.selfActive ? "Active" : "Inactive";
    const joining = a.joiningFeeStatus || "pending";

    return \`
      <tr>
        <td>
          <strong>\${a.fullName || ((a.firstName || "") + " " + (a.lastName || ""))}</strong><br>
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
}

async function markJoiningPaid(id) {
  if (!confirm("Mark this affiliate joining fee as paid?")) return;

  const data = await adminFetch("/api/admin/affiliates/" + id + "/mark-joining-paid", {
    method: "POST",
    body: JSON.stringify({})
  });

  if (data.success) {
    loadAffiliates();
  } else {
    alert(data.message || "Failed.");
  }
}

async function toggleActive(id) {
  const month = new Date().toISOString().slice(0, 7);

  const data = await adminFetch("/api/admin/affiliates/" + id + "/toggle-active", {
    method: "POST",
    body: JSON.stringify({ month })
  });

  if (data.success) {
    loadAffiliates();
  } else {
    alert(data.message || "Failed.");
  }
}

loadAffiliates();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(adminDir, "affiliates.html"), affiliatesPage);

/* =========================
   3) Add Affiliates link to admin sidebar pages
========================= */
const adminPages = [
  "dashboard.html",
  "orders.html",
  "products.html",
  "delivery.html",
  "users.html",
  "logs.html",
  "settings.html"
];

for (const page of adminPages) {
  const file = path.join(adminDir, page);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes('/admin/affiliates.html')) {
    html = html.replace(
      '<a href="/admin/orders.html">Orders</a>',
      '<a href="/admin/orders.html">Orders</a>\\n    <a href="/admin/affiliates.html" data-super-only>Affiliates</a>'
    );
  }

  fs.writeFileSync(file, html);
}

/* =========================
   4) Set all products to R1350 and add stock
========================= */
function findProductFiles(startDir) {
  const results = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    for (const item of fs.readdirSync(dir)) {
      if (["node_modules", ".git"].includes(item)) continue;

      const full = path.join(dir, item);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else if (item === "products.json") {
        results.push(full);
      }
    }
  }

  walk(startDir);
  return results;
}

const productFiles = findProductFiles(__dirname);

for (const file of productFiles) {
  try {
    const products = JSON.parse(fs.readFileSync(file, "utf8"));

    if (Array.isArray(products)) {
      const updated = products.map(p => ({
        ...p,
        price: 1350,
        stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 100
      }));

      fs.writeFileSync(file, JSON.stringify(updated, null, 2));
      console.log("Updated products:", file);
    }
  } catch (e) {
    console.log("Skipped product file:", file, e.message);
  }
}

/* =========================
   5) Admin CSS extras
========================= */
const cssAdd = `

/* Affiliate admin + product stock extras */
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
`;

if (!fs.readFileSync(cssFile, "utf8").includes("Affiliate admin + product stock extras")) {
  fs.appendFileSync(cssFile, cssAdd);
}

console.log("Affiliate admin added. Product prices set to R1350 and stock field added.");
