const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const { read, write } = require("../db");
const { hashPassword, comparePassword, newToken, publicAffiliate } = require("./authService");
const { paymentInstructions, getSettings } = require("./settingsService");
const { createNotification } = require("./notificationService");

function now() {
  return new Date().toISOString();
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function affiliateCode(firstName, lastName) {
  const base = String(`${firstName || ""}${lastName || ""}`).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6) || "FEMI";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

function makeUniqueCode(firstName, lastName, affiliates) {
  let code = affiliateCode(firstName, lastName);
  while (affiliates.some(a => String(a.referralCode).toUpperCase() === code)) code = affiliateCode(firstName, lastName);
  return code;
}

function affiliateJoined(a) {
  return !!(
    a.joiningFeePaid ||
    a.manualJoiningFeePaid ||
    a.joiningFeeStatus === "paid" ||
    a.paymentStatus === "paid" ||
    a.accountStatus === "approved" ||
    a.approved === true ||
    a.isApproved === true
  );
}

function affiliateApproved(a) {
  return affiliateJoined(a);
}

function affiliateActive(a, month = monthKey()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function directReferrals(affiliate, affiliates) {
  const code = affiliate.referralCode || affiliate.code || "";
  return affiliates.filter(a =>
    (affiliate.id && String(a.sponsorId || "") === String(affiliate.id)) ||
    (code && String(a.sponsorCode || "").toUpperCase() === String(code).toUpperCase()) ||
    (code && String(a.referredByCode || "").toUpperCase() === String(code).toUpperCase())
  );
}

function downlineTree(root, affiliates, level = 1, max = 10, seen = new Set()) {
  if (!root || level > max) return [];
  const rootKey = root.id || root.referralCode;
  if (seen.has(rootKey)) return [];
  seen.add(rootKey);
  return directReferrals(root, affiliates).map(a => ({
    ...publicAffiliate(a),
    level,
    joined: affiliateJoined(a),
    activeThisMonth: affiliateActive(a),
    children: downlineTree(a, affiliates, level + 1, max, seen)
  }));
}

function calculateCommission(affiliate, affiliates, month = monthKey()) {
  const directs = directReferrals(affiliate, affiliates);
  const activeDirects = directs.filter(a => affiliateActive(a, month));
  const selfActive = affiliateActive(affiliate, month);

  const settings = getSettings();
  const commissionSettings = settings.commission || {};
  const targetActiveDirects = Math.max(1, Number(commissionSettings.targetActiveDirects ?? 10));
  const targetBonusAmount = Number(commissionSettings.targetBonusAmount ?? 1000);

  const productCommissions = read("orders", [])
    .filter(order =>
      String(order.referralCode || "").toUpperCase() ===
      String(affiliate.referralCode || "").toUpperCase()
    )
    .filter(order => String(order.paymentStatus || "").toLowerCase() === "paid")
    .filter(order => {
      const paidDate = new Date(order.paidAt || order.createdAt || 0);

      if (Number.isNaN(paidDate.getTime())) return false;

      return paidDate.toISOString().slice(0, 7) === month;
    })
    .reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemSum, item) => {
        const quantity = Math.max(1, Number(item.qty || item.quantity || 1));
        const total = Number(item.directReferralCommissionTotal);

        if (Number.isFinite(total) && total >= 0) {
          return itemSum + total;
        }

        return itemSum + (Number(item.directReferralCommission || item.commission || 0) * quantity);
      }, 0);
    }, 0);

  const targetBonusCounted = activeDirects.length >= targetActiveDirects
    ? targetBonusAmount
    : 0;

  const totalCounted = productCommissions + targetBonusCounted;
  const payoutBlocked = affiliate.payoutBlocked === true;
  const totalPayable = selfActive && !payoutBlocked ? totalCounted : 0;
  const totalBlocked = totalCounted - totalPayable;

  let blockedReason = "";

  if (totalCounted > 0 && !selfActive) {
    blockedReason = "Distributor is not active for this month.";
  }

  if (totalCounted > 0 && payoutBlocked) {
    blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin review.";
  }

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted: productCommissions,
    targetBonusCounted,
    productCommissions,
    totalCounted,
    totalPayable,
    totalBlocked,
    blockedReason,
    targetActiveDirects,
    targetBonusAmount,
    needsForTarget: Math.max(0, targetActiveDirects - activeDirects.length),
    targetBonusProgress: {
      current: activeDirects.length,
      required: targetActiveDirects,
      remaining: Math.max(0, targetActiveDirects - activeDirects.length),
      amount: targetBonusAmount,
      status: activeDirects.length >= targetActiveDirects ? "qualified" : "pending"
    }
  };
}

