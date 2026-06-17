const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");
const cssDir = path.join(publicDir, "css");

fs.mkdirSync(cssDir, { recursive: true });

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

/* Admin CSS that matches main store + affiliate style */
fs.writeFileSync(path.join(cssDir, "femifresh-admin-premium.css"), `
/* FEMIFRESH_ADMIN_PREMIUM_V1 */
:root{
  --ff-purple:#68235f;
  --ff-deep:#240c25;
  --ff-dark:#19091b;
  --ff-pink:#f4a7d8;
  --ff-soft:#fff7fd;
  --ff-line:rgba(104,35,95,.14);
  --ff-muted:#6f6372;
}

*{
  box-sizing:border-box;
}

html,
body{
  max-width:100%;
  overflow-x:hidden;
}

body{
  margin:0 !important;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif !important;
  color:#241126 !important;
  background:
    radial-gradient(circle at 8% 12%,rgba(244,167,216,.30),transparent 28%),
    radial-gradient(circle at 90% 16%,rgba(104,35,95,.12),transparent 26%),
    linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7) !important;
}

/* Main admin layout */
.admin-shell,
.ff-admin-layout,
body{
  min-height:100vh;
}

/* Sidebar */
.sidebar,
.ff-admin-sidebar,
aside{
  background:linear-gradient(180deg,#240c25,#421041,#68235f) !important;
  color:white !important;
  border-right:1px solid rgba(255,255,255,.10) !important;
  box-shadow:18px 0 55px rgba(104,35,95,.18) !important;
}

.sidebar h1,
.sidebar h2,
.sidebar h3,
.sidebar .logo,
.ff-admin-sidebar h1,
.ff-admin-sidebar h2,
.ff-admin-sidebar h3,
.ff-admin-logo{
  color:white !important;
  letter-spacing:-.05em !important;
}

.sidebar a,
.ff-admin-sidebar a,
aside a{
  color:rgba(255,255,255,.90) !important;
  font-weight:850 !important;
  text-decoration:none !important;
  border-radius:14px !important;
  transition:background .15s ease, transform .15s ease !important;
}

.sidebar a:hover,
.ff-admin-sidebar a:hover,
aside a:hover{
  background:rgba(255,255,255,.12) !important;
  transform:translateX(3px);
}

/* Admin content */
.main,
.ff-admin-main,
.content,
.admin-main{
  background:transparent !important;
  color:#241126 !important;
  min-width:0 !important;
}

/* Headings */
h1{
  color:#35112f !important;
  font-size:clamp(42px,6vw,72px) !important;
  letter-spacing:-.07em !important;
  line-height:.95 !important;
}

h2{
  color:#35112f !important;
  font-size:clamp(28px,4vw,42px) !important;
  letter-spacing:-.05em !important;
}

h3{
  color:#35112f !important;
}

/* Cards / panels */
.card,
.panel,
.stat-card,
.metric,
.box,
.table-card,
.form-card,
.admin-card,
section{
  border-radius:26px !important;
  border:1px solid var(--ff-line) !important;
  background:rgba(255,255,255,.90) !important;
  box-shadow:0 18px 45px rgba(104,35,95,.08) !important;
}

/* Stats */
.stats,
.ff-admin-grid{
  gap:18px !important;
}

.stat-card,
.metric{
  padding:24px !important;
}

.stat-card strong,
.metric strong,
.stat-card .value,
.metric .value{
  color:var(--ff-purple) !important;
  font-size:30px !important;
  font-weight:950 !important;
}

/* Tables */
.table-wrap,
.ff-table-scroll{
  width:100% !important;
  overflow-x:auto !important;
  -webkit-overflow-scrolling:touch !important;
  border-radius:22px !important;
}

table{
  width:100% !important;
  border-collapse:collapse !important;
}

thead th,
th{
  color:var(--ff-purple) !important;
  font-size:13px !important;
  letter-spacing:.12em !important;
  text-transform:uppercase !important;
  font-weight:950 !important;
  background:rgba(255,241,250,.70) !important;
  border-bottom:1px solid var(--ff-line) !important;
}

td{
  border-bottom:1px solid rgba(104,35,95,.10) !important;
  color:#241126 !important;
  vertical-align:top !important;
}

tr:hover td{
  background:rgba(255,241,250,.50) !important;
}

/* Badges */
.badge,
.status,
.pill,
.tag{
  border-radius:999px !important;
  padding:7px 12px !important;
  font-weight:900 !important;
}

.badge.paid,
.status.paid,
.paid{
  background:#f7d9ef !important;
  color:#68235f !important;
}

.badge.pending,
.status.pending,
.pending{
  background:#fff1fa !important;
  color:#68235f !important;
}

.badge.active,
.status.active,
.active{
  background:#f7d9ef !important;
  color:#68235f !important;
}

.badge.inactive,
.status.inactive,
.inactive{
  background:#f2edf3 !important;
  color:#6f6372 !important;
}

/* Inputs */
input,
select,
textarea{
  border:1px solid var(--ff-line) !important;
  border-radius:16px !important;
  min-height:50px !important;
  padding:12px 15px !important;
  background:white !important;
  color:#241126 !important;
  outline:none !important;
  font-size:16px !important;
}

input:focus,
select:focus,
textarea:focus{
  border-color:rgba(104,35,95,.40) !important;
  box-shadow:0 0 0 4px rgba(244,167,216,.20) !important;
}

/* Buttons */
button,
.btn,
.button,
a.button,
input[type="submit"]{
  border:0 !important;
  border-radius:999px !important;
  min-height:46px !important;
  padding:12px 18px !important;
  background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8) !important;
  color:white !important;
  font-weight:950 !important;
  cursor:pointer !important;
  text-decoration:none !important;
  box-shadow:0 14px 30px rgba(104,35,95,.14) !important;
}

button:hover,
.btn:hover,
.button:hover{
  filter:brightness(.98);
  transform:translateY(-1px);
}

/* Keep dangerous/delete buttons red */
button[style*="red"],
button[style*="#b00020"],
.delete,
.danger{
  background:#b00020 !important;
  color:white !important;
}

/* Admin top area */
.top,
.topbar,
.ff-admin-top,
.toolbar{
  gap:14px !important;
  align-items:center !important;
}

/* Search */
.search,
input[type="search"],
input[placeholder*="Search"],
input[placeholder*="search"]{
  border-radius:999px !important;
  background:white !important;
}

/* Fix affiliate admin table right side cutting */
table td:last-child,
table th:last-child{
  padding-right:22px !important;
}

.open-btn,
a[href*="affiliate-profile"],
a[href*="order-detail"]{
  white-space:nowrap !important;
}

/* Mobile */
@media(max-width:900px){
  body{
    overflow-x:hidden !important;
  }

  .admin-shell,
  .ff-admin-layout{
    display:block !important;
  }

  .sidebar,
  .ff-admin-sidebar,
  aside{
    width:100% !important;
    height:auto !important;
    position:relative !important;
    padding:18px !important;
    border-radius:0 0 26px 26px !important;
    box-shadow:0 18px 45px rgba(104,35,95,.16) !important;
  }

  .sidebar h1,
  .sidebar h2,
  .ff-admin-logo{
    font-size:28px !important;
    margin-bottom:14px !important;
  }

  .sidebar nav,
  .ff-admin-menu,
  .menu{
    display:grid !important;
    grid-template-columns:1fr 1fr !important;
    gap:8px !important;
  }

  .sidebar a,
  .ff-admin-sidebar a,
  aside a{
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    min-height:42px !important;
    padding:10px !important;
    font-size:14px !important;
    background:rgba(255,255,255,.08) !important;
  }

  .main,
  .ff-admin-main,
  .content,
  .admin-main{
    padding:20px 14px 44px !important;
    width:100% !important;
  }

  h1{
    font-size:clamp(38px,12vw,58px) !important;
  }

  h2{
    font-size:clamp(28px,9vw,40px) !important;
  }

  .stats,
  .ff-admin-grid,
  .grid,
  .cards{
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:14px !important;
  }

  .card,
  .panel,
  .table-card,
  .form-card,
  section{
    padding:20px !important;
    border-radius:24px !important;
  }

  .toolbar,
  .top,
  .topbar{
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:12px !important;
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
    min-width:820px !important;
  }

  th,
  td{
    padding:12px !important;
    font-size:14px !important;
  }
}

@media(max-width:430px){
  .sidebar nav,
  .ff-admin-menu,
  .menu{
    grid-template-columns:1fr !important;
  }
}
`);

/* Inject into all admin pages */
const files = walk(adminDir);

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<link[^>]+femifresh-admin-premium\.css[^>]*>\s*/gi, "");

  if (html.includes("</head>")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/femifresh-admin-premium.css">\n</head>');
  }

  fs.writeFileSync(file, html);
  console.log("Admin premium style applied:", path.relative(publicDir, file));
}

console.log("Admin pages now match FemiFresh premium style.");
