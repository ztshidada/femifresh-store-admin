const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const jsDir = path.join(publicDir, "js");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

let server = fs.readFileSync(serverFile, "utf8");

/* Detect existing affiliate registration endpoint */
const endpointCandidates = [
  "/api/affiliate/register",
  "/api/affiliates/register",
  "/api/affiliate/signup",
  "/api/affiliates/signup",
  "/api/join",
  "/api/register"
];

let registerEndpoint = "/api/affiliate/register";

for (const ep of endpointCandidates) {
  if (server.includes(`"${ep}"`) || server.includes(`'${ep}'`)) {
    registerEndpoint = ep;
    break;
  }
}

console.log("Using affiliate register endpoint:", registerEndpoint);

/* Add manual payment settings + admin approval API */
if (!server.includes("FEMIFRESH_MANUAL_JOINING_FLOW_V1")) {
  const apiBlock = `

// FEMIFRESH_MANUAL_JOINING_FLOW_V1
function femiManualJoiningDefaults() {
  return {
    joiningFeeAmount: 100,
    yocoAffiliateJoiningFeeEnabled: false,
    manualAffiliateJoiningFeeEnabled: true,
    manualButtonEnabled: true,
    popEmail: "femifresh02@gmail.com",
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof of payment to femifresh02@gmail.com. Use your registered affiliate email as reference.",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
    referenceInstruction: "Use your registered affiliate email as reference."
  };
}

function femiGetManualJoiningSettings() {
  const settings = read("settings", {});
  return {
    ...femiManualJoiningDefaults(),
    ...(settings.manualJoiningPayment || {})
  };
}

function femiSaveManualJoiningSettings(nextSettings) {
  const settings = read("settings", {});
  settings.manualJoiningPayment = {
    ...femiManualJoiningDefaults(),
    ...nextSettings
  };
  write("settings", settings);
  return settings.manualJoiningPayment;
}

function femiAdminCookieRequired(req, res, next) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader.includes("ff_admin_token=")) {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  next();
}

function femiAffiliateIsPaid(a) {
  return !!(
    a.joiningFeePaid ||
    a.manualJoiningFeePaid ||
    a.joiningFeeStatus === "paid" ||
    a.paymentStatus === "paid"
  );
}

app.get("/api/manual-joining-settings", (req, res) => {
  res.json({
    success: true,
    settings: femiGetManualJoiningSettings()
  });
});

app.get("/api/admin/manual-joining-settings", femiAdminCookieRequired, (req, res) => {
  res.json({
    success: true,
    settings: femiGetManualJoiningSettings()
  });
});

app.post("/api/admin/manual-joining-settings", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const saved = femiSaveManualJoiningSettings({
    joiningFeeAmount: Number(body.joiningFeeAmount || 100),
    yocoAffiliateJoiningFeeEnabled: !!body.yocoAffiliateJoiningFeeEnabled,
    manualAffiliateJoiningFeeEnabled: !!body.manualAffiliateJoiningFeeEnabled,
    manualButtonEnabled: !!body.manualButtonEnabled,
    popEmail: String(body.popEmail || "femifresh02@gmail.com").trim(),
    paymentTitle: String(body.paymentTitle || "Manual joining fee payment").trim(),
    paymentInstructions: String(body.paymentInstructions || "").trim(),
    bankName: String(body.bankName || "").trim(),
    accountHolder: String(body.accountHolder || "").trim(),
    accountNumber: String(body.accountNumber || "").trim(),
    branchCode: String(body.branchCode || "").trim(),
    referenceInstruction: String(body.referenceInstruction || "").trim()
  });

  res.json({ success: true, settings: saved });
});

app.get("/api/admin/manual-joining-pending", femiAdminCookieRequired, (req, res) => {
  const affiliates = read("affiliates", []);
  const pending = affiliates.filter(a => !femiAffiliateIsPaid(a));

  res.json({
    success: true,
    affiliates: pending
  });
});

app.post("/api/admin/manual-joining-approve", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const id = String(body.affiliateId || body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  const affiliates = read("affiliates", []);
  const idx = affiliates.findIndex(a =>
    String(a.id || "") === id ||
    String(a.email || "").toLowerCase() === email
  );

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliates[idx] = {
    ...affiliates[idx],
    joiningFeePaid: true,
    manualJoiningFeePaid: true,
    joiningFeeStatus: "paid",
    paymentStatus: "paid",
    status: "approved",
    accountStatus: "approved",
    approved: true,
    isApproved: true,
    approvedAt: affiliates[idx].approvedAt || new Date().toISOString(),
    joiningFeePaidAt: new Date().toISOString(),
    manualJoiningFeeApprovedAt: new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[idx]
  });
});

app.post("/api/admin/manual-joining-unapprove", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const id = String(body.affiliateId || body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  const affiliates = read("affiliates", []);
  const idx = affiliates.findIndex(a =>
    String(a.id || "") === id ||
    String(a.email || "").toLowerCase() === email
  );

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliates[idx] = {
    ...affiliates[idx],
    joiningFeePaid: false,
    manualJoiningFeePaid: false,
    joiningFeeStatus: "pending",
    paymentStatus: "pending",
    status: "pending_payment",
    accountStatus: "pending_payment",
    approved: false,
    isApproved: false
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[idx]
  });
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + apiBlock + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
  console.log("Manual joining fee API added.");
} else {
  console.log("Manual joining fee API already exists.");
}

/* Create clean sign-up page */
fs.writeFileSync(path.join(publicDir, "join.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Create Affiliate Account | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <script src="/js/affiliate-signup-flow.js"></script>
  <style>
    :root{
      --p:#68235f;
      --d:#35112f;
      --pink:#f4a7d8;
      --line:rgba(104,35,95,.15);
      --muted:#6f6372;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:
        radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
        radial-gradient(circle at 90% 18%,rgba(104,35,95,.12),transparent 26%),
        linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7);
      color:#241126;
      min-height:100vh;
    }
    .wrap{
      width:min(1180px,calc(100% - 32px));
      margin:auto;
      padding:70px 0;
      display:grid;
      grid-template-columns:1fr .9fr;
      gap:32px;
      align-items:start;
    }
    .card{
      background:#fff;
      border:1px solid var(--line);
      border-radius:32px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.10);
    }
    h1{
      margin:0 0 16px;
      font-size:clamp(44px,7vw,82px);
      line-height:.95;
      letter-spacing:-.07em;
      color:var(--d);
    }
    h2{margin:0 0 12px;color:var(--d)}
    p{color:var(--muted);line-height:1.65;font-size:17px}
    form{display:grid;gap:14px}
    input{
      width:100%;
      min-height:54px;
      border:1px solid var(--line);
      border-radius:16px;
      padding:14px 16px;
      font-size:16px;
    }
    button,.btn{
      width:100%;
      min-height:56px;
      border:0;
      border-radius:999px;
      background:linear-gradient(135deg,var(--p),#9b358e,var(--pink));
      color:white;
      font-weight:950;
      font-size:16px;
      cursor:pointer;
      text-decoration:none;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      text-align:center;
    }
    .manual{
      background:#fff1fa;
      border:1px solid var(--line);
      border-radius:24px;
      padding:20px;
      margin-top:18px;
    }
    .success{
      display:none;
      background:#e9fff1;
      border:1px solid #b8efc9;
      color:#14592b;
      border-radius:22px;
      padding:18px;
      margin-top:18px;
    }
    .error{
      display:none;
      background:#ffe1e8;
      border:1px solid #ffbccb;
      color:#8a0020;
      border-radius:22px;
      padding:18px;
      margin-top:18px;
    }
    .logo{
      width:86px;
      height:86px;
      object-fit:cover;
      border-radius:26px;
      box-shadow:0 16px 34px rgba(104,35,95,.14);
      margin-bottom:18px;
    }
    @media(max-width:900px){
      .wrap{grid-template-columns:1fr;padding:40px 0}
      .card{padding:24px}
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <img class="logo" src="/images/femifresh-logo.jpg" alt="FemiFresh">
      <h1>Create account</h1>
      <p>Sign up as a FemiFresh affiliate. Your account will be created first, but earning and account functions will stay locked until admin approves your joining fee payment.</p>

      <form id="signupForm">
        <input name="firstName" placeholder="First name" required>
        <input name="lastName" placeholder="Last name" required>
        <input name="phone" placeholder="Phone" required>
        <input name="email" type="email" placeholder="Email" required>
        <input name="password" type="password" placeholder="Password" required>
        <input name="sponsorCode" placeholder="Sponsor code optional">
        <button type="submit">Sign Up</button>
      </form>

      <p style="margin-top:18px;">Already joined? <a href="/login" style="color:var(--p);font-weight:900;">Login</a></p>

      <div class="success" id="successBox"></div>
      <div class="error" id="errorBox"></div>
    </section>

    <aside class="card">
      <h2 id="manualTitle">Manual joining fee payment</h2>
      <div class="manual" id="manualBox">
        Loading payment instructions...
      </div>
    </aside>
  </main>

  <script>
    window.FF_REGISTER_ENDPOINT = "${registerEndpoint}";
  </script>
</body>
</html>`);

