const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(adminDir, { recursive: true });

let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("FEMIFRESH_LIMITED_STAFF_ADMIN_V1")) {
  const api = `

// FEMIFRESH_LIMITED_STAFF_ADMIN_V1
const cryptoStaffAdmin = require("crypto");

function staffCookieParse(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header.split(";").map(v => {
      const i = v.indexOf("=");
      if (i === -1) return ["", ""];
      return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())];
    }).filter(v => v[0])
  );
}

function staffSecret() {
  return process.env.STAFF_ADMIN_SECRET || process.env.JWT_SECRET || "femifresh-staff-secret-change-me";
}

function staffSign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = cryptoStaffAdmin
    .createHmac("sha256", staffSecret())
    .update(body)
    .digest("base64url");

  return body + "." + sig;
}

function staffVerify(token) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;

    const expected = cryptoStaffAdmin
      .createHmac("sha256", staffSecret())
      .update(body)
      .digest("base64url");

    if (sig !== expected) return null;

    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

    if (!data.exp || Date.now() > data.exp) return null;

    return data;
  } catch (e) {
    return null;
  }
}

function staffAuth(req, res, next) {
  const cookies = staffCookieParse(req);
  const staff = staffVerify(cookies.ff_staff_token);

  if (!staff) {
    return res.status(401).json({
      success: false,
      message: "Staff admin login required."
    });
  }

  req.staffAdmin = staff;
  next();
}

function getStaffLogin() {
  return {
    email: process.env.STAFF_ADMIN_EMAIL || "orders@femifresh.local",
    password: process.env.STAFF_ADMIN_PASSWORD || "Orders@12345"
  };
}

function orderIdMatches(order, id) {
  const keys = [
    order.id,
    order.orderId,
    order.orderNumber,
    order.orderNo,
    order.reference
  ].filter(Boolean).map(String);

  return keys.includes(String(id));
}

function orderNumber(order, index) {
  const raw =
    order.orderNumber ||
    order.orderNo ||
    order.reference ||
    order.id ||
    index + 1;

  const s = String(raw);

  if (s.startsWith("FF-")) return s;

  const digits = s.match(/\\d+/);
  if (!digits) return "FF-" + String(10000 + index + 1);

  const n = Number(digits[0]);

  if (n >= 10000) return "FF-" + n;

  return "FF-" + String(10000 + n).padStart(5, "0");
}

function affiliateJoiningPaid(a) {
  return !!(
    a.joiningFeePaid ||
    a.manualJoiningFeePaid ||
    a.joiningFeeStatus === "paid" ||
    a.paymentStatus === "paid" ||
    a.accountStatus === "approved" ||
    a.approved === true ||
    a.isApproved === true
  );
}

app.post("/api/staff/login", (req, res) => {
  const body = req.body || {};
  const login = getStaffLogin();

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (email !== login.email.toLowerCase() || password !== login.password) {
    return res.status(401).json({
      success: false,
      message: "Invalid staff admin login."
    });
  }

  const token = staffSign({
    role: "orders_joining_admin",
    email: login.email,
    exp: Date.now() + 1000 * 60 * 60 * 12
  });

  res.cookie("ff_staff_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12
  });

  res.json({
    success: true,
    role: "orders_joining_admin"
  });
});

app.post("/api/staff/logout", staffAuth, (req, res) => {
  res.clearCookie("ff_staff_token");
  res.json({ success: true });
});

app.get("/api/staff/me", staffAuth, (req, res) => {
  res.json({
    success: true,
    staff: req.staffAdmin
  });
});

app.get("/api/staff/orders", staffAuth, (req, res) => {
  const orders = read("orders", []);

  const clean = orders.map((o, index) => ({
    ...o,
    cleanOrderNumber: orderNumber(o, index)
  })).sort((a, b) => {
    return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
  });

  res.json({
    success: true,
    orders: clean
  });
});

app.post("/api/staff/orders/:id/paid", staffAuth, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => orderIdMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  orders[index] = {
    ...orders[index],
    paymentStatus: "paid",
    paid: true,
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("orders", orders);

  res.json({
    success: true,
    order: orders[index]
  });
});

app.post("/api/staff/orders/:id/fulfilled", staffAuth, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => orderIdMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  orders[index] = {
    ...orders[index],
    fulfillmentStatus: "fulfilled",
    status: orders[index].status === "cancelled" ? "cancelled" : "fulfilled",
    fulfilled: true,
    fulfilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("orders", orders);

  res.json({
    success: true,
    order: orders[index]
  });
});

app.get("/api/staff/joining-pending", staffAuth, (req, res) => {
  const affiliates = read("affiliates", []);

  const pending = affiliates
    .filter(a => !affiliateJoiningPaid(a))
    .map(a => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      fullName: a.fullName || a.name || [a.firstName, a.lastName].filter(Boolean).join(" "),
      email: a.email,
      phone: a.phone,
      referralCode: a.referralCode || a.code,
      joiningFeeStatus: a.joiningFeeStatus || a.paymentStatus || a.accountStatus || "pending",
      createdAt: a.createdAt
    }));

  res.json({
    success: true,
    affiliates: pending
  });
});

app.post("/api/staff/affiliates/:id/mark-joined", staffAuth, (req, res) => {
  const id = req.params.id;
  const affiliates = read("affiliates", []);

  const index = affiliates.findIndex(a =>
    String(a.id || "") === String(id) ||
    String(a.email || "").toLowerCase() === String(id).toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  affiliates[index] = {
    ...affiliates[index],
    joiningFeePaid: true,
    manualJoiningFeePaid: true,
    joiningFeeStatus: "paid",
    paymentStatus: "paid",
    accountStatus: "approved",
    approved: true,
    isApproved: true,
    joined: true,
    joiningFeePaidAt: affiliates[index].joiningFeePaidAt || new Date().toISOString(),
    approvedAt: affiliates[index].approvedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[index]
  });
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + api + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
  console.log("Limited staff admin API added.");
} else {
  console.log("Limited staff admin API already exists.");
}

/* Staff login page */
fs.writeFileSync(path.join(adminDir, "staff-login.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Staff Login | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:
        radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
        radial-gradient(circle at 90% 16%,rgba(104,35,95,.12),transparent 26%),
        linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7);
      color:#241126;
      padding:20px;
    }
    .card{
      width:min(460px,100%);
      background:white;
      border:1px solid rgba(104,35,95,.14);
      border-radius:34px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.12);
    }
    img{
      width:86px;
      height:86px;
      object-fit:cover;
      border-radius:24px;
      margin-bottom:18px;
    }
    h1{
      margin:0 0 12px;
      color:#35112f;
      font-size:clamp(42px,8vw,64px);
      line-height:.95;
      letter-spacing:-.07em;
    }
    p{
      color:#6f6372;
      line-height:1.6;
    }
    form{
      display:grid;
      gap:14px;
      margin-top:22px;
    }
    input{
      min-height:54px;
      border:1px solid rgba(104,35,95,.14);
      border-radius:16px;
      padding:14px 16px;
      font-size:16px;
    }
    button{
      min-height:54px;
      border:0;
      border-radius:999px;
      background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
      color:white;
      font-weight:950;
      font-size:16px;
      cursor:pointer;
    }
    .error{
      display:none;
      background:#ffe1e8;
      color:#8a0020;
      padding:14px;
      border-radius:16px;
      margin-top:14px;
      font-weight:800;
    }
  </style>
</head>
<body>
  <main class="card">
    <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
    <h1>Staff Login</h1>
    <p>Limited admin access for orders and joining-fee approval only.</p>

    <form id="loginForm">
      <input name="email" type="email" placeholder="Staff email" required>
      <input name="password" type="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>

    <div class="error" id="errorBox"></div>
  </main>

<script>
loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const fd = new FormData(loginForm);

  const res = await fetch("/api/staff/login", {
    method:"POST",
    credentials:"include",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      email: fd.get("email"),
      password: fd.get("password")
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!data.success) {
    errorBox.style.display = "block";
    errorBox.textContent = data.message || "Login failed.";
    return;
  }

  location.href = "/admin/staff.html";
});
</script>
</body>
</html>`);

