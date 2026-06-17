const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile()) out.push(full);
  }
  return out;
}

const cleanMessage = "Manual payment is currently available. Place your order and send proof of payment to WhatsApp 0632180372. Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.";

const replacements = [
  [/Online payment is paused while Yoco reviews femifresh\.co\.za\./gi, "Manual payment is currently available."],
  [/Online payment is paused while Yoco reviews the website\./gi, "Manual payment is currently available."],
  [/Online payment is paused while Yoco reviews the website/gi, "Manual payment is currently available"],
  [/Online payment is paused while Yoco reviews femifresh\.co\.za/gi, "Manual payment is currently available"],
  [/Online payment is paused\./gi, "Manual payment is currently available."],
  [/Yoco reviews femifresh\.co\.za/gi, "manual payment is available"],
  [/Yoco reviews the website/gi, "manual payment is available"],
  [/while Yoco reviews the website/gi, "using manual payment"],
  [/while Yoco reviews femifresh\.co\.za/gi, "using manual payment"],
  [/while the payment provider review is pending/gi, "while manual payment is active"],
  [/payment provider review is pending/gi, "manual payment is active"],
  [/website is being reviewed/gi, "manual payment is active"],
  [/under review/gi, "manual payment active"],
  [/review is pending/gi, "manual payment is active"],
  [/Yoco/gi, "online payment"],
];

const files = walk(publicDir).filter(file =>
  /\.(html|js|css)$/i.test(file)
);

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  for (const [find, replace] of replacements) {
    text = text.replace(find, replace);
  }

  // Remove browser alert wording that exposes review status
  text = text.replace(
    /alert\([^)]*(review|Yoco|under review|paused)[^)]*\);?/gi,
    `alert("${cleanMessage}");`
  );

  // Fix checkout/customer visible wording
  text = text.replace(
    /Your order can still be placed\.?\s*Send POP to WhatsApp\s*0632180372[^"'.]*/gi,
    "Place your order and send proof of payment to WhatsApp 0632180372"
  );

  text = text.replace(
    /Place your order and send POP to WhatsApp 0632180372/gi,
    "Place your order and send proof of payment to WhatsApp 0632180372"
  );

  // Make checkout box clean
  text = text.replace(
    /Manual payment is currently available\. Place your order and send proof of payment to WhatsApp 0632180372\. Your order can still be placed\./gi,
    "Manual payment is currently available. Place your order and send proof of payment to WhatsApp 0632180372."
  );

  if (text !== original) {
    fs.writeFileSync(file, text);
    console.log("Cleaned review wording:", path.relative(publicDir, file));
  }
}

console.log("All customer-facing review/Yoco wording removed.");
