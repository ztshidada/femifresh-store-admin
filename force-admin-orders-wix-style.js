const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");
fs.mkdirSync(adminDir, { recursive: true });

const adminCss = `
:root{
  --p:#68235f;
  --d:#35112f;
  --pink:#f4a7d8;
  --bg:#f5f1f7;
  --line:#eaddea;
  --muted:#6f6372;
  --green:#dff5e8;
  --greenText:#13753d;
  --amber:#fff1d6;
  --amberText:#8a5a00;
  --red:#ffe1e8;
  --redText:#a40024;
}

*{box-sizing:border-box}

body{
  margin:0;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  background:var(--bg);
  color:#201020;
}

.admin-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
}

.sidebar{
  background:#19091b;
  color:#fff;
  padding:24px;
  position:sticky;
  top:0;
  height:100vh;
}

.logo{
  display:flex;
  align-items:center;
  gap:12px;
  font-size:24px;
  font-weight:950;
  margin-bottom:34px;
}

.logo img{
  width:52px;
  height:52px;
  object-fit:cover;
  border-radius:18px;
}

.menu{
  display:grid;
  gap:8px;
}

.menu a{
  color:rgba(255,255,255,.82);
  padding:13px 14px;
  border-radius:16px;
  font-weight:850;
  text-decoration:none;
}

.menu a:hover,
.menu a.active{
  background:rgba(255,255,255,.12);
  color:white;
}

.main{
  padding:34px;
  min-width:0;
}

.top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  margin-bottom:24px;
}

.crumb{
  color:var(--muted);
  font-weight:850;
  margin-bottom:8px;
}

h1{
  margin:0;
  font-size:clamp(42px,5vw,72px);
  line-height:.95;
  letter-spacing:-.07em;
  color:var(--d);
}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:999px;
  min-height:42px;
  padding:10px 16px;
  background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
  color:#fff;
  font-weight:950;
  text-decoration:none;
  cursor:pointer;
}

.btn.light{
  background:#fff;
  color:var(--p);
  border:1px solid var(--line);
}

.btn.small{
  min-height:36px;
  padding:8px 13px;
  font-size:13px;
}

.stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
  margin-bottom:18px;
}

.card{
  background:#fff;
  border:1px solid var(--line);
  border-radius:24px;
  box-shadow:0 18px 44px rgba(104,35,95,.07);
  padding:20px;
}

.label{
  color:var(--muted);
  font-weight:850;
  margin-bottom:9px;
}

.value{
  color:var(--p);
  font-size:32px;
  font-weight:950;
  letter-spacing:-.05em;
}

.toolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  margin-bottom:16px;
}

.toolbar .left{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

input,select,textarea{
  border:1px solid var(--line);
  border-radius:14px;
  min-height:44px;
  padding:11px 13px;
  font-size:15px;
  background:#fff;
}

.search{
  min-width:320px;
}

.table-wrap{
  background:#fff;
  border:1px solid var(--line);
  border-radius:24px;
  overflow:auto;
  box-shadow:0 18px 44px rgba(104,35,95,.07);
}

table{
  width:100%;
  border-collapse:collapse;
  min-width:980px;
}

th,td{
  padding:15px 16px;
  border-bottom:1px solid var(--line);
  text-align:left;
  vertical-align:top;
}

th{
  background:#fbf7fb;
  color:var(--p);
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.08em;
}

tr:hover td{
  background:#fff8fd;
}

.badge{
  display:inline-flex;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:950;
  background:#f0e1ef;
  color:var(--p);
}

.badge.green{background:var(--green);color:var(--greenText)}
.badge.amber{background:var(--amber);color:var(--amberText)}
.badge.red{background:var(--red);color:var(--redText)}

.two{
  display:grid;
  grid-template-columns:1fr 390px;
  gap:20px;
}

.item-row{
  display:grid;
  grid-template-columns:1fr auto auto;
  gap:16px;
  padding:16px 0;
  border-bottom:1px solid var(--line);
}

.kv{
  display:grid;
  gap:12px;
}

.kv div{
  display:flex;
  justify-content:space-between;
  gap:14px;
}

.side-card{
  margin-bottom:16px;
}

.note{
  width:100%;
  min-height:90px;
}

@media(max-width:900px){
  .admin-shell{display:block}
  .sidebar{position:relative;height:auto}
  .menu{grid-template-columns:1fr 1fr}
  .main{padding:18px}
  .top{display:block}
  .stats,.two{grid-template-columns:1fr}
  .search{min-width:100%;width:100%}
}
`;