/* Signup flow JS */
fs.writeFileSync(path.join(jsDir, "affiliate-signup-flow.js"), `
(async function(){
  let settings = {
    joiningFeeAmount: 100,
    popEmail: "femifresh02@gmail.com",
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.",
    referenceInstruction: "Use your registered affiliate email as reference.",
    yocoAffiliateJoiningFeeEnabled: false,
    manualAffiliateJoiningFeeEnabled: true
  };

  async function loadSettings(){
    try{
      const res = await fetch("/api/manual-joining-settings", {cache:"no-store"});
      const data = await res.json();
      settings = {...settings, ...(data.settings || {})};
    }catch(e){}
  }

  function renderManualBox(){
    const title = document.getElementById("manualTitle");
    const box = document.getElementById("manualBox");
    if(!box) return;

    if(title) title.textContent = settings.paymentTitle || "Manual joining fee payment";

    box.innerHTML = \`
      <p><strong>Amount:</strong> R\${settings.joiningFeeAmount || 100}</p>
      <p>\${settings.paymentInstructions || ""}</p>
      <p><strong>Email POP to:</strong><br>\${settings.popEmail || "femifresh02@gmail.com"}</p>
      \${settings.bankName ? \`<p><strong>Bank:</strong> \${settings.bankName}</p>\` : ""}
      \${settings.accountHolder ? \`<p><strong>Account holder:</strong> \${settings.accountHolder}</p>\` : ""}
      \${settings.accountNumber ? \`<p><strong>Account number:</strong> \${settings.accountNumber}</p>\` : ""}
      \${settings.branchCode ? \`<p><strong>Branch code:</strong> \${settings.branchCode}</p>\` : ""}
      <p><strong>Reference:</strong><br>\${settings.referenceInstruction || "Use your registered affiliate email as reference."}</p>
    \`;
  }

  function saveLoginData(data){
    const token = data.token || data.accessToken || data.affiliateToken || data.jwt || "";
    if(token){
      localStorage.setItem("affiliateToken", token);
      localStorage.setItem("ffAffiliateToken", token);
      localStorage.setItem("femifresh_affiliate_token", token);
    }

    if(data.affiliate){
      localStorage.setItem("affiliate", JSON.stringify(data.affiliate));
      localStorage.setItem("ffAffiliate", JSON.stringify(data.affiliate));
    }
  }

  async function postSignup(payload){
    const endpoint = window.FF_REGISTER_ENDPOINT || "/api/affiliate/register";

    const res = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body:JSON.stringify(payload)
    });

    const data = await res.json().catch(()=>({success:false,message:"Bad server response"}));
    return data;
  }

  document.addEventListener("DOMContentLoaded", async function(){
    await loadSettings();
    renderManualBox();

    const form = document.getElementById("signupForm");
    if(!form) return;

    form.addEventListener("submit", async function(e){
      e.preventDefault();

      const fd = new FormData(form);
      const payload = {
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        name: (fd.get("firstName") + " " + fd.get("lastName")).trim(),
        phone: fd.get("phone"),
        email: fd.get("email"),
        password: fd.get("password"),
        sponsorCode: fd.get("sponsorCode") || "",
        referralCode: fd.get("sponsorCode") || ""
      };

      const btn = form.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Creating account...";

      const data = await postSignup(payload);

      btn.disabled = false;
      btn.textContent = "Sign Up";

      const success = document.getElementById("successBox");
      const error = document.getElementById("errorBox");

      if(!data.success && !data.affiliate){
        error.style.display = "block";
        error.textContent = data.message || "Could not create account.";
        return;
      }

      saveLoginData(data);

      success.style.display = "block";
      success.innerHTML =
        "<strong>Account created.</strong><br>Your dashboard will open now. Functions will stay locked until admin approves your R" +
        (settings.joiningFeeAmount || 100) +
        " joining fee payment.";

      setTimeout(() => {
        location.href = "/dashboard?manualPayment=pending";
      }, 1300);
    });
  });
})();
`);

