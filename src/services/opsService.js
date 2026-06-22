const { v4: uuid } = require("uuid");
const { read, write } = require("../db");

function now() {
  return new Date().toISOString();
}

function listStore(name) {
  return read(name, []);
}

function saveRow(store, input, id = "") {
  const rows = read(store, []);
  if (id) {
    const row = rows.find(r => String(r.id) === String(id));
    if (!row) return null;
    Object.assign(row, input, { updatedAt: now() });
    write(store, rows);
    return row;
  }
  const row = { id: uuid(), active: input.active !== false, ...input, createdAt: now(), updatedAt: now() };
  rows.unshift(row);
  write(store, rows);
  return row;
}

function updateRow(store, id, patch) {
  return saveRow(store, patch, id);
}

function moderateReview(id, status, actor = {}) {
  const rows = read("reviews", []);
  const row = rows.find(r => r.id === id);
  if (!row) return null;
  row.status = status;
  row.reviewedBy = actor.email || "";
  row.reviewedAt = now();
  row.updatedAt = now();
  write("reviews", rows);
  return row;
}

function submitReview(input) {
  return saveRow("reviews", {
    productId: input.productId || "",
    name: input.name || "",
    rating: Math.max(1, Math.min(5, Number(input.rating || 5))),
    text: input.text || "",
    status: "pending"
  });
}

function submitReturn(input) {
  return saveRow("returns", {
    orderNumber: input.orderNumber,
    contact: input.contact,
    reason: input.reason,
    status: "submitted",
    adminNote: ""
  });
}

function upsertResource(input, id = "") {
  return saveRow("resources", input, id);
}

function fraudFlags() {
  const affiliates = read("affiliates", []);
  const orders = read("orders", []);
  const flags = [];
  const bankMap = new Map();
  for (const a of affiliates) {
    const acct = String(a.bankDetails?.accountNumber || "").trim();
    if (acct) {
      const list = bankMap.get(acct) || [];
      list.push(a);
      bankMap.set(acct, list);
    }
    if (a.referralCode && String(a.sponsorCode || "").toUpperCase() === String(a.referralCode).toUpperCase()) {
      flags.push({ id: `self-${a.id}`, type: "self_referral", severity: "medium", affiliateId: a.id, message: `${a.fullName || a.email} appears to sponsor themselves.` });
    }
  }
  for (const [accountNumber, list] of bankMap.entries()) {
    if (list.length > 1) {
      flags.push({ id: `bank-${accountNumber}`, type: "repeated_bank_details", severity: "review", affiliateIds: list.map(a => a.id), message: `${list.length} distributors share the same bank account number.` });
    }
  }
  const orderEmailMap = new Map();
  for (const order of orders) {
    const email = String(order.customer?.email || "").toLowerCase();
    if (!email) continue;
    orderEmailMap.set(email, (orderEmailMap.get(email) || 0) + 1);
  }
  for (const [email, count] of orderEmailMap.entries()) {
    if (count >= 5) flags.push({ id: `orders-${email}`, type: "unusual_order_volume", severity: "low", message: `${email} has ${count} orders. Review only.` });
  }
  write("fraudFlags", flags);
  return flags;
}

function analytics() {
  const orders = read("orders", []);
  const products = read("products", []);
  const affiliates = read("affiliates", []);
  const paid = orders.filter(o => o.paymentStatus === "paid");
  const salesByProduct = {};
  for (const order of paid) {
    for (const item of order.items || []) {
      salesByProduct[item.name] = (salesByProduct[item.name] || 0) + Number(item.qty || 1);
    }
  }
  return {
    orders: {
      total: orders.length,
      unpaid: orders.filter(o => !["paid", "cancelled", "refunded"].includes(String(o.paymentStatus || "pending"))).length,
      paid: paid.length,
      fulfilled: orders.filter(o => ["fulfilled", "delivered"].includes(String(o.fulfillmentStatus || o.orderStatus))).length,
      paidSales: paid.reduce((sum, o) => sum + Number(o.total || 0), 0)
    },
    products: {
      total: products.length,
      lowStock: products.filter(p => p.active !== false && Number(p.stock || 0) <= Number(p.lowStockThreshold ?? 3)).length,
      salesByProduct
    },
    affiliates: {
      total: affiliates.length,
      pendingJoining: affiliates.filter(a => !(a.joiningFeeStatus === "paid" || a.accountStatus === "approved")).length,
      approved: affiliates.filter(a => a.joiningFeeStatus === "paid" || a.accountStatus === "approved").length
    },
    payouts: {
      pending: read("payoutHistory", []).filter(p => p.status === "pending").length
    }
  };
}

module.exports = {
  listStore,
  saveRow,
  updateRow,
  moderateReview,
  submitReview,
  submitReturn,
  upsertResource,
  fraudFlags,
  analytics
};
