const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const cssDir = path.join(publicDir, "css");
const jsDir = path.join(publicDir, "js");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
}

function injectOnce(file, snippet, before = "</head>") {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(snippet)) return;
  if (!html.includes(before)) return;
  html = html.replace(before, snippet + "\n" + before);
  fs.writeFileSync(file, html);
}

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

ensureDir(cssDir);
ensureDir(jsDir);

/* ---------------- CSS ---------------- */
const css = `
/* FEMIFRESH_GLASS_HOME_REFRESH */
:root{
  --ff-bg-1:#f9eef8;
  --ff-bg-2:#f2d4ef;
  --ff-purple:#6f1e67;
  --ff-purple-2:#8e2b82;
  --ff-purple-3:#b64ea7;
  --ff-purple-dark:#471342;
  --ff-pink:#f6a3d8;
  --ff-pink-soft:#ffe5f5;
  --ff-text:#3b1638;
  --ff-white-soft:#fff7fc;
}

html,body{
  overflow-x:hidden;
}

body{
  background:
    radial-gradient(circle at 12% 14%, rgba(255,255,255,.65), transparent 22%),
    radial-gradient(circle at 82% 18%, rgba(246,163,216,.28), transparent 24%),
    radial-gradient(circle at 50% 85%, rgba(182,78,167,.16), transparent 28%),
    linear-gradient(180deg, var(--ff-bg-1), #f6e6f4 45%, #f4ddf0 100%);
  color:var(--ff-text);
}

/* global glossy feel */
.card,
.panel,
.auth-card,
.form-card,
.join-card,
.product-card,
.feature-card,
section .card,
main section > div{
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.ff-home-hero,
.hero,
.hero-section{
  position:relative;
  overflow:hidden;
}

.ff-home-hero::before,
.hero::before,
.hero-section::before{
  content:"";
  position:absolute;
  inset:-20%;
  pointer-events:none;
  background:
    radial-gradient(circle at 18% 18%, rgba(255,255,255,.18), transparent 16%),
    radial-gradient(circle at 80% 28%, rgba(246,163,216,.22), transparent 18%),
    radial-gradient(circle at 52% 88%, rgba(182,78,167,.18), transparent 22%);
  animation:ffLightsMove 9s ease-in-out infinite alternate;
  z-index:0;
}

@keyframes ffLightsMove{
  from{transform:translate(-2%,-2%) scale(1);opacity:.62;}
  to{transform:translate(2%,3%) scale(1.06);opacity:.95;}
}

.ff-home-hero > *{
  position:relative;
  z-index:2;
}

.ff-live-title{
  background:linear-gradient(120deg,#fff7fc 0%,#ffe0f5 22%,#f6c3e5 52%,#fff1fa 76%,#f3d5ff 100%);
  background-size:220% 220%;
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent !important;
  animation:ffTitleShift 5.2s ease-in-out infinite;
  text-shadow:0 0 24px rgba(255,255,255,.08),0 0 34px rgba(246,163,216,.18);
  letter-spacing:-1px;
}

@keyframes ffTitleShift{
  0%{background-position:0% 50%; transform:translateY(0);}
  50%{background-position:100% 50%; transform:translateY(-1px);}
  100%{background-position:0% 50%; transform:translateY(0);}
}

.ff-live-subtext{
  color:#fce9f6 !important;
  text-shadow:0 2px 16px rgba(71,19,66,.22);
}

.ff-affiliate-hero-actions{
  display:flex;
  flex-wrap:wrap;
  gap:14px;
  margin-top:22px;
  margin-bottom:18px;
}

.ff-store-aff-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  padding:14px 24px;
  border-radius:999px;
  font-weight:800;
  font-size:15px;
  transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease;
  box-shadow:0 18px 38px rgba(84,16,78,.18);
}

.ff-store-aff-btn:hover{
  transform:translateY(-2px);
}

.ff-store-aff-btn.primary{
  color:#fff;
  background:linear-gradient(135deg,#702167,#9e328f,#f19bd3);
  box-shadow:0 16px 40px rgba(158,50,143,.28);
}

.ff-store-aff-btn.secondary{
  color:var(--ff-purple);
  background:rgba(255,255,255,.86);
  border:1px solid rgba(111,30,103,.14);
  backdrop-filter:blur(14px);
  -webkit-backdrop-filter:blur(14px);
}

.ff-glass-showcase{
  margin-top:28px;
  margin-bottom:8px;
  display:flex;
  justify-content:center;
}

.ff-glass-panel{
  width:min(520px,100%);
  background:linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
  border:1px solid rgba(255,255,255,.28);
  border-radius:34px;
  padding:28px 24px;
  position:relative;
  overflow:hidden;
  box-shadow:
    0 28px 60px rgba(90,14,83,.18),
    inset 0 1px 0 rgba(255,255,255,.34),
    inset 0 -1px 0 rgba(255,255,255,.12);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.ff-glass-panel::before{
  content:"";
  position:absolute;
  inset:auto -20% 65% auto;
  width:240px;
  height:240px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,0));
  filter:blur(10px);
}

.ff-glass-panel::after{
  content:"";
  position:absolute;
  left:-70px;
  bottom:-70px;
  width:190px;
  height:190px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(246,163,216,.26), rgba(246,163,216,0));
  filter:blur(6px);
}

.ff-glass-logo-box{
  width:220px;
  height:220px;
  margin:0 auto 18px;
  border-radius:28px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,.12));
  border:1px solid rgba(255,255,255,.34);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.28),
    0 18px 34px rgba(111,30,103,.16);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
}

.ff-glass-logo-box img{
  width:76%;
  height:auto;
  object-fit:contain;
  filter:drop-shadow(0 16px 22px rgba(241,155,211,.16));
  animation:ffFloat 4.8s ease-in-out infinite;
}

@keyframes ffFloat{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-8px)}
}

.ff-glass-caption{
  text-align:center;
  color:#fff4fb;
}

.ff-glass-caption strong{
  display:block;
  font-size:1.05rem;
  margin-bottom:6px;
}

.ff-glass-caption span{
  color:#ffe3f5;
  font-size:.96rem;
}

.ff-hide-overflow-card{
  display:none !important;
}

/* featured section cleanup */
.ff-featured-section{
  position:relative;
}

.ff-featured-section .ff-featured-cta{
  display:flex;
  justify-content:center;
  margin-top:22px;
}

.ff-view-more-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  padding:14px 28px;
  border-radius:999px;
  color:#fff;
  font-weight:800;
  background:linear-gradient(135deg,#6f1e67,#982f8d,#c54cb1);
  box-shadow:0 16px 36px rgba(111,30,103,.22);
}

.ff-view-more-btn:hover{
  transform:translateY(-2px);
}

.ff-soft-glass{
  background:linear-gradient(180deg, rgba(255,255,255,.80), rgba(255,255,255,.66));
  border:1px solid rgba(111,30,103,.10);
  box-shadow:0 18px 40px rgba(111,30,103,.08);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}

/* small polish for headings and buttons */
h2,h3{
  color:#54184e;
}

button,.btn,a.button{
  transition:transform .18s ease, box-shadow .18s ease;
}

button:hover,.btn:hover,a.button:hover{
  transform:translateY(-2px);
}

/* mobile */
@media (max-width: 768px){
  .ff-affiliate-hero-actions{
    display:grid;
    grid-template-columns:1fr;
  }

  .ff-store-aff-btn{
    width:100%;
  }

  .ff-glass-panel{
    padding:22px 18px;
    border-radius:28px;
  }

  .ff-glass-logo-box{
    width:170px;
    height:170px;
  }

  .ff-live-title{
    font-size:clamp(42px, 13vw, 68px) !important;
    line-height:1.05 !important;
  }

  .ff-live-subtext{
    font-size:20px !important;
    line-height:1.5 !important;
  }
}
`;

