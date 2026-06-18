const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(adminDir, { recursive: true });

/* 1. Create a clean limited joining fee page */
fs.writeFileSync(path.join(adminDir, "joining-fees.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Joining Fees | FemiFresh Admin</title>
  <link rel="stylesheet" href="/css/femifresh-admin-premium.css?v=5000">
  <style>
    body{margin:0}
    .layout{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
    aside{background:linear-gradient(180deg,#240c25,#421041,#68235f);color:white;padding:28px}
    aside h2{color:white!important;margin:0 0 30px;font-size:30px!important;line-height:1}
    aside a,aside button{display:flex;width:100%;min-height:48px;align-items:center;padding:12px 16px;margin:7px 0;border-radius:18px;border:0;background:transparent;color:white;font-weight:950;text-decoration:none;cursor:pointer}
    aside a.active{background:#fff1fa;color:#68235f}
    main{padding:56px 58px}
    h1{font-size:clamp(52px,7vw,82px)!important;margin:0 0 28px!important}
    .card{background:white;border:1px solid rgba(104,35,95,.14);border-radius:28px;padding:28px;box-shadow:0 18px 46px rgba(104,35,95,.08)}
    .toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}
    input{min-height:52px;border:1px solid rgba(104,35,95,.14);border-radius:999px;padding:12px 16px;min-width:340px}
    button.btn{border:0;border-radius:999px;min-height:44px;padding:10px 18px;background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);color:white;font-weight:950;cursor:pointer}
    .table-wrap{overflow:auto}
    table{width:100%;min-width:850px;border-collapse:collapse}
    th{background:#fff7fd;color:#68235f;text-transform:uppercase;letter-spacing:.12em;font-size:13px;text-align:left;padding:16px}
    td{padding:16px;border-bottom:1px solid rgba(104,35,95,.10);vertical-align:top}
    .badge{display:inline-flex;border-radius:999px;padding:7px 12px;background:#fff1fa;color:#68235f;font-weight:950;font-size:13px}
    @media(max-width:900px){.layout{display:block}main{padding:24px 14px}aside{border-radius:0 0 26px 26px}input{min-width:0;width:100%}.toolbar{display:grid}}
  </style>
</head>
<body>
<div class="layout">
  <aside>
    <h2>FemiFresh<br>Admin</h2>
    <a href="/admin/dashboard.html">Dashboard</a>
    <a href="/admin/orders.html">Orders</a>
    <a class="active" href="/admin/joining-fees.html">Joining Fees</a>
    <button onclick="logout()">Logout</button>
  </aside>

  <main>
    <p style="font-weight:900;color:#6f6372;margin:0 0 8px">Limited Admin</p>
    <h1>Joining Fees</h1>

    <div class="card">
      <div class="toolbar">
        <input id="search" placeholder="Search name, email, phone, code..." oninput="render()">
        <button class="btn" onclick="load()">Refresh</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Code</th>
              <th>Joining Fee</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="body"></tbody>
        </table>
      </div>
    </div>
  </main>
</div>

<script>
let affiliates = [];

async function api(url, opts={}){
  const res = await fetch(url, {
    credentials:"include",
    headers:{"Content-Type":"application/json"},
    ...opts
  });

  if(res.status === 401 || res.status === 403){
    location.href = "/admin/login.html";
    return {};
  }

  return res.json().catch(()=>({}));
}

async function load(){
  const data = await api("/api/admin/limited/joining-fees");
  affiliates = data.affiliates || [];
  render();
}

function render(){
  const q = (search.value || "").toLowerCase();

  const rows = affiliates.filter(a => JSON.stringify(a).toLowerCase().includes(q));

  body.innerHTML = rows.map(a => {
    const name = a.fullName || a.name || [a.firstName,a.lastName].filter(Boolean).join(" ") || "Affiliate";
    const status = a.joiningFeeStatus || a.paymentStatus || a.accountStatus || "pending";

    return \`
      <tr>
        <td><strong>\${name}</strong><br><small>\${a.createdAt || ""}</small></td>
        <td>\${a.email || ""}</td>
        <td>\${a.phone || ""}</td>
        <td><strong>\${a.referralCode || a.code || ""}</strong></td>
        <td><span class="badge">\${status}</span><br><small>R100 joining fee</small></td>
        <td><button class="btn" onclick="markJoined('\${a.id || a.email}')">Mark Joined</button></td>
      </tr>
    \`;
  }).join("") || '<tr><td colspan="6">No pending joining fees.</td></tr>';
}

async function markJoined(id){
  if(!confirm("Mark this affiliate as joined / R100 paid?")) return;

  const data = await api("/api/admin/limited/affiliates/" + encodeURIComponent(id) + "/mark-joined", {
    method:"POST"
  });

  if(data.success) load();
  else alert(data.message || "Could not mark joined.");
}

async function logout(){
  await fetch("/api/admin/logout", {method:"POST", credentials:"include"}).catch(()=>{});
  location.href = "/admin/login.html";
}

load();
</script>
</body>
</html>`);

/* 2. Add protected limited APIs */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("LIMITED_ADMIN_JOINING_FEES_V1")) {
  const block = `

// LIMITED_ADMIN_JOINING_FEES_V1
function limitedAdminCanUse(req) {
  const user = req.adminUser || req.user || req.admin || {};
  const role = String(user.role || user.type || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "orders_admin" ||
    role === "staff_admin"
  );
}

function joiningFeePaidLimited(a) {
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

function limitedAdminGuard(req, res, next) {
  if (typeof requireAdmin === "function") {
    return requireAdmin(req, res, function(){
      if (!limitedAdminCanUse(req)) {
        return res.status(403).json({success:false,message:"Not allowed."});
      }
      next();
    });
  }
  next();
}

app.get("/api/admin/limited/joining-fees", limitedAdminGuard, (req, res) => {
  const affiliates = read("affiliates", []);

  res.json({
    success:true,
    affiliates: affiliates
      .filter(a => !joiningFeePaidLimited(a))
      .map(a => ({
        id:a.id,
        firstName:a.firstName,
        lastName:a.lastName,
        fullName:a.fullName || a.name || [a.firstName,a.lastName].filter(Boolean).join(" "),
        email:a.email,
        phone:a.phone,
        referralCode:a.referralCode || a.code,
        joiningFeeStatus:a.joiningFeeStatus || a.paymentStatus || a.accountStatus || "pending",
        createdAt:a.createdAt
      }))
  });
});

app.post("/api/admin/limited/affiliates/:id/mark-joined", limitedAdminGuard, (req, res) => {
  const id = req.params.id;
  const affiliates = read("affiliates", []);

  const index = affiliates.findIndex(a =>
    String(a.id || "") === String(id) ||
    String(a.email || "").toLowerCase() === String(id).toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({success:false,message:"Affiliate not found."});
  }

  affiliates[index] = {
    ...affiliates[index],
    joiningFeePaid:true,
    manualJoiningFeePaid:true,
    joiningFeeStatus:"paid",
    paymentStatus:"paid",
    accountStatus:"approved",
    approved:true,
    isApproved:true,
    joined:true,
    joiningFeeAmount: affiliates[index].joiningFeeAmount || 100,
    joiningFeePaidAt: affiliates[index].joiningFeePaidAt || new Date().toISOString(),
    approvedAt: affiliates[index].approvedAt || new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({success:true, affiliate:affiliates[index]});
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

/* 3. Restrict sidebar/menu for orders_admin */
const jsDir = path.join(publicDir, "js");
fs.mkdirSync(jsDir, { recursive: true });

fs.writeFileSync(path.join(jsDir, "limited-admin-menu.js"), `
(function(){
  function getText(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isOrdersAdmin(){
    const text = getText();
    return text.includes("orders admin") || text.includes("orders_admin");
  }

  function cleanMenu(){
    if(!isOrdersAdmin()) return;

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase().trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      const allowed =
        label.includes("dashboard") ||
        label.includes("orders") ||
        label.includes("joining") ||
        label.includes("logout") ||
        href.includes("dashboard") ||
        href.includes("orders") ||
        href.includes("joining-fees");

      if(!allowed){
        a.remove();
      }

      if(label.includes("affiliates") || href.includes("affiliates")){
        a.innerText = "Joining Fees";
        a.setAttribute("href", "/admin/joining-fees.html");
      }
    });

    document.querySelectorAll("aside, .sidebar").forEach(side => {
      if(!side.querySelector('a[href*="joining-fees"]')){
        const link = document.createElement("a");
        link.href = "/admin/joining-fees.html";
        link.textContent = "Joining Fees";
        side.appendChild(link);
      }
    });

    if(location.pathname.includes("/admin/affiliates")){
      location.replace("/admin/joining-fees.html");
    }
  }

  document.addEventListener("DOMContentLoaded", cleanMenu);
  setTimeout(cleanMenu, 500);
  setTimeout(cleanMenu, 1500);
})();
`);

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir,item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full,out);
    else if (stat.isFile() && full.endsWith(".html")) out.push(full);
  }
  return out;
}

for (const file of walk(adminDir)) {
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/<script[^>]+limited-admin-menu\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace("</body>", '  <script src="/js/limited-admin-menu.js?v=5000"></script>\n</body>');
  fs.writeFileSync(file, html);
}

console.log("Orders admin limited to Dashboard, Orders and Joining Fees.");
