const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const scriptDir = path.join(publicDir, "js");
const scriptFile = path.join(scriptDir, "store-affiliate-buttons.js");
const dashboardFile = path.join(publicDir, "affiliate-dashboard.html");

fs.mkdirSync(scriptDir, { recursive: true });

/* 1) Add floating affiliate/back office buttons on main store pages */
fs.writeFileSync(scriptFile, `
(function () {
  if (document.getElementById("ff-affiliate-store-buttons")) return;

  const wrap = document.createElement("div");
  wrap.id = "ff-affiliate-store-buttons";
  wrap.innerHTML = \`
    <a class="ff-store-aff-btn primary" href="https://affiliates.femifresh.co.za">Become an Affiliate</a>
    <a class="ff-store-aff-btn secondary" href="https://affiliates.femifresh.co.za/login">Affiliate Back Office</a>
  \`;

  const style = document.createElement("style");
  style.textContent = \`
    #ff-affiliate-store-buttons {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      font-family: Arial, sans-serif;
    }

    .ff-store-aff-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      border-radius: 999px;
      padding: 12px 18px;
      font-weight: 900;
      font-size: 14px;
      box-shadow: 0 12px 30px rgba(89, 31, 83, 0.22);
      transition: transform .2s ease, opacity .2s ease;
      white-space: nowrap;
    }

    .ff-store-aff-btn:hover {
      transform: translateY(-2px);
      opacity: .95;
    }

    .ff-store-aff-btn.primary {
      background: #6b1f64;
      color: #fff;
    }

    .ff-store-aff-btn.secondary {
      background: #fff;
      color: #6b1f64;
      border: 1px solid rgba(107, 31, 100, .25);
    }

    @media (max-width: 650px) {
      #ff-affiliate-store-buttons {
        left: 12px;
        right: 12px;
        bottom: 12px;
        align-items: stretch;
      }

      .ff-store-aff-btn {
        width: 100%;
        padding: 12px 14px;
        font-size: 13px;
      }
    }
  \`;

  document.head.appendChild(style);
  document.body.appendChild(wrap);
})();
`);

/* Inject script into main store HTML pages, not admin pages */
const storePages = [
  "index.html",
  "products.html",
  "cart.html",
  "checkout.html",
  "thank-you.html",
  "contact.html",
  "policies.html",
  "distributors.html"
];

for (const page of storePages) {
  const file = path.join(publicDir, page);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/js/store-affiliate-buttons.js")) {
    if (html.includes("</body>")) {
      html = html.replace("</body>", '  <script src="/js/store-affiliate-buttons.js"></script>\\n</body>');
    } else {
      html += '\\n<script src="/js/store-affiliate-buttons.js"></script>\\n';
    }

    fs.writeFileSync(file, html);
    console.log("Added store affiliate buttons to", page);
  }
}

/* 2) Change affiliate dashboard activation/buy-stock button to go to main products page */
if (fs.existsSync(dashboardFile)) {
  let html = fs.readFileSync(dashboardFile, "utf8");

  html = html.replaceAll("Buy R1350 Stock", "Buy Products");
  html = html.replaceAll("Buy Stock", "Buy Products");
  html = html.replaceAll("buyStock()", "goBuyProducts()");

  const oldFunc = /async function goBuyProducts\(\)[\s\S]*?\n\}/;

  if (!oldFunc.test(html)) {
    html = html.replace(/async function buyStock\(\)[\s\S]*?\n\}/, `
function goBuyProducts() {
  window.location.href = "https://www.femifresh.co.za/products";
}`);
  }

  if (!html.includes("function goBuyProducts()")) {
    html = html.replace(/function logout\(\)/, `
function goBuyProducts() {
  window.location.href = "https://www.femifresh.co.za/products";
}

function logout()`);
  }

  fs.writeFileSync(dashboardFile, html);
  console.log("Affiliate dashboard buy button now redirects to main products page.");
}

console.log("Store affiliate buttons and affiliate dashboard buy redirect installed.");
