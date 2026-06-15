const nodemailer = require("nodemailer");
const { read, write } = require("./db");

let scannerStarted = false;
let scannerRunning = false;

function nowIso() {
  return new Date().toISOString();
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(n) {
  return "R" + Number(n || 0).toFixed(2);
}

function nameOf(a) {
  return a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || "there";
}

function emailOfCustomer(o) {
  return o.email || o.customerEmail || o.customer?.email || o.billing?.email || "";
}

function orderId(o) {
  return String(o.id || o.orderId || o.orderNumber || o.reference || o.createdAt || Date.now());
}

function isActive(a, month = currentMonth()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function normalizeState(state) {
  if (!state || Array.isArray(state) || typeof state !== "object") state = {};
  state.registered ||= {};
  state.orders ||= {};
  state.active ||= {};
  state.commissions ||= {};
  state.approved ||= {};
  return state;
}

function shell(title, body) {
  return `
  <div style="font-family:Arial,sans-serif;background:#fbf3fa;padding:24px;color:#2a162f">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:22px;padding:28px;border:1px solid #ead8e8">
      <h1 style="color:#6b1f64;margin-top:0">${title}</h1>
      <div style="font-size:16px;line-height:1.6">${body}</div>
      <hr style="border:0;border-top:1px solid #ead8e8;margin:24px 0">
      <p style="font-size:13px;color:#735f75">FemiFresh — Confidence in every wash.</p>
    </div>
  </div>`;
}

async function sendFemiEmail(to, subject, html, meta = {}) {
  if (!to) return { success: false, skipped: true };

  const logs = Array.isArray(read("emailLogs", [])) ? read("emailLogs", []) : [];
  const key = meta.key || `${to}:${subject}:${meta.type || "email"}`;

  if (logs.some(l => l?.meta?.key === key && l.status !== "failed")) {
    return { success: true, skipped: true, duplicate: true };
  }

  let status = "logged_only";
  let provider = "none";
  let error = "";

  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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

      status = "sent";
      provider = "smtp";
    }
  } catch (e) {
    status = "failed";
    provider = "smtp";
    error = e.message;
    console.error("Email send failed:", e.message);
  }

  logs.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: nowIso(),
    to,
    subject,
    status,
    provider,
    error,
    meta: { ...meta, key }
  });

  write("emailLogs", logs.slice(0, 1000));

  return { success: status !== "failed", status };
}

