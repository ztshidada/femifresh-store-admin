const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const publicDir = path.join(__dirname, "public");
const cssFile = path.join(publicDir, "css", "style.css");

let server = fs.readFileSync(serverFile, "utf8");

if (server.includes("AFFILIATE_JOINING_SYSTEM_V1")) {
  console.log("Affiliate joining system already installed.");
  process.exit(0);
}

const affiliateRoutes = `

// AFFILIATE_JOINING_SYSTEM_V1
function makeAffiliateCode(firstName, lastName) {
  const base = String((firstName || "") + (lastName || ""))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "FEMI";
  return base + Math.floor(1000 + Math.random() * 9000);
}

function publicAffiliate(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const affiliates = read("affiliates", []);
  return affiliates.find(a => a.token === token) || null;
}

function affiliateUrl(req) {
  return (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\\/$/, "");
}

function isAffiliateSubdomain(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return host.startsWith("affiliates.");
}

async function createJoiningFeeCheckout(affiliate, req) {
  const baseUrl = affiliateUrl(req);

  if (!process.env.YOCO_SECRET_KEY) {
    return {
      success: false,
      payment: "placeholder",
      checkoutUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode)
    };
  }

  const body = {
    amount: 10000,
    currency: "ZAR",
    successUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode) + "&payment=success",
    cancelUrl: baseUrl + "/?payment=cancelled",
    failureUrl: baseUrl + "/?payment=failed",
    metadata: {
      purpose: "affiliate_joining_fee",
      affiliateId: affiliate.id,
      affiliateCode: affiliate.referralCode,
      affiliateEmail: affiliate.email
    }
  };

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: yocoHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      payment: "placeholder",
      checkoutUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode),
      error: data
    };
  }

  const checkoutUrl = data.redirectUrl || data.redirect_url || data.checkoutUrl || data.checkout_url || data.url;

  return {
    success: true,
    payment: "yoco",
    checkoutUrl: checkoutUrl || baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode),
    data
  };
}

app.get("/join", (req, res) => res.sendFile(path.join(__dirname, "public", "join.html")));
app.get("/affiliate-login", (req, res) => res.sendFile(path.join(__dirname, "public", "affiliate-login.html")));
app.get("/affiliate-dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html")));
app.get("/join-success", (req, res) => res.sendFile(path.join(__dirname, "public", "join-success.html")));

app.get("/", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "join.html"));
  next();
});

app.get("/login", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  next();
});

app.get("/dashboard", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  next();
});

app.get("/success", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  next();
});

app.post("/api/affiliate/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, sponsorCode = "" } = req.body || {};

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: "Please complete all required fields." });
    }

    const affiliates = read("affiliates", []);
    const exists = affiliates.find(a => String(a.email).toLowerCase() === String(email).toLowerCase());

    if (exists) {
      return res.status(400).json({ success: false, message: "This email already has an affiliate account." });
    }

    let referralCode = makeAffiliateCode(firstName, lastName);
    while (affiliates.find(a => a.referralCode === referralCode)) {
      referralCode = makeAffiliateCode(firstName, lastName);
    }

    const sponsor = sponsorCode
      ? affiliates.find(a => String(a.referralCode).toUpperCase() === String(sponsorCode).toUpperCase())
      : null;

    const affiliate = {
      id: uuid(),
      firstName,
      lastName,
      fullName: firstName + " " + lastName,
      phone,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      token: crypto.randomBytes(32).toString("hex"),
      referralCode,
      sponsorCode: sponsor ? sponsor.referralCode : "",
      sponsorId: sponsor ? sponsor.id : "",
      accountStatus: "pending_joining_fee",
      joiningFeeStatus: "pending",
      joiningFeeAmount: 100,
      activeMonths: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    affiliates.unshift(affiliate);
    write("affiliates", affiliates);

    const checkout = await createJoiningFeeCheckout(affiliate, req);

    res.json({
      success: true,
      affiliate: publicAffiliate(affiliate),
      token: affiliate.token,
      payment: checkout.payment,
      checkoutUrl: checkout.checkoutUrl
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/affiliate/login", (req, res) => {
  const { email, password } = req.body || {};
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.email).toLowerCase() === String(email).toLowerCase());

  if (!affiliate || !bcrypt.compareSync(password || "", affiliate.passwordHash || "")) {
    return res.status(401).json({ success: false, message: "Wrong email or password." });
  }

  affiliate.token = crypto.randomBytes(32).toString("hex");
  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: publicAffiliate(affiliate), token: affiliate.token });
});

app.get("/api/affiliate/me", (req, res) => {
  const affiliate = affiliateFromToken(req);

  if (!affiliate) {
    return res.status(401).json({ success: false, message: "Not logged in." });
  }

  const affiliates = read("affiliates", []);
  const month = new Date().toISOString().slice(0, 7);
  const directs = affiliates.filter(a => a.sponsorId === affiliate.id);
  const activeDirects = directs.filter(a => Array.isArray(a.activeMonths) && a.activeMonths.includes(month));
  const selfActive = Array.isArray(affiliate.activeMonths) && affiliate.activeMonths.includes(month);

  res.json({
    success: true,
    affiliate: publicAffiliate(affiliate),
    stats: {
      month,
      selfActive,
      directRecruits: directs.length,
      activeDirectRecruits: activeDirects.length,
      targetBonusCounted: activeDirects.length >= 10 ? 1000 : 0,
      targetBonusPayable: selfActive && activeDirects.length >= 10 ? 1000 : 0,
      referralBonusPerActiveRecruit: 300
    }
  });
});
// END AFFILIATE_JOINING_SYSTEM_V1
`;

