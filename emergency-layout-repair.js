const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");
const cssDir = path.join(publicDir, "css");

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

function removeLineContains(html, text) {
  return html
    .split("\n")
    .filter(line => !line.includes(text))
    .join("\n");
}

/* 1) Remove public header from affiliate pages */
const affiliatePages = [
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "affiliate-reset-password.html",
  "join.html",
  "join-success.html"
];

for (const name of affiliatePages) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<header[\s\S]*?ffNavLinks[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "");
  html = html.replace(/\\n/g, "\n");

  fs.writeFileSync(file, html);
  console.log("Removed public header from affiliate page:", name);
}

/* 2) Fix admin blank issue by removing the JS wrapper that was moving/hiding admin content */
for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");

  html = removeLineContains(html, "/js/admin-unified.js");
  html = html.replace(/<script[^>]*admin-unified\.js[^>]*><\/script>/gi, "");
  html = html.replace(/\\n/g, "\n");

  if (!html.includes("/css/admin-safe-polish.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/admin-safe-polish.css">\n</head>');
  }

  fs.writeFileSync(file, html);
  console.log("Admin page repaired:", path.relative(publicDir, file));
}

/* 3) Safe admin polish only CSS, no JS, no hiding content */
fs.writeFileSync(path.join(cssDir, "admin-safe-polish.css"), `
/* ADMIN_SAFE_POLISH_V1 */
:root{
  --ff-purple:#68235f;
  --ff-dark:#35112f;
  --ff-pink:#f4a7d8;
  --ff-bg:#fff8fd;
  --ff-border:rgba(104,35,95,.14);
}

body{
  background:
    radial-gradient(circle at 10% 12%, rgba(244,167,216,.24), transparent 28%),
    radial-gradient(circle at 92% 10%, rgba(104,35,95,.12), transparent 26%),
    linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7) !important;
  color:#241126;
  font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  background:url("/images/femifresh-glass-butterfly.png") no-repeat 94% 12% / min(560px,58vw);
  opacity:.045;
  z-index:-1;
}

h1,h2,h3{
  color:var(--ff-dark);
  letter-spacing:-.04em;
}

button,
.btn,
input[type="submit"],
a.button{
  border-radius:999px !important;
  background:linear-gradient(135deg,#68235f,#8c2e80,#f4a7d8) !important;
  color:white !important;
  border:0 !important;
  font-weight:900 !important;
  min-height:44px;
}

input,
select,
textarea{
  border:1px solid var(--ff-border) !important;
  border-radius:14px !important;
  padding:12px 14px !important;
}

.card,
.panel,
.table-card,
.metric-card,
form,
table{
  background:rgba(255,255,255,.82) !important;
  border:1px solid var(--ff-border) !important;
  border-radius:22px !important;
  box-shadow:0 18px 44px rgba(104,35,95,.08) !important;
}

table{
  border-collapse:collapse;
  overflow:hidden;
}

th,td{
  padding:12px 14px;
  border-bottom:1px solid rgba(104,35,95,.10);
}

th{
  color:#68235f;
  text-transform:uppercase;
  letter-spacing:.06em;
  font-size:12px;
}

/* Keep original admin sidebar visible but nicer */
aside,
.sidebar,
.admin-sidebar,
nav.sidebar{
  background:linear-gradient(180deg,#35112f,#68235f) !important;
  color:white !important;
}

aside a,
.sidebar a,
.admin-sidebar a,
nav.sidebar a{
  color:white !important;
  border-radius:14px;
}
`);

/* 4) Fix store header: full width, menu on far right, clean cart icon */
const unifiedCss = path.join(cssDir, "femifresh-unified.css");
let css = fs.existsSync(unifiedCss) ? fs.readFileSync(unifiedCss, "utf8") : "";

