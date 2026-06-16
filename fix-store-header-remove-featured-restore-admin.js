const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");

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

/* 1) Remove featured products section from homepage */
const indexFile = path.join(publicDir, "index.html");

if (fs.existsSync(indexFile)) {
  let html = fs.readFileSync(indexFile, "utf8");

  html = html.replace(/<section class="products" id="featured">[\s\S]*?<\/section>/i, "");
  html = html.replace(/<section[^>]*id=["']featured["'][\s\S]*?<\/section>/i, "");

  /* remove floating cart if still there */
  html = html.replace(/<a class="floating-cart"[\s\S]*?<\/a>/gi, "");

  fs.writeFileSync(indexFile, html);
  console.log("Removed featured products section from homepage.");
}

/* 2) Fix public header cart position */
const headerCssFile = path.join(publicDir, "css", "femifresh-unified.css");
let css = fs.existsSync(headerCssFile) ? fs.readFileSync(headerCssFile, "utf8") : "";

if (!css.includes("FINAL_CART_RIGHT_HEADER_FIX_V1")) {
  css += `

/* FINAL_CART_RIGHT_HEADER_FIX_V1 */
.ff-nav,
.nav {
  width: 100% !important;
  max-width: none !important;
  padding-left: 9vw !important;
  padding-right: 9vw !important;
  margin: 0 !important;
  display: flex !important;
}

.ff-brand,
.brand {
  flex-shrink: 0 !important;
}

.ff-navlinks,
.navlinks {
  margin-left: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 18px !important;
}

.ff-navlinks a[href="/cart.html"],
.navlinks a[href="/cart.html"] {
  margin-left: 18px !important;
  width: 52px !important;
  height: 52px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  display: inline-grid !important;
  place-items: center !important;
  font-size: 0 !important;
  background: rgba(255,255,255,.88) !important;
  border: 1px solid rgba(104,35,95,.12) !important;
  box-shadow: 0 12px 26px rgba(104,35,95,.10) !important;
}

.ff-navlinks a[href="/cart.html"]::after,
.navlinks a[href="/cart.html"]::after {
  content: "🛒" !important;
  font-size: 22px !important;
  line-height: 1 !important;
}

@media(max-width:900px){
  .ff-nav,
  .nav {
    padding-left: 18px !important;
    padding-right: 18px !important;
  }

  .ff-navlinks,
  .navlinks {
    display: none !important;
  }

  .ff-navlinks.open,
  .navlinks.open {
    display: grid !important;
  }

  .ff-navlinks a[href="/cart.html"],
  .navlinks a[href="/cart.html"] {
    width: 100% !important;
    font-size: 15px !important;
    display: flex !important;
  }

  .ff-navlinks a[href="/cart.html"]::before,
  .navlinks a[href="/cart.html"]::before {
    content: "Cart ";
    font-size: 15px !important;
  }
}
`;
}

fs.writeFileSync(headerCssFile, css);
console.log("Cart moved to far-right header position.");

/* 3) Remove our admin-breaking injected CSS/JS from admin pages */
for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/<link[^>]+femifresh-unified\.css[^>]*>\s*/gi, "")
    .replace(/<link[^>]+femifresh-global\.css[^>]*>\s*/gi, "")
    .replace(/<link[^>]+glass-home-refresh\.css[^>]*>\s*/gi, "")
    .replace(/<link[^>]+mobile-polish\.css[^>]*>\s*/gi, "")
    .replace(/<link[^>]+admin-safe-polish\.css[^>]*>\s*/gi, "")
    .replace(/<script[^>]+admin-unified\.js[^>]*><\/script>\s*/gi, "")
    .replace(/\\n/g, "\n");

  fs.writeFileSync(file, html);
  console.log("Removed public/admin-breaking styling from:", path.relative(publicDir, file));
}

/* 4) Add a very light safe admin CSS only, without moving/hiding anything */
const safeAdminCss = path.join(publicDir, "css", "admin-basic-safe.css");

fs.writeFileSync(safeAdminCss, `
/* ADMIN_BASIC_SAFE_V1 - visual only, does not move layout */
body {
  background: #fff8fd !important;
  color: #241126;
}

button,
.btn,
input[type="submit"] {
  border-radius: 999px !important;
}

input,
select,
textarea {
  border-radius: 12px !important;
}

.card,
.panel,
table,
form {
  border-radius: 18px !important;
}
`);

for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/css/admin-basic-safe.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/admin-basic-safe.css">\n</head>');
  }

  fs.writeFileSync(file, html);
}

console.log("Admin restored to safer layout.");