server = server.replace(/app\.listen\(/, affiliateRoutes + "\napp.listen(");
fs.writeFileSync(serverFile, server);

const joinHtml = `<!doctype html>
<html>
<head>
  <title>Join FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main class="affiliate-page">
  <section class="container affiliate-wrap">
    <div class="affiliate-copy">
      <h1>Join FemiFresh</h1>
      <p>Open your affiliate account with a once-off R100 joining fee.</p>
      <div class="rule-box">
        <p><strong>Joining fee:</strong> R100 once-off</p>
        <p><strong>Stock package:</strong> R1,350 monthly activation</p>
        <p><strong>Referral bonus:</strong> R300</p>
        <p><strong>Target bonus:</strong> R1,000 for 10 active direct recruits</p>
      </div>
    </div>

    <form class="affiliate-card" onsubmit="registerAffiliate(event)">
      <h2>Create account</h2>
      <input name="firstName" placeholder="First name" required>
      <input name="lastName" placeholder="Last name" required>
      <input name="phone" placeholder="Phone" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="password" placeholder="Password" required>
      <input name="sponsorCode" id="sponsorCode" placeholder="Sponsor code optional">
      <button type="submit">Join and Pay R100</button>
      <p>Already joined? <a href="/login">Login</a></p>
    </form>
  </section>
</main>

<script>
const ref = new URLSearchParams(location.search).get("ref");
if (ref) document.getElementById("sponsorCode").value = ref;

async function registerAffiliate(e) {
  e.preventDefault();
  const body = {};
  new FormData(e.target).forEach((value, key) => body[key] = value);

  const res = await fetch("/api/affiliate/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Registration failed.");
    return;
  }

  localStorage.setItem("ff_affiliate_token", data.token);
  localStorage.setItem("ff_affiliate", JSON.stringify(data.affiliate));
  location.href = data.checkoutUrl;
}
</script>
</body>
</html>`;

const loginHtml = `<!doctype html>
<html>
<head>
  <title>Affiliate Login</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main class="affiliate-page">
  <section class="container auth-center">
    <form class="affiliate-card small-auth" onsubmit="loginAffiliate(event)">
      <h2>Affiliate Login</h2>
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
      <p>New affiliate? <a href="/">Join here</a></p>
    </form>
  </section>
</main>

<script>
async function loginAffiliate(e) {
  e.preventDefault();
  const fd = new FormData(e.target);

  const res = await fetch("/api/affiliate/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: fd.get("email"),
      password: fd.get("password")
    })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Login failed.");
    return;
  }

  localStorage.setItem("ff_affiliate_token", data.token);
  localStorage.setItem("ff_affiliate", JSON.stringify(data.affiliate));
  location.href = "/dashboard";
}
</script>
</body>
</html>`;

const dashboardHtml = `<!doctype html>
<html>
<head>
  <title>Affiliate Dashboard</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main class="affiliate-page">
  <section class="container affiliate-dashboard">
    <h1 id="welcomeName">Welcome</h1>
    <div class="dash-grid">
      <div class="dash-card"><span>Referral Code</span><strong id="referralCode">---</strong></div>
      <div class="dash-card"><span>Account Status</span><strong id="accountStatus">---</strong></div>
      <div class="dash-card"><span>Active Directs</span><strong id="activeDirects">0</strong></div>
      <div class="dash-card"><span>Target Bonus Payable</span><strong id="targetPayable">R0</strong></div>
    </div>
    <button onclick="copyLink()">Copy Referral Link</button>
    <button onclick="logout()">Logout</button>
  </section>
</main>

<script>
async function loadDash() {
  const token = localStorage.getItem("ff_affiliate_token");
  if (!token) return location.href = "/login";

  const res = await fetch("/api/affiliate/me", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (!data.success) return location.href = "/login";

  document.getElementById("welcomeName").textContent = "Welcome, " + data.affiliate.firstName;
  document.getElementById("referralCode").textContent = data.affiliate.referralCode;
  document.getElementById("accountStatus").textContent = data.affiliate.accountStatus;
  document.getElementById("activeDirects").textContent = data.stats.activeDirectRecruits;
  document.getElementById("targetPayable").textContent = "R" + data.stats.targetBonusPayable;
}

function copyLink() {
  const code = document.getElementById("referralCode").textContent;
  const link = location.origin + "/?ref=" + code;
  navigator.clipboard.writeText(link);
  alert("Copied: " + link);
}

function logout() {
  localStorage.removeItem("ff_affiliate_token");
  location.href = "/login";
}

loadDash();
</script>
</body>
</html>`;

const successHtml = `<!doctype html>
<html>
<head>
  <title>Joining Received</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main class="affiliate-page">
  <section class="container auth-center">
    <div class="affiliate-card small-auth center-text">
      <h1>Joining received</h1>
      <p>Your affiliate account has been created. If payment was successful, your joining fee will be confirmed automatically.</p>
      <a href="/login">Go to login</a>
    </div>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, "join.html"), joinHtml);
fs.writeFileSync(path.join(publicDir, "affiliate-login.html"), loginHtml);
fs.writeFileSync(path.join(publicDir, "affiliate-dashboard.html"), dashboardHtml);
fs.writeFileSync(path.join(publicDir, "join-success.html"), successHtml);

const cssAdd = `

/* AFFILIATE_JOINING_CSS_V1 */
.affiliate-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #fff6fc, #f7e6f4);
}