async function scanFemiEmailEvents() {
  if (scannerRunning) return;
  scannerRunning = true;

  try {
    if (global.ensureFemiDbReady) {
      await global.ensureFemiDbReady();
    }

    const affiliates = Array.isArray(read("affiliates", [])) ? read("affiliates", []) : [];
    const orders = Array.isArray(read("orders", [])) ? read("orders", []) : [];
    const month = currentMonth();

    let state = normalizeState(read("emailEventState", {}));

    for (const a of affiliates) {
      const id = a.id || a.referralCode || a.email;
      if (!id || !a.email) continue;

      if (!state.registered[id]) {
        const link = (process.env.AFFILIATE_URL || "https://affiliates.femifresh.co.za").replace(/\/$/, "");

        await sendFemiEmail(
          a.email,
          "Welcome to FemiFresh Affiliates",
          shell("Welcome to FemiFresh", `
            <p>Hi <strong>${nameOf(a)}</strong>,</p>
            <p>Your affiliate account has been created.</p>
            <p><strong>Referral code:</strong> ${a.referralCode || "---"}</p>
            <p><strong>Status:</strong> ${a.accountStatus || "pending"}</p>
            <p>You can login here: <a href="${link}/login">${link}/login</a></p>
          `),
          { type: "affiliate_registered", affiliateId: id, key: `registered:${id}` }
        );

        state.registered[id] = nowIso();
      }

      const approved = a.joiningFeeStatus === "paid" || a.accountStatus === "approved";

      if (approved && !state.approved[id]) {
        await sendFemiEmail(
          a.email,
          "Your FemiFresh affiliate account is approved",
          shell("Account Approved", `
            <p>Hi <strong>${nameOf(a)}</strong>,</p>
            <p>Your affiliate account is now approved.</p>
            <p><strong>Your referral code:</strong> ${a.referralCode || "---"}</p>
            <p>You can now share your link and build your team.</p>
          `),
          { type: "affiliate_approved", affiliateId: id, key: `approved:${id}` }
        );

        state.approved[id] = nowIso();
      }

      if (Array.isArray(a.activeMonths)) {
        for (const m of a.activeMonths) {
          const activeKey = `${id}:${m}`;

          if (!state.active[activeKey]) {
            await sendFemiEmail(
              a.email,
              "Your FemiFresh stock activation is confirmed",
              shell("You Are Active", `
                <p>Hi <strong>${nameOf(a)}</strong>,</p>
                <p>Your stock activation for <strong>${m}</strong> has been confirmed.</p>
                <p>You are now active for this month and eligible for payable commissions according to the compensation rules.</p>
              `),
              { type: "affiliate_active", affiliateId: id, month: m, key: `active:${activeKey}` }
            );

            state.active[activeKey] = nowIso();
          }
        }
      }
    }

    for (const o of orders) {
      const id = orderId(o);
      const to = emailOfCustomer(o);

      if (!state.orders[id] && to) {
        const total = o.total || o.amount || o.totalAmount || o.grandTotal || 0;

        await sendFemiEmail(
          to,
          "FemiFresh order received",
          shell("Order Received", `
            <p>Thank you for your FemiFresh order.</p>
            <p><strong>Order:</strong> ${id}</p>
            <p><strong>Total:</strong> ${money(total)}</p>
            <p>We will notify you once your order is processed.</p>
          `),
          { type: "order_received", orderId: id, key: `order:${id}` }
        );

        if (process.env.ADMIN_NOTIFY_EMAIL) {
          await sendFemiEmail(
            process.env.ADMIN_NOTIFY_EMAIL,
            "New FemiFresh order received",
            shell("New Order", `
              <p>A new order has been placed.</p>
              <p><strong>Order:</strong> ${id}</p>
              <p><strong>Customer:</strong> ${to}</p>
              <p><strong>Total:</strong> ${money(total)}</p>
            `),
            { type: "admin_order_received", orderId: id, key: `admin-order:${id}` }
          );
        }

        state.orders[id] = nowIso();
      }
    }

    for (const sponsor of affiliates) {
      const sponsorId = sponsor.id || sponsor.referralCode || sponsor.email;
      if (!sponsorId || !sponsor.email) continue;

      const directs = affiliates.filter(a =>
        a.sponsorId === sponsor.id ||
        a.sponsorCode === sponsor.referralCode ||
        a.referredByCode === sponsor.referralCode
      );

      const activeDirects = directs.filter(a => isActive(a, month));
      const referralBonus = activeDirects.length * 300;
      const targetBonus = activeDirects.length >= 10 ? 1000 : 0;
      const totalCounted = referralBonus + targetBonus;

      if (totalCounted > 0) {
        const commissionKey = `${sponsorId}:${month}:${activeDirects.length}:${totalCounted}`;

        if (!state.commissions[commissionKey]) {
          await sendFemiEmail(
            sponsor.email,
            "FemiFresh commission update",
            shell("Commission Update", `
              <p>Hi <strong>${nameOf(sponsor)}</strong>,</p>
              <p>Your commission count for <strong>${month}</strong> has been updated.</p>
              <p><strong>Active direct recruits:</strong> ${activeDirects.length}</p>
              <p><strong>Referral bonus counted:</strong> ${money(referralBonus)}</p>
              <p><strong>Target bonus counted:</strong> ${money(targetBonus)}</p>
              <p><strong>Total counted:</strong> ${money(totalCounted)}</p>
              <p>Remember: payout is payable when you are active for the month and not blocked.</p>
            `),
            {
              type: "commission_update",
              affiliateId: sponsorId,
              month,
              activeDirects: activeDirects.length,
              totalCounted,
              key: `commission:${commissionKey}`
            }
          );

          state.commissions[commissionKey] = nowIso();
        }
      }
    }

    write("emailEventState", state);
  } catch (e) {
    console.error("FemiFresh email event scan failed:", e.message);
  } finally {
    scannerRunning = false;
  }
}

function startFemiEmailEventScanner() {
  if (scannerStarted) return;
  scannerStarted = true;

  console.log("FemiFresh email event scanner started");

  setTimeout(scanFemiEmailEvents, 8000);
  setInterval(scanFemiEmailEvents, 60000);
}

module.exports = {
  startFemiEmailEventScanner,
  scanFemiEmailEvents,
  sendFemiEmail
};