/* Staff dashboard page */
fs.writeFileSync(path.join(adminDir, "staff.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Staff Admin | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    :root{
      --p:#68235f;
      --d:#35112f;
      --pink:#f4a7d8;
      --line:rgba(104,35,95,.14);
      --muted:#6f6372;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:
        radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
        radial-gradient(circle at 90% 16%,rgba(104,35,95,.12),transparent 26%),
        linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7);
      color:#241126;
    }
    .layout{
      display:grid;
      grid-template-columns:280px 1fr;
      min-height:100vh;
    }
    aside{
      background:linear-gradient(180deg,#240c25,#421041,#68235f);
      color:white;
      padding:28px 24px;
    }
    .brand{
      display:flex;
      align-items:center;
      gap:12px;
      font-size:24px;
      font-weight:950;
      margin-bottom:28px;
    }
    .brand img{
      width:54px;
      height:54px;
      object-fit:cover;
      border-radius:18px;
    }
    nav{
      display:grid;
      gap:8px;
    }
    nav button{
      min-height:48px;
      border:0;
      border-radius:16px;
      background:rgba(255,255,255,.10);
      color:white;
      font-weight:950;
      cursor:pointer;
      text-align:left;
      padding:0 16px;
    }
    nav button.active{
      background:white;
      color:var(--p);
    }
    main{
      padding:48px;
    }
    h1{
      margin:0 0 24px;
      font-size:clamp(48px,7vw,82px);
      line-height:.9;
      letter-spacing:-.075em;
      color:var(--d);
    }
    .card{
      background:rgba(255,255,255,.92);
      border:1px solid var(--line);
      border-radius:28px;
      box-shadow:0 18px 46px rgba(104,35,95,.08);
      padding:26px;
      margin-bottom:20px;
    }
    .toolbar{
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:18px;
    }
    input{
      min-height:50px;
      border:1px solid var(--line);
      border-radius:999px;
      padding:12px 16px;
      font-size:16px;
      min-width:280px;
    }
    table{
      width:100%;
      min-width:900px;
      border-collapse:collapse;
    }
    th{
      color:var(--p);
      background:#fff7fd;
      text-transform:uppercase;
      font-size:13px;
      letter-spacing:.12em;
      text-align:left;
      padding:16px;
    }
    td{
      border-bottom:1px solid rgba(104,35,95,.10);
      padding:16px;
      vertical-align:top;
    }
    .table-wrap{
      overflow-x:auto;
      border-radius:22px;
    }
    .btn{
      border:0;
      border-radius:999px;
      min-height:42px;
      padding:10px 16px;
      background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
      color:white;
      font-weight:950;
      cursor:pointer;
      margin:3px;
    }
    .btn.light{
      background:white;
      color:var(--p);
      border:1px solid var(--line);
    }
    .badge{
      display:inline-flex;
      border-radius:999px;
      padding:7px 12px;
      background:#fff1fa;
      color:var(--p);
      font-weight:950;
      font-size:13px;
    }
    .hidden{display:none}
    @media(max-width:900px){
      .layout{display:block}
      aside{border-radius:0 0 26px 26px}
      main{padding:24px 14px}
      nav{grid-template-columns:1fr 1fr}
      input,.btn{width:100%}
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
        <span>Staff Admin</span>
      </div>

      <nav>
        <button id="ordersTab" class="active" onclick="showTab('orders')">Orders</button>
        <button id="joiningTab" onclick="showTab('joining')">Joining Fees</button>
        <button onclick="logout()">Logout</button>
      </nav>
    </aside>

    <main>
      <section id="ordersSection">
        <h1>Orders</h1>

        <div class="card">
          <div class="toolbar">
            <input id="orderSearch" placeholder="Search order, name, phone, email..." oninput="renderOrders()">
            <button class="btn light" onclick="loadOrders()">Refresh Orders</button>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="ordersBody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="joiningSection" class="hidden">
        <h1>Joining Fees</h1>

        <div class="card">
          <div class="toolbar">
            <input id="joiningSearch" placeholder="Search name, email, phone..." oninput="renderJoining()">
            <button class="btn light" onclick="loadJoining()">Refresh Pending</button>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="joiningBody"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>

<script>
let orders = [];
let affiliates = [];

function money(v){
  const n = Number(v || 0);
  return "R" + n.toLocaleString("en-ZA", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function cleanOrderNo(o){
  return o.cleanOrderNumber || o.orderNumber || o.orderNo || o.reference || o.id || "Order";
}

function customerName(o){
  return o.customerName || o.name || o.fullName || o.customer?.name || [o.firstName,o.lastName].filter(Boolean).join(" ") || "Customer";
}

function customerContact(o){
  return o.email || o.customerEmail || o.customer?.email || o.phone || o.customerPhone || o.customer?.phone || "";
}

async function api(url, opts = {}){
  const res = await fetch(url, {
    credentials:"include",
    headers:{"Content-Type":"application/json"},
    ...opts
  });

  if (res.status === 401) {
    location.href = "/admin/staff-login.html";
    return {};
  }

  return res.json().catch(() => ({}));
}

function showTab(tab){
  ordersSection.classList.toggle("hidden", tab !== "orders");
  joiningSection.classList.toggle("hidden", tab !== "joining");
  ordersTab.classList.toggle("active", tab === "orders");
  joiningTab.classList.toggle("active", tab === "joining");

  if (tab === "orders") loadOrders();
  if (tab === "joining") loadJoining();
}

async function loadOrders(){
  const data = await api("/api/staff/orders");
  orders = data.orders || [];
  renderOrders();
}

function renderOrders(){
  const q = (orderSearch.value || "").toLowerCase();

  const filtered = orders.filter(o => {
    const text = JSON.stringify(o).toLowerCase();
    return text.includes(q);
  });

  ordersBody.innerHTML = filtered.map(o => {
    const id = o.id || o.orderId || o.orderNumber || o.orderNo || o.reference;
    const pay = o.paymentStatus || (o.paid ? "paid" : "pending");
    const fulfill = o.fulfillmentStatus || (o.fulfilled ? "fulfilled" : "unfulfilled");

    return \`
      <tr>
        <td><strong>\${cleanOrderNo(o)}</strong><br><small>\${o.createdAt || o.date || ""}</small></td>
        <td><strong>\${customerName(o)}</strong><br><small>\${customerContact(o)}</small></td>
        <td><strong>\${money(o.total || o.amount || o.grandTotal)}</strong></td>
        <td><span class="badge">\${pay}</span></td>
        <td><span class="badge">\${fulfill}</span></td>
        <td>
          <button class="btn light" onclick="markPaid('\${id}')">Mark Paid</button>
          <button class="btn" onclick="markFulfilled('\${id}')">Fulfill</button>
        </td>
      </tr>
    \`;
  }).join("") || '<tr><td colspan="6">No orders found.</td></tr>';
}

async function markPaid(id){
  if (!confirm("Mark this order as paid?")) return;
  const data = await api("/api/staff/orders/" + encodeURIComponent(id) + "/paid", {method:"POST"});
  if (data.success) loadOrders();
  else alert(data.message || "Could not mark paid.");
}

async function markFulfilled(id){
  if (!confirm("Mark this order as fulfilled?")) return;
  const data = await api("/api/staff/orders/" + encodeURIComponent(id) + "/fulfilled", {method:"POST"});
  if (data.success) loadOrders();
  else alert(data.message || "Could not fulfill order.");
}

async function loadJoining(){
  const data = await api("/api/staff/joining-pending");
  affiliates = data.affiliates || [];
  renderJoining();
}

function renderJoining(){
  const q = (joiningSearch.value || "").toLowerCase();

  const filtered = affiliates.filter(a => {
    const text = JSON.stringify(a).toLowerCase();
    return text.includes(q);
  });

  joiningBody.innerHTML = filtered.map(a => {
    const name = a.fullName || [a.firstName,a.lastName].filter(Boolean).join(" ") || "Affiliate";

    return \`
      <tr>
        <td><strong>\${name}</strong><br><small>\${a.createdAt || ""}</small></td>
        <td>\${a.email || ""}</td>
        <td>\${a.phone || ""}</td>
        <td>\${a.referralCode || ""}</td>
        <td><span class="badge">\${a.joiningFeeStatus || "pending"}</span></td>
        <td><button class="btn" onclick="markJoined('\${a.id || a.email}')">Mark Joined</button></td>
      </tr>
    \`;
  }).join("") || '<tr><td colspan="6">No pending joining fees.</td></tr>';
}

async function markJoined(id){
  if (!confirm("Mark this affiliate as joined and paid?")) return;
  const data = await api("/api/staff/affiliates/" + encodeURIComponent(id) + "/mark-joined", {method:"POST"});
  if (data.success) loadJoining();
  else alert(data.message || "Could not mark joined.");
}

async function logout(){
  await api("/api/staff/logout", {method:"POST"});
  location.href = "/admin/staff-login.html";
}

loadOrders();
</script>
</body>
</html>`);

console.log("Limited staff admin created.");
