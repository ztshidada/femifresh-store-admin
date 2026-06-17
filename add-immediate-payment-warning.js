const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const serverFile = path.join(root, "server.js");

const WARNING = "Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.";

/* 1) Update server default manual payment wording */
let server = fs.readFileSync(serverFile, "utf8");

server = server.replace(
  /paymentInstructions:\s*"[^"]*"/g,
  `paymentInstructions: "Pay the joining fee manually to the FNB business account below. Send proof of payment to WhatsApp 0632180372. You can also email POP to femifresh02@gmail.com. Use your registered affiliate email as reference. ${WARNING}"`
);

server = server.replace(
  /referenceInstruction:\s*"[^"]*"/g,
  `referenceInstruction: "Use your registered affiliate email as reference and send POP to WhatsApp 0632180372. ${WARNING}"`
);

fs.writeFileSync(serverFile, server);

/* 2) Update affiliate fee page */
const feeFile = path.join(publicDir, "affiliate-fee.html");
if (fs.existsSync(feeFile)) {
  let html = fs.readFileSync(feeFile, "utf8");

  if (!html.includes(WARNING)) {
    html = html.replace(
      /<p>\s*After payment,[\s\S]*?<\/p>/i,
      `<p>
        After payment, send your proof of payment to WhatsApp <strong>0632180372</strong>.
        You can also email POP to <strong>femifresh02@gmail.com</strong>.
      </p>
      <p style="background:#fff1fa;border:1px solid rgba(104,35,95,.14);border-radius:18px;padding:14px;color:#35112f;font-weight:800;">
        ${WARNING}
      </p>`
    );
  }

  fs.writeFileSync(feeFile, html);
}

/* 3) Update checkout manual payment JS */
const checkoutJs = path.join(publicDir, "js", "store-manual-checkout.js");
if (fs.existsSync(checkoutJs)) {
  let js = fs.readFileSync(checkoutJs, "utf8");

  if (!js.includes(WARNING)) {
    js = js.replace(
      /Use your order number or phone number as reference\./g,
      `Use your order number or phone number as reference.<br><br><strong>${WARNING}</strong>`
    );

    js = js.replace(
      /const MESSAGE = "[^"]*";/g,
      `const MESSAGE = "Online payment is paused while Yoco reviews femifresh.co.za. Your order can still be placed. Send POP to WhatsApp 0632180372 with your order number. ${WARNING}";`
    );
  }

  fs.writeFileSync(checkoutJs, js);
}

/* 4) Update banking details page */
const bankFile = path.join(publicDir, "banking-details.html");
if (fs.existsSync(bankFile)) {
  let html = fs.readFileSync(bankFile, "utf8");

  if (!html.includes(WARNING)) {
    html = html.replace(
      "</main>",
      `<p style="background:#fff1fa;border:1px solid rgba(104,35,95,.14);border-radius:18px;padding:14px;color:#35112f;font-weight:800;">
        ${WARNING}
      </p>
      </main>`
    );
  }

  fs.writeFileSync(bankFile, html);
}

console.log("Immediate payment warning added.");
