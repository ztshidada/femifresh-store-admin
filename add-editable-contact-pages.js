const fs = require("fs");
const path = require("path");

const dbFile = path.join(__dirname, "src", "db.js");
const serverFile = path.join(__dirname, "server.js");
const adminCssFile = path.join(__dirname, "public", "admin", "css", "admin.css");
const siteCssFile = path.join(__dirname, "public", "css", "style.css");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

/* 1) Add settings table to db */
let db = read(dbFile);

if (!db.includes("CREATE TABLE IF NOT EXISTS settings")) {
  db = db.replace(
    /CREATE TABLE IF NOT EXISTS email_logs[\s\S]*?\);/,
    match => match + `

db.prepare(\`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
\`).run();

const defaultSettings = {
  contact_email: "info@femifresh.co.za",
  contact_phone: "+27 00 000 0000",
  contact_whatsapp: "+27 00 000 0000",
  contact_address: "South Africa",
  business_hours: "Monday to Saturday, 08:00 - 17:00",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: ""
};

for (const [key, value] of Object.entries(defaultSettings)) {
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
`
  );
  write(dbFile, db);
}

/* 2) Add backend settings routes */
let server = read(serverFile);

if (!server.includes("app.get('/api/settings/public'")) {
  server = server.replace(
    /app.use\(express\.static\(path\.join\(__dirname, "public"\)\)\);/,
    `app.use(express.static(path.join(__dirname, "public")));

app.get('/api/settings/public', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  rows.forEach(row => settings[row.key] = row.value);
  res.json({ success: true, settings });
});

app.get('/api/admin/settings', requireAdmin, requireRole(["super_admin"]), (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  rows.forEach(row => settings[row.key] = row.value);
  res.json({ success: true, settings });
});

app.post('/api/admin/settings', requireAdmin, requireRole(["super_admin"]), (req, res) => {
  const settings = req.body || {};
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const allowed = [
    "contact_email",
    "contact_phone",
    "contact_whatsapp",
    "contact_address",
    "business_hours",
    "facebook_url",
    "instagram_url",
    "tiktok_url"
  ];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      stmt.run(key, String(settings[key] || ""));
    }
  }

  res.json({ success: true, message: "Settings updated" });
});`
  );
  write(serverFile, server);
}

/* 3) Better contact page */
const contactPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>

    <nav class="main-nav" id="mainNav">
      <a href="index.html">Home</a>
      <a href="products.html">Products</a>
      <a href="policies.html">Policies</a>
      <a href="contact.html">Contact</a>
      <a class="cart-pill" href="cart.html">Cart (<span id="cartCount">0</span>)</a>
    </nav>

    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">WE ARE HERE TO HELP</p>
      <h1>Contact FemiFresh</h1>
      <p>Need help with an order, product information or distributor support? Reach out to us and our team will assist you.</p>
    </div>
  </section>

  <section class="container contact-grid">
    <div class="contact-card">
      <div class="contact-icon">💬</div>
      <h2>WhatsApp Us</h2>
      <p>Fast support for orders, delivery and product questions.</p>
      <a class="primary-btn full-btn" id="whatsappBtn" target="_blank" rel="noopener">Chat on WhatsApp</a>
    </div>

    <div class="contact-card">
      <div class="contact-icon">📧</div>
      <h2>Email</h2>
      <p id="contactEmail">Loading...</p>
    </div>

    <div class="contact-card">
      <div class="contact-icon">📞</div>
      <h2>Phone</h2>
      <p id="contactPhone">Loading...</p>
    </div>

    <div class="contact-card">
      <div class="contact-icon">📍</div>
      <h2>Location</h2>
      <p id="contactAddress">Loading...</p>
    </div>
  </section>

  <section class="container support-panel">
    <div>
      <p class="eyebrow">BUSINESS HOURS</p>
      <h2 id="businessHours">Loading...</h2>
      <p>Send your message anytime. We will respond as soon as possible during working hours.</p>
    </div>

    <div class="social-box">
      <h3>Follow FemiFresh</h3>
      <div class="social-links">
        <a id="facebookLink" target="_blank" rel="noopener">Facebook</a>
        <a id="instagramLink" target="_blank" rel="noopener">Instagram</a>
        <a id="tiktokLink" target="_blank" rel="noopener">TikTok</a>
      </div>
    </div>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
