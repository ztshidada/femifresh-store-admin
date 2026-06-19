const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const jsDir = path.join(publicDir, "js");
fs.mkdirSync(jsDir, { recursive: true });

/* Force Buy Products button to main store products */
fs.writeFileSync(path.join(jsDir, "affiliate-buy-products-fix.js"), `
(function(){
  const STORE_PRODUCTS_URL = "https://www.femifresh.co.za/products.html";

  function fixBuyButton(){
    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.innerText || el.textContent || "").trim().toLowerCase();

      if (
        text === "buy products" ||
        text.includes("buy products") ||
        text.includes("buy product")
      ) {
        if (el.tagName.toLowerCase() === "a") {
          el.href = STORE_PRODUCTS_URL;
          el.target = "_self";
          el.removeAttribute("onclick");
        } else {
          el.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            window.location.href = STORE_PRODUCTS_URL;
          };
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", fixBuyButton);
  setTimeout(fixBuyButton, 300);
  setTimeout(fixBuyButton, 900);
  setTimeout(fixBuyButton, 1800);
})();
`);

const dashboardFiles = [
  path.join(publicDir, "affiliate-dashboard.html"),
  path.join(publicDir, "dashboard.html"),
  path.join(publicDir, "affiliate", "dashboard.html")
];

for (const file of dashboardFiles) {
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<script[^>]+affiliate-buy-products-fix\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace("</body>", '  <script src="/js/affiliate-buy-products-fix.js?v=5800"></script>\n</body>');

  // Also replace direct old Yoco/payment/store links if they are on the Buy Products button
  html = html.replace(/href=["'][^"']*(yoco|checkout|payment)[^"']*["']/gi, 'href="https://www.femifresh.co.za/products.html"');

  fs.writeFileSync(file, html);
  console.log("Fixed Buy Products button in:", path.relative(publicDir, file));
}

console.log("Affiliate Buy Products button now goes to main store products.");
