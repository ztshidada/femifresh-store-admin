const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const cssDir = path.join(publicDir, "css");
const jsDir = path.join(publicDir, "js");

fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile() && full.endsWith(".html")) out.push(full);
  }
  return out;
}

/* SENAFIX-INSPIRED FEMIFRESH STYLE */
fs.writeFileSync(path.join(cssDir, "femi-senafix-style.css"), `
/* FEMI_SENAFIX_STYLE_V1 */
:root{
  --ff-purple:#68235f;
  --ff-deep:#2a0f2b;
  --ff-pink:#f4a7d8;
  --ff-soft:#fff7fd;
  --ff-line:rgba(104,35,95,.14);
  --ff-muted:#6f6372;
}

*{box-sizing:border-box}

html,body{
  max-width:100%;
  overflow-x:hidden;
}

body{
  background:
    radial-gradient(circle at 8% 10%, rgba(244,167,216,.28), transparent 28%),
    radial-gradient(circle at 92% 12%, rgba(104,35,95,.12), transparent 26%),
    linear-gradient(180deg,#fff9fe,#fff3fb 52%,#fffaf7);
  color:#241126;
}

/* HEADER — inspired by Senafix but FemiFresh premium */
header,
.ff-site-header{
  position:sticky !important;
  top:0 !important;
  z-index:999 !important;
  background:rgba(255,255,255,.84) !important;
  backdrop-filter:blur(18px) !important;
  border-bottom:1px solid var(--ff-line) !important;
  box-shadow:0 10px 28px rgba(104,35,95,.06) !important;
}

.nav,
.ff-nav{
  min-height:86px !important;
  width:min(1320px,calc(100% - 40px)) !important;
  margin:auto !important;
  display:flex !important;
  align-items:center !important;
  gap:18px !important;
  padding:0 !important;
}

.brand,
.ff-brand{
  display:flex !important;
  align-items:center !important;
  gap:12px !important;
  text-decoration:none !important;
  color:var(--ff-purple) !important;
  font-weight:950 !important;
  font-size:28px !important;
  letter-spacing:-.04em !important;
  min-width:max-content !important;
}

.brand img,
.ff-brand img{
  width:56px !important;
  height:56px !important;
  object-fit:cover !important;
  border-radius:18px !important;
  box-shadow:0 14px 30px rgba(104,35,95,.14) !important;
}

/* top search */
.ff-header-search{
  flex:1;
  max-width:420px;
  margin-left:26px;
  position:relative;
}

.ff-header-search input{
  width:100%;
  min-height:46px;
  border-radius:999px;
  border:1px solid var(--ff-line);
  background:rgba(255,255,255,.88);
  padding:0 18px 0 44px;
  color:#35112f;
  outline:none;
  box-shadow:0 10px 26px rgba(104,35,95,.06);
}

.ff-header-search::before{
  content:"🔍";
  position:absolute;
  left:16px;
  top:50%;
  transform:translateY(-50%);
  opacity:.65;
}

.navlinks,
.ff-navlinks{
  margin-left:auto !important;
  display:flex !important;
  align-items:center !important;
  justify-content:flex-end !important;
  gap:22px !important;
}

.navlinks a,
.ff-navlinks a{
  color:#402344 !important;
  font-weight:900 !important;
  text-decoration:none !important;
}

.navlinks a:hover,
.ff-navlinks a:hover{
  color:var(--ff-purple) !important;
}

/* Cart far right, clean icon */
.navlinks a[href="/cart.html"],
.ff-navlinks a[href="/cart.html"],
.navlinks a[href="/cart"],
.ff-navlinks a[href="/cart"]{
  width:56px !important;
  height:56px !important;
  border-radius:999px !important;
  display:inline-grid !important;
  place-items:center !important;
  font-size:0 !important;
  background:white !important;
  border:1px solid var(--ff-line) !important;
  box-shadow:0 14px 30px rgba(104,35,95,.12) !important;
}

.navlinks a[href="/cart.html"]::after,
.ff-navlinks a[href="/cart.html"]::after,
.navlinks a[href="/cart"]::after,
.ff-navlinks a[href="/cart"]::after{
  content:"🛒";
  font-size:24px;
}

/* Hero/product feel */
.hero,
.ff-home-hero{
  border-radius:0 0 46px 46px;
  overflow:hidden;
}

h1,h2{
  letter-spacing:-.06em;
}

/* Product pages like clean ecommerce */
.products-grid,
.product-grid,
.cards{
  display:grid !important;
  grid-template-columns:repeat(3,minmax(0,1fr)) !important;
  gap:28px !important;
}

.product-card,
.product,
.card.product{
  background:white !important;
  border:1px solid var(--ff-line) !important;
  border-radius:26px !important;
  overflow:hidden !important;
  box-shadow:0 18px 44px rgba(104,35,95,.08) !important;
  transition:transform .18s ease, box-shadow .18s ease !important;
}

.product-card:hover,
.product:hover,
.card.product:hover{
  transform:translateY(-4px);
  box-shadow:0 24px 60px rgba(104,35,95,.13) !important;
}

.product-card img,
.product img{
  width:100% !important;
  height:300px !important;
  object-fit:cover !important;
  background:#fff1fa !important;
}

.product-card h3,
.product h3{
  color:#35112f !important;
  font-size:24px !important;
  letter-spacing:-.04em !important;
}

.product-card button,
.product button,
.add-to-cart,
.btn{
  border-radius:999px !important;
  min-height:50px !important;
  font-weight:950 !important;
}

/* cart drawer */
.cart-drawer,
.drawer,
.mini-cart{
  border-radius:28px 0 0 28px !important;
  box-shadow:-24px 0 60px rgba(0,0,0,.12) !important;
}

/* Checkout inspired by Senafix flow, but cleaner */
.checkout,
.checkout-page,
.checkout-grid{
  width:min(1180px,calc(100% - 36px)) !important;
  margin:40px auto !important;
  display:grid !important;
  grid-template-columns:minmax(0,1fr) 420px !important;
  gap:34px !important;
  align-items:start !important;
}

.checkout form,
.checkout-left,
.checkout-main{
  background:rgba(255,255,255,.92) !important;
  border:1px solid var(--ff-line) !important;
  border-radius:30px !important;
  padding:28px !important;
  box-shadow:0 18px 44px rgba(104,35,95,.08) !important;
}

.order-summary,
.summary,
.checkout-summary{
  position:sticky !important;
  top:108px !important;
  background:white !important;
  border:1px solid var(--ff-line) !important;
  border-radius:30px !important;
  padding:26px !important;
  box-shadow:0 22px 54px rgba(104,35,95,.12) !important;
}

.checkout input,
.checkout select,
.checkout textarea{
  border-radius:14px !important;
  border:1px solid var(--ff-line) !important;
  min-height:52px !important;
}

/* Manual payment block on checkout */
.ff-manual-payment-card{
  background:#fff1fa;
  border:1px solid var(--ff-line);
  border-radius:24px;
  padding:18px;
  margin:18px 0;
  color:#35112f;
}

.ff-manual-payment-card h3{
  margin:0 0 10px;
  color:#35112f;
  font-size:24px;
}

.ff-bank-row{
  display:flex;
  justify-content:space-between;
  gap:16px;
  border-bottom:1px solid rgba(104,35,95,.12);
  padding:9px 0;
}

.ff-bank-row:last-child{border-bottom:0}
.ff-bank-row span:first-child{color:var(--ff-muted);font-weight:800}
.ff-bank-row span:last-child{font-weight:950;text-align:right}

/* Thank you page */
.thank-you,
.thankyou,
.order-confirmation{
  width:min(980px,calc(100% - 32px)) !important;
  margin:50px auto !important;
  background:white !important;
  border:1px solid var(--ff-line) !important;
  border-radius:34px !important;
  padding:34px !important;
  box-shadow:0 22px 60px rgba(104,35,95,.12) !important;
}

.ff-order-number-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 14px;
  border-radius:999px;
  background:#fff1fa;
  color:var(--ff-purple);
  font-weight:950;
  border:1px solid var(--ff-line);
}

/* Mobile */
@media(max-width:900px){
  .nav,.ff-nav{
    width:calc(100% - 28px) !important;
    min-height:76px !important;
  }

  .brand,.ff-brand{
    font-size:22px !important;
  }

  .brand img,.ff-brand img{
    width:48px !important;
    height:48px !important;
  }

  .ff-header-search{
    display:none;
  }

  .navlinks,.ff-navlinks{
    display:none !important;
    position:absolute !important;
    top:76px !important;
    left:14px !important;
    right:14px !important;
    background:white !important;
    border:1px solid var(--ff-line) !important;
    border-radius:22px !important;
    padding:14px !important;
    box-shadow:0 24px 60px rgba(104,35,95,.16) !important;
  }

  .navlinks.open,.ff-navlinks.open,
  body.ff-mobile-menu-open .navlinks,
  body.ff-mobile-menu-open .ff-navlinks{
    display:grid !important;
    gap:8px !important;
  }

  .hamb,.ff-menu,#menuBtn{
    margin-left:auto !important;
    display:grid !important;
    place-items:center !important;
    width:52px !important;
    height:52px !important;
    border-radius:16px !important;
    border:0 !important;
    background:var(--ff-purple) !important;
    color:white !important;
  }

  .products-grid,
  .product-grid,
  .cards{
    grid-template-columns:1fr !important;
  }

  .product-card img,
  .product img{
    height:260px !important;
  }

  .checkout,
  .checkout-page,
  .checkout-grid{
    width:calc(100% - 28px) !important;
    grid-template-columns:1fr !important;
    margin:24px auto !important;
  }

  .order-summary,
  .summary,
  .checkout-summary{
    position:relative !important;
    top:auto !important;
  }

  .ff-bank-row{
    display:block;
  }

  .ff-bank-row span:last-child{
    display:block;
    text-align:left;
    margin-top:4px;
  }
}
`);