<script>
async function loadContactSettings() {
  const res = await fetch("/api/settings/public");
  const data = await res.json();
  const s = data.settings || {};

  const email = s.contact_email || "info@femifresh.co.za";
  const phone = s.contact_phone || "+27 00 000 0000";
  const whatsapp = s.contact_whatsapp || phone;
  const address = s.contact_address || "South Africa";
  const hours = s.business_hours || "Monday to Saturday, 08:00 - 17:00";

  document.getElementById("contactEmail").innerHTML = '<a href="mailto:' + email + '">' + email + '</a>';
  document.getElementById("contactPhone").innerHTML = '<a href="tel:' + phone.replace(/\\s/g, "") + '">' + phone + '</a>';
  document.getElementById("contactAddress").textContent = address;
  document.getElementById("businessHours").textContent = hours;

  const cleanWhatsApp = whatsapp.replace(/[^0-9]/g, "");
  document.getElementById("whatsappBtn").href = "https://wa.me/" + cleanWhatsApp + "?text=" + encodeURIComponent("Hi FemiFresh, I need help.");

  const links = [
    ["facebookLink", s.facebook_url],
    ["instagramLink", s.instagram_url],
    ["tiktokLink", s.tiktok_url]
  ];

  links.forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (url) {
      el.href = url;
      el.style.display = "inline-flex";
    } else {
      el.style.display = "none";
    }
  });
}
loadContactSettings();
</script>
</body>
</html>`;

write(path.join(__dirname, "public", "contact.html"), contactPage);

/* 4) Better policies page */
const policiesPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Policies - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>

    <nav class="main-nav" id="mainNav">
      <a href="index.html">Home</a>
      <a href="products.html">Products</a>
      <a href="policies.html">Policies</a>
      <a href="contact.html">Contact</a>
      <a class="cart-pill" href="cart.html">Cart (<span id="cartCount">0</span>)</a>
    </nav>

    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">STORE INFORMATION</p>
      <h1>FemiFresh Store Policies</h1>
      <p>Clear shopping rules for orders, payments, delivery, refunds and customer privacy.</p>
    </div>
  </section>

  <section class="container policy-layout">
    <article class="policy-card">
      <span>01</span>
      <h2>Shipping & Delivery</h2>
      <p>Orders are processed after payment confirmation. Delivery fees and methods are managed from the admin panel. Customers will receive updates once the order is packed and fulfilled.</p>
    </article>

    <article class="policy-card">
      <span>02</span>
      <h2>Refunds & Returns</h2>
      <p>Refund requests are reviewed according to product condition, proof of purchase and store policy. Opened personal-care products may not qualify for return due to hygiene reasons.</p>
    </article>

    <article class="policy-card">
      <span>03</span>
      <h2>Payments</h2>
      <p>Online payments are confirmed through the payment provider. Orders are only fulfilled after successful payment confirmation or approved manual verification.</p>
    </article>

    <article class="policy-card">
      <span>04</span>
      <h2>Privacy</h2>
      <p>Customer information is used only for orders, delivery, customer support and business communication. We do not sell customer personal information.</p>
    </article>

    <article class="policy-card">
      <span>05</span>
      <h2>Order Fulfilment</h2>
      <p>Once an order is paid, the fulfilment team will prepare, pack and dispatch the products based on the selected delivery method.</p>
    </article>

    <article class="policy-card">
      <span>06</span>
      <h2>Distributor Support</h2>
      <p>Distributor and affiliate support is managed separately from store orders. Store admins handle orders only, while the support/admin team handles business-related support.</p>
    </article>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
</body>
</html>`;

write(path.join(__dirname, "public", "policies.html"), policiesPage);

/* 5) Admin settings page */
const settingsPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - FemiFresh Admin</title>
  <link rel="stylesheet" href="/admin/css/admin.css">
</head>
<body>
<div class="admin-shell">
  <aside class="sidebar">
    <h2>FemiFresh</h2>
    <a href="/admin/dashboard.html">Dashboard</a>
    <a href="/admin/orders.html">Orders</a>
    <a href="/admin/products.html" data-super-only>Products</a>
    <a href="/admin/delivery.html" data-super-only>Delivery</a>
    <a href="/admin/users.html" data-super-only>Users</a>
    <a href="/admin/logs.html" data-super-only>Logs</a>
    <a href="/admin/settings.html" data-super-only>Settings</a>
    <button id="logoutBtn">Logout</button>
  </aside>

  <main class="admin-main">
    <div class="admin-top">
      <div>
        <p class="muted">Super Admin Only</p>
        <h1>Website Settings</h1>
      </div>
    </div>

    <section class="panel">
      <h2>Contact Information</h2>
      <p class="muted">This information updates the public Contact page automatically.</p>

      <form id="settingsForm" class="admin-form">
        <label>Email
          <input name="contact_email" type="email" placeholder="info@femifresh.co.za">
        </label>

        <label>Phone
          <input name="contact_phone" type="text" placeholder="+27 00 000 0000">
        </label>

        <label>WhatsApp Number
          <input name="contact_whatsapp" type="text" placeholder="+27 00 000 0000">
        </label>

        <label>Address / Area
          <input name="contact_address" type="text" placeholder="South Africa">
        </label>

        <label>Business Hours
          <input name="business_hours" type="text" placeholder="Monday to Saturday, 08:00 - 17:00">
        </label>

        <label>Facebook URL
          <input name="facebook_url" type="url" placeholder="https://facebook.com/...">
        </label>

        <label>Instagram URL
          <input name="instagram_url" type="url" placeholder="https://instagram.com/...">
        </label>

        <label>TikTok URL
          <input name="tiktok_url" type="url" placeholder="https://tiktok.com/@...">
        </label>

        <button class="primary" type="submit">Save Settings</button>
      </form>
    </section>
  </main>
