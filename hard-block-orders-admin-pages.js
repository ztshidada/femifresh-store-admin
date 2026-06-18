const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");
const jsDir = path.join(publicDir, "js");
fs.mkdirSync(jsDir, { recursive: true });

fs.writeFileSync(path.join(jsDir, "orders-admin-hard-lock.js"), `
(function(){
  const LIMITED_ALLOWED = [
    "/admin/dashboard.html",
    "/admin/orders.html",
    "/admin/order-detail.html",
    "/admin/joining-fees.html",
    "/admin/login.html"
  ];

  const BLOCKED_FOR_ORDERS_ADMIN = [
    "/admin/affiliates.html",
    "/admin/affiliate-profile.html",
    "/admin/products.html",
    "/admin/users.html",
    "/admin/settings.html",
    "/admin/payment-settings.html",
    "/admin/logs.html",
    "/admin/manual-payments.html",
    "/admin/delivery.html"
  ];

  function pageText(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isOrdersAdmin(){
    const t = pageText();
    return (
      t.includes("orders admin") ||
      t.includes("orders_admin") ||
      t.includes("(orders_admin)")
    );
  }

  function lockNow(){
    if (!isOrdersAdmin()) return;

    const path = location.pathname.toLowerCase();

    if (path.includes("/admin/affiliates")) {
      location.replace("/admin/joining-fees.html?v=5100");
      return;
    }

    if (BLOCKED_FOR_ORDERS_ADMIN.some(p => path.includes(p))) {
      location.replace("/admin/dashboard.html?v=5100");
      return;
    }

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase();
      const href = (a.getAttribute("href") || "").toLowerCase();

      const isAffiliate = label.includes("affiliates") || href.includes("affiliates");
      const isBlocked =
        label.includes("products") ||
        label.includes("delivery") ||
        label.includes("admin users") ||
        label.includes("payment") ||
        label.includes("logs") ||
        href.includes("products") ||
        href.includes("delivery") ||
        href.includes("users") ||
        href.includes("logs") ||
        href.includes("settings") ||
        href.includes("manual-payments");

      if (isAffiliate) {
        a.innerText = "Joining Fees";
        a.href = "/admin/joining-fees.html?v=5100";
        return;
      }

      if (isBlocked) {
        a.remove();
      }
    });

    const side = document.querySelector("aside, .sidebar");
    if (side && !side.querySelector('a[href*="joining-fees"]')) {
      const link = document.createElement("a");
      link.href = "/admin/joining-fees.html?v=5100";
      link.textContent = "Joining Fees";
      link.style.cssText = "display:flex;align-items:center;min-height:48px;padding:12px 16px;margin:7px 0;border-radius:18px;color:white;font-weight:950;text-decoration:none;";
      side.appendChild(link);
    }
  }

  document.addEventListener("DOMContentLoaded", lockNow);
  setTimeout(lockNow, 100);
  setTimeout(lockNow, 500);
  setTimeout(lockNow, 1200);
  setTimeout(lockNow, 2500);
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

for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<script[^>]+orders-admin-hard-lock\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+limited-admin-menu\.js[^>]*><\/script>\s*/gi, "");

  html = html.replace("</body>", '  <script src="/js/orders-admin-hard-lock.js?v=5100"></script>\n</body>');

  fs.writeFileSync(file, html);
  console.log("Protected:", path.relative(publicDir, file));
}

console.log("Hard lock added for orders_admin pages.");