write(path.join(cssDir, "glass-home-refresh.css"), css);

/* ---------------- JS ---------------- */
const js = `
(function () {
  const HOME = location.pathname === "/" || /index\\.html?$/.test(location.pathname);
  const LOGO_PATH = "/images/femifresh-glass-butterfly.png";
  const PRODUCTS_URL = "/products.html";
  const AFFILIATE_URL = "https://affiliates.femifresh.co.za";
  const BACKOFFICE_URL = "https://affiliates.femifresh.co.za/login";

  function byText(selectors, pattern) {
    const items = Array.from(document.querySelectorAll(selectors));
    return items.find(el => pattern.test((el.textContent || "").trim()));
  }

  function fixLiteralNewline() {
    if (document.body && document.body.firstChild && document.body.firstChild.nodeType === 3) {
      document.body.firstChild.textContent = document.body.firstChild.textContent.replace(/\\\\n/g, "");
    }

    document.querySelectorAll("body, body *").forEach(el => {
      if (el.childNodes && el.childNodes.length) {
        el.childNodes.forEach(node => {
          if (node.nodeType === 3 && /\\\\n/.test(node.textContent || "")) {
            node.textContent = (node.textContent || "").replace(/\\\\n/g, "");
          }
        });
      }
    });
  }

  function getHero() {
    return (
      document.querySelector(".hero") ||
      document.querySelector(".hero-section") ||
      Array.from(document.querySelectorAll("section")).find(sec => sec.querySelector("h1")) ||
      document.querySelector("main")
    );
  }

  function styleHero(hero) {
    if (!hero) return;
    hero.classList.add("ff-home-hero");

    const title = hero.querySelector("h1");
    if (title) title.classList.add("ff-live-title");

    const paras = hero.querySelectorAll("p");
    if (paras[0]) paras[0].classList.add("ff-live-subtext");
  }

  function findHeroInsertPoint(hero) {
    return (
      hero.querySelector(".hero-actions") ||
      hero.querySelector(".actions") ||
      hero.querySelector(".buttons") ||
      hero.querySelector(".hero-buttons") ||
      hero.querySelector("p:last-of-type") ||
      hero.querySelector("h1") ||
      hero
    );
  }

  function ensureHomeButtons(hero) {
    if (!hero) return;

    document.querySelectorAll("#ff-affiliate-store-buttons, .ff-affiliate-hero-actions").forEach(el => {
      if (!hero.contains(el)) el.remove();
    });

    let wrap = hero.querySelector(".ff-affiliate-hero-actions");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "ff-affiliate-hero-actions";
      wrap.innerHTML = \`
        <a class="ff-store-aff-btn primary" href="\${AFFILIATE_URL}">Become an Affiliate</a>
        <a class="ff-store-aff-btn secondary" href="\${BACKOFFICE_URL}">Affiliate Back Office</a>
      \`;

      const anchor = findHeroInsertPoint(hero);
      if (anchor && anchor !== hero) anchor.insertAdjacentElement("afterend", wrap);
      else hero.appendChild(wrap);
    }
  }

  function ensureGlassShowcase(hero) {
    if (!hero) return;

    let box = hero.querySelector(".ff-glass-showcase");
    if (!box) {
      box = document.createElement("div");
      box.className = "ff-glass-showcase";
      box.innerHTML = \`
        <div class="ff-glass-panel">
          <div class="ff-glass-logo-box">
            <img src="\${LOGO_PATH}" alt="FemiFresh Butterfly Logo">
          </div>
          <div class="ff-glass-caption">
            <strong>FemiFresh</strong>
            <span>Confidence in every wash.</span>
          </div>
        </div>
      \`;

      const buttons = hero.querySelector(".ff-affiliate-hero-actions");
      if (buttons) buttons.insertAdjacentElement("afterend", box);
      else hero.appendChild(box);
    }
  }

  function removeNonHomeAffiliateButtons() {
    document.querySelectorAll("a").forEach(a => {
      const text = (a.textContent || "").trim().toLowerCase();
      const href = (a.getAttribute("href") || "").toLowerCase();

      const isAffiliateButton =
        text.includes("become an affiliate") ||
        text.includes("affiliate back office") ||
        href.includes("affiliates.femifresh.co.za");

      if (isAffiliateButton) {
        const holder =
          a.closest(".ff-affiliate-hero-actions") ||
          a.closest("#ff-affiliate-store-buttons") ||
          a.closest("div") ||
          a;
        if (holder) holder.remove();
      }
    });
  }

  function hideBigOverflowingPromo() {
    const hero = getHero();
    const allImgs = Array.from(document.querySelectorAll("main img, section img, body img"));

    const candidates = allImgs.filter(img => {
      const src = (img.getAttribute("src") || "").toLowerCase();
      if (src.includes("glass-butterfly")) return false;
      if (img.closest(".ff-glass-showcase")) return false;
      if (img.closest("header,.site-header,.navbar")) return false;
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      return (w >= 250 || h >= 250);
    });

    const target = candidates.find(img => {
      const container = img.closest(".card,.panel,section > div,section,div");
      if (!container) return false;
      if (hero && hero.contains(container)) return false;
      const txt = (container.textContent || "").toLowerCase();
      if (txt.includes("featured products")) return false;
      return true;
    });

    if (target) {
      const block = target.closest(".card,.panel,section > div,section,div");
      if (block) block.classList.add("ff-hide-overflow-card");
    }
  }

  function cleanupFeaturedProducts() {
    const sections = Array.from(document.querySelectorAll("section, div"));
    const featured = sections.find(el => {
      const heading = el.querySelector("h1,h2,h3,h4");
      return heading && /featured products/i.test((heading.textContent || "").trim());
    });

    if (!featured) return;
    featured.classList.add("ff-featured-section");

    const productGrid =
      featured.querySelector(".product-grid") ||
      featured.querySelector(".products-grid") ||
      featured.querySelector("[class*='product-grid']") ||
      featured.querySelector("[class*='products-grid']") ||
      Array.from(featured.querySelectorAll(".grid, .cards, .products")).find(el =>
        /product|price|cart/i.test(el.textContent || "")
      );

    if (productGrid) {
      const directKids = Array.from(featured.children);
      directKids.forEach(child => {
        if (child === productGrid) return;
        if (child.querySelector && child.querySelector("h1,h2,h3,h4")) return;

        const hasProductFeel = /price|add to cart|shop now|buy/i.test(child.textContent || "");
        if (!hasProductFeel) {
          const imgOnly = child.querySelector("img") && !child.querySelector("button,a[href*='product'],a[href*='cart']");
          if (imgOnly) child.remove();
        }
      });
    }

    if (!featured.querySelector(".ff-featured-cta")) {
      const cta = document.createElement("div");
      cta.className = "ff-featured-cta";
      cta.innerHTML = \`<a class="ff-view-more-btn" href="\${PRODUCTS_URL}">View More</a>\`;
      featured.appendChild(cta);
    }
  }

  function addSoftGlassToCards() {
    document.querySelectorAll(".card,.panel,.product-card,.auth-card,.join-card").forEach(el => {
      el.classList.add("ff-soft-glass");
    });
  }

  function runHome() {
    const hero = getHero();
    if (!hero) return;

    styleHero(hero);
    ensureHomeButtons(hero);
    ensureGlassShowcase(hero);
    hideBigOverflowingPromo();
    cleanupFeaturedProducts();
    addSoftGlassToCards();
  }

  function runOtherPages() {
    removeNonHomeAffiliateButtons();
    addSoftGlassToCards();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fixLiteralNewline();
    if (HOME) runHome();
    else runOtherPages();
  });
})();
`;

