const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("AFFILIATE_EMAIL_SYSTEM_V1")) {
  const helper = `

// AFFILIATE_EMAIL_SYSTEM_V1
function saveAffiliateEmailLog(entry) {
  try {
    const logs = read("emailLogs", []);
    logs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      ...entry
    });
    write("emailLogs", logs.slice(0, 500));
  } catch (e) {
    console.log("Email log failed:", e.message);
  }
}

async function sendAffiliateEmail(to, subject, html, meta = {}) {
  if (!to) return { success: false, skipped: true, message: "Missing recipient." };

  try {
    if (typeof sendMail === "function") {
      await sendMail({ to, subject, html });
      saveAffiliateEmailLog({ to, subject, status: "sent", provider: "sendMail", meta });
      return { success: true };
    }

    if (typeof sendEmail === "function") {
      await sendEmail({ to, subject, html });
      saveAffiliateEmailLog({ to, subject, status: "sent", provider: "sendEmail", meta });
      return { success: true };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
      });

      saveAffiliateEmailLog({ to, subject, status: "sent", provider: "smtp", meta });
      return { success: true };
    }

    saveAffiliateEmailLog({
      to,
      subject,
      html,
      status: "logged_only",
      provider: "none",
      meta
    });

    return { success: true, loggedOnly: true };
  } catch (e) {
    saveAffiliateEmailLog({
      to,
      subject,
      html,
      status: "failed",
      error: e.message,
      meta
    });

    return { success: false, message: e.message };
  }
}

function femiEmailShell(title, body) {
  return \`
    <div style="font-family:Arial,sans-serif;background:#fbf3fa;padding:24px;color:#2a162f">
      <div style="max-width:620px;margin:auto;background:white;border-radius:22px;padding:26px;border:1px solid #ead8e8">
        <h1 style="color:#6b1f64;margin-top:0">\${title}</h1>
        <div style="font-size:16px;line-height:1.6">\${body}</div>
        <hr style="border:0;border-top:1px solid #ead8e8;margin:24px 0">
        <p style="color:#735f75;font-size:13px">FemiFresh — Confidence in every wash.</p>
      </div>
    </div>
  \`;
}

async function emailAffiliateRegistered(affiliate) {
  const link = (process.env.AFFILIATE_URL || process.env.APP_URL || "https://affiliates.femifresh.co.za").replace(/\\/$/, "");

  return sendAffiliateEmail(
    affiliate.email,
    "Welcome to FemiFresh Affiliates",
    femiEmailShell("Welcome to FemiFresh", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your affiliate account has been created.</p>
      <p><strong>Referral code:</strong> \${affiliate.referralCode || "---"}</p>
      <p><strong>Status:</strong> \${affiliate.accountStatus || "pending"}</p>
      <p>Please complete your once-off joining fee of <strong>R100</strong> to activate your account.</p>
      <p><a href="\${link}/login" style="background:#6b1f64;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Login to dashboard</a></p>
    \`),
    { type: "affiliate_registered", affiliateId: affiliate.id }
  );
}

async function emailAffiliateJoiningApproved(affiliate) {
  const link = (process.env.AFFILIATE_URL || process.env.APP_URL || "https://affiliates.femifresh.co.za").replace(/\\/$/, "");

  return sendAffiliateEmail(
    affiliate.email,
    "Your FemiFresh affiliate account is approved",
    femiEmailShell("Account Approved", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your R100 joining fee has been confirmed and your affiliate account is now approved.</p>
      <p><strong>Your referral code:</strong> \${affiliate.referralCode || "---"}</p>
      <p>You can now share your referral link and build your team.</p>
      <p><a href="\${link}/dashboard" style="background:#6b1f64;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open dashboard</a></p>
    \`),
    { type: "joining_fee_approved", affiliateId: affiliate.id }
  );
}

async function emailAffiliateMarkedActive(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "Your FemiFresh monthly active status is confirmed",
    femiEmailShell("You are Active This Month", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your R1350 stock purchase has been confirmed.</p>
      <p>You are now active for this month and eligible for payable commissions, subject to the compensation rules.</p>
    \`),
    { type: "affiliate_marked_active", affiliateId: affiliate.id }
  );
}

async function emailAffiliatePayoutBlocked(affiliate, reason) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh payout status update",
    femiEmailShell("Payout Temporarily Blocked", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your payout has been temporarily blocked for review.</p>
      <p><strong>Reason:</strong> \${reason || "Account under review"}</p>
      <p>Please contact support if you need help.</p>
    \`),
    { type: "payout_blocked", affiliateId: affiliate.id, reason }
  );
}

async function emailAffiliatePayoutUnblocked(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh payout unblocked",
    femiEmailShell("Payout Unblocked", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your payout has been unblocked. If you are active this month, your payable commissions can now be processed.</p>
    \`),
    { type: "payout_unblocked", affiliateId: affiliate.id }
  );
}

async function emailAffiliateStockCheckoutStarted(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh stock package checkout started",
    femiEmailShell("Stock Package Checkout", \`
      <p>Hi <strong>\${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>You started your <strong>R1350 stock package</strong> checkout.</p>
      <p>Once payment is confirmed, your monthly active status will be updated.</p>
    \`),
    { type: "stock_checkout_started", affiliateId: affiliate.id }
  );
}
// END AFFILIATE_EMAIL_SYSTEM_V1
`;

  server = server.replace(/app\.listen\(/, helper + "\napp.listen(");
}

/* Send welcome email when affiliate is created/login response first happens */
server = server.replaceAll(
`res.json({ success: true, affiliate: publicAffiliate(affiliate), token: affiliate.token });`,
`if (!affiliate.welcomeEmailSentAt) {
    affiliate.welcomeEmailSentAt = new Date().toISOString();
    try {
      const affiliates = read("affiliates", []);
      const idx = affiliates.findIndex(a => a.id === affiliate.id);
      if (idx >= 0) {
        affiliates[idx] = affiliate;
        write("affiliates", affiliates);
      }
    } catch (e) {}
    emailAffiliateRegistered(affiliate);
  }

  res.json({ success: true, affiliate: publicAffiliate(affiliate), token: affiliate.token });`
);

/* Send approved email when joining fee is marked paid */
server = server.replaceAll(
`affiliate.joiningFeePaidAt = new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();`,
`affiliate.joiningFeePaidAt = new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  if (!affiliate.joiningApprovedEmailSentAt) {
    affiliate.joiningApprovedEmailSentAt = new Date().toISOString();
    emailAffiliateJoiningApproved(affiliate);
  }`
);

server = server.replaceAll(
`affiliate.joiningFeePaidAt = affiliate.joiningFeePaidAt || new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();`,
`affiliate.joiningFeePaidAt = affiliate.joiningFeePaidAt || new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  if (!affiliate.joiningApprovedEmailSentAt) {
    affiliate.joiningApprovedEmailSentAt = new Date().toISOString();
    emailAffiliateJoiningApproved(affiliate);
  }`
);

/* Send active email when marked active */
server = server.replaceAll(
`if (!affiliate.activeMonths.includes(month)) affiliate.activeMonths.push(month);

  affiliate.updatedAt = new Date().toISOString();`,
`if (!affiliate.activeMonths.includes(month)) {
    affiliate.activeMonths.push(month);
    emailAffiliateMarkedActive(affiliate);
  }

  affiliate.updatedAt = new Date().toISOString();`
);

/* Send payout emails */
server = server.replaceAll(
`affiliate.payoutBlockedReason = req.body.reason || "Blocked by admin.";
  affiliate.updatedAt = new Date().toISOString();`,
`affiliate.payoutBlockedReason = req.body.reason || "Blocked by admin.";
  affiliate.updatedAt = new Date().toISOString();

  emailAffiliatePayoutBlocked(affiliate, affiliate.payoutBlockedReason);`
);

server = server.replaceAll(
`affiliate.payoutBlocked = false;
  affiliate.payoutBlockedReason = "";
  affiliate.updatedAt = new Date().toISOString();`,
`affiliate.payoutBlocked = false;
  affiliate.payoutBlockedReason = "";
  affiliate.updatedAt = new Date().toISOString();

  emailAffiliatePayoutUnblocked(affiliate);`
);

/* Send stock checkout started email */
server = server.replace(
`const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\\/$/, "");

    if (!process.env.YOCO_SECRET_KEY) {`,
`const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\\/$/, "");

    emailAffiliateStockCheckoutStarted(affiliate);

    if (!process.env.YOCO_SECRET_KEY) {`
);

fs.writeFileSync(serverFile, server);

console.log("Affiliate email notification system installed.");
