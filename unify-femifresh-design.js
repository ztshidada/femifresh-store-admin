const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const cssDir = path.join(publicDir, "css");

if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (stat.isFile() && full.endsWith(".html")) list.push(full);
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
    .replace(/WhatsApp/gi, "Email");
}

/* 1) Main unified CSS */
const css = `
/* FEMIFRESH_UNIFIED_BRAND_V2 */
:root{
  --ff-purple:#68235f;
  --ff-purple-dark:#35112f;
  --ff-purple-mid:#8c2e80;
  --ff-pink:#f4a7d8;
  --ff-pink-2:#f7c7e7;
  --ff-bg:#fff8fd;
  --ff-cream:#fffaf7;
  --ff-text:#241126;
  --ff-muted:#6f5e72;
  --ff-border:rgba(104,35,95,.14);
  --ff-glass:rgba(255,255,255,.76);
  --ff-shadow:0 22px 52px rgba(104,35,95,.10);
}

*{box-sizing:border-box}

html{
  scroll-behavior:smooth;
}

body{
  margin:0;
  font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  color:var(--ff-text);
  background:
    radial-gradient(circle at 8% 12%, rgba(244,167,216,.30), transparent 28%),
    radial-gradient(circle at 92% 10%, rgba(104,35,95,.14), transparent 26%),
    radial-gradient(circle at 80% 90%, rgba(244,167,216,.16), transparent 26%),
    linear-gradient(180deg,#fff8fd 0%,#fff1fa 48%,#fffaf7 100%);
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  background:url("/images/femifresh-glass-butterfly.png") no-repeat 94% 10% / min(560px,58vw);
  opacity:.065;
  pointer-events:none;
  z-index:-1;
}

a{
  color:inherit;
  text-decoration:none;
}

img{
  max-width:100%;
}

.ff-site-header,
.topbar,
header.topbar{
  position:sticky;
  top:0;
  z-index:50;
  background:rgba(255,250,253,.82) !important;
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  border-bottom:1px solid var(--ff-border);
}

.ff-nav,
.nav{
  width:min(1180px,calc(100% - 32px));
  min-height:82px;
  margin:auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
}

.ff-brand,
.brand{
  display:flex;
  align-items:center;
  gap:12px;
  font-size:27px;
  font-weight:950;
  color:var(--ff-purple);
  letter-spacing:-.05em;
}

.ff-brand img,
.brand img{
  width:54px;
  height:54px;
  object-fit:cover;
  border-radius:18px;
  box-shadow:0 12px 28px rgba(104,35,95,.16);
}

.ff-navlinks,
.navlinks{
  display:flex;
  align-items:center;
  gap:10px;
}

.ff-navlinks a,
.navlinks a{
  padding:11px 15px;
  border-radius:999px;
  font-weight:850;
  color:#4d2b50;
  font-size:14px;
}

.ff-navlinks a:hover,
.navlinks a:hover{
  background:#fff;
  box-shadow:0 10px 24px rgba(104,35,95,.10);
}

.ff-menu,
.hamb{
  display:none;
}

.ff-wrap,
.wrap,
main,
.container,
.page{
  width:min(1180px,calc(100% - 32px));
  margin-left:auto;
  margin-right:auto;
}

.ff-page-hero{
  padding:76px 0 34px;
  text-align:center;
}

.ff-page-hero h1{
  margin:0 0 14px;
  font-size:clamp(44px,7vw,82px);
  line-height:1;
  letter-spacing:-.06em;
  background:linear-gradient(120deg,var(--ff-purple-dark),var(--ff-purple),#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-page-hero p{
  max-width:760px;
  margin:0 auto;
  font-size:18px;
  color:var(--ff-muted);
  line-height:1.7;
}

h1,h2,h3{
  color:var(--ff-purple-dark);
  letter-spacing:-.045em;
}

h1{font-size:clamp(42px,7vw,82px);line-height:1}
h2{font-size:clamp(34px,5vw,56px);line-height:1}
p{color:var(--ff-muted);line-height:1.65}

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
.affiliate-panel,
.admin-card,
.ff-card{
  background:var(--ff-glass) !important;
  border:1px solid var(--ff-border) !important;
  border-radius:28px !important;
  box-shadow:var(--ff-shadow) !important;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
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
input[type="submit"],
.ff-primary{
  background:linear-gradient(135deg,var(--ff-purple),var(--ff-purple-mid),var(--ff-pink));
  color:#fff;
  box-shadow:0 16px 34px rgba(104,35,95,.20);
}

.ff-secondary{
  background:rgba(255,255,255,.86) !important;
  color:var(--ff-purple) !important;
  border:1px solid var(--ff-border) !important;
}

input,
select,
textarea{
  border:1px solid var(--ff-border);
  border-radius:16px;
  padding:14px 16px;
  min-height:48px;
  outline:none;
  background:rgba(255,255,255,.88);
  color:var(--ff-text);
}

input:focus,
select:focus,
textarea:focus{
  border-color:rgba(104,35,95,.45);
  box-shadow:0 0 0 4px rgba(244,167,216,.22);
}

table{
  width:100%;
  border-collapse:collapse;
  background:rgba(255,255,255,.70);
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

/* Products/cards consistent */
.products-grid,
.product-grid,
.cards,
.grid{
  gap:18px;
}

.product-card{
  overflow:hidden;
}

.product-card img{
  border-radius:22px;
}

/* Admin redesign */
body.ff-admin-body{
  min-height:100vh;
  background:
    radial-gradient(circle at 10% 12%, rgba(244,167,216,.26), transparent 28%),
    radial-gradient(circle at 88% 18%, rgba(104,35,95,.22), transparent 28%),
    linear-gradient(135deg,#fff8fd,#fff1fa 52%,#fffaf7);
}

body.ff-admin-body::before{
  opacity:.055;
}

.ff-admin-layout{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
}

.ff-admin-sidebar{
  position:sticky;
  top:0;
  height:100vh;
  padding:22px;
  background:linear-gradient(180deg,rgba(53,17,47,.96),rgba(104,35,95,.92));
  color:white;
  box-shadow:20px 0 50px rgba(53,17,47,.18);
}

.ff-admin-logo{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:26px;
  font-weight:950;
  font-size:24px;
}

.ff-admin-logo img{
  width:48px;
  height:48px;
  object-fit:cover;
  border-radius:16px;
  box-shadow:0 14px 28px rgba(0,0,0,.18);
}

.ff-admin-menu{
  display:grid;
  gap:8px;
}

.ff-admin-menu a{
  color:rgba(255,255,255,.84);
  padding:13px 14px;
  border-radius:16px;
  font-weight:800;
}

.ff-admin-menu a:hover,
.ff-admin-menu a.active{
  background:rgba(255,255,255,.13);
  color:#fff;
}

.ff-admin-main{
  padding:28px;
}

.ff-admin-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  margin-bottom:24px;
}

.ff-admin-title h1{
  margin:0;
  font-size:clamp(34px,4vw,58px);
  background:linear-gradient(120deg,var(--ff-purple-dark),var(--ff-purple),#d55cbb);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.ff-admin-title p{
  margin:8px 0 0;
}

.ff-admin-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
  margin-bottom:22px;
}

.ff-admin-stat{
  padding:22px;
}

.ff-admin-stat strong{
  display:block;
  font-size:30px;
  color:var(--ff-purple);
}

.ff-admin-stat span{
  color:var(--ff-muted);
  font-weight:800;
}

.ff-admin-section{
  padding:24px;
}

body.ff-admin-login{
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:24px;
  background:
    radial-gradient(circle at 12% 12%, rgba(244,167,216,.30), transparent 28%),
    radial-gradient(circle at 90% 14%, rgba(104,35,95,.24), transparent 28%),
    linear-gradient(135deg,#fff8fd,#fff1fa,#fffaf7);
}

.ff-admin-login-card{
  width:min(460px,100%);
  padding:34px;
  text-align:center;
}

.ff-admin-login-card img{
  width:86px;
  height:86px;
  object-fit:cover;
  border-radius:26px;
  margin-bottom:16px;
}

.ff-admin-login-card h1{
  margin:0 0 8px;
  font-size:42px;
}

.ff-admin-login-card form{
  display:grid;
  gap:14px;
  margin-top:22px;
  text-align:left;
}

.ff-admin-login-card label{
  font-weight:850;
  color:var(--ff-purple-dark);
}

/* Mobile */
@media(max-width:900px){
  body::before{
    background-size:430px;
    background-position:140% 8%;
  }

  .ff-wrap,
  .wrap,
  main,
  .container,
  .page{
    width:calc(100% - 28px);
  }

  .ff-nav,
  .nav{
    min-height:76px;
  }

  .ff-menu,
  .hamb{
    display:grid;
    place-items:center;
    width:56px;
    height:56px;
    border-radius:18px;
    background:var(--ff-purple);
    color:#fff;
    font-size:26px;
  }

  .ff-navlinks,
  .navlinks{
    display:none;
    position:absolute;
    top:78px;
    left:14px;
    right:14px;
    padding:14px;
    border-radius:24px;
    background:#fff;
    border:1px solid var(--ff-border);
    box-shadow:0 22px 50px rgba(104,35,95,.14);
  }

  .ff-navlinks.open,
  .navlinks.open{
    display:grid;
  }

  h1{font-size:clamp(42px,13vw,68px)}
  h2{font-size:clamp(34px,11vw,52px)}

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
  .contact-grid,
  .ff-admin-grid{
    display:grid !important;
    grid-template-columns:1fr !important;
  }

  .ff-admin-layout{
    display:block;
  }

  .ff-admin-sidebar{
    position:relative;
    height:auto;
    border-radius:0 0 28px 28px;
  }

  .ff-admin-menu{
    grid-template-columns:1fr 1fr;
  }

  .ff-admin-main{
    padding:18px 14px 36px;
  }

  .ff-admin-top{
    display:block;
  }

  table{
    font-size:14px;
  }

  th,td{
    padding:10px;
  }
}
`;

