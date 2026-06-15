const fs = require("fs");
const path = require("path");

const root = __dirname;
const serverFile = path.join(root, "server.js");
const adminLogin = path.join(root, "public", "admin", "login.html");
const affiliateLogin = path.join(root, "public", "affiliate-login.html");
const resetPage = path.join(root, "public", "affiliate-reset-password.html");
const cssFile = path.join(root, "public", "css", "mobile-polish.css");
const storeButtons = path.join(root, "public", "js", "store-affiliate-buttons.js");

/* 1) Remove visible demo credentials from admin login */
if (fs.existsSync(adminLogin)) {
  let html = fs.readFileSync(adminLogin, "utf8");

  html = html
    .replace(/<p[^>]*>\s*<strong>\s*Super Admin:[\s\S]*?<\/p>/gi, "")
    .replace(/<p[^>]*>\s*<strong>\s*Orders Admin:[\s\S]*?<\/p>/gi, "")
    .replace(/<div[^>]*>\s*<strong>\s*Super Admin:[\s\S]*?Orders Admin:[\s\S]*?<\/div>/gi, "")
    .replace(/Super Admin:[\s\S]*?Admin@12345/gi, "")
    .replace(/Orders Admin:[\s\S]*?Orders@12345/gi, "");

  fs.writeFileSync(adminLogin, html);
  console.log("Removed admin demo credentials.");
}

