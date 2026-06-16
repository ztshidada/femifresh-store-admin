const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

const files = [
  "join.html",
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "affiliate-reset-password.html",
  "join-success.html"
];

for (const name of files) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  // remove visible literal \n text
  html = html.replace(/\\n/g, "\n");

  // remove any accidental text node near body start
  html = html.replace(/<body>\s*\\n/gi, "<body>");

  // make manual payment notice cleaner
  html = html.replace(
    /<div[^>]*MANUAL_PAYMENT_NOTICE_SAFE_V1[\s\S]*?<\/div>/gi,
    `<div class="MANUAL_PAYMENT_NOTICE_SAFE_V1" style="max-width:640px;margin:24px auto 0;padding:18px 22px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;box-shadow:0 18px 40px rgba(104,35,95,.10);">
      <strong>Online payment is paused.</strong><br>
      Please pay the once-off <strong>R100 joining fee</strong> manually and email proof to <strong>femifresh02@gmail.com</strong>.<br>
      Use your registered affiliate email as reference.
    </div>`
  );

  fs.writeFileSync(file, html);
  console.log("Cleaned:", name);
}

console.log("Affiliate manual payment pages cleaned.");
