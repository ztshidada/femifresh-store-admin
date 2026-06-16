const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const dashFile = path.join(publicDir, "affiliate-dashboard.html");
const loginFile = path.join(publicDir, "affiliate-login.html");
const joinFile = path.join(publicDir, "join.html");
const resetFile = path.join(publicDir, "affiliate-reset-password.html");
const cssFile = path.join(publicDir, "css", "affiliate-premium.css");

/*
  Remove the dashboard-breaking JS from dashboard only.
  The original dashboard JavaScript must control data loading.
*/
if (fs.existsSync(dashFile)) {
  let html = fs.readFileSync(dashFile, "utf8");

  html = html
    .replace(/<script[^>]+affiliate-premium\.js[^>]*><\/script>\s*/gi, "")
    .replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "")
    .replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "")
    .replace(/\\n/g, "\n");

  if (!html.includes("/css/affiliate-dashboard-safe.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/affiliate-dashboard-safe.css">\n</head>');
  }

  fs.writeFileSync(dashFile, html);
  console.log("Affiliate dashboard JS removed. Original data loading restored.");
}

/*
  Login/join/reset can keep premium look, but no public store header.
*/
for (const file of [loginFile, joinFile, resetFile]) {
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "")
    .replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "")
    .replace(/\\n/g, "\n");

  fs.writeFileSync(file, html);
}

/*
  Safe dashboard styling only. No JS. No moving elements.
*/
fs.writeFileSync(path.join(publicDir, "css", "affiliate-dashboard-safe.css"), `
/* AFFILIATE_DASHBOARD_SAFE_V1 */
body{
  background:
    radial-gradient(circle at 8% 12%, rgba(244,167,216,.30), transparent 28%),
    radial-gradient(circle at 92% 14%, rgba(104,35,95,.12), transparent 26%),
    linear-gradient(180deg,#fff8fd 0%,#fff1fa 48%,#fffaf7 100%) !important;
  color:#241126;
  font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  background:url("/images/femifresh-glass-butterfly.png") no-repeat 94% 12% / min(560px,58vw);
  opacity:.055;
  z-index:-1;
}

h1,h2,h3{
  color:#35112f;
  letter-spacing:-.04em;
}

.card,
.panel,
.stat,
.metric,
.referral-card,
section,
form{
  border-radius:28px !important;
}

button,
.btn,
input[type="submit"]{
  border-radius:999px !important;
  background:linear-gradient(135deg,#68235f,#8c2e80,#f4a7d8) !important;
  color:white !important;
  border:0 !important;
  font-weight:900 !important;
}

input,
textarea,
select{
  border-radius:16px !important;
}

a[href="/"],
a[href="/products.html"],
a[href="/cart.html"],
a[href="/policies.html"],
a[href="/contact.html"]{
  display:none !important;
}

/* keep dashboard centered */
main,
.container,
.dashboard,
.page{
  width:min(1180px,calc(100% - 32px));
  margin-left:auto;
  margin-right:auto;
}
`);

console.log("Affiliate dashboard fixed safely.");
