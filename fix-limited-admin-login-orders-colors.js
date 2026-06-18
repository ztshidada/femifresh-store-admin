const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const jsDir = path.join(publicDir, "js");
const cssDir = path.join(publicDir, "css");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(jsDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });

/* 1. Remove auto-filled login values */
const loginFile = path.join(adminDir, "login.html");
if (fs.existsSync(loginFile)) {
  let html = fs.readFileSync(loginFile, "utf8");

  html = html.replace(/value=["']admin@femifresh\.local["']/gi, "");
  html = html.replace(/value=["'][^"']*Orders@12345[^"']*["']/gi, "");
  html = html.replace(/value=["'][^"']*Admin@12345[^"']*["']/gi, "");

  html = html.replace(/<form([^>]*)>/i, '<form$1 autocomplete="off">');

  html = html.replace(/type=["']email["']/i, 'type="email" autocomplete="new-email" value=""');
  html = html.replace(/type=["']password["']/i, 'type="password" autocomplete="new-password" value=""');

  if (!html.includes("LOGIN_CLEAR_AUTOFILL_V1")) {
    html = html.replace("</body>", `
<script>
// LOGIN_CLEAR_AUTOFILL_V1
setTimeout(() => {
  document.querySelectorAll('input[type="email"], input[type="password"]').forEach(input => {
    input.value = "";
    input.setAttribute("autocomplete", input.type === "password" ? "new-password" : "new-email");
  });
}, 250);
</script>
</body>`);
  }

  fs.writeFileSync(loginFile, html);
  console.log("Login autofill cleared.");
}

/* 2. Add normal-admin-session limited orders APIs */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("LIMITED_ADMIN_ORDERS_NORMAL_SESSION_V1")) {
  const block = `

// LIMITED_ADMIN_ORDERS_NORMAL_SESSION_V1
function limitedOrdersRoleOk(req) {
  const user = req.adminUser || req.user || req.admin || {};
  const role = String(user.role || user.type || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "orders_admin" ||
    role === "staff_admin"
  );
}

function limitedOrdersGuard(req, res, next) {
  if (typeof requireAdmin === "function") {
    return requireAdmin(req, res, function(){
      if (!limitedOrdersRoleOk(req)) {
        return res.status(403).json({success:false,message:"Not allowed."});
      }
      next();
    });
  }

  next();
}

function limitedOrderMatches(order, id) {
  const keys = [
    order.id,
    order.orderId,
    order.orderNumber,
    order.orderNo,
    order.reference
  ].filter(Boolean).map(String);

  return keys.includes(String(id));
}

function limitedCleanOrderNo(order, index) {
  const raw = order.orderNumber || order.orderNo || order.reference || order.id || index + 1;
  const s = String(raw);

  if (s.startsWith("FF-")) return s;

  const digits = s.match(/\\d+/);
  if (!digits) return "FF-" + String(10000 + index + 1);

  const n = Number(digits[0]);
  if (n >= 10000) return "FF-" + n;

  return "FF-" + String(10000 + n).padStart(5, "0");
}

app.get("/api/admin/limited/orders", limitedOrdersGuard, (req, res) => {
  const orders = read("orders", []);

  const clean = orders.map((o, index) => ({
    ...o,
    cleanOrderNumber: limitedCleanOrderNo(o, index)
  })).sort((a, b) => {
    return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
  });

  res.json({
    success:true,
    orders:clean
  });
});

app.post("/api/admin/limited/orders/:id/paid", limitedOrdersGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => limitedOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({success:false,message:"Order not found."});
  }

  orders[index] = {
    ...orders[index],
    paymentStatus:"paid",
    paid:true,
    paidAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("orders", orders);

  res.json({success:true, order:orders[index]});
});

app.post("/api/admin/limited/orders/:id/fulfilled", limitedOrdersGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => limitedOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({success:false,message:"Order not found."});
  }

  orders[index] = {
    ...orders[index],
    fulfillmentStatus:"fulfilled",
    status: orders[index].status === "cancelled" ? "cancelled" : "fulfilled",
    fulfilled:true,
    fulfilledAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("orders", orders);

  res.json({success:true, order:orders[index]});
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
  console.log("Limited orders APIs added for normal admin session.");
}

/* 3. Make staff-orders use /api/admin/limited instead of /api/staff */
const staffOrdersFile = path.join(adminDir, "staff-orders.html");
if (fs.existsSync(staffOrdersFile)) {
  let html = fs.readFileSync(staffOrdersFile, "utf8");

  html = html.replace(/\/api\/staff\/orders/g, "/api/admin/limited/orders");
  html = html.replace(/\/api\/staff\/orders\/"\s*\+\s*encodeURIComponent\(id\)\s*\+\s*"\/paid/g, '/api/admin/limited/orders/" + encodeURIComponent(id) + "/paid');
  html = html.replace(/\/api\/staff\/orders\/"\s*\+\s*encodeURIComponent\(id\)\s*\+\s*"\/fulfilled/g, '/api/admin/limited/orders/" + encodeURIComponent(id) + "/fulfilled');

  // direct safe replacements for exact strings
  html = html.replace(/"\/api\/admin\/limited\/orders\/"\s*\+\s*encodeURIComponent\(id\)\s*\+\s*"\/paid"/g, '"/api/admin/limited/orders/" + encodeURIComponent(id) + "/paid"');
  html = html.replace(/"\/api\/admin\/limited\/orders\/"\s*\+\s*encodeURIComponent\(id\)\s*\+\s*"\/fulfilled"/g, '"/api/admin/limited/orders/" + encodeURIComponent(id) + "/fulfilled"');

  fs.writeFileSync(staffOrdersFile, html);
  console.log("staff-orders now uses normal admin session.");
}

/* 4. Force orders_admin Orders menu to limited orders page */
fs.writeFileSync(path.join(jsDir, "orders-admin-route-fix.js"), `
(function(){
  function text(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isOrdersAdmin(){
    const t = text();
    return t.includes("orders_admin") || t.includes("orders admin");
  }

  function fix(){
    if(!isOrdersAdmin()) return;

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase().trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      if(label === "orders" || href.includes("/admin/orders.html")){
        a.setAttribute("href", "/admin/staff-orders.html?v=5300");
      }

      if(label.includes("affiliates") || href.includes("/admin/affiliates")){
        a.innerText = "Joining Fees";
        a.setAttribute("href", "/admin/joining-fees.html?v=5300");
      }

      if(
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
        href.includes("manual-payments")
      ){
        a.remove();
      }
    });

    if(location.pathname.toLowerCase() === "/admin/orders.html"){
      location.replace("/admin/staff-orders.html?v=5300");
    }

    if(location.pathname.toLowerCase().includes("/admin/affiliates")){
      location.replace("/admin/joining-fees.html?v=5300");
    }
  }

  document.addEventListener("DOMContentLoaded", fix);
  setTimeout(fix, 100);
  setTimeout(fix, 700);
  setTimeout(fix, 1500);
})();
`);

/* 5. Fix unreadable order detail colors */
const detailCssFile = path.join(cssDir, "order-detail-readable.css");
fs.writeFileSync(detailCssFile, `
/* ORDER_DETAIL_READABLE_V1 */
body{
  color:#241126 !important;
}

.order-status,
.status-panel,
.status-card,
.customer-info,
.customer-card,
aside .card,
.dark-card,
[class*="status"]{
  color:#241126 !important;
}

.order-status *,
.status-panel *,
.status-card *,
.customer-info *,
.customer-card *,
.dark-card *{
  color:#241126 !important;
}

select,
input,
textarea{
  color:#241126 !important;
  background:white !important;
}

label,
small,
p{
  color:#6f6372 !important;
}

h1,h2,h3,strong{
  color:#35112f !important;
}

button,
.btn{
  color:white !important;
}
`);

const orderDetailFile = path.join(adminDir, "order-detail.html");
if (fs.existsSync(orderDetailFile)) {
  let html = fs.readFileSync(orderDetailFile, "utf8");

  html = html.replace(/<link[^>]+order-detail-readable\.css[^>]*>\s*/gi, "");
  html = html.replace("</head>", '  <link rel="stylesheet" href="/css/order-detail-readable.css?v=5300">\n</head>');

  fs.writeFileSync(orderDetailFile, html);
}

/* inject route fix into all admin pages */
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

  html = html.replace(/<script[^>]+orders-admin-route-fix\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace("</body>", '  <script src="/js/orders-admin-route-fix.js?v=5300"></script>\n</body>');

  fs.writeFileSync(file, html);
}

console.log("Fixed limited admin orders, login autofill and order detail colors.");
