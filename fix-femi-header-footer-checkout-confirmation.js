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

/* 1) Strong FemiFresh header/footer/checkout styling */
fs.writeFileSync(path.join(cssDir, "femi-store-stable.css"), `
/* FEMI_STORE_STABLE_V1 */
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
  margin:0;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  background:
    radial-gradient(circle at 8% 10%,rgba(244,167,216,.24),transparent 28%),
    radial-gradient(circle at 92% 14%,rgba(104,35,95,.12),transparent 26%),
    linear-gradient(180deg,#fff9fe,#fff4fb 55%,#fffaf7);
  color:#241126;
}

/* force old headers not to fight */
body > header:not(.ff-clean-header){
  display:none !important;
}

.ff-clean-header{
  position:sticky;
  top:0;
  z-index:9999;
  background:rgba(255,255,255,.88);
  backdrop-filter:blur(18px);
  border-bottom:1px solid var(--ff-line);
  box-shadow:0 10px 28px rgba(104,35,95,.07);
}

.ff-clean-nav{
  width:min(1320px,calc(100% - 40px));
  min-height:86px;
  margin:auto;
  display:flex;
  align-items:center;
  gap:18px;
}

.ff-clean-brand{
  display:flex;
  align-items:center;
  gap:12px;
  color:var(--ff-purple);
  text-decoration:none;
  font-weight:950;
  font-size:29px;
  letter-spacing:-.05em;
  white-space:nowrap;
}

.ff-clean-brand img{
  width:56px;
  height:56px;
  object-fit:cover;
  border-radius:18px;
  box-shadow:0 14px 30px rgba(104,35,95,.14);
}

.ff-clean-search{
  flex:1;
  max-width:430px;
  position:relative;
  margin-left:22px;
}

.ff-clean-search input{
  width:100%;
  min-height:46px;
  border-radius:999px;
  border:1px solid var(--ff-line);
  background:#fff;
  padding:0 18px 0 44px;
  outline:none;
  color:#35112f;
  box-shadow:0 10px 26px rgba(104,35,95,.06);
}

.ff-clean-search:before{
  content:"🔍";
  position:absolute;
  left:16px;
  top:50%;
  transform:translateY(-50%);
  opacity:.7;
}

.ff-clean-links{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:24px;
}

.ff-clean-links a{
  color:#402344;
  font-weight:900;
  text-decoration:none;
}

.ff-clean-cart{
  width:56px;
  height:56px;
  display:grid !important;
  place-items:center;
  border-radius:999px;
  background:#fff;
  border:1px solid var(--ff-line);
  box-shadow:0 14px 30px rgba(104,35,95,.12);
  font-size:24px !important;
}

.ff-clean-menu{
  display:none;
  width:52px;
  height:52px;
  border:0;
  border-radius:16px;
  background:var(--ff-purple);
  color:#fff;
  font-size:24px;
  margin-left:auto;
}

.ff-clean-footer{
  margin-top:70px;
  background:#1d1020;
  color:#fff;
  padding:54px 20px 26px;
}

.ff-footer-inner{
  width:min(1180px,100%);
  margin:auto;
  display:grid;
  grid-template-columns:1.3fr 1fr 1fr;
  gap:34px;
}

.ff-footer-brand{
  display:flex;
  align-items:center;
  gap:12px;
  font-size:28px;
  font-weight:950;
  color:#fff;
}

.ff-footer-brand img{
  width:58px;
  height:58px;
  object-fit:cover;
  border-radius:18px;
}

.ff-clean-footer h3{
  margin:0 0 14px;
  color:#fff;
}

.ff-clean-footer p,
.ff-clean-footer a{
  color:rgba(255,255,255,.74);
  line-height:1.7;
  text-decoration:none;
}

.ff-footer-bottom{
  width:min(1180px,100%);
  margin:32px auto 0;
  padding-top:20px;
  border-top:1px solid rgba(255,255,255,.12);
  color:rgba(255,255,255,.55);
  font-size:14px;
}

/* checkout and confirmation */
.ff-manual-card{
  background:#fff1fa;
  border:1px solid var(--ff-line);
  border-radius:24px;
  padding:18px;
  color:#35112f;
  margin:18px 0;
}

.ff-manual-card h3{
  margin:0 0 12px;
  font-size:24px;
  color:#35112f;
}

.ff-bank-row{
  display:flex;
  justify-content:space-between;
  gap:16px;
  border-bottom:1px solid rgba(104,35,95,.12);
  padding:10px 0;
}

.ff-bank-row:last-child{border-bottom:0}
.ff-bank-row span:first-child{color:var(--ff-muted);font-weight:850}
.ff-bank-row span:last-child{font-weight:950;text-align:right}

.ff-thankyou-page{
  width:min(1120px,calc(100% - 32px));
  margin:46px auto;
  display:grid;
  grid-template-columns:1fr 430px;
  gap:28px;
  align-items:start;
}

.ff-thankyou-card{
  background:white;
  border:1px solid var(--ff-line);
  border-radius:34px;
  padding:34px;
  box-shadow:0 22px 60px rgba(104,35,95,.12);
}

.ff-order-chip{
  display:inline-flex;
  padding:11px 16px;
  border-radius:999px;
  background:#fff1fa;
  color:var(--ff-purple);
  font-weight:950;
  border:1px solid var(--ff-line);
  margin:12px 0;
}

.ff-thankyou-card h1{
  margin:0 0 12px;
  font-size:clamp(44px,7vw,76px);
  line-height:.95;
  letter-spacing:-.07em;
  color:#35112f;
}

.ff-primary-btn{
  display:inline-flex;
  justify-content:center;
  align-items:center;
  min-height:52px;
  padding:13px 22px;
  border-radius:999px;
  background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
  color:white;
  text-decoration:none;
  font-weight:950;
  border:0;
}

.ff-light-btn{
  display:inline-flex;
  justify-content:center;
  align-items:center;
  min-height:52px;
  padding:13px 22px;
  border-radius:999px;
  background:white;
  color:#68235f;
  text-decoration:none;
  font-weight:950;
  border:1px solid var(--ff-line);
}

/* make old checkout cleaner */
.checkout,
.checkout-page,
.checkout-grid{
  width:min(1180px,calc(100% - 34px)) !important;
  margin:36px auto !important;
}

@media(max-width:900px){
  .ff-clean-nav{
    width:calc(100% - 28px);
    min-height:76px;
  }

  .ff-clean-brand{
    font-size:22px;
  }

  .ff-clean-brand img{
    width:48px;
    height:48px;
  }

  .ff-clean-search{
    display:none;
  }

  .ff-clean-menu{
    display:grid;
    place-items:center;
  }

  .ff-clean-links{
    display:none;
    position:absolute;
    top:76px;
    left:14px;
    right:14px;
    background:white;
    border:1px solid var(--ff-line);
    border-radius:22px;
    padding:14px;
    box-shadow:0 22px 60px rgba(104,35,95,.16);
  }

  .ff-clean-links.open{
    display:grid;
    gap:8px;
  }

  .ff-clean-links a{
    min-height:46px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:14px;
  }

  .ff-clean-cart{
    width:100%;
    height:48px;
  }

  .ff-footer-inner{
    grid-template-columns:1fr;
  }

  .ff-thankyou-page{
    grid-template-columns:1fr;
    margin:24px auto;
  }

  .ff-thankyou-card{
    padding:24px;
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

/* 2) Stable JS: force header/footer, prevent null checkout redirect, stable thank-you */
fs.writeFileSync(path.join(jsDir, "femi-store-stable.js"), `
(function(){
  const BANK = {
    bank:"FNB",
    name:"Femi Fresh (PTY) LTD",
    type:"FNB Business Account",
    number:"63214749822",
    whatsapp:"0632180372",
    email:"femifresh02@gmail.com"
  };

  function cleanText(){
    try{
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => {
        if(n.nodeValue && n.nodeValue.includes("\\\\n")){
          n.nodeValue = n.nodeValue.replace(/\\\\n/g,"");
        }
      });
    }catch(e){}
  }

  function makeHeader(){
    if(document.querySelector(".ff-clean-header")) return;
    if(location.pathname.includes("/admin/")) return;
    if(location.hostname.includes("affiliates.")) return;

    const header = document.createElement("header");
    header.className = "ff-clean-header";
    header.innerHTML = \`
      <nav class="ff-clean-nav">
        <a class="ff-clean-brand" href="/">
          <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
          <span>FemiFresh</span>
        </a>

        <div class="ff-clean-search">
          <input placeholder="Search products..." id="ffCleanSearch">
        </div>

        <button class="ff-clean-menu" type="button" aria-label="Menu">☰</button>

        <div class="ff-clean-links">
          <a href="/">Home</a>
          <a href="/products.html">Products</a>
          <a href="/policies.html">Policy</a>
          <a href="/contact.html">Contact</a>
          <a class="ff-clean-cart" href="/cart.html">🛒</a>
        </div>
      </nav>
    \`;

    document.body.prepend(header);

    const btn = header.querySelector(".ff-clean-menu");
    const links = header.querySelector(".ff-clean-links");
    btn.addEventListener("click", () => links.classList.toggle("open"));

    const search = header.querySelector("#ffCleanSearch");
    search.addEventListener("keydown", e => {
      if(e.key === "Enter"){
        const q = encodeURIComponent(search.value.trim());
        if(q) location.href = "/products.html?search=" + q;
      }
    });
  }

  function makeFooter(){
    if(document.querySelector(".ff-clean-footer")) return;
    if(location.pathname.includes("/admin/")) return;
    if(location.hostname.includes("affiliates.")) return;

    const footer = document.createElement("footer");
    footer.className = "ff-clean-footer";
    footer.innerHTML = \`
      <div class="ff-footer-inner">
        <div>
          <div class="ff-footer-brand">
            <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
            <span>FemiFresh</span>
          </div>
          <p>Premium feminine-care products created for freshness, comfort and everyday confidence.</p>
        </div>

        <div>
          <h3>Need Assistance?</h3>
          <p><a href="/contact.html">Contact us</a></p>
          <p><a href="/policies.html">Policies</a></p>
          <p><a href="/products.html">All Products</a></p>
        </div>

        <div>
          <h3>Manual Payment</h3>
          <p>Send POP to WhatsApp: <strong>0632180372</strong></p>
          <p>Bank: FNB</p>
          <p>Account: 63214749822</p>
        </div>
      </div>
      <div class="ff-footer-bottom">© 2026 FemiFresh. All rights reserved.</div>
    \`;

    document.body.appendChild(footer);
  }

  function orderNumberFrom(order){
    const raw = order && (order.orderNumber || order.orderNo || order.reference || order.id);
    if(!raw) return "FF-10001";

    const s = String(raw);

    if(s.startsWith("FF-")) return s;

    const digits = s.match(/\\d+/);
    if(!digits) return "FF-10001";

    const n = Number(digits[0]);

    if(n >= 10000) return "FF-" + n;
    return "FF-" + String(10000 + n).padStart(5,"0");
  }

  function saveOrder(order){
    if(!order) return;
    const no = orderNumberFrom(order);
    const saved = {...order, cleanOrderNumber:no};
    localStorage.setItem("femiLastOrder", JSON.stringify(saved));
    localStorage.setItem("femiLastOrderNumber", no);
  }

  function manualCard(orderNo){
    return \`
      <div class="ff-manual-card">
        <h3>Manual Payment Details</h3>
        <div class="ff-bank-row"><span>Bank</span><span>\${BANK.bank}</span></div>
        <div class="ff-bank-row"><span>Account Name</span><span>\${BANK.name}</span></div>
        <div class="ff-bank-row"><span>Account Type</span><span>\${BANK.type}</span></div>
        <div class="ff-bank-row"><span>Account Number</span><span>\${BANK.number}</span></div>
        <div class="ff-bank-row"><span>POP WhatsApp</span><span>\${BANK.whatsapp}</span></div>
        <div class="ff-bank-row"><span>Reference</span><span>\${orderNo || "Use your order number"}</span></div>
        <p style="font-weight:850;margin:14px 0 0;">
          Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.
        </p>
      </div>
    \`;
  }

  function addCheckoutManualCard(){
    if(!location.pathname.includes("checkout")) return;
    if(document.querySelector(".ff-manual-card")) return;

    const target =
      document.querySelector(".payment") ||
      document.querySelector("#payment") ||
      document.querySelector("form") ||
      document.querySelector("main");

    if(target){
      const div = document.createElement("div");
      div.innerHTML = manualCard("");
      target.appendChild(div.firstElementChild);
    }
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function(input, init){
    const res = await nativeFetch(input, init);

    try{
      const url = String(typeof input === "string" ? input : (input && input.url) || "");

      if(url.includes("/api/orders") || url.includes("/api/checkout")){
        const clone = res.clone();
        const data = await clone.json().catch(() => null);

        if(data && typeof data === "object"){
          const order = data.order || data.data || data;
          const orderNo = orderNumberFrom(order);
          saveOrder(order);

          const thankUrl = "/thank-you.html?order=" + encodeURIComponent(orderNo);

          const cleaned = {
            ...data,
            checkoutUrl: thankUrl,
            paymentUrl: thankUrl,
            redirectUrl: thankUrl,
            yocoUrl: null,
            paymentMode:"manual",
            paymentStatus:"pending",
            manualPayment:{
              bank:BANK.bank,
              accountName:BANK.name,
              accountNumber:BANK.number,
              whatsapp:BANK.whatsapp,
              reference:orderNo
            },
            message:"Order created. Please make manual payment and send POP to WhatsApp " + BANK.whatsapp + "."
          };

          return new Response(JSON.stringify(cleaned), {
            status:res.status,
            statusText:res.statusText,
            headers:{"Content-Type":"application/json"}
          });
        }
      }
    }catch(e){}

    return res;
  };

  function renderThankYou(){
    if(!location.pathname.includes("thank")) return;

    const params = new URLSearchParams(location.search);
    let orderNo = params.get("order") || localStorage.getItem("femiLastOrderNumber") || "FF-10001";

    if(orderNo === "null" || orderNo === "undefined") orderNo = localStorage.getItem("femiLastOrderNumber") || "FF-10001";

    let order = {};
    try{ order = JSON.parse(localStorage.getItem("femiLastOrder") || "{}"); }catch(e){}

    document.body.innerHTML = "";

    makeHeader();

    const page = document.createElement("main");
    page.className = "ff-thankyou-page";
    page.innerHTML = \`
      <section class="ff-thankyou-card">
        <h1>Thank you.</h1>
        <p style="color:#6f6372;font-size:18px;line-height:1.65;">
          Your order has been created successfully. Please complete manual payment and send proof of payment.
        </p>

        <div class="ff-order-chip">Order Number: \${orderNo}</div>

        <div style="margin-top:22px;">
          <h2 style="color:#35112f;">Order Summary</h2>
          <p><strong>Total:</strong> \${order.total ? "R" + Number(order.total).toLocaleString("en-ZA",{minimumFractionDigits:2}) : "Check your order total above"}</p>
          <p><strong>Payment Method:</strong> Manual Payment</p>
          <p><strong>Status:</strong> Pending payment confirmation</p>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
          <a class="ff-primary-btn" href="https://wa.me/27632180372">Send POP on WhatsApp</a>
          <a class="ff-light-btn" href="/products.html">Continue Shopping</a>
        </div>
      </section>

      <aside class="ff-thankyou-card">
        \${manualCard(orderNo)}
      </aside>
    \`;

    document.body.appendChild(page);
    makeFooter();
  }

  document.addEventListener("DOMContentLoaded", function(){
    cleanText();

    if(location.pathname.includes("thank")){
      renderThankYou();
      return;
    }

    makeHeader();
    makeFooter();
    addCheckoutManualCard();
  });
})();
`);

/* 3) Replace thank-you page completely */
fs.writeFileSync(path.join(publicDir, "thank-you.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Thank You | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femi-store-stable.css">
</head>
<body>
  <script src="/js/femi-store-stable.js"></script>
</body>
</html>`);

/* 4) Inject stable CSS/JS into public pages only */
const files = walk(publicDir).filter(file => !file.includes(path.join("public","admin")));

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/\\n/g, "\n");

  html = html.replace(/<link[^>]+femi-store-stable\.css[^>]*>\s*/gi, "");
  html = html.replace(/<script[^>]+femi-store-stable\.js[^>]*><\/script>\s*/gi, "");

  if (!html.includes("/css/femi-store-stable.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femi-store-stable.css">\n</head>');
  }

  if (!html.includes("/js/femi-store-stable.js")) {
    html = html.replace("</body>", '  <script src="/js/femi-store-stable.js"></script>\n</body>');
  }

  fs.writeFileSync(file, html);
  console.log("Stable layout applied:", path.relative(publicDir, file));
}

console.log("FemiFresh stable header/footer/checkout confirmation installed.");
