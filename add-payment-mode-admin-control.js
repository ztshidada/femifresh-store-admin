const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const jsDir = path.join(publicDir, "js");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

/* 1) Add payment settings API to server.js */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("FEMIFRESH_PAYMENT_SETTINGS_CONTROL_V1")) {
  const block = `

// FEMIFRESH_PAYMENT_SETTINGS_CONTROL_V1
function femiDefaultPaymentSettings() {
  return {
    manualAffiliateJoiningFeeEnabled: true,
    yocoAffiliateJoiningFeeEnabled: false,
    manualPaymentButtonEnabled: true,
    joiningFeeAmount: 100,
    manualPaymentEmail: "femifresh02@gmail.com",
    manualPaymentInstruction: "Pay the once-off R100 joining fee manually and email proof of payment to femifresh02@gmail.com. Use your registered affiliate email as reference."
  };
}

function femiGetPaymentSettings() {
  const settings = read("settings", {});
  return {
    ...femiDefaultPaymentSettings(),
    ...(settings.paymentSettings || {})
  };
}

function femiSimpleAdminCookieCheck(req, res, next) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader.includes("ff_admin_token=")) {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  next();
}

app.get("/api/payment-settings", (req, res) => {
  res.json({
    success: true,
    settings: femiGetPaymentSettings()
  });
});

app.get("/api/admin/payment-settings", femiSimpleAdminCookieCheck, (req, res) => {
  res.json({
    success: true,
    settings: femiGetPaymentSettings()
  });
});

app.post("/api/admin/payment-settings", femiSimpleAdminCookieCheck, (req, res) => {
  const settings = read("settings", {});
  const current = femiGetPaymentSettings();

  settings.paymentSettings = {
    ...current,
    manualAffiliateJoiningFeeEnabled: !!req.body.manualAffiliateJoiningFeeEnabled,
    yocoAffiliateJoiningFeeEnabled: !!req.body.yocoAffiliateJoiningFeeEnabled,
    manualPaymentButtonEnabled: !!req.body.manualPaymentButtonEnabled,
    joiningFeeAmount: Number(req.body.joiningFeeAmount || 100),
    manualPaymentEmail: String(req.body.manualPaymentEmail || "femifresh02@gmail.com").trim(),
    manualPaymentInstruction: String(req.body.manualPaymentInstruction || current.manualPaymentInstruction).trim()
  };

  write("settings", settings);

  res.json({
    success: true,
    settings: settings.paymentSettings
  });
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) {
    throw new Error("Could not find app.listen in server.js");
  }

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
  console.log("Payment settings API added.");
} else {
  console.log("Payment settings API already exists.");
}

/* 2) Admin payment settings page */
fs.writeFileSync(path.join(adminDir, "payment-settings.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Settings | FemiFresh Admin</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    :root{
      --p:#68235f;
      --d:#35112f;
      --pink:#f4a7d8;
      --bg:#f7f2f8;
      --line:#eaddea;
      --muted:#6f6372;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:var(--bg);color:#241126}
    .shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
    aside{background:#19091b;color:white;padding:24px}
    .logo{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:950;margin-bottom:34px}
    .logo img{width:52px;height:52px;object-fit:cover;border-radius:18px}
    nav{display:grid;gap:8px}
    nav a{color:rgba(255,255,255,.82);padding:13px 14px;border-radius:16px;font-weight:850;text-decoration:none}
    nav a:hover,.active{background:rgba(255,255,255,.12);color:white}
    main{padding:34px}
    h1{font-size:clamp(42px,5vw,72px);letter-spacing:-.07em;line-height:.95;margin:0 0 8px;color:var(--d)}
    p{color:var(--muted);line-height:1.65}
    .card{background:white;border:1px solid var(--line);border-radius:28px;box-shadow:0 18px 44px rgba(104,35,95,.08);padding:26px;max-width:900px}
    .row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--line)}
    .row:last-child{border-bottom:0}
    label{font-weight:900;color:var(--d)}
    small{display:block;color:var(--muted);margin-top:5px}
    input,textarea{width:100%;border:1px solid var(--line);border-radius:16px;padding:14px 16px;font-size:16px}
    textarea{min-height:110px}
    .switch{position:relative;width:62px;height:34px;flex:0 0 auto}
    .switch input{display:none}
    .slider{position:absolute;cursor:pointer;inset:0;background:#ddd;border-radius:999px;transition:.2s}
    .slider:before{content:"";position:absolute;width:26px;height:26px;left:4px;top:4px;background:white;border-radius:50%;transition:.2s;box-shadow:0 4px 10px rgba(0,0,0,.16)}
    .switch input:checked + .slider{background:linear-gradient(135deg,var(--p),#9b358e,var(--pink))}
    .switch input:checked + .slider:before{transform:translateX(28px)}
    .btn{border:0;border-radius:999px;background:linear-gradient(135deg,var(--p),#9b358e,var(--pink));color:white;font-weight:950;padding:14px 22px;cursor:pointer;margin-top:24px}
    .notice{background:#fff1fa;border:1px solid var(--line);border-radius:20px;padding:16px;margin:18px 0;color:#35112f}
    @media(max-width:900px){.shell{display:block}aside{position:relative}main{padding:18px}.row{display:block}.switch{margin-top:12px}}
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="logo"><img src="/images/femifresh-logo.jpg"><span>FemiFresh Admin</span></div>
      <nav>
        <a href="/admin/dashboard.html">Dashboard</a>
        <a href="/admin/orders.html">Orders</a>
        <a href="/admin/affiliates.html">Affiliates</a>
        <a href="/admin/products.html">Products</a>
        <a href="/admin/delivery.html">Delivery</a>
        <a class="active" href="/admin/payment-settings.html">Payment Settings</a>
        <a href="/admin/logs.html">Logs</a>
      </nav>
    </aside>

    <main>
      <h1>Payment Settings</h1>
      <p>Control how affiliates pay the once-off R100 joining fee.</p>

      <div class="notice">
        Recommended while Yoco is reviewing the affiliate subdomain: keep <strong>Manual Payment ON</strong> and <strong>Yoco Payment OFF</strong>.
      </div>

      <section class="card">
        <div class="row">
          <div>
            <label>Show manual payment button</label>
            <small>Shows a button on affiliate join/login pages for R100 manual payment instructions.</small>
          </div>
          <label class="switch">
            <input type="checkbox" id="manualPaymentButtonEnabled">
            <span class="slider"></span>
          </label>
        </div>

        <div class="row">
          <div>
            <label>Manual R100 joining fee enabled</label>
            <small>If ON, affiliate registration will show manual payment instructions instead of redirecting to Yoco.</small>
          </div>
          <label class="switch">
            <input type="checkbox" id="manualAffiliateJoiningFeeEnabled">
            <span class="slider"></span>
          </label>
        </div>

        <div class="row">
          <div>
            <label>Yoco online payment enabled</label>
            <small>If ON, affiliate registration can continue to the Yoco payment flow.</small>
          </div>
          <label class="switch">
            <input type="checkbox" id="yocoAffiliateJoiningFeeEnabled">
            <span class="slider"></span>
          </label>
        </div>

        <div style="margin-top:18px">
          <label>Joining fee amount</label>
          <input id="joiningFeeAmount" type="number" value="100">
        </div>

        <div style="margin-top:18px">
          <label>Manual payment email</label>
          <input id="manualPaymentEmail" value="femifresh02@gmail.com">
        </div>

        <div style="margin-top:18px">
          <label>Manual payment instruction</label>
          <textarea id="manualPaymentInstruction"></textarea>
        </div>

        <button class="btn" onclick="saveSettings()">Save Settings</button>
      </section>
    </main>
  </div>

<script>
async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    alert("Please login as admin first.");
    location.href = "/admin/login.html";
    return {};
  }

  return data;
}

async function loadSettings() {
  const data = await api("/api/admin/payment-settings");
  const s = data.settings || {};

  manualPaymentButtonEnabled.checked = !!s.manualPaymentButtonEnabled;
  manualAffiliateJoiningFeeEnabled.checked = !!s.manualAffiliateJoiningFeeEnabled;
  yocoAffiliateJoiningFeeEnabled.checked = !!s.yocoAffiliateJoiningFeeEnabled;
  joiningFeeAmount.value = s.joiningFeeAmount || 100;
  manualPaymentEmail.value = s.manualPaymentEmail || "femifresh02@gmail.com";
  manualPaymentInstruction.value = s.manualPaymentInstruction || "";
}

async function saveSettings() {
  const body = {
    manualPaymentButtonEnabled: manualPaymentButtonEnabled.checked,
    manualAffiliateJoiningFeeEnabled: manualAffiliateJoiningFeeEnabled.checked,
    yocoAffiliateJoiningFeeEnabled: yocoAffiliateJoiningFeeEnabled.checked,
    joiningFeeAmount: Number(joiningFeeAmount.value || 100),
    manualPaymentEmail: manualPaymentEmail.value,
    manualPaymentInstruction: manualPaymentInstruction.value
  };

  const data = await api("/api/admin/payment-settings", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (data.success) {
    alert("Payment settings saved.");
  } else {
    alert(data.message || "Could not save settings.");
  }
}

loadSettings();
</script>
</body>
</html>`);

