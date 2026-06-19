const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const jsDir = path.join(publicDir, "js");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(jsDir, { recursive: true });

let server = fs.readFileSync(serverFile, "utf8");

/* Backend APIs for affiliate referral features */
if (!server.includes("FEMI_AFFILIATE_SENAFIX_FEATURES_V1")) {
  const block = `

// FEMI_AFFILIATE_SENAFIX_FEATURES_V1
function femiAffNorm(v) {
  return String(v || "").trim().toLowerCase();
}

function femiFindAffiliate(req) {
  const q = req.query || {};
  const b = req.body || {};
  const token = String(q.token || b.token || "").trim();
  const id = String(q.id || b.id || "").trim();
  const email = femiAffNorm(q.email || b.email);

  const affiliates = read("affiliates", []);

  return affiliates.find(a => {
    return (
      (token && String(a.token || "") === token) ||
      (id && String(a.id || "") === id) ||
      (email && femiAffNorm(a.email) === email)
    );
  }) || null;
}

function femiAffName(a) {
  return a.fullName || a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || "Affiliate";
}

function femiAffCode(a) {
  return a.referralCode || a.code || a.affiliateCode || "";
}

function femiAffiliateJoined(a) {
  return !!(
    a.joiningFeePaid ||
    a.manualJoiningFeePaid ||
    a.joiningFeeStatus === "paid" ||
    a.paymentStatus === "paid" ||
    a.accountStatus === "approved" ||
    a.approved === true ||
    a.isApproved === true
  );
}

function femiDirectsFor(affiliate, affiliates) {
  const code = femiAffCode(affiliate);
  const id = affiliate.id;

  return affiliates.filter(a => {
    return (
      (code && String(a.sponsorCode || "").toUpperCase() === String(code).toUpperCase()) ||
      (id && String(a.sponsorId || "") === String(id)) ||
      (code && String(a.referrerCode || "").toUpperCase() === String(code).toUpperCase())
    );
  });
}

function femiBuildDownline(rootAffiliate, affiliates, level = 1, max = 10, seen = new Set()) {
  if (!rootAffiliate || level > max) return [];

  const rootId = rootAffiliate.id || femiAffCode(rootAffiliate);
  if (seen.has(rootId)) return [];
  seen.add(rootId);

  const directs = femiDirectsFor(rootAffiliate, affiliates);

  return directs.map(a => ({
    id: a.id,
    level,
    fullName: femiAffName(a),
    email: a.email,
    phone: a.phone,
    referralCode: femiAffCode(a),
    joined: femiAffiliateJoined(a),
    children: femiBuildDownline(a, affiliates, level + 1, max, seen)
  }));
}

app.get("/api/affiliate/femi-features", (req, res) => {
  const affiliate = femiFindAffiliate(req);

  if (!affiliate) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  const affiliates = read("affiliates", []);
  const directs = femiDirectsFor(affiliate, affiliates);

  res.json({
    success: true,
    affiliate: {
      id: affiliate.id,
      fullName: femiAffName(affiliate),
      email: affiliate.email,
      phone: affiliate.phone,
      referralCode: femiAffCode(affiliate),
      bankDetails: affiliate.bankDetails || {}
    },
    referralLink: "https://affiliates.femifresh.co.za/?ref=" + encodeURIComponent(femiAffCode(affiliate)),
    directReferrals: directs.map(a => ({
      id: a.id,
      fullName: femiAffName(a),
      email: a.email,
      phone: a.phone,
      referralCode: femiAffCode(a),
      joined: femiAffiliateJoined(a),
      monthlyStatus: femiAffiliateJoined(a) ? "Joined" : "Not Yet This Month"
    })),
    downline: femiBuildDownline(affiliate, affiliates, 1, 10)
  });
});

app.post("/api/affiliate/femi-bank-details", (req, res) => {
  const affiliate = femiFindAffiliate(req);

  if (!affiliate) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  const affiliates = read("affiliates", []);
  const index = affiliates.findIndex(a => String(a.id || "") === String(affiliate.id || ""));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  const body = req.body || {};

  affiliates[index] = {
    ...affiliates[index],
    bankDetails: {
      accountHolderName: String(body.accountHolderName || "").trim(),
      bankName: String(body.bankName || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
      branchCode: String(body.branchCode || "").trim(),
      accountType: String(body.accountType || "").trim()
    },
    updatedAt: new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    bankDetails: affiliates[index].bankDetails
  });
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

/* Frontend feature injector */
fs.writeFileSync(path.join(jsDir, "femi-affiliate-senafix-features.js"), `
(function(){
  const API = "/api/affiliate/femi-features";

  function getStoredAffiliate(){
    const keys = [
      "affiliate",
      "ff_affiliate",
      "femifresh_affiliate",
      "affiliateUser",
      "user"
    ];

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        const parsed = JSON.parse(value);
        if (parsed && (parsed.email || parsed.id || parsed.token || parsed.referralCode)) return parsed;
      } catch(e){}
    }

    return {};
  }

  function getIdentity(){
    const a = getStoredAffiliate();

    const params = new URLSearchParams(location.search);

    return {
      id: a.id || params.get("id") || "",
      email: a.email || params.get("email") || "",
      token: a.token || localStorage.getItem("affiliateToken") || localStorage.getItem("ff_affiliate_token") || ""
    };
  }

  async function loadData(){
    const id = getIdentity();

    const qs = new URLSearchParams();
    if (id.id) qs.set("id", id.id);
    if (id.email) qs.set("email", id.email);
    if (id.token) qs.set("token", id.token);

    const res = await fetch(API + "?" + qs.toString(), {credentials:"include"});
    return res.json().catch(() => ({}));
  }

  function copy(text){
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied.");
    }).catch(() => {
      prompt("Copy this:", text);
    });
  }

  function flattenTree(nodes, out = []){
    nodes.forEach(n => {
      out.push(n);
      if (n.children && n.children.length) flattenTree(n.children, out);
    });
    return out;
  }

  function makeDownlineHtml(nodes){
    const flat = flattenTree(nodes);

    if (!flat.length) {
      return \`
        <div class="ff-feature-empty">
          <strong>No downline yet.</strong>
          <p>Share your referral link/code to start building your team.</p>
        </div>
      \`;
    }

    return \`
      <div class="ff-downline-list">
        \${flat.map(a => \`
          <div class="ff-downline-row">
            <div>
              <strong>Level \${a.level}: \${a.fullName}</strong>
              <small>\${a.phone || ""} \${a.email ? " • " + a.email : ""}</small>
            </div>
            <span>\${a.joined ? "Joined" : "Pending"}</span>
          </div>
        \`).join("")}
      </div>
    \`;
  }

  function featureStyles(){
    if (document.getElementById("ff-senafix-feature-style")) return;

    const style = document.createElement("style");
    style.id = "ff-senafix-feature-style";
    style.innerHTML = \`
      .ff-senafix-feature-card{
        background:rgba(255,255,255,.92);
        border:1px solid rgba(104,35,95,.14);
        border-radius:28px;
        box-shadow:0 18px 46px rgba(104,35,95,.08);
        padding:28px;
        margin:24px 0;
        color:#241126;
      }
      .ff-senafix-feature-card h2{
        color:#35112f;
        font-size:clamp(34px,5vw,56px);
        letter-spacing:-.06em;
        line-height:.95;
        margin:0 0 20px;
      }
      .ff-ref-box{
        background:#fff1fa;
        border:1px solid rgba(104,35,95,.12);
        color:#68235f;
        border-radius:18px;
        padding:16px;
        font-weight:900;
        overflow-wrap:anywhere;
        margin:12px 0;
      }
      .ff-feature-actions{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      }
      .ff-feature-actions button,
      .ff-feature-actions a{
        border:0;
        border-radius:999px;
        min-height:46px;
        padding:12px 18px;
        background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
        color:white;
        font-weight:950;
        text-decoration:none;
        cursor:pointer;
      }
      .ff-feature-actions .whatsapp{
        background:#18b957;
      }
      .ff-feature-table{
        width:100%;
        border-collapse:collapse;
        min-width:760px;
      }
      .ff-feature-table th{
        text-align:left;
        color:#68235f;
        background:#fff7fd;
        padding:14px;
        text-transform:uppercase;
        letter-spacing:.12em;
        font-size:12px;
      }
      .ff-feature-table td{
        padding:14px;
        border-bottom:1px solid rgba(104,35,95,.10);
      }
      .ff-table-scroll{overflow:auto;border-radius:18px}
      .ff-downline-row{
        display:flex;
        justify-content:space-between;
        gap:16px;
        padding:14px;
        border:1px solid rgba(104,35,95,.10);
        border-radius:18px;
        margin:10px 0;
        background:#fffafd;
      }
      .ff-downline-row small{display:block;color:#6f6372;margin-top:4px}
      .ff-downline-row span{
        color:#68235f;
        font-weight:950;
      }
      .ff-feature-empty{
        background:#fff7fd;
        border:1px solid rgba(104,35,95,.10);
        border-radius:18px;
        padding:18px;
      }
      @media(max-width:700px){
        .ff-feature-actions{display:grid}
        .ff-feature-actions button,.ff-feature-actions a{width:100%;text-align:center}
        .ff-downline-row{display:block}
      }
    \`;
    document.head.appendChild(style);
  }

  function build(data){
    if (!data.success) return;

    featureStyles();

    if (document.getElementById("ff-senafix-features")) return;

    const affiliate = data.affiliate || {};
    const code = affiliate.referralCode || "";
    const link = data.referralLink || ("https://affiliates.femifresh.co.za/?ref=" + code);

    const whatsappText = encodeURIComponent("Join FemiFresh using my referral link: " + link);

    const directRows = (data.directReferrals || []).map(a => \`
      <tr>
        <td><strong>\${a.fullName || "Affiliate"}</strong></td>
        <td>\${a.phone || ""}</td>
        <td>\${a.joined ? "Yes" : "No"}</td>
        <td>\${a.monthlyStatus || "Not Yet This Month"}</td>
      </tr>
    \`).join("");

    const wrapper = document.createElement("div");
    wrapper.id = "ff-senafix-features";
    wrapper.innerHTML = \`
      <section class="ff-senafix-feature-card">
        <h2>Your referral tools</h2>
        <label><strong>Referral Link</strong></label>
        <div class="ff-ref-box">\${link}</div>
        <div class="ff-feature-actions">
          <button type="button" id="ffCopyLink">Copy Referral Link</button>
          <button type="button" id="ffCopyCode">Copy Referral Code</button>
          <a class="whatsapp" href="https://wa.me/?text=\${whatsappText}" target="_blank">Share on WhatsApp</a>
          <a href="/settings">Payment Settings</a>
        </div>
      </section>

      <section class="ff-senafix-feature-card">
        <h2>Direct Referrals</h2>
        <div class="ff-table-scroll">
          <table class="ff-feature-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Monthly Status</th>
              </tr>
            </thead>
            <tbody>
              \${directRows || '<tr><td colspan="4">No direct referrals yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="ff-senafix-feature-card">
        <h2>My Downline Tree (10 Levels)</h2>
        <p>This shows your FemiFresh team structure up to 10 levels deep.</p>
        <div class="ff-ref-box"><strong>Total Team Members:</strong> \${flattenTree(data.downline || []).length}</div>
        \${makeDownlineHtml(data.downline || [])}
      </section>
    \`;

    document.body.appendChild(wrapper);

    document.getElementById("ffCopyLink").onclick = () => copy(link);
    document.getElementById("ffCopyCode").onclick = () => copy(code);
  }

  async function boot(){
    if (!location.pathname.includes("dashboard") && !location.pathname.includes("home")) return;

    const data = await loadData();
    build(data);
  }

  document.addEventListener("DOMContentLoaded", boot);
  setTimeout(boot, 1200);
})();
`);

/* Payment settings page */
fs.writeFileSync(path.join(publicDir, "settings.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Settings | FemiFresh</title>
  <style>
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:linear-gradient(180deg,#fff8fd,#fff1fa);
      color:#241126;
      padding:34px;
    }
    .wrap{max-width:1100px;margin:auto}
    h1{
      color:#35112f;
      font-size:clamp(42px,6vw,70px);
      letter-spacing:-.06em;
      margin:0 0 20px;
    }
    .nav{display:flex;gap:14px;margin-bottom:22px;flex-wrap:wrap}
    .nav a{font-weight:950;color:#68235f;text-decoration:none}
    .card{
      background:white;
      border:1px solid rgba(104,35,95,.14);
      border-radius:28px;
      padding:28px;
      box-shadow:0 18px 46px rgba(104,35,95,.08);
      margin-bottom:22px;
    }
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    label{font-weight:900;color:#35112f}
    input,select{
      width:100%;
      min-height:52px;
      border:1px solid rgba(104,35,95,.14);
      border-radius:16px;
      padding:12px 14px;
      margin-top:6px;
      font-size:16px;
      box-sizing:border-box;
    }
    button{
      margin-top:18px;
      border:0;
      border-radius:999px;
      min-height:50px;
      padding:12px 20px;
      color:white;
      background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
      font-weight:950;
      cursor:pointer;
    }
    @media(max-width:900px){body{padding:18px}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Payment Settings</h1>
    <div class="nav">
      <a href="/dashboard">Home</a>
      <a href="/settings">Settings</a>
      <a href="/dashboard">Back to Dashboard</a>
    </div>

    <div class="card" id="profileBox">Loading profile...</div>

    <div class="card">
      <h2>Bank Details</h2>
      <form id="bankForm">
        <div class="grid">
          <label>Account Holder Name
            <input name="accountHolderName">
          </label>
          <label>Bank Name
            <input name="bankName">
          </label>
          <label>Account Number
            <input name="accountNumber">
          </label>
          <label>Branch Code
            <input name="branchCode">
          </label>
          <label>Account Type
            <select name="accountType">
              <option value="">Select account type</option>
              <option>Savings</option>
              <option>Cheque</option>
              <option>Current</option>
              <option>Business</option>
            </select>
          </label>
        </div>
        <button>Save Bank Details</button>
      </form>
    </div>
  </div>

<script>
function getStoredAffiliate(){
  const keys = ["affiliate","ff_affiliate","femifresh_affiliate","affiliateUser","user"];
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (parsed && (parsed.email || parsed.id || parsed.token)) return parsed;
    } catch(e){}
  }
  return {};
}

function identity(){
  const a = getStoredAffiliate();
  const qs = new URLSearchParams();
  if(a.id) qs.set("id", a.id);
  if(a.email) qs.set("email", a.email);
  if(a.token) qs.set("token", a.token);
  return qs;
}

async function load(){
  const res = await fetch("/api/affiliate/femi-features?" + identity().toString(), {credentials:"include"});
  const data = await res.json().catch(()=>({}));

  if(!data.success){
    profileBox.textContent = "Could not load profile.";
    return;
  }

  const a = data.affiliate || {};
  const bank = a.bankDetails || {};

  profileBox.innerHTML = \`
    <p><strong>Name:</strong> \${a.fullName || ""}</p>
    <p><strong>Phone:</strong> \${a.phone || ""}</p>
    <p><strong>Email:</strong> \${a.email || ""}</p>
    <p><strong>Referral Code:</strong> \${a.referralCode || ""}</p>
  \`;

  for(const [k,v] of Object.entries(bank)){
    if(bankForm.elements[k]) bankForm.elements[k].value = v || "";
  }
}

bankForm.addEventListener("submit", async e => {
  e.preventDefault();

  const fd = new FormData(bankForm);
  const body = Object.fromEntries(fd.entries());

  const a = getStoredAffiliate();
  if(a.id) body.id = a.id;
  if(a.email) body.email = a.email;
  if(a.token) body.token = a.token;

  const res = await fetch("/api/affiliate/femi-bank-details", {
    method:"POST",
    credentials:"include",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });

  const data = await res.json().catch(()=>({}));

  alert(data.success ? "Bank details saved." : (data.message || "Could not save."));
});

load();
</script>
</body>
</html>`);

/* inject into possible dashboard files */
const dashboardFiles = [
  path.join(publicDir, "affiliate-dashboard.html"),
  path.join(publicDir, "dashboard.html")
];

for (const file of dashboardFiles) {
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/<script[^>]+femi-affiliate-senafix-features\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace("</body>", '  <script src="/js/femi-affiliate-senafix-features.js?v=5900"></script>\n</body>');
  fs.writeFileSync(file, html);
  console.log("Injected affiliate features:", path.relative(publicDir, file));
}

console.log("FemiFresh affiliate Senafix-style features added.");
