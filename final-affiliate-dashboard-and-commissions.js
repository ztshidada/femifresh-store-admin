const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const dashboardFile = path.join(__dirname, "public", "affiliate-dashboard.html");
const cssFile = path.join(__dirname, "public", "css", "style.css");

let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("AFFILIATE_MEMBER_DASHBOARD_V2")) {
  const apiCode = `

// AFFILIATE_MEMBER_DASHBOARD_V2
function affiliateSafeMemberV2(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateMonthV2() {
  return new Date().toISOString().slice(0, 7);
}

function affiliateIsActiveV2(a, month = affiliateMonthV2()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function getAffiliateTokenV2(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function getLoggedAffiliateV2(req) {
  const token = getAffiliateTokenV2(req);
  if (!token) return null;
  const affiliates = read("affiliates", []);
  return affiliates.find(a => a.token === token) || null;
}

function calculateAffiliateMemberStatsV2(affiliate, affiliates, month = affiliateMonthV2()) {
  const directs = affiliates.filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode);
  const activeDirects = directs.filter(a => affiliateIsActiveV2(a, month));
  const selfActive = affiliateIsActiveV2(affiliate, month);

  const referralBonusCounted = activeDirects.length * 300;
  const targetBonusCounted = activeDirects.length >= 10 ? 1000 : 0;
  const totalCounted = referralBonusCounted + targetBonusCounted;

  const payoutBlocked = affiliate.payoutBlocked === true;
  const totalPayable = selfActive && !payoutBlocked ? totalCounted : 0;
  const totalBlocked = totalCounted - totalPayable;

  let blockedReason = "";
  if (totalCounted > 0 && !selfActive) blockedReason = "You are not active this month. Buy R1350 stock to unlock payout.";
  if (totalCounted > 0 && payoutBlocked) blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin.";

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted,
    targetBonusCounted,
    totalCounted,
    totalPayable,
    totalBlocked,
    blockedReason,
    needsForTarget: Math.max(0, 10 - activeDirects.length)
  };
}

app.get("/api/affiliate/dashboard-v2", (req, res) => {
  const affiliate = getLoggedAffiliateV2(req);

  if (!affiliate) {
    return res.status(401).json({ success: false, message: "Affiliate login required." });
  }

  const affiliates = read("affiliates", []);
  const month = affiliateMonthV2();

  const sponsor = affiliates.find(a => a.id === affiliate.sponsorId || a.referralCode === affiliate.sponsorCode) || null;
  const directs = affiliates
    .filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode)
    .map(a => ({
      ...affiliateSafeMemberV2(a),
      activeThisMonth: affiliateIsActiveV2(a, month)
    }));

  const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\\/$/, "");

  res.json({
    success: true,
    affiliate: affiliateSafeMemberV2(affiliate),
    sponsor: affiliateSafeMemberV2(sponsor),
    stats: calculateAffiliateMemberStatsV2(affiliate, affiliates, month),
    directs,
    referralLink: baseUrl + "/?ref=" + encodeURIComponent(affiliate.referralCode || "")
  });
});

app.post("/api/affiliate/buy-stock-v2", async (req, res) => {
  try {
    const affiliate = getLoggedAffiliateV2(req);

    if (!affiliate) {
      return res.status(401).json({ success: false, message: "Affiliate login required." });
    }

    const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\\/$/, "");

    if (!process.env.YOCO_SECRET_KEY) {
      return res.json({
        success: true,
        payment: "placeholder",
        checkoutUrl: baseUrl + "/dashboard?stock=placeholder"
      });
    }

    const body = {
      amount: 135000,
      currency: "ZAR",
      successUrl: baseUrl + "/dashboard?stock=success",
      cancelUrl: baseUrl + "/dashboard?stock=cancelled",
      failureUrl: baseUrl + "/dashboard?stock=failed",
      metadata: {
        purpose: "affiliate_stock_activation",
        affiliateId: affiliate.id,
        affiliateCode: affiliate.referralCode,
        affiliateEmail: affiliate.email,
        month: affiliateMonthV2()
      }
    };

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: typeof yocoHeaders === "function"
        ? yocoHeaders()
        : {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.YOCO_SECRET_KEY
          },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Could not create stock checkout.",
        error: data
      });
    }

    const checkoutUrl = data.redirectUrl || data.redirect_url || data.checkoutUrl || data.checkout_url || data.url;

    res.json({
      success: true,
      payment: "yoco",
      checkoutUrl: checkoutUrl || baseUrl + "/dashboard?stock=created"
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
// END AFFILIATE_MEMBER_DASHBOARD_V2
`;

  server = server.replace(/app\.listen\(/, apiCode + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
}

const dashboardHtml = `<!doctype html>
<html>
<head>
  <title>Affiliate Dashboard</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main class="affiliate-page">
  <section class="container affiliate-dashboard-v2">
    <div class="dash-topline">
      <div>
        <p class="muted">FemiFresh Affiliate</p>
        <h1 id="welcomeName">Welcome</h1>
      </div>
      <button onclick="logout()">Logout</button>
    </div>

    <div id="noticeBox" class="affiliate-notice" style="display:none;"></div>

    <div class="dash-grid-v2">
      <div class="dash-card"><span>Referral Code</span><strong id="referralCode">---</strong></div>
      <div class="dash-card"><span>Account Status</span><strong id="accountStatus">---</strong></div>
      <div class="dash-card"><span>Active This Month</span><strong id="selfActive">---</strong></div>
      <div class="dash-card"><span>Active Directs</span><strong id="activeDirects">0 / 0</strong></div>
      <div class="dash-card"><span>Referral Bonus Counted</span><strong id="refBonus">R0</strong></div>
      <div class="dash-card"><span>Target Bonus Progress</span><strong id="targetProgress">0 / 10</strong></div>
      <div class="dash-card"><span>Total Counted</span><strong id="totalCounted">R0</strong></div>
      <div class="dash-card"><span>Total Payable</span><strong id="totalPayable">R0</strong></div>
    </div>

    <section class="affiliate-panel">
      <div>
        <h2>Your referral link</h2>
        <p id="referralLink" class="copy-link-text">---</p>
      </div>
      <div class="dash-actions">
        <button onclick="copyLink()">Copy Referral Link</button>
        <button onclick="buyStock()">Buy R1350 Stock</button>
      </div>
    </section>

    <section class="affiliate-panel">
      <h2>Payment Status</h2>
      <div class="info-lines">
        <p><strong>Joining fee:</strong> <span id="joiningFee">---</span></p>
        <p><strong>Sponsor:</strong> <span id="sponsorName">---</span></p>
        <p><strong>Blocked amount:</strong> <span id="blockedAmount">R0</span></p>
        <p><strong>Blocked reason:</strong> <span id="blockedReason">---</span></p>
      </div>
    </section>

    <section class="affiliate-panel">
      <h2>My Direct Recruits</h2>
      <div class="affiliate-table-wrap">
        <table class="affiliate-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Joining</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody id="directRows">
            <tr><td colspan="4">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</main>

<script>
let dashboardData = null;
const money = n => "R" + Number(n || 0).toFixed(2);

function token() {
  return localStorage.getItem("ff_affiliate_token") || "";
}

function showNotice(message) {
  const box = document.getElementById("noticeBox");
  box.textContent = message;
  box.style.display = "block";
}

async function loadDash() {
  const t = token();
  if (!t) return location.href = "/login";

  const res = await fetch("/api/affiliate/dashboard-v2", {
    headers: { Authorization: "Bearer " + t }
  });

  const data = await res.json();

  if (!data.success) {
    localStorage.removeItem("ff_affiliate_token");
    return location.href = "/login";
  }

  dashboardData = data;
  const a = data.affiliate;
  const s = data.stats;

  document.getElementById("welcomeName").textContent = "Welcome, " + (a.firstName || a.fullName || "Affiliate");
  document.getElementById("referralCode").textContent = a.referralCode || "---";
  document.getElementById("accountStatus").textContent = a.accountStatus || "---";
  document.getElementById("selfActive").textContent = s.selfActive ? "Yes" : "No";
  document.getElementById("activeDirects").textContent = s.activeDirectRecruits + " / " + s.directRecruits;
  document.getElementById("refBonus").textContent = money(s.referralBonusCounted);
  document.getElementById("targetProgress").textContent = s.activeDirectRecruits + " / 10";
  document.getElementById("totalCounted").textContent = money(s.totalCounted);
  document.getElementById("totalPayable").textContent = money(s.totalPayable);

  document.getElementById("referralLink").textContent = data.referralLink || "---";
  document.getElementById("joiningFee").textContent = a.joiningFeeStatus || "pending";
  document.getElementById("sponsorName").textContent = data.sponsor ? ((data.sponsor.fullName || data.sponsor.email) + " (" + data.sponsor.referralCode + ")") : "---";
  document.getElementById("blockedAmount").textContent = money(s.totalBlocked);
  document.getElementById("blockedReason").textContent = s.blockedReason || "---";

  if (!data.directs.length) {
    document.getElementById("directRows").innerHTML = '<tr><td colspan="4">No direct recruits yet.</td></tr>';
  } else {
    document.getElementById("directRows").innerHTML = data.directs.map(d => {
      const name = d.fullName || ((d.firstName || "") + " " + (d.lastName || "")).trim() || "---";
      return \`
        <tr>
          <td>\${name}<br><small>\${d.email || ""}</small></td>
          <td><strong>\${d.referralCode || "---"}</strong></td>
          <td>\${d.joiningFeeStatus || "pending"}</td>
          <td>\${d.activeThisMonth ? "Active" : "Inactive"}</td>
        </tr>
      \`;
    }).join("");
  }
}

function copyLink() {
  const link = dashboardData?.referralLink || document.getElementById("referralLink").textContent;
  navigator.clipboard.writeText(link);
  showNotice("Referral link copied.");
}

async function buyStock() {
  const res = await fetch("/api/affiliate/buy-stock-v2", {
    method: "POST",
    headers: { Authorization: "Bearer " + token() }
  });

  const data = await res.json();

  if (!data.success) {
    showNotice(data.message || "Could not start stock payment.");
    return;
  }

  location.href = data.checkoutUrl;
}

function logout() {
  localStorage.removeItem("ff_affiliate_token");
  localStorage.removeItem("ff_affiliate");
  location.href = "/login";
}

const params = new URLSearchParams(location.search);
if (params.get("stock") === "success") {
  showNotice("Stock payment received. Activation will update after payment confirmation.");
}

loadDash();
</script>
</body>
</html>`;

fs.writeFileSync(dashboardFile, dashboardHtml);

const cssAdd = `

/* Affiliate member dashboard v2 */
.affiliate-dashboard-v2 {
  padding-top: 55px;
  padding-bottom: 70px;
}

.dash-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}

.dash-topline h1 {
  font-size: clamp(34px, 5vw, 58px);
  margin: 0;
  color: #2a162f;
}

.dash-topline button,
.dash-actions button {
  border: 0;
  border-radius: 999px;
  background: #6b1f64;
  color: white;
  font-weight: 900;
  padding: 14px 22px;
  cursor: pointer;
}

.dash-grid-v2 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 22px;
}

.affiliate-panel {
  background: white;
  border: 1px solid rgba(107, 31, 100, 0.12);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 45px rgba(107, 31, 100, 0.08);
  margin-bottom: 22px;
}

.affiliate-panel h2 {
  margin-top: 0;
}

.copy-link-text {
  background: #f7e6f4;
  color: #6b1f64;
  padding: 14px 16px;
  border-radius: 14px;
  word-break: break-all;
  font-weight: 800;
}

.dash-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.affiliate-notice {
  background: #fff4fb;
  border: 1px solid #e7c5df;
  color: #6b1f64;
  font-weight: 900;
  padding: 14px 16px;
  border-radius: 14px;
  margin-bottom: 18px;
}

.affiliate-table-wrap {
  overflow-x: auto;
}

.affiliate-table {
  width: 100%;
  border-collapse: collapse;
}

.affiliate-table th,
.affiliate-table td {
  text-align: left;
  padding: 14px;
  border-bottom: 1px solid rgba(107, 31, 100, 0.1);
}

.affiliate-table th {
  color: #6b1f64;
  text-transform: uppercase;
  font-size: 13px;
}

@media (max-width: 950px) {
  .dash-grid-v2 {
    grid-template-columns: 1fr;
  }

  .dash-topline {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;

let css = fs.readFileSync(cssFile, "utf8");
if (!css.includes("Affiliate member dashboard v2")) {
  fs.appendFileSync(cssFile, cssAdd);
}

console.log("Final affiliate dashboard and commission view installed.");