fs.writeFileSync(path.join(adminDir, "orders-v2.css"), adminCss);

const adminJs = `
const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts
  });

  const j = await r.json().catch(() => ({ success:false, message:"Bad response" }));

  if (r.status === 401) {
    location.href = "/admin/login.html";
    return {};
  }

  return j;
};

const money = n => "R" + Number(n || 0).toLocaleString("en-ZA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const date = d => d ? new Date(d).toLocaleString("en-ZA") : "--";

function badge(v){
  const s = String(v || "pending").toLowerCase();
  let c = "";
  if (s.includes("paid") || s.includes("fulfilled") || s.includes("delivered")) c = "green";
  else if (s.includes("failed") || s.includes("cancel") || s.includes("refund")) c = "red";
  else if (s.includes("pending") || s.includes("new") || s.includes("manual")) c = "amber";
  return '<span class="badge '+c+'">'+(v || "--")+'</span>';
}

function orderNumber(o){
  return o.orderNumber || o.orderNo || o.reference || o.number || o.id || "--";
}

function customerName(o){
  return o.customer?.name || o.name || o.customerName || "--";
}

function customerEmail(o){
  return o.customer?.email || o.email || "";
}

function customerPhone(o){
  return o.customer?.phone || o.phone || "";
}

function orderItems(o){
  return Array.isArray(o.items) ? o.items : [];
}

function itemName(i){
  return i.name || i.title || i.productName || "Item";
}

function itemQty(i){
  return Number(i.qty || i.quantity || 1);
}

function itemPrice(i){
  return Number(i.price || i.amount || i.unitPrice || 0);
}

function itemTotal(i){
  return Number(i.subtotal || i.total || (itemPrice(i) * itemQty(i)));
}

function sidebar(active){
  const links = [
    ["Dashboard","/admin/dashboard.html"],
    ["Orders","/admin/orders.html"],
    ["Affiliates","/admin/affiliates.html"],
    ["Products","/admin/products.html"],
    ["Delivery Methods","/admin/delivery.html"],
    ["Admin Users","/admin/users.html"],
    ["Payment & Email Logs","/admin/logs.html"],
    ["Logout","#logout"]
  ];

  return \`
    <aside class="sidebar">
      <div class="logo">
        <img src="/images/femifresh-logo.jpg">
        <span>FemiFresh Admin</span>
      </div>
      <nav class="menu">
        \${links.map(([label, href]) => {
          if (href === "#logout") return '<a href="#" onclick="logout()">Logout</a>';
          return '<a class="'+(label === active ? 'active' : '')+'" href="'+href+'">'+label+'</a>';
        }).join("")}
      </nav>
    </aside>
  \`;
}

async function logout(){
  await api("/api/admin/logout", { method:"POST" });
  location.href = "/admin/login.html";
}

async function getOrders(){
  const r = await api("/api/admin/orders");
  return r.orders || r.data || [];
}

let allOrders = [];

async function ordersPage(){
  allOrders = await getOrders();

  document.body.innerHTML = \`
    <div class="admin-shell">
      \${sidebar("Orders")}
      <main class="main">
        <div class="top">
          <div>
            <div class="crumb">Sales</div>
            <h1>Orders</h1>
          </div>
          <a class="btn light" href="/">Open Store</a>
        </div>

        <section class="stats">
          <div class="card"><div class="label">Total orders</div><div class="value">\${allOrders.length}</div></div>
          <div class="card"><div class="label">Paid</div><div class="value">\${allOrders.filter(o => String(o.paymentStatus).toLowerCase() === "paid").length}</div></div>
          <div class="card"><div class="label">Pending</div><div class="value">\${allOrders.filter(o => String(o.paymentStatus || "pending").toLowerCase().includes("pending")).length}</div></div>
          <div class="card"><div class="label">Paid sales</div><div class="value">\${money(allOrders.filter(o => String(o.paymentStatus).toLowerCase() === "paid").reduce((s,o)=>s+Number(o.total||0),0))}</div></div>
        </section>

        <div class="toolbar">
          <div class="left">
            <input class="search" id="q" placeholder="Search order number, customer, email..." oninput="renderOrders()">
            <select id="pay" onchange="renderOrders()">
              <option value="">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
            <select id="ful" onchange="renderOrders()">
              <option value="">All fulfillment</option>
              <option value="new">New</option>
              <option value="packed">Packed</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <a class="btn light" href="/admin/dashboard.html">Back to Dashboard</a>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Name</th>
                <th>Paid / Pending</th>
                <th>Fulfillment</th>
                <th>Total</th>
                <th>Items</th>
                <th>Date</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody id="ordersBody"></tbody>
          </table>
        </div>
      </main>
    </div>
  \`;

  renderOrders();
}

function renderOrders(){
  const q = (document.getElementById("q")?.value || "").toLowerCase();
  const pay = document.getElementById("pay")?.value || "";
  const ful = document.getElementById("ful")?.value || "";

  const list = allOrders.filter(o => {
    const text = [
      orderNumber(o),
      customerName(o),
      customerEmail(o),
      customerPhone(o),
      o.paymentStatus,
      o.fulfillmentStatus,
      o.total
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!pay || String(o.paymentStatus || "pending").toLowerCase() === pay) &&
      (!ful || String(o.fulfillmentStatus || "new").toLowerCase() === ful);
  });

  document.getElementById("ordersBody").innerHTML = list.map(o => {
    const no = orderNumber(o);
    const id = encodeURIComponent(o.id || no);
    const items = orderItems(o).map(i => itemQty(i) + "x " + itemName(i)).join("<br>");

    return \`
      <tr>
        <td><b style="font-size:16px">\${no}</b><br><small>\${o.id || ""}</small></td>
        <td><b>\${customerName(o)}</b><br><small>\${customerEmail(o)}</small></td>
        <td>\${badge(o.paymentStatus || "pending")}</td>
        <td>\${badge(o.fulfillmentStatus || "new")}</td>
        <td><b>\${money(o.total)}</b></td>
        <td>\${items || "--"}</td>
        <td>\${date(o.createdAt)}</td>
        <td><a class="btn small light" href="/admin/order-detail.html?id=\${id}">Open</a></td>
      </tr>
    \`;
  }).join("");
}

async function orderDetail(){
  const id = new URLSearchParams(location.search).get("id");
  const orders = await getOrders();

  const o = orders.find(x =>
    String(x.id) === String(id) ||
    String(orderNumber(x)) === String(id)
  );

  if (!o) {
    document.body.innerHTML = \`
      <div class="admin-shell">
        \${sidebar("Orders")}
        <main class="main">
          <div class="card">
            <h1>Order not found</h1>
            <p>This order could not be opened.</p>
            <a class="btn" href="/admin/orders.html">Back to Orders</a>
          </div>
        </main>
      </div>
    \`;
    return;
  }

  const no = orderNumber(o);
  const items = orderItems(o);

  document.body.innerHTML = \`
    <div class="admin-shell">
      \${sidebar("Orders")}
      <main class="main">
        <div class="top">
          <div>
            <div class="crumb">Orders › \${no}</div>
            <h1>\${no}</h1>
            <div style="margin-top:12px">\${badge(o.paymentStatus || "pending")} \${badge(o.fulfillmentStatus || "new")}</div>
          </div>
          <a class="btn light" href="/admin/orders.html">Back to Orders</a>
        </div>

        <div class="two">
          <section>
            <div class="card" style="margin-bottom:16px">
              <h2>Items (\${items.length})</h2>
              \${items.map(i => \`
                <div class="item-row">
                  <div><b>\${itemName(i)}</b><br><small>Qty: \${itemQty(i)}</small></div>
                  <div>\${money(itemPrice(i))}</div>
                  <div><b>\${money(itemTotal(i))}</b></div>
                </div>
              \`).join("") || "<p>No items found.</p>"}
            </div>

            <div class="card" style="margin-bottom:16px">
              <h2>Payment info</h2>
              <div class="kv">
                <div><span>Items</span><b>\${money(o.subtotal)}</b></div>
                <div><span>Shipping</span><b>\${money(o.delivery?.price || o.shipping || 0)}</b></div>
                <div><span>Tax</span><b>\${money(o.tax || 0)}</b></div>
                <div style="font-size:18px"><span>Total</span><b>\${money(o.total)}</b></div>
                <div><span>Payment method</span><b>\${o.paymentMethod || "--"}</b></div>
                <div><span>Amount customer paid</span><b>\${money(o.total)}</b></div>
              </div>
            </div>

            <div class="card">
              <h2>Order activity</h2>
              <p>• Order placed: \${date(o.createdAt)}</p>
              <p>• Payment status: \${o.paymentStatus || "pending"}</p>
              <p>• Fulfillment status: \${o.fulfillmentStatus || "new"}</p>
              <label>Internal note</label>
              <textarea class="note" onchange="updateOrder('\${o.id}','adminNote',this.value)">\${o.adminNote || ""}</textarea>
            </div>
          </section>

          <aside>
            <div class="card side-card">
              <h2>Order status</h2>

              <label>Payment status</label>
              <select onchange="updateOrder('\${o.id}','paymentStatus',this.value)">
                <option value="pending" \${sel(o.paymentStatus,"pending")}>Pending</option>
                <option value="paid" \${sel(o.paymentStatus,"paid")}>Paid</option>
                <option value="failed" \${sel(o.paymentStatus,"failed")}>Failed</option>
                <option value="refunded" \${sel(o.paymentStatus,"refunded")}>Refunded</option>
              </select>

              <label>Fulfillment status</label>
              <select onchange="updateOrder('\${o.id}','fulfillmentStatus',this.value)">
                <option value="new" \${sel(o.fulfillmentStatus,"new")}>New</option>
                <option value="packed" \${sel(o.fulfillmentStatus,"packed")}>Packed</option>
                <option value="out_for_delivery" \${sel(o.fulfillmentStatus,"out_for_delivery")}>Out for delivery</option>
                <option value="delivered" \${sel(o.fulfillmentStatus,"delivered")}>Delivered</option>
                <option value="cancelled" \${sel(o.fulfillmentStatus,"cancelled")}>Cancelled</option>
              </select>

              <label>Tracking number</label>
              <input value="\${o.trackingNumber || ""}" onchange="updateOrder('\${o.id}','trackingNumber',this.value)">
            </div>

            <div class="card side-card">
              <h2>Customer info</h2>
              <p><b>\${customerName(o)}</b><br>\${customerEmail(o)}<br>\${customerPhone(o)}</p>
            </div>

            <div class="card side-card">
              <h2>Delivery info</h2>
              <p><b>Delivery method</b><br>\${o.delivery?.name || o.deliveryMethod || "--"}</p>
              <p><b>Shipping address</b><br>\${o.customer?.address || o.shippingAddress || "No address"}</p>
            </div>

            <div class="card">
              <h2>Additional info</h2>
              <p><b>Referral code</b><br>\${o.referralCode || "--"}</p>
              <p><b>Order ID</b><br>\${o.id || "--"}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  \`;
}

function sel(a,b){
  return String(a || "").toLowerCase() === String(b).toLowerCase() ? "selected" : "";
}

async function updateOrder(id,key,value){
  const r = await api("/api/admin/orders/" + id, {
    method:"PATCH",
    body: JSON.stringify({ [key]: value })
  });

  if (!r.success) alert(r.message || "Update failed");
}
`;

