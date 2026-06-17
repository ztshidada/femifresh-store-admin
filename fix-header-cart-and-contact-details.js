const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const jsFile = path.join(publicDir, "js", "femi-store-stable.js");
const cssFile = path.join(publicDir, "css", "femi-store-stable.css");

const EMAIL = "femifresh02@gmail.com";
const WHATSAPP = "0632180372";
const WA_LINK = "https://wa.me/27632180372";

/* 1. Fix header order in stable JS: Home, Products, Policy, Contact, Cart far right */
if (fs.existsSync(jsFile)) {
  let js = fs.readFileSync(jsFile, "utf8");

  js = js.replace(
    /<a href="\/">Home<\/a>\s*<a href="\/products\.html">Products<\/a>\s*<a href="\/cart\.html" class="ff-clean-cart">🛒<\/a>\s*<a href="\/policies\.html">Policy<\/a>\s*<a href="\/contact\.html">Contact<\/a>/g,
    `<a href="/">Home</a>
          <a href="/products.html">Products</a>
          <a href="/policies.html">Policy</a>
          <a href="/contact.html">Contact</a>
          <a href="/cart.html" class="ff-clean-cart">🛒</a>`
  );

  js = js.replace(/Send POP to WhatsApp:\s*<strong>[^<]*<\/strong>/g, `Send POP to WhatsApp: <strong>${WHATSAPP}</strong>`);
  js = js.replace(/Account:\s*63214749822/g, "Account: 63214749822");

  fs.writeFileSync(jsFile, js);
}

/* 2. Strengthen cart position CSS */
let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("CART_AFTER_CONTACT_CORNER_V1")) {
  css += `

/* CART_AFTER_CONTACT_CORNER_V1 */
.ff-clean-links {
  display: flex !important;
  align-items: center !important;
}

.ff-clean-links .ff-clean-cart {
  margin-left: 10px !important;
  order: 99 !important;
  flex: 0 0 56px !important;
}

@media(max-width:900px){
  .ff-clean-links .ff-clean-cart {
    width: 100% !important;
    flex: auto !important;
    margin-left: 0 !important;
  }

  .ff-clean-links .ff-clean-cart::before {
    content: "Cart ";
    font-size: 15px;
  }
}
`;
}

fs.writeFileSync(cssFile, css);

/* 3. Rebuild contact page cleanly */
const contactFile = path.join(publicDir, "contact.html");

if (fs.existsSync(contactFile)) {
  fs.writeFileSync(contactFile, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Contact | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femi-store-stable.css">
  <style>
    .contact-page{
      width:min(1180px,calc(100% - 32px));
      margin:60px auto;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:28px;
      align-items:start;
    }
    .contact-card{
      background:white;
      border:1px solid rgba(104,35,95,.14);
      border-radius:34px;
      padding:34px;
      box-shadow:0 22px 60px rgba(104,35,95,.10);
    }
    .contact-card h1{
      margin:0 0 14px;
      font-size:clamp(44px,7vw,78px);
      line-height:.95;
      letter-spacing:-.07em;
      color:#35112f;
    }
    .contact-card h2{
      margin:0 0 14px;
      color:#35112f;
      font-size:34px;
      letter-spacing:-.05em;
    }
    .contact-card p{
      color:#6f6372;
      line-height:1.65;
      font-size:18px;
    }
    .contact-row{
      display:flex;
      justify-content:space-between;
      gap:16px;
      border-bottom:1px solid rgba(104,35,95,.12);
      padding:14px 0;
      font-size:17px;
    }
    .contact-row span:first-child{
      color:#6f6372;
      font-weight:850;
    }
    .contact-row span:last-child{
      color:#35112f;
      font-weight:950;
      text-align:right;
    }
    .contact-actions{
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      margin-top:22px;
    }
    .contact-btn{
      min-height:52px;
      padding:13px 22px;
      border-radius:999px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      text-decoration:none;
      font-weight:950;
    }
    .contact-btn.primary{
      background:linear-gradient(135deg,#68235f,#9b358e,#f4a7d8);
      color:white;
    }
    .contact-btn.light{
      background:white;
      color:#68235f;
      border:1px solid rgba(104,35,95,.14);
    }
    @media(max-width:900px){
      .contact-page{
        grid-template-columns:1fr;
        margin:28px auto;
      }
      .contact-card{
        padding:24px;
      }
      .contact-row{
        display:block;
      }
      .contact-row span:last-child{
        display:block;
        text-align:left;
        margin-top:4px;
      }
      .contact-btn{
        width:100%;
      }
    }
  </style>
</head>
<body>
  <main class="contact-page">
    <section class="contact-card">
      <h1>Contact FemiFresh</h1>
      <p>
        Need help with an order, affiliate account, payment proof, or stock package?
        Contact us and we will assist you.
      </p>

      <div class="contact-row"><span>Email</span><span>${EMAIL}</span></div>
      <div class="contact-row"><span>WhatsApp</span><span>${WHATSAPP}</span></div>
      <div class="contact-row"><span>POP WhatsApp</span><span>${WHATSAPP}</span></div>

      <div class="contact-actions">
        <a class="contact-btn primary" href="${WA_LINK}">Chat on WhatsApp</a>
        <a class="contact-btn light" href="mailto:${EMAIL}">Send Email</a>
      </div>
    </section>

    <section class="contact-card">
      <h2>Manual Payment Details</h2>
      <p>Use these details for manual payments and send POP to WhatsApp.</p>

      <div class="contact-row"><span>Bank</span><span>FNB</span></div>
      <div class="contact-row"><span>Account Name</span><span>Femi Fresh (PTY) LTD</span></div>
      <div class="contact-row"><span>Account Type</span><span>FNB Business Account</span></div>
      <div class="contact-row"><span>Account Number</span><span>63214749822</span></div>
      <div class="contact-row"><span>Reference</span><span>Order number, phone number, or affiliate email</span></div>

      <p style="font-weight:850;color:#35112f;margin-top:18px;">
        Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.
      </p>
    </section>
  </main>

  <script src="/js/femi-store-stable.js"></script>
</body>
</html>`);
}

/* 4. Update common text in all public customer pages */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile() && /\.(html|js)$/i.test(full)) out.push(full);
  }
  return out;
}

const files = walk(publicDir).filter(file => !file.includes(path.join("public","admin")));

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  // normalize old/wrong contact references
  text = text.replace(/femifresh20@gmail\.com/gi, EMAIL);
  text = text.replace(/femifresh02@gmail\.com/gi, EMAIL);
  text = text.replace(/063\s*218\s*0372/g, WHATSAPP);
  text = text.replace(/0632180372/g, WHATSAPP);

  // remove duplicate email rows if same one appears twice in old contact blocks
  text = text.replace(
    /(<[^>]*>\s*Email:\s*femifresh02@gmail\.com\s*<\/[^>]*>\s*){2,}/gi,
    `<p><strong>Email:</strong> ${EMAIL}</p>`
  );

  if (text !== original) {
    fs.writeFileSync(file, text);
    console.log("Updated contact details:", path.relative(publicDir, file));
  }
}

console.log("Cart moved after contact and contact details updated everywhere.");