/* Dashboard gate */
fs.writeFileSync(path.join(jsDir, "affiliate-dashboard-gate.js"), `
(async function(){
  let settings = {
    joiningFeeAmount: 100,
    popEmail: "femifresh02@gmail.com",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com.",
    referenceInstruction: "Use your registered affiliate email as reference."
  };

  async function loadSettings(){
    try{
      const res = await fetch("/api/manual-joining-settings", {cache:"no-store"});
      const data = await res.json();
      settings = {...settings, ...(data.settings || {})};
    }catch(e){}
  }

  function localAffiliate(){
    try{
      return JSON.parse(localStorage.getItem("affiliate") || localStorage.getItem("ffAffiliate") || "{}");
    }catch(e){ return {}; }
  }

  async function fetchAffiliate(){
    const urls = ["/api/affiliate/me", "/api/affiliate/dashboard", "/api/affiliates/me", "/api/me"];
    for(const url of urls){
      try{
        const token = localStorage.getItem("affiliateToken") || localStorage.getItem("ffAffiliateToken") || localStorage.getItem("femifresh_affiliate_token");
        const res = await fetch(url, {
          credentials:"include",
          headers: token ? {Authorization:"Bearer " + token} : {}
        });
        if(!res.ok) continue;
        const data = await res.json();
        return data.affiliate || data.user || data.data || data;
      }catch(e){}
    }
    return localAffiliate();
  }

  function isPaid(a){
    return !!(
      a.joiningFeePaid ||
      a.manualJoiningFeePaid ||
      a.joiningFeeStatus === "paid" ||
      a.paymentStatus === "paid"
    );
  }

  function lockDashboard(a){
    if(document.getElementById("ffDashboardLock")) return;

    const box = document.createElement("section");
    box.id = "ffDashboardLock";
    box.style.cssText =
      "max-width:1100px;margin:24px auto;padding:22px;border-radius:26px;background:#fff1fa;border:1px solid rgba(104,35,95,.16);box-shadow:0 18px 44px rgba(104,35,95,.12);font-family:Inter,system-ui;color:#35112f;";

    box.innerHTML = \`
      <h2 style="margin:0 0 8px;">Account awaiting payment approval</h2>
      <p style="margin:0 0 12px;color:#6f6372;">Your account is created, but earning functions are locked until admin confirms your joining fee payment.</p>
      <div style="background:white;border-radius:18px;padding:16px;border:1px solid rgba(104,35,95,.12);">
        <strong>Manual payment instructions</strong><br>
        Amount: <strong>R\${settings.joiningFeeAmount || 100}</strong><br>
        \${settings.paymentInstructions || ""}<br><br>
        Email proof to: <strong>\${settings.popEmail || "femifresh02@gmail.com"}</strong><br>
        Reference: <strong>\${settings.referenceInstruction || "Use your registered affiliate email as reference."}</strong>
      </div>
    \`;

    document.body.prepend(box);

    document.querySelectorAll("button,a").forEach(el => {
      const txt = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && el.getAttribute("href") || "").toLowerCase();

      if(txt.includes("logout") || txt.includes("copy") || href.includes("logout")) return;

      if(txt.includes("buy") || txt.includes("withdraw") || txt.includes("payment") || txt.includes("activate")) {
        el.style.opacity = ".45";
        el.style.pointerEvents = "none";
        el.title = "Locked until admin approves joining fee payment";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async function(){
    if(!location.pathname.includes("dashboard")) return;

    await loadSettings();

    setTimeout(async () => {
      const a = await fetchAffiliate();
      if(!isPaid(a)) lockDashboard(a);
    }, 700);
  });
})();
`);

