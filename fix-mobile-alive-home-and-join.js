const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const polishCss = path.join(publicDir, "css", "mobile-polish.css");
const buttonsJs = path.join(publicDir, "js", "store-affiliate-buttons.js");

/* 1) Remove visible literal \n from HTML files */
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

for (const file of walk(publicDir)) {
  let html = fs.readFileSync(file, "utf8");

  if (html.includes("\\n")) {
    html = html.replace(/\\n/g, "\n");
    fs.writeFileSync(file, html);
    console.log("Removed visible \\n from", path.relative(publicDir, file));
  }
}

/* 2) Replace affiliate buttons script so buttons appear in hero, not hidden */
fs.writeFileSync(buttonsJs, `
(function () {
  if (document.getElementById("ff-affiliate-store-buttons")) return;

  const isStorePage = !location.pathname.includes("/admin");
  if (!isStorePage) return;

  const wrap = document.createElement("div");
  wrap.id = "ff-affiliate-store-buttons";
  wrap.className = "ff-affiliate-hero-actions";
  wrap.innerHTML = \`
    <a class="ff-store-aff-btn primary" href="https://affiliates.femifresh.co.za">Become an Affiliate</a>
    <a class="ff-store-aff-btn secondary" href="https://affiliates.femifresh.co.za/login">Affiliate Back Office</a>
  \`;

  const heroActions =
    document.querySelector(".hero-actions") ||
    document.querySelector(".hero .actions") ||
    document.querySelector(".hero-buttons") ||
    document.querySelector(".hero .buttons") ||
    document.querySelector(".actions");

  if (heroActions) {
    heroActions.insertAdjacentElement("afterend", wrap);
    return;
  }

  const hero =
    document.querySelector(".hero") ||
    document.querySelector("section") ||
    document.querySelector("main") ||
    document.body;

  hero.appendChild(wrap);
})();
`);

/* 3) Add alive/mobile CSS */
let css = fs.existsSync(polishCss) ? fs.readFileSync(polishCss, "utf8") : "";

if (!css.includes("FEMIFRESH_ALIVE_MOBILE_V2")) {
  css += `

/* FEMIFRESH_ALIVE_MOBILE_V2 */
:root {
  --ff-purple: #6b1f64;
  --ff-purple-dark: #4b1647;
  --ff-pink: #f47ac3;
  --ff-soft: #fff3fb;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 18%, rgba(244,122,195,.16), transparent 28%),
    radial-gradient(circle at 85% 20%, rgba(255,255,255,.13), transparent 26%),
    radial-gradient(circle at 50% 90%, rgba(244,122,195,.10), transparent 30%);
  z-index: -1;
}

.hero,
.hero-section,
section:first-of-type {
  position: relative;
  overflow: hidden;
}

.hero::before,
.hero-section::before,
section:first-of-type::before {
  content: "";
  position: absolute;
  inset: -40%;
  background:
    radial-gradient(circle, rgba(255,255,255,.18), transparent 20%),
    radial-gradient(circle at 70% 30%, rgba(244,122,195,.22), transparent 22%);
  animation: ffGlowMove 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes ffGlowMove {
  from { transform: translate(-5%, -3%) rotate(0deg); opacity: .45; }
  to { transform: translate(5%, 4%) rotate(8deg); opacity: .85; }
}

.hero h1,
.hero-section h1,
section:first-of-type h1 {
  text-shadow: 0 0 24px rgba(255,255,255,.22), 0 0 34px rgba(244,122,195,.22);
  animation: ffTitleGlow 3s ease-in-out infinite alternate;
}

@keyframes ffTitleGlow {
  from { filter: drop-shadow(0 0 0 rgba(244,122,195,0)); }
  to { filter: drop-shadow(0 0 18px rgba(244,122,195,.45)); }
}

.hero img,
.hero-section img,
header img {
  animation: ffFloat 4.8s ease-in-out infinite;
}

@keyframes ffFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

button,
.btn,
a.button,
.ff-store-aff-btn {
  transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
}

button:hover,
.btn:hover,
a.button:hover,
.ff-store-aff-btn:hover {
  transform: translateY(-2px);
}

.ff-affiliate-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
  position: relative;
  z-index: 3;
}

.ff-store-aff-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 999px;
  padding: 14px 22px;
  font-weight: 900;
  font-size: 15px;
  box-shadow: 0 14px 34px rgba(30, 3, 31, .18);
  white-space: nowrap;
}

.ff-store-aff-btn.primary {
  background: linear-gradient(135deg, #7a2070, #a72c96, #f47ac3);
  color: #fff;
  box-shadow: 0 16px 38px rgba(167,44,150,.28);
}

.ff-store-aff-btn.secondary {
  background: rgba(255,255,255,.94);
  color: var(--ff-purple);
  border: 1px solid rgba(107,31,100,.18);
}

.ff-store-aff-btn.primary::after {
  content: " ✨";
}

/* Make join/login pages phone-friendly */
@media (max-width: 760px) {
  body {
    overflow-x: hidden;
  }

  main,
  .container,
  .affiliate-page,
  .join-page,
  .auth-page {
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 14px !important;
    padding-right: 14px !important;
    box-sizing: border-box;
  }

  .affiliate-page,
  .join-page,
  .auth-page,
  main > section,
  .grid,
  .auth-grid,
  .join-grid {
    display: block !important;
    grid-template-columns: 1fr !important;
  }

  form,
  .card,
  .form-card,
  .auth-card,
  .join-card,
  .ff-auth-card {
    width: 100% !important;
    max-width: 100% !important;
    margin: 16px auto !important;
    box-sizing: border-box;
    border-radius: 24px !important;
  }

  input,
  select,
  textarea,
  button {
    width: 100% !important;
    min-height: 48px;
    font-size: 16px !important;
    box-sizing: border-box;
  }

  .hero,
  .hero-section,
  section:first-of-type {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }

  .hero h1,
  .hero-section h1,
  section:first-of-type h1 {
    font-size: clamp(42px, 13vw, 66px) !important;
    line-height: 1.08 !important;
    letter-spacing: -1px;
  }

  .hero p,
  .hero-section p,
  section:first-of-type p {
    font-size: 20px !important;
    line-height: 1.55 !important;
  }

  .ff-affiliate-hero-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin: 20px 0 6px;
  }

  .ff-store-aff-btn {
    width: 100%;
    padding: 15px 18px;
    font-size: 15px;
  }

  .cart-button,
  .floating-cart,
  #cart-button,
  [href*="cart"] {
    z-index: 50;
  }
}
`;
}

fs.writeFileSync(polishCss, css);

/* 4) Make sure pages load the CSS and buttons JS */
const pages = [
  "index.html",
  "products.html",
  "cart.html",
  "checkout.html",
  "contact.html",
  "policies.html",
  "distributors.html",
  "join.html",
  "affiliate-login.html",
  "affiliate-dashboard.html"
];

for (const page of pages) {
  const file = path.join(publicDir, page);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/css/mobile-polish.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/css/mobile-polish.css">\n</head>');
  }

  if (
    ["index.html", "products.html", "cart.html", "checkout.html", "contact.html"].includes(page) &&
    !html.includes("/js/store-affiliate-buttons.js")
  ) {
    html = html.replace("</body>", '<script src="/js/store-affiliate-buttons.js"></script>\n</body>');
  }

  fs.writeFileSync(file, html);
}

console.log("Mobile alive polish installed.");