/* 3) Safer affiliate payment controller */
fs.writeFileSync(path.join(jsDir, "affiliate-payment-controller.js"), `
(function () {
  let settingsPromise = null;

  function getSettings() {
    if (!settingsPromise) {
      settingsPromise = fetch("/api/payment-settings", { cache: "no-store" })
        .then(r => r.json())
        .then(d => d.settings || {})
        .catch(() => ({
          manualAffiliateJoiningFeeEnabled: true,
          yocoAffiliateJoiningFeeEnabled: false,
          manualPaymentButtonEnabled: true,
          joiningFeeAmount: 100,
          manualPaymentEmail: "femifresh02@gmail.com",
          manualPaymentInstruction: "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference."
        }));
    }
    return settingsPromise;
  }

  function showManualBox(s) {
    if (document.getElementById("ffManualPaymentBox")) return;

    const box = document.createElement("div");
    box.id = "ffManualPaymentBox";
    box.style.cssText =
      "max-width:680px;margin:24px auto;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;box-shadow:0 18px 40px rgba(104,35,95,.10);";

    box.innerHTML =
      "<strong>Manual joining fee payment</strong><br>" +
      (s.manualPaymentInstruction || "Pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com.") +
      "<br><br><strong>Email proof to:</strong> " + (s.manualPaymentEmail || "femifresh02@gmail.com");

    const form = document.querySelector("form");
    if (form && form.parentNode) form.parentNode.insertBefore(box, form.nextSibling);
    else document.body.prepend(box);
  }

  function addManualButton(s) {
    if (!s.manualPaymentButtonEnabled) return;
    if (document.getElementById("ffManualPaymentBtn")) return;

    const btn = document.createElement("button");
    btn.id = "ffManualPaymentBtn";
    btn.type = "button";
    btn.textContent = "Manual R" + (s.joiningFeeAmount || 100) + " Payment Instructions";
    btn.style.cssText =
      "width:100%;margin-top:14px;min-height:52px;border:0;border-radius:999px;background:#68235f;color:#fff;font-weight:900;cursor:pointer;";

    btn.addEventListener("click", () => showManualBox(s));

    const form = document.querySelector("form");
    if (form) form.appendChild(btn);
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const res = await nativeFetch(input, init);

    try {
      const url = String(typeof input === "string" ? input : (input && input.url) || "");

      if (url.includes("affiliate") || url.includes("register") || url.includes("join")) {
        const s = await getSettings();

        if (s.yocoAffiliateJoiningFeeEnabled) {
          return res;
        }

        if (s.manualAffiliateJoiningFeeEnabled) {
          const clone = res.clone();
          const data = await clone.json().catch(() => null);

          if (data && typeof data === "object") {
            const cleaned = {
              ...data,
              checkoutUrl: null,
              paymentUrl: null,
              yocoUrl: null,
              redirectUrl: null,
              paymentMode: "manual",
              manualPayment: {
                amount: s.joiningFeeAmount || 100,
                email: s.manualPaymentEmail || "femifresh02@gmail.com",
                instruction: s.manualPaymentInstruction
              },
              message: data.message || "Account created. Please follow manual payment instructions."
            };

            setTimeout(() => showManualBox(s), 250);

            return new Response(JSON.stringify(cleaned), {
              status: res.status,
              statusText: res.statusText,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      }
    } catch (e) {}

    return res;
  };

  document.addEventListener("DOMContentLoaded", async function () {
    const s = await getSettings();

    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && (el.getAttribute("href") || "")).toLowerCase();

      if (!s.yocoAffiliateJoiningFeeEnabled && (href.includes("yoco") || text.includes("pay r100"))) {
        el.remove();
      }
    });

    if (s.manualPaymentButtonEnabled) {
      addManualButton(s);
    }

    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "cancelled") {
      history.replaceState({}, "", location.pathname);
      showManualBox(s);
    }
  });
})();
`);