/* Inject dashboard gate */
const dashFile = path.join(publicDir, "affiliate-dashboard.html");
if (fs.existsSync(dashFile)) {
  let dash = fs.readFileSync(dashFile, "utf8");
  dash = dash.replace(/<script[^>]+affiliate-dashboard-gate\.js[^>]*><\/script>\s*/gi, "");
  if (!dash.includes("/js/affiliate-dashboard-gate.js")) {
    dash = dash.replace("</head>", '  <script src="/js/affiliate-dashboard-gate.js"></script>\\n</head>');
  }
  fs.writeFileSync(dashFile, dash);
}

/* Admin manual payment settings page */
fs.writeFileSync(path.join(adminDir, "manual-payments.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manual Payments | FemiFresh Admin</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    :root{--p:#68235f;--d:#35112f;--pink:#f4a7d8;--line:#eaddea;--muted:#6f6372}
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui;background:#f7f2f8;color:#241126}
    .shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
    aside{background:#19091b;color:white;padding:24px}
    .logo{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:950;margin-bottom:34px}
    .logo img{width:52px;height:52px;object-fit:cover;border-radius:18px}
    nav{display:grid;gap:8px}
    nav a{color:rgba(255,255,255,.82);padding:13px 14px;border-radius:16px;text-decoration:none;font-weight:850}
    nav a:hover,.active{background:rgba(255,255,255,.12);color:white}
    main{padding:34px}
    h1{font-size:clamp(42px,5vw,72px);letter-spacing:-.07em;margin:0 0 10px;color:var(--d)}
    h2{color:var(--d)}
    p{color:var(--muted);line-height:1.6}
    .card{background:white;border:1px solid var(--line);border-radius:26px;padding:24px;box-shadow:0 18px 44px rgba(104,35,95,.08);margin-bottom:18px}
    label{font-weight:900;color:var(--d);display:block;margin:14px 0 7px}
    input,textarea{width:100%;border:1px solid var(--line);border-radius:14px;padding:13px 15px;font-size:16px}
    textarea{min-height:110px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .full{grid-column:1/-1}
    .btn{border:0;border-radius:999px;background:linear-gradient(135deg,var(--p),#9b358e,var(--pink));color:white;font-weight:950;padding:13px 18px;cursor:pointer}
    .btn.light{background:white;color:var(--p);border:1px solid var(--line)}
    table{width:100%;border-collapse:collapse}
    th,td{text-align:left;border-bottom:1px solid var(--line);padding:13px}
    th{color:var(--p);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    @media(max-width:900px){.shell{display:block}.grid{grid-template-columns:1fr}main{padding:18px}}
  </style>
</head>
<body>
<div class="shell">
  <aside>
    <div class="logo"><img src="/images/femifresh-logo.jpg"><span>FemiFresh Admin</span></div>
    <nav>
      <a href="/admin/dashboard.html">Dashboard</a>
      <a href="/admin/orders.html">Orders</a>
      <a href="/admin/affiliates.html">Affiliates</a>
      <a href="/admin/products.html">Products</a>
      <a class="active" href="/admin/manual-payments.html">Manual Payments</a>
      <a href="/admin/logs.html">Logs</a>
    </nav>
  </aside>
  <main>
    <h1>Manual Payments</h1>
    <p>Set the payment instructions shown after affiliate sign-up, and approve affiliates after POP is received.</p>

    <section class="card">
      <h2>Payment Instructions</h2>
      <div class="grid">
        <div><label>Joining fee amount</label><input id="joiningFeeAmount" type="number"></div>
        <div><label>POP email</label><input id="popEmail"></div>
        <div><label>Bank name</label><input id="bankName"></div>
        <div><label>Account holder</label><input id="accountHolder"></div>
        <div><label>Account number</label><input id="accountNumber"></div>
        <div><label>Branch code</label><input id="branchCode"></div>
        <div class="full"><label>Payment title</label><input id="paymentTitle"></div>
        <div class="full"><label>Payment instructions</label><textarea id="paymentInstructions"></textarea></div>
        <div class="full"><label>Reference instruction</label><input id="referenceInstruction"></div>
      </div>
      <button class="btn" onclick="saveSettings()">Save Details</button>
    </section>

    <section class="card">
      <h2>Pending Payment Approval</h2>
      <div id="pendingBox">Loading...</div>
    </section>
  </main>
</div>

<script>
async function api(url, opts={}){
  const r = await fetch(url,{credentials:"include",headers:{"Content-Type":"application/json"},...opts});
  const j = await r.json().catch(()=>({success:false}));
  if(r.status === 401){ location.href="/admin/login.html"; return {}; }
  return j;
}

async function loadSettings(){
  const d = await api("/api/admin/manual-joining-settings");
  const s = d.settings || {};
  joiningFeeAmount.value = s.joiningFeeAmount || 100;
  popEmail.value = s.popEmail || "femifresh02@gmail.com";
  bankName.value = s.bankName || "";
  accountHolder.value = s.accountHolder || "";
  accountNumber.value = s.accountNumber || "";
  branchCode.value = s.branchCode || "";
  paymentTitle.value = s.paymentTitle || "Manual joining fee payment";
  paymentInstructions.value = s.paymentInstructions || "";
  referenceInstruction.value = s.referenceInstruction || "";
}

async function saveSettings(){
  const body = {
    joiningFeeAmount:Number(joiningFeeAmount.value || 100),
    popEmail:popEmail.value,
    bankName:bankName.value,
    accountHolder:accountHolder.value,
    accountNumber:accountNumber.value,
    branchCode:branchCode.value,
    paymentTitle:paymentTitle.value,
    paymentInstructions:paymentInstructions.value,
    referenceInstruction:referenceInstruction.value,
    manualAffiliateJoiningFeeEnabled:true,
    yocoAffiliateJoiningFeeEnabled:false,
    manualButtonEnabled:true
  };

  const d = await api("/api/admin/manual-joining-settings",{method:"POST",body:JSON.stringify(body)});
  alert(d.success ? "Saved." : "Could not save.");
}

async function loadPending(){
  const d = await api("/api/admin/manual-joining-pending");
  const list = d.affiliates || [];

  if(!list.length){
    pendingBox.innerHTML = "<p>No pending manual payments.</p>";
    return;
  }

  pendingBox.innerHTML = '<table><thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(a => \`
      <tr>
        <td><b>\${a.name || ((a.firstName||"")+" "+(a.lastName||""))}</b></td>
        <td>\${a.email || ""}</td>
        <td>\${a.code || a.referralCode || ""}</td>
        <td>\${a.status || a.accountStatus || "pending_payment"}</td>
        <td><button class="btn light" onclick="approve('\${a.id || ""}','\${a.email || ""}')">Approve Paid</button></td>
      </tr>
    \`).join("") + "</tbody></table>";
}

async function approve(id,email){
  if(!confirm("Approve this affiliate as paid?")) return;
  const d = await api("/api/admin/manual-joining-approve",{method:"POST",body:JSON.stringify({affiliateId:id,email})});
  if(d.success){ alert("Approved."); loadPending(); }
  else alert(d.message || "Could not approve.");
}

loadSettings();
loadPending();
</script>
</body>
</html>`);

/* Add menu link to dashboard/orders/products if possible */
for (const name of ["dashboard.html", "orders.html", "products.html", "affiliates.html"]) {
  const file = path.join(adminDir, name);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("/admin/manual-payments.html")) {
    html = html.replace(/<a href="\/admin\/logs\.html">Logs<\/a>/g, '<a href="/admin/manual-payments.html">Manual Payments</a><a href="/admin/logs.html">Logs</a>');
  }
  fs.writeFileSync(file, html);
}

console.log("Signup approval flow installed.");
