const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

const files = [
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "join.html",
  "join-success.html",
  "affiliate-reset-password.html",
  "affiliate-fee.html"
];

for (const name of files) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  // Remove any fixed/floating/manual payment button containers
  html = html.replace(/<div[^>]*style=["'][^"']*position\s*:\s*fixed[\s\S]*?<\/div>/gi, "");

  // Remove any link/button pointing to affiliate-fee
  html = html.replace(/<a[^>]*href=["'][^"']*affiliate-fee\.html[^"']*["'][\s\S]*?<\/a>/gi, "");
  html = html.replace(/<button[^>]*[\s\S]*?(Pay R100|Joining Fee|R100 Joining|Pay Joining)[\s\S]*?<\/button>/gi, "");

  // Remove text blocks that say pay R100
  html = html.replace(/<div[^>]*[\s\S]*?(Pay R100 Joining Fee|Pay R100|R100 Joining Fee)[\s\S]*?<\/div>/gi, "");

  // Remove accidental raw text/buttons
  html = html.replace(/Pay R100 Joining Fee/gi, "");
  html = html.replace(/Pay R100/gi, "");
  html = html.replace(/R100 Joining Fee/gi, "Manual Joining Fee");

  // Remove old JS injections
  html = html.replace(/<script[^>]+affiliate-premium\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+glass-home-refresh\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+store-affiliate-buttons\.js[^>]*><\/script>\s*/gi, "");

  // Remove public store header on affiliate pages
  html = html.replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "");

  fs.writeFileSync(file, html);
  console.log("Cleaned payment buttons from", name);
}

// Rebuild affiliate-fee page as manual info only
const feeFile = path.join(publicDir, "affiliate-fee.html");

fs.writeFileSync(feeFile, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manual Joining Fee | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:linear-gradient(135deg,#fff8fd,#fff1fa,#fffaf7);
      color:#241126;
      padding:24px;
    }
    .card{
      width:min(720px,100%);
      background:#fff;
      border:1px solid rgba(104,35,95,.14);
      border-radius:30px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.12);
      text-align:center;
    }
    img{
      width:90px;
      height:90px;
      object-fit:cover;
      border-radius:24px;
      margin-bottom:18px;
    }
    h1{
      margin:0 0 12px;
      color:#35112f;
      font-size:clamp(36px,6vw,62px);
      letter-spacing:-.06em;
    }
    p{
      color:#6f6372;
      line-height:1.7;
      font-size:18px;
    }
    .amount{
      font-size:54px;
      font-weight:950;
      color:#68235f;
      margin:12px 0;
    }
    .email{
      display:inline-block;
      padding:14px 18px;
      border-radius:999px;
      background:#fff1fa;
      color:#68235f;
      font-weight:950;
      text-decoration:none;
      margin-top:12px;
    }
    .back{
      display:inline-block;
      margin-top:26px;
      color:#68235f;
      font-weight:900;
    }
  </style>
</head>
<body>
  <main class="card">
    <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
    <h1>Manual Joining Fee</h1>
    <div class="amount">R100</div>
    <p>
      Online payment for the affiliate joining fee is paused while the payment provider review is pending.
    </p>
    <p>
      Please pay manually and email your proof of payment. Use your registered affiliate email as the payment reference.
    </p>
    <a class="email" href="mailto:femifresh02@gmail.com">femifresh02@gmail.com</a>
    <br>
    <a class="back" href="https://affiliates.femifresh.co.za/login">Back to Affiliate Login</a>
  </main>
</body>
</html>`);

console.log("All R100 online payment buttons removed. Manual fee page rebuilt.");