/* 4) Inject controller into affiliate pages */
for (const name of ["join.html", "affiliate-login.html", "affiliate-dashboard.html", "affiliate-reset-password.html", "join-success.html"]) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<script[^>]+manual-affiliate-payment-safe\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+manual-affiliate-payment\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+affiliate-payment-controller\.js[^>]*><\/script>\s*/gi, "");

  if (!html.includes("/js/affiliate-payment-controller.js")) {
    html = html.replace("</head>", '  <script src="/js/affiliate-payment-controller.js"></script>\\n</head>');
  }

  fs.writeFileSync(file, html);
  console.log("Injected affiliate payment controller:", name);
}

/* 5) Add payment settings link to existing admin sidebars where possible */
for (const name of ["dashboard.html", "orders.html", "products.html", "affiliates.html", "delivery.html", "logs.html", "users.html"]) {
  const file = path.join(adminDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/admin/payment-settings.html")) {
    html = html.replace(/<a href="\/admin\/logs\.html">Logs<\/a>/g, '<a href="/admin/payment-settings.html">Payment Settings</a><a href="/admin/logs.html">Logs</a>');
    html = html.replace(/<a href="\/admin\/logs\.html">Logs<\/a>/g, '<a href="/admin/payment-settings.html">Payment Settings</a><a href="/admin/logs.html">Logs</a>');
  }

  fs.writeFileSync(file, html);
}

console.log("Payment mode admin control installed.");
