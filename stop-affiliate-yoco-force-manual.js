const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const serverFile = path.join(root, "server.js");

/* 1) Hide payment cancelled message and show manual payment notice on join page */
const joinFiles = [
  "join.html",
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "affiliate-reset-password.html"
];

for (const name of joinFiles) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  // Remove old online payment links/buttons
  html = html
    .replace(/<a[^>]+affiliate-fee\.html[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<a[^>]+yoco[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?(Pay|R100|Joining Fee|Yoco)[\s\S]*?<\/button>/gi, "")
    .replace(/payment=cancelled/gi, "");

  // Remove any public store header from affiliate pages
  html = html.replace(/<header class="ff-site-header">[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<script>\s*const ffMenuBtn[\s\S]*?<\/script>/gi, "");

  if (name === "join.html" && !html.includes("MANUAL_AFFILIATE_PAYMENT_NOTICE_V2")) {
    html = html.replace("</body>", `
<div class="MANUAL_AFFILIATE_PAYMENT_NOTICE_V2" style="max-width:640px;margin:20px auto 40px;padding:20px;border-radius:24px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;">
  <strong>Manual joining fee payment</strong><br>
  After creating your account, please pay the once-off <strong>R100 joining fee</strong> manually and email proof of payment to <strong>femifresh02@gmail.com</strong>.<br>
  Use the same email address you used when registering.
</div>
</body>`);
  }

  fs.writeFileSync(file, html);
  console.log("Cleaned affiliate page:", name);
}

/* 2) Force affiliate registration API to return manual payment message instead of Yoco checkout URL */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("MANUAL_AFFILIATE_JOINING_FEE_FORCE_V1")) {
  const patch = `

// MANUAL_AFFILIATE_JOINING_FEE_FORCE_V1
// While Yoco reviews the affiliate subdomain, do not redirect affiliate registrations to online payment.
// Frontend should show these manual instructions after registration.
function femiManualJoiningFeeResponse(payload = {}) {
  return {
    ...payload,
    paymentRequired: true,
    paymentMode: "manual",
    joiningFeeAmount: 100,
    manualPayment: {
      amount: 100,
      email: "femifresh02@gmail.com",
      instruction: "Pay the once-off R100 joining fee manually and email proof of payment to femifresh02@gmail.com. Use the registered affiliate email as reference."
    },
    checkoutUrl: null,
    paymentUrl: null,
    yocoUrl: null
  };
}
`;

  // Put helper near top before routes
  const insertAt = server.indexOf("app.use");
  if (insertAt !== -1) {
    server = server.slice(0, insertAt) + patch + "\n" + server.slice(insertAt);
  } else {
    server = patch + "\n" + server;
  }
}

/*
  Replace obvious affiliate checkout URL responses.
  This keeps registration successful but removes payment redirect fields.
*/
server = server
  .replace(/checkoutUrl\s*:\s*checkoutUrl/g, 'checkoutUrl: null')
  .replace(/checkoutUrl\s*:\s*paymentUrl/g, 'checkoutUrl: null')
  .replace(/paymentUrl\s*:\s*checkoutUrl/g, 'paymentUrl: null')
  .replace(/paymentUrl\s*:\s*paymentUrl/g, 'paymentUrl: null')
  .replace(/yocoUrl\s*:\s*checkoutUrl/g, 'yocoUrl: null')
  .replace(/yocoUrl\s*:\s*paymentUrl/g, 'yocoUrl: null');

/*
  If a response still sends success registration data, inject manualPayment fields.
  This is safe because it only adds info; it does not delete the affiliate.
*/
server = server.replace(
  /res\.json\(\{\s*success:\s*true,\s*affiliate\s*:/g,
  'res.json(femiManualJoiningFeeResponse({ success: true, affiliate:'
);

server = server.replace(
  /res\.json\(\{\s*success:\s*true,\s*message:\s*["']Affiliate/g,
  'res.json(femiManualJoiningFeeResponse({ success: true, message: "Affiliate'
);

fs.writeFileSync(serverFile, server);

/* 3) Add frontend safety script: if response contains payment URL, ignore it and show manual message */
const safetyJs = path.join(publicDir, "js", "manual-affiliate-payment.js");
fs.mkdirSync(path.dirname(safetyJs), { recursive: true });

fs.writeFileSync(safetyJs, `
(function(){
  const manualMessage = "Account created. Please pay the once-off R100 joining fee manually and email proof to femifresh02@gmail.com. Use your registered affiliate email as reference.";

  const oldFetch = window.fetch;
  window.fetch = async function(){
    const res = await oldFetch.apply(this, arguments);

    try {
      const url = String(arguments[0] || "");
      if (url.includes("affiliate") || url.includes("register") || url.includes("join")) {
        const clone = res.clone();
        clone.json().then(data => {
          if (data && (data.checkoutUrl || data.paymentUrl || data.yocoUrl)) {
            data.checkoutUrl = null;
            data.paymentUrl = null;
            data.yocoUrl = null;
            data.paymentMode = "manual";
            data.manualPayment = {
              amount: 100,
              email: "femifresh02@gmail.com",
              instruction: manualMessage
            };
          }
        }).catch(()=>{});
      }
    } catch(e){}

    return res;
  };

  document.addEventListener("DOMContentLoaded", function(){
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "cancelled") {
      const box = document.createElement("div");
      box.style.cssText = "max-width:640px;margin:20px auto;padding:18px;border-radius:22px;background:#fff1fa;border:1px solid rgba(104,35,95,.15);color:#35112f;font-family:Inter,system-ui;";
      box.innerHTML = "<strong>Online payment is paused.</strong><br>Please use manual payment for the R100 joining fee and email proof to <strong>femifresh02@gmail.com</strong>.";
      document.body.prepend(box);
      history.replaceState({}, "", location.pathname);
    }
  });
})();
`);

for (const name of ["join.html", "affiliate-login.html", "affiliate-dashboard.html"]) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/js/manual-affiliate-payment.js")) {
    html = html.replace("</body>", '  <script src="/js/manual-affiliate-payment.js"></script>\\n</body>');
  }

  fs.writeFileSync(file, html);
}

console.log("Affiliate Yoco redirect stopped. Manual joining fee enabled.");
