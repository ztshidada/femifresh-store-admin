const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const cssDir = path.join(publicDir, "css");
const jsDir = path.join(publicDir, "js");

fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

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

/* UNIVERSAL MOBILE CSS */
fs.writeFileSync(path.join(cssDir, "femifresh-mobile-system.css"), `
/* FEMIFRESH_MOBILE_SYSTEM_V1 */

/* General mobile reset */
* {
  box-sizing: border-box;
}

html,
body {
  max-width: 100%;
  overflow-x: hidden !important;
}

img,
video {
  max-width: 100%;
  height: auto;
}

input,
select,
textarea,
button {
  font-size: 16px !important;
}

/* Remove visible accidental \\n text if layout exposed it */
body {
  word-break: normal;
}

/* Public store header */
.ff-site-header,
header,
.topbar {
  width: 100% !important;
}

.ff-nav,
.nav {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding-left: clamp(16px, 5vw, 80px) !important;
  padding-right: clamp(16px, 5vw, 80px) !important;
}

.ff-brand,
.brand {
  min-width: 0;
}

.ff-brand span,
.brand span {
  white-space: nowrap;
}

.ff-navlinks,
.navlinks {
  margin-left: auto !important;
}

/* Cart icon far right */
.ff-navlinks a[href="/cart.html"],
.navlinks a[href="/cart.html"] {
  margin-left: auto !important;
  width: 52px !important;
  height: 52px !important;
  border-radius: 999px !important;
  display: inline-grid !important;
  place-items: center !important;
  font-size: 0 !important;
  background: rgba(255,255,255,.9) !important;
  border: 1px solid rgba(104,35,95,.12) !important;
  box-shadow: 0 12px 26px rgba(104,35,95,.10) !important;
}

.ff-navlinks a[href="/cart.html"]::after,
.navlinks a[href="/cart.html"]::after {
  content: "🛒" !important;
  font-size: 22px !important;
}

/* Public store sections */
main,
.container,
.wrap,
.page,
.section,
.ff-wrap {
  width: min(1180px, calc(100% - 32px)) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.card,
.panel,
.product-card,
.checkout-card,
.cart-card,
.form-card,
.auth-card {
  max-width: 100%;
}

/* Products */
.products-grid,
.product-grid,
.cards,
.grid {
  gap: 18px;
}

/* Forms */
form {
  max-width: 100%;
}

input,
select,
textarea {
  max-width: 100%;
}

/* Tables */
.table-wrap,
.table-card,
.orders-table,
.admin-table {
  width: 100%;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
}

/* Admin universal */
.admin-shell,
.ff-admin-layout {
  min-height: 100vh;
}

.sidebar,
.ff-admin-sidebar,
aside {
  overflow-x: hidden;
}

.main,
.ff-admin-main {
  min-width: 0;
}

.admin-shell table,
.ff-admin-main table {
  min-width: 760px;
}

/* Affiliate pages */
#ffDashboardLock,
.MANUAL_PAYMENT_NOTICE_SAFE_V1,
.MANUAL_AFFILIATE_PAYMENT_NOTICE_V2,
#ffManualPaymentBox {
  max-width: calc(100% - 28px) !important;
}

/* Mobile only */
@media (max-width: 900px) {
  body {
    min-width: 0 !important;
  }

  /* Header becomes usable on phone */
  .ff-nav,
  .nav {
    min-height: 76px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
    gap: 10px !important;
  }

  .ff-brand img,
  .brand img {
    width: 48px !important;
    height: 48px !important;
  }

  .ff-brand,
  .brand {
    font-size: 22px !important;
  }

  .ff-menu,
  .hamb,
  #menuBtn {
    display: grid !important;
    place-items: center !important;
    width: 52px !important;
    height: 52px !important;
    border-radius: 16px !important;
    border: 0 !important;
    background: #68235f !important;
    color: #fff !important;
    margin-left: auto !important;
    flex: 0 0 auto !important;
  }

  .ff-navlinks,
  .navlinks {
    display: none !important;
    position: absolute !important;
    top: 76px !important;
    left: 14px !important;
    right: 14px !important;
    z-index: 999 !important;
    padding: 14px !important;
    border-radius: 22px !important;
    background: rgba(255,255,255,.96) !important;
    border: 1px solid rgba(104,35,95,.14) !important;
    box-shadow: 0 22px 50px rgba(104,35,95,.18) !important;
  }

  .ff-navlinks.open,
  .navlinks.open,
  body.ff-mobile-menu-open .ff-navlinks,
  body.ff-mobile-menu-open .navlinks {
    display: grid !important;
    gap: 8px !important;
  }

  .ff-navlinks a,
  .navlinks a {
    width: 100% !important;
    min-height: 46px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 14px !important;
    font-size: 15px !important;
    padding: 12px !important;
  }

  .ff-navlinks a[href="/cart.html"],
  .navlinks a[href="/cart.html"] {
    width: 100% !important;
    height: auto !important;
    font-size: 15px !important;
    margin-left: 0 !important;
  }

  .ff-navlinks a[href="/cart.html"]::before,
  .navlinks a[href="/cart.html"]::before {
    content: "Cart ";
    font-size: 15px !important;
  }

  /* Public layout */
  main,
  .container,
  .wrap,
  .page,
  .section,
  .ff-wrap {
    width: calc(100% - 28px) !important;
  }

  section {
    max-width: 100%;
  }

  h1 {
    font-size: clamp(40px, 12vw, 66px) !important;
    line-height: 1.02 !important;
  }

  h2 {
    font-size: clamp(30px, 9vw, 48px) !important;
    line-height: 1.05 !important;
  }

  p {
    font-size: 16px !important;
  }

  .hero,
  .hero-section,
  .ff-home-hero {
    min-height: auto !important;
    padding: 48px 0 !important;
  }

  .hero-grid,
  .checkout-grid,
  .cart-grid,
  .contact-grid,
  .affiliate-grid,
  .products-grid,
  .product-grid,
  .cards,
  .grid,
  .two,
  .stats {
    display: grid !important;
    grid-template-columns: 1fr !important;
  }

  .product-card,
  .card,
  .panel {
    border-radius: 24px !important;
  }

  .product-img {
    height: 220px !important;
    min-height: 220px !important;
  }

  button,
  .btn,
  .button,
  input[type="submit"] {
    width: 100%;
    min-height: 52px !important;
  }

  input,
  select,
  textarea {
    width: 100% !important;
    min-height: 52px !important;
  }

  /* Affiliate login/join pages */
  .ff-affiliate-login-shell {
    display: grid !important;
    grid-template-columns: 1fr !important;
    width: calc(100% - 28px) !important;
    padding: 36px 0 !important;
    gap: 20px !important;
  }

  .ff-affiliate-login-card,
  .ff-affiliate-login-copy,
  .auth-card,
  .join-card {
    width: 100% !important;
    padding: 24px !important;
  }

  .ff-affiliate-login-copy {
    text-align: center !important;
  }

  /* Affiliate locked dashboard */
  body main[style*="place-items:center"] {
    padding: 22px 14px !important;
  }

  body main[style*="place-items:center"] section {
    padding: 24px !important;
    border-radius: 26px !important;
  }

  body main[style*="place-items:center"] h1 {
    font-size: clamp(38px, 11vw, 58px) !important;
  }

  body main[style*="place-items:center"] div[style*="display:flex"] {
    display: grid !important;
  }

  /* Admin */
  .admin-shell,
  .ff-admin-layout {
    display: block !important;
  }

  .sidebar,
  .ff-admin-sidebar {
    position: relative !important;
    height: auto !important;
    width: 100% !important;
    padding: 16px !important;
    border-radius: 0 0 24px 24px !important;
  }

  .logo,
  .ff-admin-logo {
    margin-bottom: 14px !important;
  }

  .menu,
  .ff-admin-menu {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
  }

  .menu a,
  .ff-admin-menu a {
    padding: 11px 10px !important;
    font-size: 14px !important;
    text-align: center !important;
  }

  .main,
  .ff-admin-main {
    padding: 18px 14px 40px !important;
  }

  .top,
  .topbar,
  .ff-admin-top {
    display: block !important;
  }

  .stats,
  .ff-admin-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
  }

  .toolbar {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .toolbar .left {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .search {
    min-width: 0 !important;
    width: 100% !important;
  }

  .table-wrap {
    border-radius: 18px !important;
  }

  th,
  td {
    padding: 12px !important;
    font-size: 14px !important;
  }

  .item-row {
    grid-template-columns: 1fr !important;
  }

  .side-card {
    margin-bottom: 14px !important;
  }
}

/* Very small phones */
@media (max-width: 430px) {
  .ff-brand span,
  .brand span {
    font-size: 20px !important;
  }

  .ff-brand img,
  .brand img {
    width: 44px !important;
    height: 44px !important;
  }

  h1 {
    font-size: clamp(36px, 13vw, 54px) !important;
  }

  .card,
  .panel {
    padding: 18px !important;
  }

  .menu,
  .ff-admin-menu {
    grid-template-columns: 1fr !important;
  }
}
`);

