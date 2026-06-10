const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const adminDir = path.join(__dirname, "public", "admin");
const adminCssFile = path.join(adminDir, "css", "admin.css");

let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("AFFILIATE_SYSTEM_ADMIN_V1")) {
  const apiCode = `

// AFFILIATE_SYSTEM_ADMIN_V1
function affiliateSystemAdminAuth(req, res, next) {
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

    const payloadRole = payload?.role || payload?.adminRole || payload?.type || "";
    if (payloadRole === "super_admin" || payloadRole === "superadmin" || payloadRole === "admin") {
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
        const role = found.role || found.adminRole || found.type || "";
        if (role === "super_admin" || role === "superadmin" || role === "admin") {
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

function affiliateSafe(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function affiliateIsActive(a, month = affiliateMonthKey()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function getAffiliateDirects(affiliate, affiliates) {
  return affiliates.filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode);
}

function calculateAffiliateStats(affiliate, affiliates, month = affiliateMonthKey()) {
  const directs = getAffiliateDirects(affiliate, affiliates);
  const activeDirects = directs.filter(a => affiliateIsActive(a, month));
  const selfActive = affiliateIsActive(affiliate, month);

  const referralBonusCounted = activeDirects.length * 300;
  const targetBonusCounted = activeDirects.length >= 10 ? 1000 : 0;
  const totalCounted = referralBonusCounted + targetBonusCounted;

  const payoutBlocked = affiliate.payoutBlocked === true;
  const payable = selfActive && !payoutBlocked ? totalCounted : 0;
  const blocked = totalCounted - payable;

  let blockedReason = "";
  if (totalCounted > 0 && !selfActive) blockedReason = "Affiliate is not active for this month.";
  if (totalCounted > 0 && payoutBlocked) blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin.";

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted,
    targetBonusCounted,
    totalCounted,
    totalPayable: payable,
    totalBlocked: blocked,
    blockedReason,
    needsForTarget: Math.max(0, 10 - activeDirects.length)
  };
}

function buildAffiliateTree(root, affiliates, depth = 0, maxDepth = 10) {
  if (!root || depth >= maxDepth) return [];

  const children = getAffiliateDirects(root, affiliates);
  return children.map(child => ({
    ...affiliateSafe(child),
    depth,
    children: buildAffiliateTree(child, affiliates, depth + 1, maxDepth)
  }));
}

app.get("/api/aff-admin/overview", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = affiliateMonthKey();

  const approved = affiliates.filter(a => a.accountStatus === "approved").length;
  const pendingJoining = affiliates.filter(a => a.joiningFeeStatus !== "paid").length;
  const active = affiliates.filter(a => affiliateIsActive(a, month)).length;

  let counted = 0;
  let payable = 0;
  affiliates.forEach(a => {
    const stats = calculateAffiliateStats(a, affiliates, month);
    counted += stats.totalCounted;
    payable += stats.totalPayable;
  });

  res.json({
    success: true,
    overview: {
      totalAffiliates: affiliates.length,
      approved,
      pendingJoining,
      activeThisMonth: active,
      totalCounted: counted,
      totalPayable: payable
    }
  });
});

app.get("/api/aff-admin/affiliates", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.query.month || affiliateMonthKey();
  const q = String(req.query.q || "").toLowerCase();

  let list = affiliates.map(a => ({
    ...affiliateSafe(a),
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  if (q) {
    list = list.filter(a =>
      String(a.fullName || "").toLowerCase().includes(q) ||
      String(a.firstName || "").toLowerCase().includes(q) ||
      String(a.lastName || "").toLowerCase().includes(q) ||
      String(a.email || "").toLowerCase().includes(q) ||
      String(a.phone || "").toLowerCase().includes(q) ||
      String(a.referralCode || "").toLowerCase().includes(q) ||
      String(a.sponsorCode || "").toLowerCase().includes(q)
    );
  }

  res.json({ success: true, affiliates: list });
});

app.get("/api/aff-admin/affiliates/:id", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.query.month || affiliateMonthKey();

  const affiliate = affiliates.find(a => a.id === req.params.id || a.referralCode === req.params.id);
  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const sponsor = affiliates.find(a => a.id === affiliate.sponsorId || a.referralCode === affiliate.sponsorCode) || null;
  const directs = getAffiliateDirects(affiliate, affiliates).map(a => ({
    ...affiliateSafe(a),
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  res.json({
    success: true,
    affiliate: affiliateSafe(affiliate),
    sponsor: affiliateSafe(sponsor),
    stats: calculateAffiliateStats(affiliate, affiliates, month),
    directs,
    tree: buildAffiliateTree(affiliate, affiliates)
  });
});

app.post("/api/aff-admin/affiliates/:id/change-sponsor", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const newSponsorCode = String(req.body.newSponsorCode || "").trim().toUpperCase();

  if (!newSponsorCode) {
    affiliate.sponsorId = "";
    affiliate.sponsorCode = "";
    affiliate.updatedAt = new Date().toISOString();
    write("affiliates", affiliates);
    return res.json({ success: true, message: "Sponsor removed.", affiliate: affiliateSafe(affiliate) });
  }

  const sponsor = affiliates.find(a => String(a.referralCode).toUpperCase() === newSponsorCode);

  if (!sponsor) return res.status(404).json({ success: false, message: "New sponsor code not found." });
  if (sponsor.id === affiliate.id) return res.status(400).json({ success: false, message: "Affiliate cannot sponsor themselves." });

  affiliate.sponsorId = sponsor.id;
  affiliate.sponsorCode = sponsor.referralCode;
  affiliate.updatedAt = new Date().toISOString();

  affiliate.adminNotes = Array.isArray(affiliate.adminNotes) ? affiliate.adminNotes : [];
  affiliate.adminNotes.push({
    type: "change_sponsor",
    message: "Sponsor changed to " + sponsor.referralCode,
    createdAt: new Date().toISOString()
  });

  write("affiliates", affiliates);

  res.json({ success: true, message: "Sponsor changed.", affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-joining-paid", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.joiningFeeStatus = "paid";
  affiliate.accountStatus = "approved";
  affiliate.joiningFeePaidAt = affiliate.joiningFeePaidAt || new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-active", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const month = req.body.month || affiliateMonthKey();
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];

  if (!affiliate.activeMonths.includes(month)) affiliate.activeMonths.push(month);

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-inactive", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const month = req.body.month || affiliateMonthKey();
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];
  affiliate.activeMonths = affiliate.activeMonths.filter(m => m !== month);

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/block-payout", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.payoutBlocked = true;
  affiliate.payoutBlockedReason = req.body.reason || "Blocked by admin.";
  affiliate.updatedAt = new Date().toISOString();

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/unblock-payout", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.payoutBlocked = false;
  affiliate.payoutBlockedReason = "";
  affiliate.updatedAt = new Date().toISOString();

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/recalculate", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.body.month || affiliateMonthKey();

  const summary = affiliates.map(a => ({
    affiliateId: a.id,
    referralCode: a.referralCode,
    fullName: a.fullName,
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  write("affiliateCommissionSummary", {
    month,
    generatedAt: new Date().toISOString(),
    summary
  });

  res.json({ success: true, month, count: summary.length, summary });
});
// END AFFILIATE_SYSTEM_ADMIN_V1
`;

  server = server.replace(/app\.listen\(/, apiCode + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
}

/* Admin Affiliates list page */
const affiliatesHtml = `<!doctype html>
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
        <p class="muted">Affiliate Support</p>
        <h1>Affiliate Admin</h1>
      </div>
      <button class="primary" onclick="recalculate()">Recalculate</button>
    </div>

    <section class="metric-grid" id="overviewCards">
      <div class="metric-card"><span>Total Affiliates</span><strong>...</strong></div>
      <div class="metric-card"><span>Active This Month</span><strong>...</strong></div>
      <div class="metric-card"><span>Counted</span><strong>...</strong></div>
      <div class="metric-card"><span>Payable</span><strong>...</strong></div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Affiliate Accounts</h2>
          <p class="muted">Search, manage sponsor issues, active status, joining fee and payout status.</p>
        </div>
        <input class="admin-search" id="searchInput" placeholder="Search name, phone, email, code..." oninput="loadAffiliates()">
      </div>

      <div id="errorBox" class="admin-alert" style="display:none;"></div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Sponsor</th>
              <th>Joining</th>
              <th>Active</th>
              <th>Directs</th>
              <th>Money</th>
              <th>Blocked</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody id="rows">
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

function adminToken() {
  return localStorage.getItem("femifresh_admin_token") || localStorage.getItem("ff_admin_token") || localStorage.getItem("token") || "";
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({ success:false, message:"Invalid server response" }));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function loadOverview() {
  const data = await api("/api/aff-admin/overview");
  const o = data.overview;
  document.getElementById("overviewCards").innerHTML = \`
    <div class="metric-card"><span>Total Affiliates</span><strong>\${o.totalAffiliates}</strong></div>
    <div class="metric-card"><span>Active This Month</span><strong>\${o.activeThisMonth}</strong></div>
    <div class="metric-card"><span>Counted</span><strong>\${money(o.totalCounted)}</strong></div>
    <div class="metric-card"><span>Payable</span><strong>\${money(o.totalPayable)}</strong></div>
  \`;
}

let loadTimer;
function loadAffiliates() {
  clearTimeout(loadTimer);
  loadTimer = setTimeout(loadAffiliatesNow, 250);
}

async function loadAffiliatesNow() {
  const q = document.getElementById("searchInput").value.trim();
  const rows = document.getElementById("rows");
  const errorBox = document.getElementById("errorBox");

  errorBox.style.display = "none";
  rows.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';

  try {
    const data = await api("/api/aff-admin/affiliates?q=" + encodeURIComponent(q));

    if (!data.affiliates.length) {
      rows.innerHTML = '<tr><td colspan="9">No affiliates found.</td></tr>';
      return;
    }

    rows.innerHTML = data.affiliates.map(a => {
      const s = a.stats || {};
      const name = a.fullName || ((a.firstName || "") + " " + (a.lastName || "")).trim() || "---";

      return \`
        <tr>
          <td>
            <strong>\${name}</strong><br>
            <small>\${a.email || ""}<br>\${a.phone || ""}</small>
          </td>
          <td><strong>\${a.referralCode || "---"}</strong></td>
          <td>\${a.sponsorCode || "---"}</td>
          <td><span class="status-pill">\${a.joiningFeeStatus || "pending"}</span></td>
          <td><span class="status-pill">\${s.selfActive ? "Active" : "Inactive"}</span></td>
          <td>\${s.activeDirectRecruits || 0} / \${s.directRecruits || 0}</td>
          <td>
            Counted: <strong>\${money(s.totalCounted)}</strong><br>
            Payable: <strong>\${money(s.totalPayable)}</strong>
          </td>
          <td>\${a.payoutBlocked ? "Blocked" : "No"}</td>
          <td><a class="mini-btn" href="/admin/affiliate-profile.html?id=\${a.id}">Open</a></td>
        </tr>
      \`;
    }).join("");
  } catch (e) {
    rows.innerHTML = '<tr><td colspan="9">Could not load affiliates.</td></tr>';
    errorBox.textContent = e.message;
    errorBox.style.display = "block";
  }
}

async function recalculate() {
  try {
    const data = await api("/api/aff-admin/recalculate", {
      method: "POST",
      body: JSON.stringify({})
    });
    alert("Recalculated " + data.count + " affiliates.");
    loadOverview();
    loadAffiliatesNow();
  } catch (e) {
    alert(e.message);
  }
}

loadOverview();
loadAffiliatesNow();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(adminDir, "affiliates.html"), affiliatesHtml);

/* Admin Affiliate Profile page */
const profileHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Affiliate Profile - FemiFresh Admin</title>
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
        <p class="muted">Affiliate Support Profile</p>
        <h1 id="profileName">Affiliate Profile</h1>
      </div>
      <a class="mini-btn" href="/admin/affiliates.html">Back to Affiliates</a>
    </div>

    <div id="errorBox" class="admin-alert" style="display:none;"></div>

    <section class="metric-grid" id="profileMetrics"></section>

    <section class="profile-grid">
      <div class="panel">
        <h2>Account Details</h2>
        <div id="accountDetails">Loading...</div>
      </div>

      <div class="panel">
        <h2>Admin Actions</h2>
        <div class="action-stack big-actions">
          <button onclick="markJoiningPaid()">Mark Joining Fee Paid</button>
          <button onclick="markActive()">Mark Active This Month</button>
          <button onclick="markInactive()">Mark Inactive This Month</button>
          <button onclick="changeSponsor()">Change Sponsor</button>
          <button onclick="blockPayout()">Block Payout</button>
          <button onclick="unblockPayout()">Unblock Payout</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Direct Recruits</h2>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Joining</th>
              <th>Active</th>
              <th>Money</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody id="directRows">
            <tr><td colspan="6">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</div>

<script src="/admin/js/admin.js"></script>
<script>
const id = new URLSearchParams(location.search).get("id");
const money = n => "R" + Number(n || 0).toFixed(2);
let currentAffiliate = null;

function adminToken() {
  return localStorage.getItem("femifresh_admin_token") || localStorage.getItem("ff_admin_token") || localStorage.getItem("token") || "";
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({ success:false, message:"Invalid server response" }));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function loadProfile() {
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "none";

  try {
    const data = await api("/api/aff-admin/affiliates/" + encodeURIComponent(id));
    const a = data.affiliate;
    const s = data.stats;
    currentAffiliate = a;

    const name = a.fullName || ((a.firstName || "") + " " + (a.lastName || "")).trim() || "Affiliate";
    document.getElementById("profileName").textContent = name;

    document.getElementById("profileMetrics").innerHTML = \`
      <div class="metric-card"><span>Referral Code</span><strong>\${a.referralCode || "---"}</strong></div>
      <div class="metric-card"><span>Active Directs</span><strong>\${s.activeDirectRecruits} / \${s.directRecruits}</strong></div>
      <div class="metric-card"><span>Total Counted</span><strong>\${money(s.totalCounted)}</strong></div>
      <div class="metric-card"><span>Total Payable</span><strong>\${money(s.totalPayable)}</strong></div>
    \`;

    document.getElementById("accountDetails").innerHTML = \`
      <div class="info-lines">
        <p><strong>Email:</strong> \${a.email || "---"}</p>
        <p><strong>Phone:</strong> \${a.phone || "---"}</p>
        <p><strong>Sponsor:</strong> \${data.sponsor ? ((data.sponsor.fullName || data.sponsor.email) + " (" + data.sponsor.referralCode + ")") : "---"}</p>
        <p><strong>Joining Fee:</strong> \${a.joiningFeeStatus || "pending"}</p>
        <p><strong>Account Status:</strong> \${a.accountStatus || "---"}</p>
        <p><strong>Active this month:</strong> \${s.selfActive ? "Yes" : "No"}</p>
        <p><strong>Blocked:</strong> \${a.payoutBlocked ? "Yes" : "No"}</p>
        <p><strong>Blocked reason:</strong> \${a.payoutBlockedReason || s.blockedReason || "---"}</p>
        <p><strong>Needs for target:</strong> \${s.needsForTarget} more active directs</p>
      </div>
    \`;

    if (!data.directs.length) {
      document.getElementById("directRows").innerHTML = '<tr><td colspan="6">No direct recruits yet.</td></tr>';
    } else {
      document.getElementById("directRows").innerHTML = data.directs.map(d => {
        const ds = d.stats || {};
        const dname = d.fullName || ((d.firstName || "") + " " + (d.lastName || "")).trim() || "---";

        return \`
          <tr>
            <td><strong>\${dname}</strong><br><small>\${d.email || ""}</small></td>
            <td>\${d.referralCode || "---"}</td>
            <td>\${d.joiningFeeStatus || "pending"}</td>
            <td>\${ds.selfActive ? "Active" : "Inactive"}</td>
            <td>Payable: \${money(ds.totalPayable)}</td>
            <td><a class="mini-btn" href="/admin/affiliate-profile.html?id=\${d.id}">Open</a></td>
          </tr>
        \`;
      }).join("");
    }
  } catch (e) {
    errorBox.textContent = e.message;
    errorBox.style.display = "block";
  }
}

async function postAction(url, body = {}) {
  await api(url, { method: "POST", body: JSON.stringify(body) });
  loadProfile();
}

function markJoiningPaid() {
  if (confirm("Mark joining fee as paid?")) {
    postAction("/api/aff-admin/affiliates/" + id + "/mark-joining-paid");
  }
}

function markActive() {
  postAction("/api/aff-admin/affiliates/" + id + "/mark-active", {
    month: new Date().toISOString().slice(0, 7)
  });
}

function markInactive() {
  if (confirm("Mark inactive for this month?")) {
    postAction("/api/aff-admin/affiliates/" + id + "/mark-inactive", {
      month: new Date().toISOString().slice(0, 7)
    });
  }
}

function changeSponsor() {
  const code = prompt("Enter new sponsor referral code. Leave empty to remove sponsor.");
  if (code === null) return;

  postAction("/api/aff-admin/affiliates/" + id + "/change-sponsor", {
    newSponsorCode: code
  });
}

function blockPayout() {
  const reason = prompt("Reason for blocking payout:", "Account under review");
  if (!reason) return;

  postAction("/api/aff-admin/affiliates/" + id + "/block-payout", { reason });
}

function unblockPayout() {
  postAction("/api/aff-admin/affiliates/" + id + "/unblock-payout");
}

loadProfile();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(adminDir, "affiliate-profile.html"), profileHtml);

/* Add CSS */
const cssAdd = `

/* Affiliate system admin foundation */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  border: 1px solid rgba(107, 31, 100, 0.12);
  border-radius: 22px;
  padding: 22px;
  box-shadow: 0 18px 45px rgba(107, 31, 100, 0.08);
}

.metric-card span {
  display: block;
  color: #725d74;
  font-weight: 800;
  margin-bottom: 10px;
}

.metric-card strong {
  color: #6b1f64;
  font-size: 28px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.admin-search {
  min-width: 320px;
  border: 1px solid rgba(107, 31, 100, 0.18);
  border-radius: 999px;
  padding: 13px 18px;
  font: inherit;
}

.mini-btn {
  display: inline-flex;
  background: #6b1f64;
  color: white !important;
  padding: 9px 13px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 900;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 22px;
  margin-bottom: 24px;
}

.info-lines p {
  margin: 0 0 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(107, 31, 100, 0.08);
}

.big-actions button {
  width: 100%;
  text-align: center;
}

@media (max-width: 1000px) {
  .metric-grid,
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-search {
    min-width: 100%;
  }
}
`;

let css = fs.readFileSync(adminCssFile, "utf8");
if (!css.includes("Affiliate system admin foundation")) {
  fs.appendFileSync(adminCssFile, cssAdd);
}

console.log("Affiliate system admin foundation upgraded.");