/* 2) Add forgot password API endpoints */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("AFFILIATE_FORGOT_PASSWORD_V1")) {
  const code = `

// AFFILIATE_FORGOT_PASSWORD_V1
function femiHashAffiliatePassword(password) {
  try {
    const bcryptjs = require("bcryptjs");
    return bcryptjs.hashSync(String(password), 10);
  } catch (e) {
    return crypto.createHash("sha256").update(String(password)).digest("hex");
  }
}

function femiSafeAffiliateEmail(email) {
  return String(email || "").trim().toLowerCase();
}

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "affiliate-reset-password.html"));
});

app.post("/api/affiliate/forgot-password", async (req, res) => {
  try {
    const email = femiSafeAffiliateEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const affiliates = read("affiliates", []);
    const affiliate = affiliates.find(a => femiSafeAffiliateEmail(a.email) === email);

    // Security: don't expose whether email exists
    if (!affiliate) {
      return res.json({ success: true, message: "If this email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    affiliate.resetPasswordToken = token;
    affiliate.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    affiliate.updatedAt = new Date().toISOString();

    write("affiliates", affiliates);

    const resetUrl = (process.env.AFFILIATE_URL || "https://affiliates.femifresh.co.za").replace(/\\/$/, "") + "/reset-password?token=" + encodeURIComponent(token);

    try {
      const emailer = require("./src/emailEvents");
      await emailer.sendFemiEmail(
        affiliate.email,
        "Reset your FemiFresh affiliate password",
        \`
          <div style="font-family:Arial,sans-serif;background:#fbf3fa;padding:24px;color:#2a162f">
            <div style="max-width:640px;margin:auto;background:white;border-radius:22px;padding:28px;border:1px solid #ead8e8">
              <h1 style="color:#6b1f64;margin-top:0">Reset Your Password</h1>
              <p>Hi <strong>\${affiliate.fullName || affiliate.firstName || "there"}</strong>,</p>
              <p>Click the button below to reset your FemiFresh affiliate password.</p>
              <p style="text-align:center;margin:28px 0">
                <a href="\${resetUrl}" style="background:#6b1f64;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Reset Password</a>
              </p>
              <p style="font-size:13px;color:#735f75">This link expires in 1 hour.</p>
              <p style="font-size:13px;color:#735f75">If you did not request this, you can ignore this email.</p>
            </div>
          </div>
        \`,
        { type: "affiliate_password_reset", affiliateId: affiliate.id, key: "reset:" + affiliate.id + ":" + token.slice(0, 8) }
      );
    } catch (e) {
      console.error("Password reset email failed:", e.message);
    }

    res.json({ success: true, message: "If this email exists, a reset link has been sent." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/affiliate/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const affiliates = read("affiliates", []);
    const affiliate = affiliates.find(a => String(a.resetPasswordToken || "") === token);

    if (!affiliate) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset link." });
    }

    if (affiliate.resetPasswordExpiresAt && new Date(affiliate.resetPasswordExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Reset link expired. Please request a new one." });
    }

    affiliate.passwordHash = femiHashAffiliatePassword(password);
    affiliate.password = undefined;
    delete affiliate.resetPasswordToken;
    delete affiliate.resetPasswordExpiresAt;
    affiliate.updatedAt = new Date().toISOString();

    write("affiliates", affiliates);

    res.json({ success: true, message: "Password updated. You can login now." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
// END AFFILIATE_FORGOT_PASSWORD_V1
`;

  server = server.replace(/app\.listen\(/, code + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
  console.log("Forgot password API added.");
}

/* 3) Create reset password page */
fs.writeFileSync(resetPage, `<!doctype html>
<html>
<head>
  <title>Reset Password - FemiFresh</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/mobile-polish.css">
</head>
<body class="ff-auth-body">
  <main class="ff-auth-wrap">
    <section class="ff-auth-card">
      <img class="ff-auth-logo" src="/images/femifresh-logo.jpg" alt="FemiFresh">
      <h1>Reset Password</h1>
      <p class="ff-muted">Enter your new affiliate password.</p>

      <form id="resetForm">
        <input id="password" type="password" placeholder="New password" required>
        <input id="confirmPassword" type="password" placeholder="Confirm password" required>
        <button type="submit">Update Password</button>
      </form>

      <p id="msg" class="ff-auth-msg"></p>
      <p><a href="/login">Back to login</a></p>
    </section>
  </main>

<script>
const params = new URLSearchParams(location.search);
const token = params.get("token") || "";

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const msg = document.getElementById("msg");

  if (password !== confirmPassword) {
    msg.textContent = "Passwords do not match.";
    return;
  }

  const res = await fetch("/api/affiliate/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password })
  });

  const data = await res.json();
  msg.textContent = data.message || "Done.";

  if (data.success) {
    setTimeout(() => location.href = "/login", 1500);
  }
});
</script>
</body>
</html>`);

/* 4) Add forgot link to affiliate login */
if (fs.existsSync(affiliateLogin)) {
  let html = fs.readFileSync(affiliateLogin, "utf8");

  if (!html.includes("/css/mobile-polish.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/mobile-polish.css">\\n</head>');
  }

  if (!html.includes("ff-forgot-password")) {
    html = html.replace("</body>", `
<script>
(function () {
  const forms = document.querySelectorAll("form");
  const form = forms[0];

  const box = document.createElement("div");
  box.className = "ff-forgot-password";
  box.innerHTML = '<a href="#" id="ffForgotLink">Forgot password?</a>';

  if (form) {
    form.insertAdjacentElement("afterend", box);
  } else {
    document.body.appendChild(box);
  }

  document.getElementById("ffForgotLink").addEventListener("click", async function(e) {
    e.preventDefault();

    const email = prompt("Enter your affiliate email address:");
    if (!email) return;

    const res = await fetch("/api/affiliate/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json().catch(() => ({}));
    alert(data.message || "If this email exists, a reset link has been sent.");
  });
})();
</script>
</body>`);
  }

  fs.writeFileSync(affiliateLogin, html);
  console.log("Forgot password link added.");
}

/* 5) Mobile polish CSS */
fs.writeFileSync(cssFile, `
/* Launch mobile polish */
html {
  scroll-behavior: smooth;
}

body {
  -webkit-font-smoothing: antialiased;
}

.ff-auth-body {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 182, 225, .35), transparent 28%),
    radial-gradient(circle at 80% 10%, rgba(107, 31, 100, .18), transparent 28%),
    #fff4fb;
}

.ff-auth-wrap {
  width: min(1100px, calc(100% - 28px));
  margin: 0 auto;
  padding: 36px 0;
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.ff-auth-card {
  width: min(430px, 100%);
  background: rgba(255,255,255,.86);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(107,31,100,.12);
  border-radius: 26px;
  padding: 28px;
  box-shadow: 0 24px 70px rgba(107,31,100,.14);
}

.ff-auth-logo {
  width: 86px;
  height: 86px;
  object-fit: cover;
  border-radius: 22px;
  display: block;
  margin-bottom: 16px;
}

.ff-auth-card input,
.ff-auth-card button {
  width: 100%;
  min-height: 48px;
  border-radius: 14px;
  margin: 8px 0;
}

.ff-auth-card button {
  border: 0;
  background: #6b1f64;
  color: #fff;
  font-weight: 900;
}

.ff-muted,
.ff-auth-msg {
  color: #735f75;
}

.ff-forgot-password {
  margin-top: 12px;
  text-align: right;
}

.ff-forgot-password a {
  color: #6b1f64;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 760px) {
  body {
    overflow-x: hidden;
  }

  h1 {
    line-height: 1.05;
  }

  .hero,
  .hero-section,
  .affiliate-page,
  .container {
    width: 100%;
  }

  input,
  button,
  select,
  textarea {
    font-size: 16px !important;
  }

  .ff-auth-wrap {
    padding: 18px 14px;
  }

  .ff-auth-card {
    padding: 22px;
    border-radius: 22px;
  }
}
`);

/* 6) Stop affiliate buttons from blocking mobile screen */
if (fs.existsSync(storeButtons)) {
  let js = fs.readFileSync(storeButtons, "utf8");

  js = js.replace(/position:\s*fixed;/g, "position: fixed;");

  if (!js.includes("Launch mobile non-overlay")) {
    js = js.replace(
      "@media (max-width: 650px) {",
      "@media (max-width: 650px) {\\n      /* Launch mobile non-overlay */"
    );

    js = js.replace(
`      #ff-affiliate-store-buttons {
        left: 12px;
        right: 12px;
        bottom: 12px;
        align-items: stretch;
      }`,
`      #ff-affiliate-store-buttons {
        position: static;
        left: auto;
        right: auto;
        bottom: auto;
        margin: 18px 14px;
        align-items: stretch;
      }`
    );
  }

  fs.writeFileSync(storeButtons, js);
  console.log("Mobile affiliate buttons no longer overlay screen.");
}

/* 7) Inject mobile CSS into important pages */
for (const rel of [
  "index.html",
  "products.html",
  "cart.html",
  "checkout.html",
  "contact.html",
  "affiliate-login.html",
  "join.html",
  "affiliate-dashboard.html"
]) {
  const file = path.join(root, "public", rel);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/css/mobile-polish.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/css/mobile-polish.css">\\n</head>');
    fs.writeFileSync(file, html);
    console.log("Injected mobile polish into", rel);
  }
}

console.log("Launch mobile + forgot password polish completed.");