.affiliate-wrap {
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 30px;
  padding-top: 60px;
  padding-bottom: 60px;
}

.affiliate-copy h1 {
  font-size: clamp(42px, 6vw, 72px);
  color: #2a162f;
}

.affiliate-card,
.rule-box,
.dash-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 45px rgba(107, 31, 100, 0.12);
  border: 1px solid rgba(107, 31, 100, 0.12);
}

.affiliate-card {
  display: grid;
  gap: 14px;
}

.affiliate-card input {
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid #d8c3d5;
  border-radius: 12px;
  font-size: 16px;
}

.affiliate-card button,
.affiliate-dashboard button {
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  background: #6b1f64;
  color: white;
  font-weight: 900;
  cursor: pointer;
  padding: 0 22px;
}

.auth-center {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

.small-auth {
  width: min(100%, 500px);
}

.affiliate-dashboard {
  padding-top: 60px;
}

.dash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.dash-card span {
  display: block;
  color: #735f75;
  margin-bottom: 10px;
}

.dash-card strong {
  color: #6b1f64;
  font-size: 24px;
}

@media (max-width: 900px) {
  .affiliate-wrap,
  .dash-grid {
    grid-template-columns: 1fr;
  }
}
`;

if (!fs.readFileSync(cssFile, "utf8").includes("AFFILIATE_JOINING_CSS_V1")) {
  fs.appendFileSync(cssFile, cssAdd);
}

console.log("Affiliate joining fee patch file created and applied.");