function onboardingChecklist(affiliate) {
  const orders = read("orders", []);
  const affiliates = read("affiliates", []);
  const ownOrders = orders.filter(o =>
    String(o.customer?.email || "").toLowerCase() === String(affiliate.email || "").toLowerCase() ||
    String(o.affiliateId || "") === String(affiliate.id || "")
  );
  const bank = affiliate.bankDetails || {};
  const directs = directReferrals(affiliate, affiliates);
  return [
    { id: "pay_joining_fee", label: "Pay R100 joining fee", complete: affiliateJoined(affiliate) },
    { id: "approved", label: "Get approved", complete: affiliateApproved(affiliate) },
    { id: "bank_details", label: "Save payout bank details", complete: !!(bank.bankName && bank.accountNumber && bank.accountHolderName) },
    { id: "copy_referral_link", label: "Copy referral link", complete: affiliate.referralLinkCopiedAt ? true : false },
    { id: "first_order", label: "Place first product order", complete: ownOrders.length > 0 },
    { id: "first_recruit", label: "Recruit first distributor", complete: directs.length > 0 }
  ];
}

function registerAffiliate(input) {
  const { firstName, lastName, phone, email, password, sponsorCode = "" } = input || {};
  if (!firstName || !lastName || !phone || !email || !password) throw new Error("Please complete all required fields.");
  if (!String(sponsorCode || "").trim()) throw new Error("Sponsor code is required.");
  const affiliates = read("affiliates", []);
  if (affiliates.some(a => String(a.email || "").toLowerCase() === String(email).toLowerCase())) {
    throw new Error("This email already has an affiliate account.");
  }
  const sponsor = affiliates.find(a =>
    String(a.referralCode || "").toUpperCase() === String(sponsorCode).trim().toUpperCase()
  );

  if (!sponsor) throw new Error("Please enter a valid sponsor code.");

  const referralCode = makeUniqueCode(firstName, lastName, affiliates);
  const affiliate = {
    id: uuid(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    phone,
    email,
    passwordHash: hashPassword(password),
    token: newToken(),
    referralCode,
    sponsorCode: sponsor ? sponsor.referralCode : "",
    sponsorId: sponsor ? sponsor.id : "",
    accountStatus: "pending_joining_fee",
    joiningFeeStatus: "pending",
    joiningFeeAmount: 100,
    activeMonths: [],
    bankDetails: {},
    createdAt: now(),
    updatedAt: now()
  };
  affiliate.paymentInstructions = paymentInstructions(affiliate.email, 100, "joining_fee");
  affiliates.unshift(affiliate);
  write("affiliates", affiliates);
  createNotification({
    audience: "admin",
    title: "New affiliate signup",
    message: `${affiliate.fullName} signed up and is awaiting R100 joining fee approval.`,
    type: "affiliate",
    data: { affiliateId: affiliate.id }
  });
  return affiliate;
}

function loginAffiliate(email, password) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.email || "").toLowerCase() === String(email || "").toLowerCase());
  if (!affiliate || !comparePassword(password, affiliate.passwordHash)) return null;
  affiliate.token = newToken();
  affiliate.updatedAt = now();
  write("affiliates", affiliates);
  return affiliate;
}

function approveJoiningFee(id, actor = {}) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.id) === String(id) || String(a.email || "").toLowerCase() === String(id).toLowerCase());
  if (!affiliate) return null;
  affiliate.joiningFeePaid = true;
  affiliate.manualJoiningFeePaid = true;
  affiliate.joiningFeeStatus = "paid";
  affiliate.paymentStatus = "paid";
  affiliate.accountStatus = "approved";
  affiliate.status = "approved";
  affiliate.approved = true;
  affiliate.isApproved = true;
  affiliate.joined = true;
  affiliate.joiningFeePaidAt = affiliate.joiningFeePaidAt || now();
  affiliate.approvedAt = affiliate.approvedAt || now();
  affiliate.approvedBy = actor.email || "";
  affiliate.updatedAt = now();
  write("affiliates", affiliates);
  createNotification({
    audience: "affiliate",
    userId: affiliate.id,
    title: "Affiliate account approved",
    message: "Your R100 joining fee has been approved. Your dashboard is unlocked.",
    type: "approval"
  });
  return affiliate;
}