write(path.join(jsDir, "glass-home-refresh.js"), js);

/* keep old injected button script harmless on non-home pages */
write(path.join(jsDir, "store-affiliate-buttons.js"), `
(function(){
  const HOME = location.pathname === "/" || /index\\.html?$/.test(location.pathname);
  if (!HOME) return;
})();
`);

/* ---------------- inject into pages ---------------- */
const htmlFiles = walk(publicDir);

for (const file of htmlFiles) {
  injectOnce(file, '<link rel="stylesheet" href="/css/glass-home-refresh.css">', "</head>");
}

/* homepage only JS */
const homeCandidates = [
  path.join(publicDir, "index.html"),
  path.join(publicDir, "home.html")
];

for (const file of homeCandidates) {
  if (fs.existsSync(file)) {
    injectOnce(file, '<script src="/js/glass-home-refresh.js"></script>', "</body>");
  }
}

/* non-home pages: still load JS so it can remove old affiliate buttons if cached markup exists */
for (const file of htmlFiles) {
  const base = path.basename(file).toLowerCase();
  if (base === "index.html" || base === "home.html") continue;
  injectOnce(file, '<script src="/js/glass-home-refresh.js"></script>', "</body>");
}

console.log("✅ Glass home refresh applied.");
console.log("✅ Put your butterfly image here if not already done:");
console.log("   public/images/femifresh-glass-butterfly.png");
