const fs = require("fs");
const path = require("path");

const productFiles = [
  path.join(__dirname, "data", "products.json"),
  path.join(__dirname, "public", "data", "products.json")
];

function isBusinessPack(p) {
  const text = [
    p.name,
    p.title,
    p.category,
    p.description,
    p.slug,
    p.sku
  ].filter(Boolean).join(" ").toLowerCase();

  return (
    text.includes("business pack") ||
    text.includes("starter business") ||
    text.includes("starter pack")
  );
}

for (const file of productFiles) {
  if (!fs.existsSync(file)) continue;

  const products = JSON.parse(fs.readFileSync(file, "utf8"));

  let changed = false;

  const updated = products.map(p => {
    if (!isBusinessPack(p)) return p;

    changed = true;

    return {
      ...p,
      stock: 0,
      quantity: 0,
      inStock: false,
      available: false,
      status: "out_of_stock",
      badge: "Out of Stock"
    };
  });

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(updated, null, 2));
    console.log("Marked Business Pack out of stock in:", file);
  }
}

/* Frontend protection: disable add to cart for out-of-stock products */
const jsDir = path.join(__dirname, "public", "js");
fs.mkdirSync(jsDir, { recursive: true });

const outStockJs = path.join(jsDir, "out-of-stock-protection.js");

fs.writeFileSync(outStockJs, `
(function(){
  function isOutOfStockCard(card){
    const text = (card.innerText || "").toLowerCase();

    return (
      text.includes("out of stock") ||
      text.includes("business pack") ||
      text.includes("starter business pack")
    );
  }

  function applyOutOfStock(){
    document.querySelectorAll(".product-card, .product, .card").forEach(card => {
      if (!isOutOfStockCard(card)) return;

      const nameText = (card.innerText || "").toLowerCase();

      if (!(nameText.includes("business pack") || nameText.includes("starter business pack"))) return;

      if (!card.querySelector(".ff-out-stock-badge")) {
        const badge = document.createElement("div");
        badge.className = "ff-out-stock-badge";
        badge.textContent = "Out of Stock";
        badge.style.cssText = "display:inline-flex;margin:10px 0;padding:8px 14px;border-radius:999px;background:#fff1fa;color:#68235f;font-weight:950;border:1px solid rgba(104,35,95,.14);";
        card.appendChild(badge);
      }

      card.querySelectorAll("button, a").forEach(btn => {
        const t = (btn.innerText || "").toLowerCase();

        if (
          t.includes("add") ||
          t.includes("cart") ||
          t.includes("buy") ||
          t.includes("shop")
        ) {
          btn.disabled = true;
          btn.innerText = "Out of Stock";
          btn.style.opacity = ".55";
          btn.style.pointerEvents = "none";
          btn.style.cursor = "not-allowed";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", applyOutOfStock);
  setTimeout(applyOutOfStock, 800);
  setTimeout(applyOutOfStock, 1800);
})();
`);

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

const htmlFiles = walk(path.join(__dirname, "public")).filter(file => !file.includes("/admin/"));

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<script[^>]+out-of-stock-protection\.js[^>]*><\/script>\s*/gi, "");

  html = html.replace("</body>", '  <script src="/js/out-of-stock-protection.js?v=4200"></script>\n</body>');

  fs.writeFileSync(file, html);
}

console.log("Business Pack is now protected as out of stock.");