function saveBankDetails(affiliateId, input) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.id) === String(affiliateId));
  if (!affiliate) return null;
  affiliate.bankDetails = {
    accountHolderName: String(input.accountHolderName || "").trim(),
    bankName: String(input.bankName || "").trim(),
    accountNumber: String(input.accountNumber || "").trim(),
    branchCode: String(input.branchCode || "").trim(),
    accountType: String(input.accountType || "").trim()
  };
  affiliate.updatedAt = now();
  write("affiliates", affiliates);
  return affiliate;
}

function generateCommissionStatement(affiliateId, month = monthKey()) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.id) === String(affiliateId) || String(a.referralCode) === String(affiliateId));
  if (!affiliate) return null;
  const stats = calculateCommission(affiliate, affiliates, month);
  const statements = read("commissionStatements", []);
  const existing = statements.find(s => s.affiliateId === affiliate.id && s.month === month);
  const statement = {
    id: existing?.id || uuid(),
    affiliateId: affiliate.id,
    referralCode: affiliate.referralCode,
    fullName: affiliate.fullName,
    month,
    stats,
    status: existing?.status || "draft",
    payoutStatus: existing?.payoutStatus || "unpaid",
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  };
  if (existing) Object.assign(existing, statement);
  else statements.unshift(statement);
  write("commissionStatements", statements);
  return statement;
}

function payoutRecord(input, actor = {}) {
  const payouts = read("payoutHistory", []);
  const row = {
    id: uuid(),
    affiliateId: input.affiliateId,
    statementId: input.statementId || "",
    month: input.month || monthKey(),
    amount: Number(input.amount || 0),
    status: input.status || "pending",
    note: input.note || "",
    createdBy: actor.email || "",
    createdAt: now(),
    updatedAt: now()
  };
  payouts.unshift(row);
  write("payoutHistory", payouts);
  return row;
}

function resetPasswordRequest(email) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.email || "").toLowerCase() === String(email || "").toLowerCase());
  if (!affiliate) return null;
  affiliate.resetPasswordToken = crypto.randomBytes(32).toString("hex");
  affiliate.resetPasswordExpiresAt = new Date(Date.now() + 3600000).toISOString();
  affiliate.updatedAt = now();
  write("affiliates", affiliates);
  return affiliate;
}

function resetPassword(token, password) {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.resetPasswordToken || "") === String(token || ""));
  if (!affiliate) return null;
  if (affiliate.resetPasswordExpiresAt && new Date(affiliate.resetPasswordExpiresAt).getTime() < Date.now()) return null;
  affiliate.passwordHash = hashPassword(password);
  delete affiliate.resetPasswordToken;
  delete affiliate.resetPasswordExpiresAt;
  affiliate.updatedAt = now();
  write("affiliates", affiliates);
  return affiliate;
}

function pendingJoiningFees() {
  return read("affiliates", []).filter(a => !affiliateJoined(a));
}

function dashboardFor(affiliate, req) {
  const affiliates = read("affiliates", []);
  const month = monthKey();
  const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return {
    affiliate: publicAffiliate(affiliate, { includeBankDetails: true }),
    approved: affiliateApproved(affiliate),
    joined: affiliateJoined(affiliate),
    referralCode: affiliate.referralCode || "",
    referralLink: `${baseUrl}/join?ref=${encodeURIComponent(affiliate.referralCode || "")}`,
    stats: calculateCommission(affiliate, affiliates, month),
    directs: directReferrals(affiliate, affiliates).map(a => ({
      ...publicAffiliate(a),
      joined: affiliateJoined(a),
      activeThisMonth: affiliateActive(a, month)
    })),
    downline: downlineTree(affiliate, affiliates),
    checklist: onboardingChecklist(affiliate),
    statements: read("commissionStatements", []).filter(s => s.affiliateId === affiliate.id),
    payoutHistory: read("payoutHistory", []).filter(p => p.affiliateId === affiliate.id),
    orders: read("orders", []).filter(o =>
      String(o.customer?.email || "").toLowerCase() === String(affiliate.email || "").toLowerCase() ||
      String(o.referralCode || "").toUpperCase() === String(affiliate.referralCode || "").toUpperCase()
    )
  };
}

module.exports = {
  monthKey,
  affiliateJoined,
  affiliateApproved,
  affiliateActive,
  directReferrals,
  downlineTree,
  calculateCommission,
  onboardingChecklist,
  registerAffiliate,
  loginAffiliate,
  approveJoiningFee,
  saveBankDetails,
  generateCommissionStatement,
  payoutRecord,
  resetPasswordRequest,
  resetPassword,
  pendingJoiningFees,
  dashboardFor
};