fs.writeFileSync(path.join(adminDir, "orders-v2.js"), adminJs);

function page(title, fn){
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | FemiFresh Admin</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/admin/orders-v2.css">
</head>
<body>
  <script src="/admin/orders-v2.js"></script>
  <script>${fn}();</script>
</body>
</html>`;
}

fs.writeFileSync(path.join(adminDir, "orders.html"), page("Orders", "ordersPage"));
fs.writeFileSync(path.join(adminDir, "order-detail.html"), page("Order Detail", "orderDetail"));

/* Remove R100 payment button from affiliate pages */
const affiliatePages = [
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "join.html",
  "join-success.html",
  "affiliate-reset-password.html"
];

for (const name of affiliatePages) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/<div[^>]*>[\s\S]*?Pay R100 Joining Fee[\s\S]*?<\/div>/gi, "")
    .replace(/<a[^>]+affiliate-fee\.html[^>]*>[\s\S]*?Pay R100[\s\S]*?<\/a>/gi, "")
    .replace(/<a[^>]+affiliate-fee\.html[^>]*>[\s\S]*?Joining Fee[\s\S]*?<\/a>/gi, "");

  fs.writeFileSync(file, html);
}

/* Make affiliate-fee page manual info only */
const feeFile = path.join(publicDir, "affiliate-fee.html");
if (fs.existsSync(feeFile)) {
  let fee = fs.readFileSync(feeFile, "utf8");

  fee = fee.replace(/<form id="feeForm">[\s\S]*?<\/form>/i, `
<div class="notice">
  <h2 style="margin-top:0;">Manual payment only</h2>
  <p>Please pay the once-off <strong>R100 affiliate joining fee</strong> manually.</p>
  <p>Email your proof of payment to:</p>
  <p style="font-size:22px;color:var(--p);font-weight:950;">femifresh02@gmail.com</p>
  <p>Use your registered affiliate email as the payment reference.</p>
</div>
`);

  fee = fee.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/i, "</body>");
  fs.writeFileSync(feeFile, fee);
}

console.log("Forced admin orders list/detail and removed R100 pay button.");
