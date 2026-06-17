const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const joinFile = path.join(publicDir, "join.html");
const jsDir = path.join(publicDir, "js");
const signupJs = path.join(jsDir, "affiliate-signup-flow.js");

fs.mkdirSync(jsDir, { recursive: true });

/* 1) Fix join page: no GET details in URL, show bank details immediately */
fs.writeFileSync(joinFile, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Create Affiliate Account | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
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
      min-height:100vh;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      color:#241126;
      background:
        radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
        radial-gradient(circle at 90% 18%,rgba(104,35,95,.12),transparent 26%),
        linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7);
    }
    .wrap{
      width:min(1180px,calc(100% - 32px));
      margin:auto;
      padding:56px 0;
      display:grid;
      grid-template-columns:1fr .9fr;
      gap:32px;
      align-items:start;
    }
    .card{
      background:#fff;
      border:1px solid var(--line);
      border-radius:34px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.10);
    }
    .logo{
      width:86px;
      height:86px;
      object-fit:cover;
      border-radius:26px;
      box-shadow:0 16px 34px rgba(104,35,95,.14);
      margin-bottom:18px;
    }
    h1{
      margin:0 0 16px;
      font-size:clamp(44px,7vw,82px);
      line-height:.95;
      letter-spacing:-.07em;
      color:var(--d);
    }
    h2{
      margin:0 0 14px;
      color:var(--d);
      font-size:34px;
      letter-spacing:-.05em;
    }
    p{
      color:var(--muted);
      line-height:1.65;
      font-size:17px;
    }
    form{
      display:grid;
      gap:14px;
      margin-top:22px;
    }
    input{
      width:100%;
      min-height:56px;
      border:1px solid var(--line);
      border-radius:16px;
      padding:14px 16px;
      font-size:16px;
      outline:none;
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
    .details{
      background:#fff1fa;
      border:1px solid var(--line);
      border-radius:24px;
      padding:20px;
      margin-top:18px;
    }
    .row{
      display:flex;
      justify-content:space-between;
      gap:16px;
      border-bottom:1px solid rgba(104,35,95,.12);
      padding:12px 0;
      font-size:17px;
    }
    .row:last-child{border-bottom:0}
    .row span:first-child{color:#6f6372;font-weight:850}
    .row span:last-child{color:#35112f;font-weight:950;text-align:right}
    .warn{
      margin-top:18px;
      background:white;
      border:1px solid rgba(104,35,95,.12);
      border-radius:18px;
      padding:16px;
      color:#35112f;
      font-weight:850;
      line-height:1.55;
    }
    .success,.error{
      display:none;
      border-radius:18px;
      padding:16px;
      margin-top:16px;
      font-weight:800;
      line-height:1.5;
    }
    .success{background:#e9fff1;border:1px solid #b8efc9;color:#14592b}
    .error{background:#ffe1e8;border:1px solid #ffbccb;color:#8a0020}
    @media(max-width:900px){
      .wrap{grid-template-columns:1fr;padding:30px 0}
      .card{padding:24px}
      .row{display:block}
      .row span:last-child{display:block;text-align:left;margin-top:4px}
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <img class="logo" src="/images/femifresh-logo.jpg" alt="FemiFresh">
      <h1>Create account</h1>
      <p>
        Sign up as a FemiFresh affiliate. Your account will be created first, but earning and dashboard functions will stay locked until admin approves your joining fee payment.
      </p>

      <form id="signupForm" method="post" autocomplete="on">
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
      <h2>Manual joining fee payment</h2>
      <p>Pay the once-off joining fee manually using the details below.</p>

      <div class="details">
        <div class="row"><span>Amount</span><span>R100</span></div>
        <div class="row"><span>Bank</span><span>FNB</span></div>
        <div class="row"><span>Account Name</span><span>Femi Fresh (PTY) LTD</span></div>
        <div class="row"><span>Account Type</span><span>FNB Business Account</span></div>
        <div class="row"><span>Account Number</span><span>63214749822</span></div>
        <div class="row"><span>POP WhatsApp</span><span>0632180372</span></div>
        <div class="row"><span>Reference</span><span>Your registered affiliate email</span></div>
      </div>

      <div class="warn">
        Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.
      </div>
    </aside>
  </main>

  <script src="/js/affiliate-signup-flow.js?v=3900"></script>
</body>
</html>`);

/* 2) Fix signup JS: prevent URL query leak and post safely */
fs.writeFileSync(signupJs, `
(function(){
  const REGISTER_ENDPOINTS = [
    "/api/affiliate/register",
    "/api/affiliates/register",
    "/api/affiliate/signup",
    "/api/affiliates/signup",
    "/api/join",
    "/api/register"
  ];

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

  async function tryRegister(payload){
    let lastError = "Could not create account.";

    for (const endpoint of REGISTER_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          credentials:"include",
          body:JSON.stringify(payload)
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.success || data.affiliate || data.token)) {
          return data;
        }

        if (data && data.message) lastError = data.message;
      } catch(e) {}
    }

    return {success:false,message:lastError};
  }

  function cleanUrl(){
    if (location.search && /password=|email=|phone=|firstName=|lastName=/i.test(location.search)) {
      history.replaceState({}, document.title, location.pathname);
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    cleanUrl();

    const form = document.getElementById("signupForm");
    if(!form) return;

    form.addEventListener("submit", async function(e){
      e.preventDefault();

      const fd = new FormData(form);

      const payload = {
        firstName: String(fd.get("firstName") || "").trim(),
        lastName: String(fd.get("lastName") || "").trim(),
        name: (String(fd.get("firstName") || "").trim() + " " + String(fd.get("lastName") || "").trim()).trim(),
        fullName: (String(fd.get("firstName") || "").trim() + " " + String(fd.get("lastName") || "").trim()).trim(),
        phone: String(fd.get("phone") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        password: String(fd.get("password") || ""),
        sponsorCode: String(fd.get("sponsorCode") || "").trim(),
        referralCode: String(fd.get("sponsorCode") || "").trim()
      };

      const btn = form.querySelector("button");
      const success = document.getElementById("successBox");
      const error = document.getElementById("errorBox");

      success.style.display = "none";
      error.style.display = "none";

      btn.disabled = true;
      btn.textContent = "Creating account...";

      const data = await tryRegister(payload);

      btn.disabled = false;
      btn.textContent = "Sign Up";

      if(!data.success && !data.affiliate && !data.token){
        error.style.display = "block";
        error.textContent = data.message || "Could not create account.";
        return;
      }

      saveLoginData(data);

      success.style.display = "block";
      success.innerHTML = "<strong>Account created.</strong><br>Your dashboard will open now. It will unlock after admin approves your joining fee payment.";

      form.reset();

      setTimeout(() => {
        location.href = "/dashboard?manualPayment=pending";
      }, 1200);
    });
  });
})();
`);

console.log("Join page fixed: payment details show immediately and form no longer leaks details in URL.");
