const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const serverFile = path.join(root, "server.js");

/* 1) Update default manual payment details in server.js */
let server = fs.readFileSync(serverFile, "utf8");

server = server.replace(/popEmail:\s*"[^"]*"/g, 'popEmail: "femifresh02@gmail.com"');
server = server.replace(/manualPaymentEmail:\s*"[^"]*"/g, 'manualPaymentEmail: "femifresh02@gmail.com"');

server = server.replace(/bankName:\s*"[^"]*"/g, 'bankName: "FNB"');
server = server.replace(/accountHolder:\s*"[^"]*"/g, 'accountHolder: "Femi Fresh (PTY) LTD"');
server = server.replace(/accountNumber:\s*"[^"]*"/g, 'accountNumber: "63214749822"');
server = server.replace(/branchCode:\s*"[^"]*"/g, 'branchCode: ""');

server = server.replace(
  /paymentInstructions:\s*"[^"]*"/g,
  'paymentInstructions: "Pay the once-off R100 joining fee manually to the FNB business account below. Email proof of payment to femifresh02@gmail.com or WhatsApp POP to 0632180372. Use your registered affiliate email as reference."'
);

server = server.replace(
  /referenceInstruction:\s*"[^"]*"/g,
  'referenceInstruction: "Use your registered affiliate email as reference."'
);

fs.writeFileSync(serverFile, server);

/* 2) Make manual payment page show full banking details */
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
      width:min(760px,100%);
      background:#fff;
      border:1px solid rgba(104,35,95,.14);
      border-radius:30px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.12);
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
    .details{
      background:#fff1fa;
      border:1px solid rgba(104,35,95,.14);
      border-radius:22px;
      padding:20px;
      margin:20px 0;
    }
    .row{
      display:flex;
      justify-content:space-between;
      gap:18px;
      border-bottom:1px solid rgba(104,35,95,.12);
      padding:12px 0;
      font-size:17px;
    }
    .row:last-child{border-bottom:0}
    .row span:first-child{color:#6f6372;font-weight:800}
    .row span:last-child{color:#35112f;font-weight:950;text-align:right}
    .btn{
      display:inline-flex;
      justify-content:center;
      align-items:center;
      min-height:50px;
      padding:13px 18px;
      border-radius:999px;
      background:#68235f;
      color:white;
      font-weight:950;
      text-decoration:none;
      margin-top:12px;
    }
    @media(max-width:600px){
      .card{padding:24px}
      .row{display:block}
      .row span:last-child{display:block;text-align:left;margin-top:4px}
    }
  </style>
</head>
<body>
  <main class="card">
    <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
    <h1>Manual Joining Fee</h1>
    <div class="amount">R100</div>

    <p>Online payment is paused while Yoco is reviewing the website. Please pay manually using the banking details below.</p>

    <div class="details">
      <div class="row"><span>Bank</span><span>FNB</span></div>
      <div class="row"><span>Account Name</span><span>Femi Fresh (PTY) LTD</span></div>
      <div class="row"><span>Account Type</span><span>FNB Business Account</span></div>
      <div class="row"><span>Account Number</span><span>63214749822</span></div>
      <div class="row"><span>Amount</span><span>R100</span></div>
      <div class="row"><span>Reference</span><span>Your registered affiliate email</span></div>
    </div>

    <p>
      After payment, email your proof of payment to <strong>femifresh02@gmail.com</strong>
      or send POP to <strong>0632180372</strong>.
    </p>

    <a class="btn" href="mailto:femifresh02@gmail.com">Email Proof of Payment</a>
    <a class="btn" style="background:white;color:#68235f;border:1px solid rgba(104,35,95,.14);margin-left:8px;" href="https://affiliates.femifresh.co.za/login">Back to Login</a>
  </main>
</body>
</html>`);

/* 3) Update manual checkout JS with full banking details */
const checkoutJs = path.join(publicDir, "js", "store-manual-checkout.js");

if (fs.existsSync(checkoutJs)) {
  let js = fs.readFileSync(checkoutJs, "utf8");

  js = js.replace(/const MANUAL_EMAIL = "[^"]*";/g, 'const MANUAL_EMAIL = "femifresh02@gmail.com";');

  js = js.replace(
    /Please email proof of payment to:<br>\s*<strong>\$\{MANUAL_EMAIL\}<\/strong><br><br>\s*Use your order number or phone number as reference\./g,
    `Bank: <strong>FNB</strong><br>
      Account Name: <strong>Femi Fresh (PTY) LTD</strong><br>
      Account Type: <strong>FNB Business Account</strong><br>
      Account Number: <strong>63214749822</strong><br><br>
      Please email proof of payment to:<br>
      <strong>\${MANUAL_EMAIL}</strong><br>
      Or send POP to: <strong>0632180372</strong><br><br>
      Use your order number or phone number as reference.`
  );

  fs.writeFileSync(checkoutJs, js);
}

/* 4) Add a small public banking page for customers too */
fs.writeFileSync(path.join(publicDir, "banking-details.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Banking Details | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femifresh-mobile-system.css">
</head>
<body style="margin:0;font-family:Inter,system-ui;background:#fff8fd;color:#241126;padding:24px;">
  <main style="width:min(760px,100%);margin:40px auto;background:white;border:1px solid rgba(104,35,95,.14);border-radius:30px;padding:30px;box-shadow:0 22px 60px rgba(104,35,95,.12);">
    <img src="/images/femifresh-logo.jpg" style="width:90px;height:90px;object-fit:cover;border-radius:24px;">
    <h1 style="color:#35112f;font-size:clamp(38px,7vw,64px);letter-spacing:-.06em;">Banking Details</h1>
    <p><strong>Bank:</strong> FNB</p>
    <p><strong>Account Name:</strong> Femi Fresh (PTY) LTD</p>
    <p><strong>Account Type:</strong> FNB Business Account</p>
    <p><strong>Account Number:</strong> 63214749822</p>
    <p><strong>POP Email:</strong> femifresh02@gmail.com</p>
    <p><strong>POP Cell:</strong> 0632180372</p>
    <p><strong>Reference:</strong> Use your order number, phone number, or registered affiliate email.</p>
  </main>
</body>
</html>`);

console.log("Manual payment banking details updated.");
