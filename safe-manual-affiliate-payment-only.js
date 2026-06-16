const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const jsDir = path.join(publicDir, "js");
fs.mkdirSync(jsDir, { recursive: true });

/*
  This does NOT touch server.js.
  It only stops the affiliate pages from redirecting to Yoco
  and shows manual payment instructions.
*/

fs.writeFileSync(path.join(jsDir, "manual-affiliate-payment-safe.js"), `
(function () {
  const manualMessage =
    "Account created. Please pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.";

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const res = await nativeFetch(input, init);

    try {
      const url = String(typeof input === "string" ? input : input && input.url || "");

      if (
        url.includes("affiliate") ||
        url.includes("register") ||
        url.includes("join")
      ) {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);

        if (data && typeof data === "object") {
          if (data.checkoutUrl || data.paymentUrl || data.yocoUrl || data.redirectUrl) {
            const cleaned = {
              ...data,
              checkoutUrl: null,
              paymentUrl: null,
              yocoUrl: null,
              redirectUrl: null,
              paymentMode: "manual",
              manualPayment: {
                amount: 100,
                email: "femifresh02@gmail.com",
                instruction: manualMessage
              },
              message: data.message || manualMessage
            };

            setTimeout(() => {
              alert(manualMessage);
            }, 300);

            return new Response(JSON.stringify(cleaned), {
              status: res.status,
              statusText: res.statusText,
              headers: {
                "Content-Type": "application/json"
              }
            });
          }
        }
      }
    } catch (e) {}

    return res;
  };

  document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(location.search);

    if (params.get("payment") === "cancelled") {
      history.replaceState({}, "", location.pathname);

      const box = document.createElement("div");
      box.style.cssText =
        "max-width:680px;margin:24px auto;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;box-shadow:0 18px 40px rgba(104,35,95,.10);";

      box.innerHTML =
        "<strong>Online payment is paused.</strong><br>Please pay the R100 joining fee manually and email proof to <strong>femifresh02@gmail.com</strong>. Use your registered affiliate email as reference.";

      document.body.prepend(box);
    }

    document.querySelectorAll("a, button").forEach(el => {
      const text = (el.textContent || "").toLowerCase();
      const href = (el.getAttribute && el.getAttribute("href") || "").toLowerCase();

      if (
        text.includes("pay r100") ||
        text.includes("joining fee") ||
        href.includes("yoco") ||
        href.includes("affiliate-fee")
      ) {
        el.remove();
      }
    });
  });
})();
`);

const affiliatePages = [
  "join.html",
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "affiliate-reset-password.html",
  "join-success.html"
];

for (const name of affiliatePages) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  // Remove public store header from affiliate pages
  html = html.replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "");

  // Remove old pay buttons/links
  html = html.replace(/<div[^>]*style=["'][^"']*position\s*:\s*fixed[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<a[^>]*href=["'][^"']*affiliate-fee\.html[^"']*["'][\s\S]*?<\/a>/gi, "");
  html = html.replace(/<a[^>]*href=["'][^"']*yoco[^"']*["'][\s\S]*?<\/a>/gi, "");
  html = html.replace(/<button[^>]*>[\s\S]*?(Pay R100|Joining Fee|Yoco)[\s\S]*?<\/button>/gi, "");

  // Inject safety script early in HEAD before page scripts run
  html = html.replace(/<script[^>]+manual-affiliate-payment\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script[^>]+manual-affiliate-payment-safe\.js[^>]*><\/script>\s*/gi, "");

  if (!html.includes("/js/manual-affiliate-payment-safe.js")) {
    html = html.replace("</head>", '  <script src="/js/manual-affiliate-payment-safe.js"></script>\\n</head>');
  }

  if (name === "join.html" && !html.includes("MANUAL_PAYMENT_NOTICE_SAFE_V1")) {
    html = html.replace("</body>", `
<div class="MANUAL_PAYMENT_NOTICE_SAFE_V1" style="max-width:680px;margin:20px auto 40px;padding:18px 20px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;">
  <strong>Manual joining fee payment</strong><br>
  After creating your account, pay the once-off <strong>R100 joining fee</strong> manually and email proof to <strong>femifresh02@gmail.com</strong>. Use your registered affiliate email as reference.
</div>
</body>`);
  }

  fs.writeFileSync(file, html);
  console.log("Safe manual payment applied to:", name);
}

// Manual info page only
fs.writeFileSync(path.join(publicDir, "affiliate-fee.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manual Joining Fee | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui;background:linear-gradient(135deg,#fff8fd,#fff1fa,#fffaf7);color:#241126;padding:24px}
    .card{width:min(720px,100%);background:#fff;border:1px solid rgba(104,35,95,.14);border-radius:30px;padding:34px;box-shadow:0 22px 60px rgba(104,35,95,.12);text-align:center}
    img{width:90px;height:90px;object-fit:cover;border-radius:24px;margin-bottom:18px}
    h1{margin:0 0 12px;color:#35112f;font-size:clamp(36px,6vw,62px);letter-spacing:-.06em}
    p{color:#6f6372;line-height:1.7;font-size:18px}
    .amount{font-size:54px;font-weight:950;color:#68235f;margin:12px 0}
    .email{display:inline-block;padding:14px 18px;border-radius:999px;background:#fff1fa;color:#68235f;font-weight:950;text-decoration:none;margin-top:12px}
    .back{display:inline-block;margin-top:26px;color:#68235f;font-weight:900}
  </style>
</head>
<body>
  <main class="card">
    <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
    <h1>Manual Joining Fee</h1>
    <div class="amount">R100</div>
    <p>Online payment for the affiliate joining fee is paused while the payment provider review is pending.</p>
    <p>Please pay manually and email proof of payment. Use your registered affiliate email as reference.</p>
    <a class="email" href="mailto:femifresh02@gmail.com">femifresh02@gmail.com</a>
    <br>
    <a class="back" href="https://affiliates.femifresh.co.za/login">Back to Affiliate Login</a>
  </main>
</body>
</html>`);

console.log("Safe frontend-only manual affiliate payment patch complete.");