fs.writeFileSync(path.join(cssDir, "femifresh-unified.css"), css);

/* 2) Unified public header, no Why FemiFresh, no affiliate in header */
function publicHeader() {
  return `
<header class="ff-site-header">
  <nav class="ff-nav">
    <a class="ff-brand" href="/">
      <img src="/images/femifresh-logo.jpg" alt="FemiFresh logo">
      <span>FemiFresh</span>
    </a>

    <button class="ff-menu" id="ffMenuBtn" aria-label="Open menu">☰</button>

    <div class="ff-navlinks" id="ffNavLinks">
      <a href="/products.html">Products</a>
      <a href="/policies.html">Policy</a>
      <a href="/contact.html">Contact</a>
    </div>
  </nav>
</header>`;
}

function publicHeaderScript() {
  return `
<script>
  const ffMenuBtn = document.getElementById("ffMenuBtn");
  const ffNavLinks = document.getElementById("ffNavLinks");
  if (ffMenuBtn && ffNavLinks) {
    ffMenuBtn.addEventListener("click", () => ffNavLinks.classList.toggle("open"));
  }
</script>`;
}

function injectUnifiedCss(html) {
  html = html.replace(/<link[^>]+femifresh-global\.css[^>]*>\s*/gi, "");
  html = html.replace(/<link[^>]+glass-home-refresh\.css[^>]*>\s*/gi, "");
  html = html.replace(/<link[^>]+mobile-polish\.css[^>]*>\s*/gi, "");
  if (!html.includes("/css/femifresh-unified.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femifresh-unified.css">\n</head>');
  }
  return html;
}

function replacePublicHeader(html) {
  html = html.replace(/<header[\s\S]*?<\/header>/i, publicHeader());
  if (!/<header[\s\S]*?<\/header>/i.test(html)) {
    html = html.replace("<body>", "<body>\n" + publicHeader());
  }
  if (!html.includes("ffMenuBtn")) {
    html = html.replace("</body>", publicHeaderScript() + "\n</body>");
  }
  return html;
}

/* 3) Clean all public pages */
for (const file of walk(publicDir)) {
  const isAdmin = file.includes(path.sep + "admin" + path.sep);
  let html = fs.readFileSync(file, "utf8");

  html = cleanPhone(html).replace(/\\n/g, "\n");
  html = injectUnifiedCss(html);

  if (!isAdmin) {
    const name = path.basename(file).toLowerCase();

    /* keep homepage custom structure, but remove old header links */
    html = replacePublicHeader(html);

    /* remove old affiliate floating script on non-home */
    if (name !== "index.html") {
      html = html
        .replace(/<script[^>]+store-affiliate-buttons\.js[^>]*><\/script>\s*/gi, "")
        .replace(/<script[^>]+glass-home-refresh\.js[^>]*><\/script>\s*/gi, "");
    }
  }

  fs.writeFileSync(file, html);
  console.log("Updated:", path.relative(publicDir, file));
}

/* 4) Make contact page match homepage vibe and email only */
const contactFile = path.join(publicDir, "contact.html");
fs.writeFileSync(contactFile, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Contact FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femifresh-unified.css">
</head>
<body>
${publicHeader()}

<main>
  <section class="ff-page-hero">
    <h1>Contact FemiFresh</h1>
    <p>For orders, affiliate support, stock packages and general enquiries, please contact us by email.</p>
  </section>

  <section style="padding:26px 0 90px;">
    <div class="ff-card" style="max-width:760px;margin:auto;padding:36px;text-align:center;">
      <img src="/images/femifresh-logo.jpg" alt="FemiFresh" style="width:110px;height:110px;object-fit:cover;border-radius:28px;margin-bottom:18px;">
      <h2 style="margin:0 0 12px;">We’re here to help.</h2>
      <p style="margin-bottom:24px;">Send us an email and our team will assist you as soon as possible.</p>
      <a class="ff-secondary btn" href="mailto:femifresh02@gmail.com">femifresh02@gmail.com</a>
      <div style="margin-top:28px;">
        <a class="btn" href="/products.html">Shop Products</a>
      </div>
    </div>
  </section>
</main>

${publicHeaderScript()}
</body>
</html>`);

/* 5) Admin CSS injection and wrapper script */
const adminEnhanceJs = `
(function(){
  document.body.classList.add(location.pathname.includes("login") ? "ff-admin-login" : "ff-admin-body");

  if (!location.pathname.includes("login") && !document.querySelector(".ff-admin-layout")) {
    const bodyChildren = Array.from(document.body.children);
    const sidebar = document.createElement("aside");
    sidebar.className = "ff-admin-sidebar";
    sidebar.innerHTML = \`
      <div class="ff-admin-logo">
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
        <span>FemiFresh Admin</span>
      </div>
      <nav class="ff-admin-menu">
        <a href="/admin/dashboard.html">Dashboard</a>
        <a href="/admin/orders.html">Orders</a>
        <a href="/admin/products.html">Products</a>
        <a href="/admin/affiliates.html">Affiliates</a>
        <a href="/admin/delivery.html">Delivery</a>
        <a href="/admin/logs.html">Logs</a>
      </nav>
    \`;

    const main = document.createElement("main");
    main.className = "ff-admin-main";

    bodyChildren.forEach(el => {
      if (el.tagName !== "SCRIPT") main.appendChild(el);
    });

    const layout = document.createElement("div");
    layout.className = "ff-admin-layout";
    layout.appendChild(sidebar);
    layout.appendChild(main);

    document.body.prepend(layout);
  }

  if (location.pathname.includes("login")) {
    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
      if (!form.closest(".ff-admin-login-card")) {
        const card = document.createElement("div");
        card.className = "ff-admin-login-card ff-card";
        card.innerHTML = \`
          <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
          <h1>Admin Login</h1>
          <p>Manage FemiFresh orders, products and affiliates.</p>
        \`;
        form.parentNode.insertBefore(card, form);
        card.appendChild(form);
      }
    });
  }

  document.querySelectorAll("h1").forEach(h => {
    if (!h.closest(".ff-admin-title") && !location.pathname.includes("login")) {
      const wrap = document.createElement("div");
      wrap.className = "ff-admin-top";
      wrap.innerHTML = \`<div class="ff-admin-title"></div>\`;
      h.parentNode.insertBefore(wrap, h);
      wrap.querySelector(".ff-admin-title").appendChild(h);
    }
  });
})();
`;

fs.writeFileSync(path.join(publicDir, "js", "admin-unified.js"), adminEnhanceJs);

for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");
  html = cleanPhone(html).replace(/\\n/g, "\n");
  html = injectUnifiedCss(html);

  if (!html.includes("/js/admin-unified.js")) {
    html = html.replace("</body>", '  <script src="/js/admin-unified.js"></script>\n</body>');
  }

  fs.writeFileSync(file, html);
  console.log("Admin redesigned:", path.relative(publicDir, file));
}

/* 6) Final remove contact number anywhere */
for (const file of walk(publicDir)) {
  let html = fs.readFileSync(file, "utf8");
  html = cleanPhone(html);
  fs.writeFileSync(file, html);
}

console.log("✅ Unified public website and admin redesign complete.");
