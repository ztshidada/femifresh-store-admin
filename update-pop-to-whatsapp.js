const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const serverFile = path.join(root, "server.js");

const WHATSAPP = "0632180372";
const EMAIL = "femifresh02@gmail.com";

/* Update server default wording */
let server = fs.readFileSync(serverFile, "utf8");

server = server.replace(
  /paymentInstructions:\s*"[^"]*"/g,
  `paymentInstructions: "Pay the joining fee manually to the FNB business account below. Send proof of payment to WhatsApp ${WHATSAPP}. You can also email POP to ${EMAIL}. Use your registered affiliate email as reference."`
);

server = server.replace(
  /referenceInstruction:\s*"[^"]*"/g,
  `referenceInstruction: "Use your registered affiliate email as reference and send POP to WhatsApp ${WHATSAPP}."`
);

fs.writeFileSync(serverFile, server);

/* Update affiliate fee page wording */
const feeFile = path.join(publicDir, "affiliate-fee.html");
if (fs.existsSync(feeFile)) {
  let html = fs.readFileSync(feeFile, "utf8");

  html = html.replace(/email your proof of payment to <strong>femifresh02@gmail\.com<\/strong>\s*or send POP to <strong>0632180372<\/strong>/gi,
    `send your proof of payment to WhatsApp <strong>${WHATSAPP}</strong>. You can also email POP to <strong>${EMAIL}</strong>`
  );

  html = html.replace(/Email Proof of Payment/gi, "Send POP on WhatsApp");

  html = html.replace(/href="mailto:femifresh02@gmail\.com"/gi, `href="https://wa.me/27632180372"`);

  fs.writeFileSync(feeFile, html);
}

/* Update checkout manual payment JS */
const checkoutJs = path.join(publicDir, "js", "store-manual-checkout.js");
if (fs.existsSync(checkoutJs)) {
  let js = fs.readFileSync(checkoutJs, "utf8");

  js = js.replace(/Please email proof of payment to/g, "Please send proof of payment to WhatsApp");
  js = js.replace(/Or send POP to:/g, "WhatsApp POP:");
  js = js.replace(/email proof of payment to femifresh02@gmail\.com/gi, `send POP to WhatsApp ${WHATSAPP}`);

  fs.writeFileSync(checkoutJs, js);
}

/* Update banking details page */
const bankFile = path.join(publicDir, "banking-details.html");
if (fs.existsSync(bankFile)) {
  let html = fs.readFileSync(bankFile, "utf8");

  html = html.replace(/<p><strong>POP Email:<\/strong> femifresh02@gmail\.com<\/p>/gi,
    `<p><strong>POP WhatsApp:</strong> ${WHATSAPP}</p><p><strong>POP Email:</strong> ${EMAIL}</p>`
  );

  html = html.replace(/Use your order number, phone number, or registered affiliate email\./gi,
    `Use your order number, phone number, or registered affiliate email. Send POP to WhatsApp ${WHATSAPP}.`
  );

  fs.writeFileSync(bankFile, html);
}

console.log("POP instructions updated to WhatsApp first.");
