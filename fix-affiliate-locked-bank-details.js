const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const jsDir = path.join(publicDir, "js");
const serverFile = path.join(__dirname, "server.js");

/* 1. Update server defaults for admin manual payment details */
let server = fs.readFileSync(serverFile, "utf8");

server = server.replace(/bankName:\s*"[^"]*"/g, 'bankName: "FNB"');
server = server.replace(/accountHolder:\s*"[^"]*"/g, 'accountHolder: "Femi Fresh (PTY) LTD"');
server = server.replace(/accountNumber:\s*"[^"]*"/g, 'accountNumber: "63214749822"');
server = server.replace(/branchCode:\s*"[^"]*"/g, 'branchCode: ""');
server = server.replace(/popEmail:\s*"[^"]*"/g, 'popEmail: "femifresh02@gmail.com"');

server = server.replace(
  /paymentInstructions:\s*"[^"]*"/g,
  'paymentInstructions: "Pay the once-off R100 joining fee to the FNB business account below. Send proof of payment to WhatsApp 0632180372. Use your registered affiliate email as reference. Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days."'
);

server = server.replace(
  /referenceInstruction:\s*"[^"]*"/g,
  'referenceInstruction: "Use your registered affiliate email as reference."'
);

fs.writeFileSync(serverFile, server);

/* 2. Replace affiliate dashboard locked screen */
fs.writeFileSync(path.join(jsDir, "affiliate-dashboard-gate.js"), `
(async function(){
  const BANK = {
    amount: 100,
    bank: "FNB",
    accountName: "Femi Fresh (PTY) LTD",
    accountType: "FNB Business Account",
    accountNumber: "63214749822",
    whatsapp: "0632180372",
    email: "femifresh02@gmail.com"
  };

  let settings = {
    joiningFeeAmount: 100,
    popEmail: BANK.email,
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee to the FNB business account below.",
    referenceInstruction: "Use your registered affiliate email as reference.",
    bankName: BANK.bank,
    accountHolder: BANK.accountName,
    accountNumber: BANK.accountNumber,
    branchCode: ""
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

  function value(v, fallback){
    return v && String(v).trim() ? v : fallback;
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
    const firstName = a.firstName || (a.name ? String(a.name).split(" ")[0] : "") || "Affiliate";
    const amount = settings.joiningFeeAmount || BANK.amount;
    const bankName = value(settings.bankName, BANK.bank);
    const accountHolder = value(settings.accountHolder, BANK.accountName);
    const accountNumber = value(settings.accountNumber, BANK.accountNumber);
    const accountType = "FNB Business Account";
    const whatsapp = BANK.whatsapp;

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
            Hi <strong>\${firstName}</strong>, your account has been created. Your dashboard will unlock after admin confirms your joining fee payment.
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

            \${row("Amount", "R" + amount)}
            \${row("Bank", bankName)}
            \${row("Account Name", accountHolder)}
            \${row("Account Type", accountType)}
            \${row("Account Number", accountNumber)}
            \${row("POP WhatsApp", whatsapp)}
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

  document.addEventListener("DOMContentLoaded", async function(){
    if(!location.pathname.includes("dashboard")) return;

    await loadSettings();

    setTimeout(async () => {
      const a = await fetchAffiliate();
      if(!isPaid(a)){
        buildLockedScreen(a);
      }
    }, 400);
  });
})();
`);

/* 3. Remove duplicate/manual old boxes from dashboard HTML */
const dashFile = path.join(publicDir, "affiliate-dashboard.html");
if (fs.existsSync(dashFile)) {
  let html = fs.readFileSync(dashFile, "utf8");

  html = html.replace(/<script[^>]+affiliate-dashboard-gate\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<div[^>]*MANUAL_PAYMENT_NOTICE_SAFE_V1[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<div[^>]*MANUAL_AFFILIATE_PAYMENT_NOTICE_V2[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<section[^>]*id=["']ffDashboardLock["'][\s\S]*?<\/section>/gi, "");
  html = html.replace(/<div[^>]*id=["']ffManualPaymentBox["'][\s\S]*?<\/div>/gi, "");
  html = html.replace(/\\n/g, "\n");

  html = html.replace("</head>", '  <script src="/js/affiliate-dashboard-gate.js"></script>\n</head>');

  fs.writeFileSync(dashFile, html);
}

console.log("Affiliate locked dashboard now shows clean FNB banking details.");
