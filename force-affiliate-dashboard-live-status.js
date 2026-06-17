const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const gateFile = path.join(publicDir, "js", "affiliate-dashboard-gate.js");
const dashboardFile = path.join(publicDir, "affiliate-dashboard.html");

fs.writeFileSync(gateFile, `
(async function(){
  const VERSION = "LIVE_STATUS_3700";

  const BANK = {
    amount: 100,
    bank: "FNB",
    accountName: "Femi Fresh (PTY) LTD",
    accountType: "FNB Business Account",
    accountNumber: "63214749822",
    whatsapp: "0632180372",
    email: "femifresh02@gmail.com"
  };

  function getLocalAffiliate(){
    try {
      return JSON.parse(localStorage.getItem("affiliate") || localStorage.getItem("ffAffiliate") || "{}");
    } catch(e) {
      return {};
    }
  }

  function saveAffiliate(a){
    if (!a || typeof a !== "object") return;
    localStorage.setItem("affiliate", JSON.stringify(a));
    localStorage.setItem("ffAffiliate", JSON.stringify(a));
  }

  function isApproved(a){
    return !!(
      a.joiningFeePaid ||
      a.manualJoiningFeePaid ||
      a.joiningFeeStatus === "paid" ||
      a.paymentStatus === "paid" ||
      a.approved === true ||
      a.isApproved === true ||
      a.status === "approved" ||
      a.accountStatus === "approved"
    );
  }

  function affiliateName(a){
    const full =
      a.fullName ||
      a.name ||
      [a.firstName, a.lastName].filter(Boolean).join(" ") ||
      "";

    if (full && full.trim()) return full.trim();
    if (a.email) return String(a.email).split("@")[0];
    return "Affiliate";
  }

  async function getLiveAffiliate(){
    const token =
      localStorage.getItem("affiliateToken") ||
      localStorage.getItem("ffAffiliateToken") ||
      localStorage.getItem("femifresh_affiliate_token");

    const headers = token ? { Authorization: "Bearer " + token } : {};

    const urls = [
      "/api/affiliate/dashboard",
      "/api/affiliate/me",
      "/api/affiliates/me",
      "/api/me"
    ];

    let found = null;

    for (const url of urls) {
      try {
        const res = await fetch(url + "?v=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers
        });

        if (!res.ok) continue;

        const data = await res.json();
        const a = data.affiliate || data.user || data.data || data;

        if (a && typeof a === "object") {
          found = a;
          break;
        }
      } catch(e) {}
    }

    if (!found) found = getLocalAffiliate();

    const email = found.email || "";
    const id = found.id || "";

    if (email || id) {
      try {
        const res = await fetch(
          "/api/affiliate/real-status?email=" +
          encodeURIComponent(email) +
          "&id=" +
          encodeURIComponent(id) +
          "&v=" +
          Date.now(),
          {
            credentials: "include",
            cache: "no-store"
          }
        );

        if (res.ok) {
          const data = await res.json();

          if (data && data.affiliate) {
            saveAffiliate(data.affiliate);
            return data.affiliate;
          }
        }
      } catch(e) {}
    }

    saveAffiliate(found);
    return found;
  }

  function row(label, val){
    return \`
      <div style="
        display:flex;
        justify-content:space-between;
        gap:14px;
        padding:12px 0;
        border-bottom:1px solid rgba(104,35,95,.12);
      ">
        <span style="color:#6f6372;font-weight:800;">\${label}</span>
        <strong style="color:#35112f;text-align:right;">\${val}</strong>
      </div>
    \`;
  }

  function buildLockedScreen(a){
    const name = affiliateName(a);

    document.body.innerHTML = \`
      <main style="
        min-height:100vh;
        padding:34px 16px;
        display:grid;
        place-items:center;
        font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
        color:#241126;
        background:
          radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
          radial-gradient(circle at 90% 18%,rgba(104,35,95,.12),transparent 26%),
          linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7);
      ">
        <section style="
          width:min(920px,100%);
          background:rgba(255,255,255,.9);
          border:1px solid rgba(104,35,95,.15);
          border-radius:34px;
          padding:34px;
          box-shadow:0 22px 60px rgba(104,35,95,.12);
        ">
          <img src="/images/femifresh-logo.jpg" alt="FemiFresh" style="
            width:82px;
            height:82px;
            object-fit:cover;
            border-radius:24px;
            box-shadow:0 16px 34px rgba(104,35,95,.14);
            margin-bottom:18px;
          ">

          <p style="margin:0 0 8px;color:#6f6372;font-weight:800;">FemiFresh Affiliate</p>

          <h1 style="
            margin:0 0 12px;
            font-size:clamp(40px,7vw,74px);
            line-height:.95;
            letter-spacing:-.07em;
            color:#35112f;
          ">
            Account awaiting approval
          </h1>

          <p style="font-size:18px;line-height:1.65;color:#6f6372;margin:0 0 22px;">
            Hi <strong>\${name}</strong>, your account has been created. Your dashboard will unlock after admin confirms your joining fee payment.
          </p>

          <div style="
            background:#fff1fa;
            border:1px solid rgba(104,35,95,.15);
            border-radius:26px;
            padding:24px;
            margin-top:20px;
          ">
            <h2 style="margin:0 0 14px;color:#35112f;font-size:34px;letter-spacing:-.05em;">
              Manual joining fee payment
            </h2>

            \${row("Amount", "R100")}
            \${row("Bank", BANK.bank)}
            \${row("Account Name", BANK.accountName)}
            \${row("Account Type", BANK.accountType)}
            \${row("Account Number", BANK.accountNumber)}
            \${row("POP WhatsApp", BANK.whatsapp)}
            \${row("Reference", "Your registered affiliate email")}

            <div style="
              margin-top:18px;
              background:white;
              border:1px solid rgba(104,35,95,.12);
              border-radius:18px;
              padding:16px;
              color:#35112f;
              line-height:1.55;
              font-weight:800;
            ">
              Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.
            </div>
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
            <a href="https://wa.me/27632180372" style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              min-height:52px;
              padding:13px 22px;
              border-radius:999px;
              background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
              color:white;
              text-decoration:none;
              font-weight:950;
            ">Send POP on WhatsApp</a>

            <button onclick="location.reload()" style="
              min-height:52px;
              padding:13px 22px;
              border-radius:999px;
              border:1px solid rgba(104,35,95,.15);
              background:white;
              color:#68235f;
              font-weight:950;
              cursor:pointer;
            ">Refresh Status</button>

            <button onclick="logoutAffiliate()" style="
              min-height:52px;
              padding:13px 22px;
              border-radius:999px;
              border:1px solid rgba(104,35,95,.15);
              background:white;
              color:#68235f;
              font-weight:950;
              cursor:pointer;
            ">Logout</button>
          </div>
        </section>
      </main>
    \`;
  }

  window.logoutAffiliate = function(){
    localStorage.removeItem("affiliateToken");
    localStorage.removeItem("ffAffiliateToken");
    localStorage.removeItem("femifresh_affiliate_token");
    localStorage.removeItem("affiliate");
    localStorage.removeItem("ffAffiliate");
    location.href = "/login";
  };

  async function boot(){
    if (!location.pathname.includes("dashboard")) return;

    const a = await getLiveAffiliate();

    if (isApproved(a)) {
      document.body.classList.add("ff-affiliate-approved");

      const name = affiliateName(a);
      setTimeout(() => {
        document.querySelectorAll("*").forEach(el => {
          if (el.children.length) return;
          if ((el.textContent || "").trim() === "Welcome") {
            el.textContent = "Welcome, " + name;
          }
          if ((el.textContent || "").includes("Hi Affiliate")) {
            el.textContent = el.textContent.replace("Hi Affiliate", "Hi " + name);
          }
        });
      }, 700);

      return;
    }

    buildLockedScreen(a);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`);

if (fs.existsSync(dashboardFile)) {
  let html = fs.readFileSync(dashboardFile, "utf8");

  html = html.replace(/<script[^>]+affiliate-dashboard-gate\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+affiliate-dashboard-gate\.js\?v=[^"]*"><\/script>\s*/gi, "");

  html = html.replace("</head>", '  <script src="/js/affiliate-dashboard-gate.js?v=3700"></script>\n</head>');

  fs.writeFileSync(dashboardFile, html);
}

console.log("Affiliate dashboard now forces live approval status and cache-busts gate script.");
