const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const cssDir = path.join(publicDir, "css");

if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) walk(full, list);
    if (stat.isFile() && full.endsWith(".html")) list.push(full);
  }

  return list;
}

function cleanPhone(text) {
  return text
    .replace(/\+27\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/0\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/061\s*450\s*3120/gi, "femifresh02@gmail.com")
    .replace(/614503120/gi, "femifresh02@gmail.com")
    .replace(/27614503120/gi, "femifresh02@gmail.com")
    .replace(/https:\/\/wa\.me\/[0-9]+/gi, "mailto:femifresh02@gmail.com")
    .replace(/http:\/\/wa\.me\/[0-9]+/gi, "mailto:femifresh02@gmail.com")
    .replace(/href=["']tel:[^"']+["']/gi, 'href="mailto:femifresh02@gmail.com"')
    .replace(/href=["']https:\/\/wa\.me\/[^"']+["']/gi, 'href="mailto:femifresh02@gmail.com"')
    .replace(/href=["']http:\/\/wa\.me\/[^"']+["']/gi, 'href="mailto:femifresh02@gmail.com"')
    .replace(/WhatsApp:\s*femifresh02@gmail\.com/gi, "Email: femifresh02@gmail.com")
    .replace(/WhatsApp/gi, "Email");
}

/* Global premium styling for all public pages */
const css = `
/* FEMIFRESH_GLOBAL_PREMIUM_V1 */
:root{
  --ff-purple:#68235f;
  --ff-purple-dark:#35112f;
  --ff-purple-soft:#9b358e;
  --ff-pink:#f4a7d8;
  --ff-pink-soft:#fff1fa;
  --ff-cream:#fffaf7;
  --ff-text:#241126;
  --ff-muted:#6f5e72;
  --ff-border:rgba(104,35,95,.14);
  --ff-glass:rgba(255,255,255,.74);
}

*{box-sizing:border-box}

html{
  scroll-behavior:smooth;
}

body{
  margin:0;
  color:var(--ff-text);
  background:
    radial-gradient(circle at 8% 12%, rgba(244,167,216,.30), transparent 28%),
    radial-gradient(circle at 90% 10%, rgba(104,35,95,.14), transparent 26%),
    linear-gradient(180deg,#fff8fd 0%,#fff1fa 48%,#fffaf7 100%);
  font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  background:url("/images/femifresh-glass-butterfly.png") no-repeat 94% 12% / min(580px,60vw);
  opacity:.07;
  pointer-events:none;
  z-index:-1;
}

a{
  color:inherit;
}

img{
  max-width:100%;
}

main,
.container,
.page,
.section,
.wrap{
  width:min(1180px,calc(100% - 32px));
  margin-left:auto;
  margin-right:auto;
}

section{
  position:relative;
}

h1,h2,h3{
  color:var(--ff-purple-dark);
  letter-spacing:-.03em;
}

h1{
  font-size:clamp(42px,7vw,82px);
  line-height:1;
}

h2{
  font-size:clamp(34px,5vw,56px);
  line-height:1;
}

p{
  color:var(--ff-muted);
  line-height:1.65;
}

button,
.btn,
.button,
input[type="submit"],
a[class*="btn"],
a[class*="button"]{
  border-radius:999px !important;
  min-height:48px;
  padding:13px 22px;
  border:0;
  font-weight:900;
  cursor:pointer;
  transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease;
}

button:hover,
.btn:hover,
.button:hover,
input[type="submit"]:hover,
a[class*="btn"]:hover,
a[class*="button"]:hover{
  transform:translateY(-2px);
}

button,
.btn,
.button,
input[type="submit"]{
  background:linear-gradient(135deg,var(--ff-purple),var(--ff-purple-soft),var(--ff-pink));
  color:#fff;
  box-shadow:0 16px 34px rgba(104,35,95,.20);
}

input,
select,
textarea{
  border:1px solid var(--ff-border);
  border-radius:16px;
  padding:14px 16px;
  min-height:48px;
  outline:none;
  background:rgba(255,255,255,.86);
  color:var(--ff-text);
}

input:focus,
select:focus,
textarea:focus{
  border-color:rgba(104,35,95,.45);
  box-shadow:0 0 0 4px rgba(244,167,216,.22);
}

.card,
.panel,
.product-card,
.auth-card,
.form-card,
.join-card,
.checkout-card,
.cart-card,
.table-card,
.metric-card,
.affiliate-panel{
  background:var(--ff-glass) !important;
  border:1px solid var(--ff-border) !important;
  border-radius:28px !important;
  box-shadow:0 22px 52px rgba(104,35,95,.10) !important;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
}

.product-card,
.card{
  overflow:hidden;
}

.product-card img,
.card img{
  border-radius:22px;
}

table{
  width:100%;
  border-collapse:collapse;
  background:rgba(255,255,255,.65);
  border-radius:22px;
  overflow:hidden;
}

th,td{
  padding:14px;
  border-bottom:1px solid rgba(104,35,95,.10);
}

th{
  color:var(--ff-purple);
  text-align:left;
  font-size:13px;
  text-transform:uppercase;
  letter-spacing:.06em;
}

header,
.navbar,
.site-header,
.topbar{
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  background:rgba(255,250,253,.80) !important;
  border-bottom:1px solid var(--ff-border);
}

.logo img,
.brand img,
header img{
  border-radius:18px;
}

/* Public page hero fallback */
main > h1:first-child,
.container > h1:first-child,
section:first-of-type h1:first-child{
  background:linear-gradient(120deg,var(--ff-purple-dark),var(--ff-purple),#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-page-hero{
  padding:72px 0 34px;
  text-align:center;
}

.ff-page-hero h1{
  margin:0 0 14px;
  background:linear-gradient(120deg,var(--ff-purple-dark),var(--ff-purple),#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-page-hero p{
  max-width:720px;
  margin:0 auto;
  font-size:18px;
}

.ff-email-only{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:999px;
  background:rgba(255,255,255,.82);
  border:1px solid var(--ff-border);
  padding:13px 18px;
  font-weight:900;
  color:var(--ff-purple);
  text-decoration:none;
}

/* Hide old injected floating affiliate buttons except homepage JS-controlled areas */
body:not(.home-page) #ff-affiliate-store-buttons{
  display:none !important;
}

/* Mobile */
@media(max-width:760px){
  body::before{
    background-size:430px;
    background-position:140% 8%;
    opacity:.06;
  }

  main,
  .container,
  .page,
  .section,
  .wrap{
    width:calc(100% - 28px);
  }

  h1{
    font-size:clamp(42px,13vw,68px);
  }

  h2{
    font-size:clamp(34px,11vw,52px);
  }

  input,
  select,
  textarea,
  button{
    width:100%;
    font-size:16px !important;
  }

  .grid,
  .products-grid,
  .product-grid,
  .cards,
  .checkout-grid,
  .cart-grid,
  .affiliate-grid,
  .contact-grid{
    display:grid !important;
    grid-template-columns:1fr !important;
  }

  .card,
  .panel,
  .product-card,
  .auth-card,
  .form-card,
  .join-card{
    border-radius:24px !important;
  }

  table{
    font-size:14px;
  }

  th,td{
    padding:10px;
  }
}
`;