</div>

<script src="/admin/js/admin.js"></script>
<script>
async function loadSettings() {
  const token = localStorage.getItem("femifresh_admin_token");
  const res = await fetch("/api/admin/settings", {
    headers: { Authorization: "Bearer " + token }
  });

  if (res.status === 403) {
    alert("Only Super Admin can access settings.");
    window.location.href = "/admin/orders.html";
    return;
  }

  const data = await res.json();
  const s = data.settings || {};

  document.querySelectorAll("#settingsForm [name]").forEach(input => {
    input.value = s[input.name] || "";
  });
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("femifresh_admin_token");
  const body = {};
  new FormData(e.target).forEach((value, key) => body[key] = value);

  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.success) {
    alert("Settings saved successfully.");
  } else {
    alert(data.message || "Failed to save settings.");
  }
});

loadSettings();
</script>
</body>
</html>`;

write(path.join(__dirname, "public", "admin", "settings.html"), settingsPage);

/* 6) Add Settings link to admin pages */
const adminPages = ["dashboard.html", "orders.html", "products.html", "delivery.html", "users.html", "logs.html"];
for (const page of adminPages) {
  const file = path.join(__dirname, "public", "admin", page);
  if (!fs.existsSync(file)) continue;

  let html = read(file);

  if (!html.includes('/admin/settings.html')) {
    html = html.replace(
      '<a href="/admin/logs.html" data-super-only>Logs</a>',
      '<a href="/admin/logs.html" data-super-only>Logs</a>\n    <a href="/admin/settings.html" data-super-only>Settings</a>'
    );
  }

  write(file, html);
}

/* 7) CSS upgrades */
if (!read(siteCssFile).includes("contact-grid")) {
  fs.appendFileSync(siteCssFile, `

/* ===== Professional page upgrades ===== */
.page-hero {
  background: linear-gradient(135deg, #6b1f64, #e85bb8);
  color: white;
  padding: 80px 0;
}

.small-hero {
  padding: 70px 0;
}

.page-hero h1 {
  font-size: clamp(34px, 6vw, 64px);
  line-height: 1;
  margin: 12px 0;
}

.page-hero p {
  max-width: 720px;
  font-size: 17px;
  opacity: 0.95;
}

.eyebrow {
  letter-spacing: 4px;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-top: -36px;
  position: relative;
  z-index: 2;
}

.contact-card,
.support-panel,
.policy-card {
  background: white;
  border: 1px solid rgba(107, 31, 100, 0.12);
  box-shadow: 0 20px 45px rgba(107, 31, 100, 0.10);
  border-radius: 26px;
  padding: 26px;
}

.contact-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: #f8e7f5;
  font-size: 24px;
  margin-bottom: 14px;
}

.contact-card h2 {
  margin-bottom: 8px;
}

.contact-card a {
  color: #6b1f64;
  font-weight: 900;
  text-decoration: none;
}

.primary-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  background: #6b1f64;
  color: white !important;
  padding: 14px 20px;
  border-radius: 999px;
  font-weight: 900;
  text-decoration: none;
}

.full-btn {
  width: 100%;
  margin-top: 10px;
}

.support-panel {
  margin-top: 22px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}

.social-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.social-links a {
  background: #f8e7f5;
  color: #6b1f64;
  padding: 10px 14px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 900;
}

.policy-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: -36px;
  position: relative;
  z-index: 2;
}

.policy-card span {
  display: inline-flex;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: #6b1f64;
  color: white;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  margin-bottom: 18px;
}

.policy-card h2 {
  margin-bottom: 10px;
}

.policy-card p {
  color: #5d4b5f;
  line-height: 1.7;
}

@media (max-width: 950px) {
  .contact-grid,
  .policy-layout {
    grid-template-columns: repeat(2, 1fr);
  }

  .support-panel {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .contact-grid,
  .policy-layout {
    grid-template-columns: 1fr;
  }

  .page-hero {
    padding: 55px 0;
  }
}
`);
}

if (!read(adminCssFile).includes("admin-form")) {
  fs.appendFileSync(adminCssFile, `

.admin-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.admin-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 800;
  color: #2b1730;
}

.admin-form input {
  border: 1px solid rgba(107, 31, 100, 0.18);
  border-radius: 14px;
  padding: 13px 14px;
  font: inherit;
}

.admin-form button {
  grid-column: 1 / -1;
  width: fit-content;
}

@media (max-width: 760px) {
  .admin-form {
    grid-template-columns: 1fr;
  }
}
`);
}

console.log("Done: contact page, policies page, WhatsApp button and editable admin settings added.");
