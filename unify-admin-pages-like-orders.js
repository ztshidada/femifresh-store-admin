const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");
const cssFile = path.join(publicDir, "css", "femifresh-admin-premium.css");

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

let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("ADMIN_ORDERS_STYLE_UNIFIED_V1")) {
  css += `

/* ADMIN_ORDERS_STYLE_UNIFIED_V1 */

/* Make every admin page feel like the Orders page */
body{
  background:
    radial-gradient(circle at 8% 10%, rgba(244,167,216,.28), transparent 28%),
    radial-gradient(circle at 92% 14%, rgba(104,35,95,.13), transparent 28%),
    linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7) !important;
}

/* sidebar fixed clean */
.sidebar,
aside,
.ff-admin-sidebar{
  width:280px !important;
  min-width:280px !important;
  background:linear-gradient(180deg,#220825,#421041,#68235f) !important;
  padding:28px 26px !important;
}

.sidebar img,
aside img,
.ff-admin-sidebar img{
  width:56px !important;
  height:56px !important;
  object-fit:cover !important;
  border-radius:18px !important;
  box-shadow:0 14px 30px rgba(255,255,255,.12) !important;
}

.sidebar a,
aside a,
.ff-admin-sidebar a{
  display:flex !important;
  align-items:center !important;
  min-height:48px !important;
  padding:12px 16px !important;
  margin:6px 0 !important;
  border-radius:18px !important;
  font-weight:950 !important;
  line-height:1.15 !important;
  color:white !important;
  text-decoration:none !important;
}

.sidebar a:hover,
aside a:hover,
.ff-admin-sidebar a:hover{
  background:rgba(255,255,255,.14) !important;
}

.sidebar a.active,
aside a.active,
.ff-admin-sidebar a.active,
.sidebar a[aria-current="page"],
aside a[aria-current="page"]{
  background:#fff1fa !important;
  color:#68235f !important;
}

/* main admin area */
.main,
.content,
.admin-main,
.ff-admin-main,
body > main{
  padding:56px 58px !important;
  max-width:none !important;
  width:calc(100% - 280px) !important;
  margin-left:0 !important;
}

/* headings like orders page */
.main > h1,
.content > h1,
.admin-main > h1,
.ff-admin-main > h1,
body > main > h1{
  font-size:clamp(54px,7vw,86px) !important;
  line-height:.9 !important;
  letter-spacing:-.075em !important;
  margin:0 0 36px !important;
  color:#35112f !important;
}

/* small label above titles */
.main > p:first-child,
.content > p:first-child,
.admin-main > p:first-child,
.ff-admin-main > p:first-child{
  color:#6f6372 !important;
  font-weight:900 !important;
  margin-bottom:8px !important;
}

/* cards/panels must look same as orders */
.card,
.panel,
.stat-card,
.metric,
.box,
.table-card,
.form-card,
.admin-card,
section,
form{
  background:rgba(255,255,255,.92) !important;
  border:1px solid rgba(104,35,95,.14) !important;
  border-radius:28px !important;
  box-shadow:0 18px 46px rgba(104,35,95,.08) !important;
}

/* form cards same spacing */
form,
.form-card,
.panel form,
.card form{
  padding:28px !important;
}

/* Product add form like orders card */
input,
select,
textarea{
  min-height:54px !important;
  border-radius:16px !important;
  border:1px solid rgba(104,35,95,.14) !important;
  padding:14px 16px !important;
  font-size:16px !important;
  background:white !important;
}

textarea{
  min-height:82px !important;
}

/* buttons consistent */
button,
.btn,
.button,
input[type="submit"],
a.button{
  min-height:52px !important;
  border-radius:999px !important;
  padding:13px 22px !important;
  background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8) !important;
  color:white !important;
  border:0 !important;
  font-weight:950 !important;
  text-decoration:none !important;
  box-shadow:0 14px 30px rgba(104,35,95,.14) !important;
}

/* tables like orders page */
.table-card,
.table-wrap,
section:has(table){
  padding:28px !important;
  overflow-x:auto !important;
}

table{
  width:100% !important;
  border-collapse:collapse !important;
}

th{
  color:#68235f !important;
  background:#fff7fd !important;
  font-size:13px !important;
  letter-spacing:.15em !important;
  text-transform:uppercase !important;
  font-weight:950 !important;
  padding:18px 16px !important;
  border-bottom:1px solid rgba(104,35,95,.14) !important;
}

td{
  padding:18px 16px !important;
  border-bottom:1px solid rgba(104,35,95,.10) !important;
  vertical-align:top !important;
}

tr:hover td{
  background:#fff7fd !important;
}

/* stat cards like orders */
.stats,
.metrics,
.dashboard-cards,
.cards,
.grid{
  display:grid !important;
  grid-template-columns:repeat(4,minmax(0,1fr)) !important;
  gap:18px !important;
  margin:24px 0 28px !important;
}

.stat-card,
.metric{
  padding:24px !important;
  min-height:116px !important;
}

.stat-card h3,
.metric h3,
.stat-card p,
.metric p{
  color:#6f6372 !important;
  margin:0 0 12px !important;
  font-weight:900 !important;
}

.stat-card strong,
.metric strong,
.stat-card .value,
.metric .value{
  color:#68235f !important;
  font-size:34px !important;
  font-weight:950 !important;
}

/* search/filter row like orders */
.filters,
.toolbar,
.actions,
.topbar{
  display:flex !important;
  align-items:center !important;
  gap:12px !important;
  margin:18px 0 !important;
  flex-wrap:wrap !important;
}

.filters input,
.toolbar input,
.actions input,
.topbar input{
  max-width:420px !important;
  border-radius:999px !important;
}

/* badges */
.badge,
.status,
.pill,
.tag{
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  border-radius:999px !important;
  padding:7px 13px !important;
  font-weight:950 !important;
  font-size:13px !important;
}

/* prevent right side cutting on affiliates table */
body:has(table) .content,
body:has(table) .main,
body:has(table) .admin-main{
  overflow-x:hidden !important;
}

table{
  min-width:900px !important;
}

/* make open buttons visible */
td:last-child,
th:last-child{
  min-width:110px !important;
  padding-right:28px !important;
}

td:last-child button,
td:last-child a{
  white-space:nowrap !important;
}

/* products page better spacing */
input[placeholder*="Product name"],
input[placeholder*="Category"],
input[placeholder*="Price"],
input[placeholder*="Stock"]{
  margin-bottom:10px !important;
}

form button,
#addProduct,
button[type="submit"]{
  width:100% !important;
  margin-top:10px !important;
}

/* mobile admin */
@media(max-width:900px){
  .sidebar,
  aside,
  .ff-admin-sidebar{
    width:100% !important;
    min-width:0 !important;
    position:relative !important;
    padding:20px !important;
    border-radius:0 0 26px 26px !important;
  }

  .main,
  .content,
  .admin-main,
  .ff-admin-main,
  body > main{
    width:100% !important;
    padding:24px 14px 50px !important;
  }

  .main > h1,
  .content > h1,
  .admin-main > h1,
  .ff-admin-main > h1,
  body > main > h1{
    font-size:clamp(42px,12vw,62px) !important;
  }

  .stats,
  .metrics,
  .dashboard-cards,
  .cards,
  .grid{
    grid-template-columns:1fr !important;
  }

  .filters,
  .toolbar,
  .actions,
  .topbar{
    display:grid !important;
    grid-template-columns:1fr !important;
  }

  input,
  select,
  textarea,
  button,
  .btn,
  .button{
    width:100% !important;
  }

  table{
    min-width:860px !important;
  }
}
`;
}

fs.writeFileSync(cssFile, css);

/* make sure all admin pages load premium css */
const files = walk(adminDir);

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<link[^>]+femifresh-admin-premium\.css[^>]*>\s*/gi, "");

  if (html.includes("</head>")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femifresh-admin-premium.css?v=4100">\n</head>');
  }

  fs.writeFileSync(file, html);
  console.log("Unified admin style:", path.relative(publicDir, file));
}

console.log("All admin pages now use the same Orders-style layout.");