/* JS: add search, clean order numbers display, manual payment block */
fs.writeFileSync(path.join(jsDir, "femi-senafix-style.js"), `
(function(){
  const BANK = {
    bank:"FNB",
    name:"Femi Fresh (PTY) LTD",
    type:"FNB Business Account",
    number:"63214749822",
    whatsapp:"0632180372",
    email:"femifresh02@gmail.com"
  };

  function addHeaderSearch(){
    const nav =
      document.querySelector(".ff-nav") ||
      document.querySelector(".nav") ||
      document.querySelector("header");

    if(!nav || document.querySelector(".ff-header-search")) return;

    const links =
      document.querySelector(".ff-navlinks") ||
      document.querySelector(".navlinks");

    const search = document.createElement("div");
    search.className = "ff-header-search";
    search.innerHTML = '<input id="ffGlobalSearch" placeholder="Search products...">';

    if(links) nav.insertBefore(search, links);
    else nav.appendChild(search);

    search.querySelector("input").addEventListener("keydown", function(e){
      if(e.key === "Enter"){
        const q = encodeURIComponent(this.value.trim());
        if(q) location.href = "/products.html?search=" + q;
      }
    });
  }

  function addManualPaymentCard(){
    if(document.querySelector(".ff-manual-payment-card")) return;

    const checkoutArea =
      document.querySelector(".payment") ||
      document.querySelector("#payment") ||
      document.querySelector("form");

    if(!checkoutArea) return;

    const card = document.createElement("div");
    card.className = "ff-manual-payment-card";
    card.innerHTML = \`
      <h3>Manual Payment Details</h3>
      <div class="ff-bank-row"><span>Bank</span><span>\${BANK.bank}</span></div>
      <div class="ff-bank-row"><span>Account Name</span><span>\${BANK.name}</span></div>
      <div class="ff-bank-row"><span>Account Type</span><span>\${BANK.type}</span></div>
      <div class="ff-bank-row"><span>Account Number</span><span>\${BANK.number}</span></div>
      <div class="ff-bank-row"><span>POP WhatsApp</span><span>\${BANK.whatsapp}</span></div>
      <div class="ff-bank-row"><span>Reference</span><span>Use your order number</span></div>
      <p style="margin:14px 0 0;font-weight:800;">Please make immediate payment. If payment is delayed, your order approval process may take up to 7 working days.</p>
    \`;

    checkoutArea.appendChild(card);
  }

  function improveThankYou(){
    if(!location.pathname.includes("thank")) return;

    const text = document.body.innerText;
    const match = text.match(/order\\s*(number|no|#)?\\s*[:#]?\\s*([A-Z]*[- ]?\\d+)/i);
    const orderNo = match ? match[2].replace(/\\s+/g,"") : "";

    if(orderNo && !document.querySelector(".ff-order-number-chip")){
      const chip = document.createElement("div");
      chip.className = "ff-order-number-chip";
      chip.textContent = "Order Number: " + orderNo;

      const target = document.querySelector("h1,h2") || document.body.firstElementChild;
      if(target) target.insertAdjacentElement("afterend", chip);
    }

    if(!document.querySelector(".ff-manual-payment-card")){
      const card = document.createElement("div");
      card.className = "ff-manual-payment-card";
      card.style.maxWidth = "760px";
      card.style.margin = "24px auto";
      card.innerHTML = \`
        <h3>Next Step: Send POP</h3>
        <div class="ff-bank-row"><span>Bank</span><span>\${BANK.bank}</span></div>
        <div class="ff-bank-row"><span>Account Name</span><span>\${BANK.name}</span></div>
        <div class="ff-bank-row"><span>Account Number</span><span>\${BANK.number}</span></div>
        <div class="ff-bank-row"><span>POP WhatsApp</span><span>\${BANK.whatsapp}</span></div>
        <div class="ff-bank-row"><span>Reference</span><span>\${orderNo || "Use your order number"}</span></div>
        <p style="font-weight:800;">Please make immediate payment. If payment is delayed, your order approval process may take up to 7 working days.</p>
      \`;
      document.body.appendChild(card);
    }
  }

  function cleanOrderNumbers(){
    document.querySelectorAll("*").forEach(el => {
      if(el.children.length) return;
      const t = el.textContent || "";
      const m = t.match(/Order number[:\\s]+(\\d{1,4})\\b/i);
      if(m){
        const n = Number(m[1]);
        if(n > 0 && n < 10000){
          el.textContent = t.replace(m[1], "FF-" + String(10000 + n).padStart(5,"0"));
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    addHeaderSearch();

    if(location.pathname.includes("checkout")){
      addManualPaymentCard();
    }

    improveThankYou();
    cleanOrderNumbers();
  });
})();
`);

/* Inject into main public pages only, not admin */
const files = walk(publicDir).filter(file => !file.includes(path.join("public","admin")));

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/\\n/g, "\n");

  html = html.replace(/<link[^>]+femi-senafix-style\.css[^>]*>\s*/gi, "");
  html = html.replace(/<script[^>]+femi-senafix-style\.js[^>]*><\/script>\s*/gi, "");

  html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femi-senafix-style.css">\n</head>');
  html = html.replace("</body>", '  <script src="/js/femi-senafix-style.js"></script>\n</body>');

  fs.writeFileSync(file, html);
  console.log("Applied Senafix-inspired style:", path.relative(publicDir, file));
}

console.log("FemiFresh now follows Senafix-style ecommerce layout.");