/* UNIVERSAL MOBILE JS */
fs.writeFileSync(path.join(jsDir, "femifresh-mobile-system.js"), `
(function(){
  function cleanLiteralNewlines(){
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(n => {
        if (n.nodeValue && n.nodeValue.includes("\\\\n")) {
          n.nodeValue = n.nodeValue.replace(/\\\\n/g, "");
        }
      });
    } catch(e){}
  }

  function setupMenu(){
    const btn =
      document.getElementById("ffMenuBtn") ||
      document.getElementById("menuBtn") ||
      document.querySelector(".ff-menu") ||
      document.querySelector(".hamb");

    const links =
      document.getElementById("ffNavLinks") ||
      document.getElementById("navLinks") ||
      document.querySelector(".ff-navlinks") ||
      document.querySelector(".navlinks");

    if (btn && links && !btn.dataset.ffMobileReady) {
      btn.dataset.ffMobileReady = "yes";

      btn.addEventListener("click", function(e){
        e.preventDefault();
        links.classList.toggle("open");
        document.body.classList.toggle("ff-mobile-menu-open");
      });
    }
  }

  function wrapTables(){
    document.querySelectorAll("table").forEach(table => {
      if (table.parentElement && table.parentElement.classList.contains("ff-table-scroll")) return;

      const wrap = document.createElement("div");
      wrap.className = "ff-table-scroll";
      wrap.style.cssText = "width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;";

      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function makeAdminUsefulOnPhone(){
    if (!location.pathname.includes("/admin/")) return;

    document.body.classList.add("ff-admin-phone-ready");

    const sidebar = document.querySelector(".sidebar,.ff-admin-sidebar,aside");
    if (sidebar && !document.getElementById("ffAdminMobileHint")) {
      const hint = document.createElement("div");
      hint.id = "ffAdminMobileHint";
      hint.textContent = "Admin menu";
      hint.style.cssText = "font-weight:900;margin:0 0 10px;color:#fff;opacity:.85;";
      sidebar.prepend(hint);
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    cleanLiteralNewlines();
    setupMenu();
    wrapTables();
    makeAdminUsefulOnPhone();
  });

  window.addEventListener("resize", setupMenu);
})();
`);

/* Inject into all HTML pages */
const htmlFiles = walk(publicDir);

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/\\n/g, "\n");

  if (!html.includes("/css/femifresh-mobile-system.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femifresh-mobile-system.css">\n</head>');
  }

  if (!html.includes("/js/femifresh-mobile-system.js")) {
    html = html.replace("</body>", '  <script src="/js/femifresh-mobile-system.js"></script>\n</body>');
  }

  fs.writeFileSync(file, html);
  console.log("Mobile ready:", path.relative(publicDir, file));
}

console.log("Whole FemiFresh system is now mobile responsive.");
