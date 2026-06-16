const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const jsDir = path.join(publicDir, "js");

fs.mkdirSync(jsDir, { recursive: true });

/* 1) Replace dashboard gate with one clean locked screen */
fs.writeFileSync(path.join(jsDir, "affiliate-dashboard-gate.js"), `
(async function(){
  let settings = {
    joiningFeeAmount: 100,
    popEmail: "femifresh02@gmail.com",
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee manually and email proof of payment to femifresh02@gmail.com.",
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
    }catch(e){
      return {};
    }
  }

  async function fetchAffiliate(){
    const urls = ["/api/affiliate/me", "/api/affiliate/dashboard", "/api/affiliates/me", "/api/me"];

    for(const url of urls){
      try{
        const token =
          localStorage.getItem("affiliateToken") ||
          localStorage.getItem("ffAffiliateToken") ||
          localStorage.getItem("femifresh_affiliate_token");

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

  function buildLockedScreen(a){
    const name =
      a.firstName ||
      a.name ||
      "Affiliate";

    document.body.innerHTML = \`
      <main style="
        min-height:100vh;
        padding:40px 18px;
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
          width:min(900px,100%);
          background:rgba(255,255,255,.86);
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
            font-size:clamp(42px,7vw,76px);
            line-height:.95;
            letter-spacing:-.07em;
            color:#35112f;
          ">
            Account awaiting approval
          </h1>

          <p style="font-size:18px;line-height:1.65;color:#6f6372;margin:0 0 22px;">
            Hi <strong>\${name}</strong>, your account has been created. Your dashboard functions are locked until admin confirms your joining fee payment.
          </p>

          <div style="
            background:#fff1fa;
            border:1px solid rgba(104,35,95,.15);
            border-radius:24px;
            padding:22px;
            margin-top:20px;
          ">
            <h2 style="margin:0 0 10px;color:#35112f;">\${settings.paymentTitle || "Manual joining fee payment"}</h2>

            <p style="font-size:18px;color:#35112f;line-height:1.55;margin:0 0 12px;">
              <strong>Amount:</strong> R\${settings.joiningFeeAmount || 100}
            </p>

            <p style="font-size:17px;color:#35112f;line-height:1.55;margin:0 0 12px;">
              \${settings.paymentInstructions || ""}
            </p>

            <p style="font-size:17px;color:#35112f;line-height:1.55;margin:0 0 12px;">
              <strong>Email proof to:</strong><br>
              \${settings.popEmail || "femifresh02@gmail.com"}
            </p>

            <p style="font-size:17px;color:#35112f;line-height:1.55;margin:0;">
              <strong>Reference:</strong><br>
              \${settings.referenceInstruction || "Use your registered affiliate email as reference."}
            </p>
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
            <a href="mailto:\${settings.popEmail || "femifresh02@gmail.com"}" style="
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
            ">Email Proof of Payment</a>

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

  document.addEventListener("DOMContentLoaded", async function(){
    if(!location.pathname.includes("dashboard")) return;

    await loadSettings();

    setTimeout(async () => {
      const a = await fetchAffiliate();

      if(!isPaid(a)){
        buildLockedScreen(a);
      }
    }, 500);
  });
})();
`);

/* 2) Clean visible literal \\n from affiliate pages */
const pages = [
  "affiliate-dashboard.html",
  "affiliate-login.html",
  "join.html",
  "join-success.html",
  "affiliate-reset-password.html"
];

for (const name of pages) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/\\n/g, "\n")
    .replace(/<body>\s*\\n\s*\\n/gi, "<body>")
    .replace(/<body>\s*\\n/gi, "<body>");

  /* remove old duplicate manual notice blocks */
  html = html.replace(/<div[^>]*MANUAL_PAYMENT_NOTICE_SAFE_V1[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<div[^>]*MANUAL_AFFILIATE_PAYMENT_NOTICE_V2[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<section[^>]*id=["']ffDashboardLock["'][\s\S]*?<\/section>/gi, "");
  html = html.replace(/<div[^>]*id=["']ffManualPaymentBox["'][\s\S]*?<\/div>/gi, "");

  /* ensure dashboard gate is installed only once */
  html = html.replace(/<script[^>]+affiliate-dashboard-gate\.js[^>]*><\/script>\s*/gi, "");

  if (name === "affiliate-dashboard.html") {
    html = html.replace("</head>", '  <script src="/js/affiliate-dashboard-gate.js"></script>\n</head>');
  }

  fs.writeFileSync(file, html);
  console.log("Cleaned:", name);
}

console.log("Clean locked affiliate dashboard installed.");