fs.writeFileSync(path.join(cssDir, "femifresh-global.css"), css);

/* Clean all HTML pages */
for (const file of walk(publicDir)) {
  let html = fs.readFileSync(file, "utf8");

  html = cleanPhone(html);

  if (!html.includes("/css/femifresh-global.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femifresh-global.css">\n</head>');
  }

  /* remove literal visible \\n accidents */
  html = html.replace(/\\n/g, "\n");

  fs.writeFileSync(file, html);
  console.log("Cleaned:", path.relative(publicDir, file));
}

/* Update contact page if it exists */
const contactFile = path.join(publicDir, "contact.html");
if (fs.existsSync(contactFile)) {
  let contact = fs.readFileSync(contactFile, "utf8");

  contact = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Contact FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femifresh-global.css">
</head>
<body>
  <main>
    <section class="ff-page-hero">
      <h1>Contact FemiFresh</h1>
      <p>For orders, affiliate support, stock packages and general enquiries, please contact us by email.</p>
    </section>

    <section style="padding:30px 0 90px;">
      <div class="card" style="max-width:720px;margin:auto;padding:34px;text-align:center;">
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh" style="width:110px;height:110px;object-fit:cover;border-radius:28px;margin-bottom:18px;">
        <h2 style="margin:0 0 12px;">We’re here to help.</h2>
        <p style="margin-bottom:24px;">Send us an email and our team will assist you as soon as possible.</p>
        <a class="ff-email-only" href="mailto:femifresh02@gmail.com">femifresh02@gmail.com</a>
        <div style="margin-top:30px;">
          <a class="btn" href="/products.html">Shop Products</a>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;

  fs.writeFileSync(contactFile, contact);
  console.log("Rebuilt contact page email-only.");
}

console.log("Global FemiFresh polish complete. Phone numbers removed.");