if (!css.includes("STORE_HEADER_RIGHT_CART_REPAIR_V1")) {
  css += `

/* STORE_HEADER_RIGHT_CART_REPAIR_V1 */
.ff-site-header,
.topbar,
header.topbar{
  width:100% !important;
}

.ff-nav,
.nav{
  width:100% !important;
  max-width:none !important;
  padding-left:9vw !important;
  padding-right:9vw !important;
  margin:0 !important;
}

.ff-navlinks,
.navlinks{
  margin-left:auto !important;
  justify-content:flex-end !important;
}

.ff-navlinks a[href="/cart.html"]{
  position:relative;
  font-size:0 !important;
  width:48px;
  height:48px;
  padding:0 !important;
  display:inline-grid !important;
  place-items:center;
  background:rgba(255,255,255,.75);
  border:1px solid rgba(104,35,95,.12);
  box-shadow:0 10px 24px rgba(104,35,95,.08);
}

.ff-navlinks a[href="/cart.html"]::after{
  content:"🛒" !important;
  font-size:20px !important;
  line-height:1;
}

@media(max-width:900px){
  .ff-nav,
  .nav{
    padding-left:18px !important;
    padding-right:18px !important;
  }

  .ff-navlinks a[href="/cart.html"]{
    width:100% !important;
    font-size:15px !important;
    display:flex !important;
    justify-content:center;
  }

  .ff-navlinks a[href="/cart.html"]::before{
    content:"Cart ";
    font-size:15px;
  }
}
`;
}

fs.writeFileSync(unifiedCss, css);

/* 5) Make homepage featured products use real/fallback image, not plain purple blocks */
const indexFile = path.join(publicDir, "index.html");
if (fs.existsSync(indexFile)) {
  let index = fs.readFileSync(indexFile, "utf8");

  index = index.replace(/<a class="floating-cart"[\s\S]*?<\/a>/gi, "");

  const oldStart = index.indexOf("async function loadFeaturedProducts()");
  const oldEnd = index.indexOf("loadFeaturedProducts();", oldStart);

  if (oldStart !== -1 && oldEnd !== -1) {
    const before = index.slice(0, oldStart);
    const after = index.slice(oldEnd + "loadFeaturedProducts();".length);

    const newLoader = `
    function getProductImage(p){
      let img = p.image || p.imageUrl || p.image_url || p.photo || p.photoUrl || p.thumbnail || p.mainImage || p.main_image || p.picture || "";

      if (!img && Array.isArray(p.images) && p.images.length) {
        const first = p.images[0];
        img = typeof first === "string" ? first : (first.url || first.src || first.image || "");
      }

      if (img && img.startsWith("uploads/")) img = "/" + img;
      if (img && img.startsWith("public/")) img = img.replace("public", "");

      return img || "/images/femifresh-logo.jpg";
    }

    async function loadFeaturedProducts(){
      const box = document.getElementById("featuredProducts");

      try{
        const res = await fetch("/api/products", { cache:"no-store" });
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products || data.data || []);

        if(!products.length) return;

        box.innerHTML = products.slice(0,3).map(p => {
          const name = p.name || p.title || "FemiFresh Product";
          const desc = p.description || p.shortDescription || "Premium feminine-care product for freshness and comfort.";
          const price = Number(p.price || p.amount || p.sellingPrice || 0);
          const img = getProductImage(p);

          return \`
            <div class="product-card">
              <div class="product-img">
                <img src="\${img}" alt="\${name}" loading="lazy" onerror="this.src='/images/femifresh-logo.jpg'">
              </div>
              <div class="product-body">
                <h3>\${name}</h3>
                <p>\${desc}</p>
                <div class="price">\${price ? "R" + price.toFixed(2) : "View product"}</div>
              </div>
            </div>
          \`;
        }).join("");
      }catch(e){
        console.warn("Featured products failed", e);
      }
    }

    loadFeaturedProducts();`;

    index = before + newLoader + after;
  }

  if (!index.includes("FEATURED_IMAGE_FORCE_FIX_V2")) {
    index = index.replace("</style>", `
    /* FEATURED_IMAGE_FORCE_FIX_V2 */
    .product-img{
      height:230px !important;
      min-height:230px !important;
      display:block !important;
      background:#fff1fa !important;
    }
    .product-img img{
      width:100% !important;
      height:100% !important;
      object-fit:cover !important;
      display:block !important;
    }
  </style>`);
  }

  fs.writeFileSync(indexFile, index);
}

console.log("Emergency repair complete: admin fixed, affiliate header removed, store header/cart repaired.");
