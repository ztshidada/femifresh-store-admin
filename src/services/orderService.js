const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { read, write, dataDir } = require("../db");
const { validateCartItems, adjustStock } = require("./productService");
const { getSettings, paymentInstructions } = require("./settingsService");
const { createNotification } = require("./notificationService");

const orderStatuses = ["new", "pop_submitted", "under_review", "paid", "packing", "packed", "fulfilled", "tracking_added", "delivered", "cancelled"];
const paymentStatuses = ["pending", "pop_submitted", "under_review", "paid", "failed", "refunded", "cancelled"];

function now() {
  return new Date().toISOString();
}

function money(n) {
  return Number(Number(n || 0).toFixed(2));
}

function nextOrderNumber() {
  const orders = read("orders", []);
  const yyyy = new Date().getFullYear();
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");
  const count = orders.filter(o => String(o.orderNumber || "").includes(`FF-${yyyy}${mm}`)).length + 1;
  return `FF-${yyyy}${mm}-${String(count).padStart(4, "0")}`;
}

function deliveryFeeFor(input = {}) {
  const settings = getSettings();
  const methods = read("deliveryMethods", []);
  const deliveryZones = settings.deliveryZones || [];
  const id = input.deliveryMethodId || input.deliveryZoneId || "";
  const region = String(input.region || input.customer?.region || "").toLowerCase();

  const method = methods.find(m => m.id === id && m.active !== false);
  if (method) return { id: method.id, name: method.name, price: money(method.price), rule: "deliveryMethod" };

  const zone = deliveryZones.find(z =>
    z.active !== false &&
    (String(z.id) === String(id) || (Array.isArray(z.regions) && z.regions.some(r => String(r).toLowerCase() === region || String(r).toLowerCase() === "all")))
  );
  if (zone) return { id: zone.id, name: zone.name, price: money(zone.fee), rule: "deliveryZone" };

  const fallback = methods.find(m => m.active !== false) || deliveryZones.find(z => z.active !== false) || { id: "delivery", name: "Delivery", price: 0, fee: 0 };
  return { id: fallback.id, name: fallback.name, price: money(fallback.price ?? fallback.fee), rule: "fallback" };
}

function activeDiscounts() {
  const settings = getSettings();
  return Array.isArray(settings.discountCodes) ? settings.discountCodes.filter(d => d.active !== false) : [];
}

function discountFor(code, subtotal) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return { code: "", amount: 0 };
  const discount = activeDiscounts().find(d => String(d.code || "").trim().toUpperCase() === clean);
  if (!discount) return { code: clean, amount: 0, invalid: true };
  let amount = 0;
  if (discount.type === "percent") amount = subtotal * (Number(discount.value || 0) / 100);
  else amount = Number(discount.value || 0);
  amount = Math.min(subtotal, Math.max(0, amount));
  return { code: clean, amount: money(amount), campaignId: discount.campaignId || "", label: discount.name || clean };
}

function calculateOrder(items, input = {}) {
  const cleanItems = validateCartItems(items);
  const subtotal = money(cleanItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
  const delivery = deliveryFeeFor(input);
  const discount = discountFor(input.discountCode || input.campaignCode, subtotal);
  const total = money(subtotal + Number(delivery.price || 0) - Number(discount.amount || 0));
  return { items: cleanItems, subtotal, delivery, discount, total };
}

function publicOrder(order) {
  if (!order) return null;
  return order;
}

function findOrderByReference(reference) {
  const ref = String(reference || "");
  return read("orders", []).find(o => [o.id, o.orderNumber, o.orderNo, o.reference].filter(Boolean).map(String).includes(ref)) || null;
}

function contactMatches(order, contact) {
  const clean = String(contact || "").trim().toLowerCase();
  if (!clean || !order) return false;
  const values = [
    order.customer?.email,
    order.customer?.phone,
    order.email,
    order.phone,
    order.customerEmail,
    order.customerPhone
  ].filter(Boolean).map(v => String(v).trim().toLowerCase());
  return values.includes(clean);
}

function createOrder(input) {
  const customer = input.customer || {};
  if (!customer.name || !customer.phone || !customer.email) {
    throw new Error("Customer name, phone and email are required.");
  }

  const totals = calculateOrder(input.items, { ...input, customer });
  const order = {
    id: uuid(),
    orderNumber: nextOrderNumber(),
    customerId: input.customerId || "",
    affiliateId: input.affiliateId || "",
    customer,
    items: totals.items,
    subtotal: totals.subtotal,
    delivery: totals.delivery,
    discount: totals.discount,
    total: totals.total,
    referralCode: input.referralCode || "",
    campaignCode: input.campaignCode || "",
    paymentMethod: "manual",
    paymentStatus: "pending",
    orderStatus: "new",
    fulfillmentStatus: "new",
    trackingNumber: "",
    adminNote: "",
    notes: [],
    paymentInstructions: paymentInstructions("", totals.total, "order"),
    createdAt: now(),
    updatedAt: now()
  };
  order.paymentInstructions = paymentInstructions(order.orderNumber, order.total, "order");

  const orders = read("orders", []);
  orders.unshift(order);
  write("orders", orders);

  createNotification({
    audience: "admin",
    title: "New manual payment order",
    message: `${order.orderNumber} was created and is awaiting proof of payment.`,
    type: "order",
    data: { orderId: order.id, orderNumber: order.orderNumber }
  });

  return order;
}

function updateOrder(id, patch, actor = {}) {
  const orders = read("orders", []);
  const order = orders.find(o => [o.id, o.orderNumber].map(String).includes(String(id)));
  if (!order) return null;

  const allowed = ["paymentStatus", "orderStatus", "fulfillmentStatus", "trackingNumber", "adminNote", "returnStatus", "refundStatus"];
  for (const key of allowed) {
    if (patch[key] !== undefined) order[key] = patch[key];
  }

  if (patch.paymentStatus === "paid" && !order.paidAt) {
    order.paidAt = now();
    if (!order.stockDeductedAt) {
      adjustStock(order.items, -1);
      order.stockDeductedAt = now();
    }
  }

  if (patch.fulfillmentStatus === "fulfilled" || patch.orderStatus === "fulfilled") order.fulfilledAt = order.fulfilledAt || now();
  if (patch.trackingNumber) order.orderStatus = "tracking_added";

  order.notes = Array.isArray(order.notes) ? order.notes : [];
  order.notes.push({
    type: "admin_update",
    actor: actor.email || actor.name || "admin",
    patch,
    createdAt: now()
  });
  order.updatedAt = now();
  write("orders", orders);
  return order;
}

function popUploadDir() {
  const dir = path.join(dataDir, "private", "pop");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function savePopFile({ fileName, fileType, fileData }) {
  if (!fileData) return null;
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(fileType)) throw new Error("Only JPG, PNG, WEBP or PDF proof files are allowed.");
  const base64 = String(fileData).replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > 1.5 * 1024 * 1024) throw new Error("Proof file must be smaller than 1.5MB.");
  const safeExt = fileType === "application/pdf" ? ".pdf" : fileType === "image/png" ? ".png" : fileType === "image/webp" ? ".webp" : ".jpg";
  const storedName = `${Date.now()}-${uuid()}${safeExt}`;
  fs.writeFileSync(path.join(popUploadDir(), storedName), buffer);
  return { originalName: fileName || "proof", fileType, storedName, size: buffer.length };
}

function submitPop({ kind = "order", reference, contact = "", note = "", fileName = "", fileType = "", fileData = "" }) {
  const submissions = read("popSubmissions", []);
  const file = savePopFile({ fileName, fileType, fileData });
  const row = {
    id: uuid(),
    kind,
    reference,
    contact,
    note,
    file,
    status: "submitted",
    createdAt: now(),
    updatedAt: now()
  };
  submissions.unshift(row);
  write("popSubmissions", submissions);

  if (kind === "order") {
    const order = findOrderByReference(reference);
    if (order) updateOrder(order.id, { paymentStatus: "pop_submitted", orderStatus: "pop_submitted" }, { email: "customer" });
  }

  createNotification({
    audience: "admin",
    title: "Proof of payment submitted",
    message: `${reference} has a new POP submission.`,
    type: "pop",
    data: { popId: row.id, reference, kind }
  });

  return row;
}

function reviewPop(id, status, actor = {}) {
  const submissions = read("popSubmissions", []);
  const row = submissions.find(p => p.id === id);
  if (!row) return null;
  row.status = status;
  row.reviewedBy = actor.email || "";
  row.reviewedAt = now();
  row.updatedAt = now();
  write("popSubmissions", submissions);
  return row;
}

function trackOrder(reference, contact) {
  const order = findOrderByReference(reference);
  if (!order || !contactMatches(order, contact)) return null;
  return publicOrder(order);
}

function deleteOrder(id, actor = {}) {
  const orders = read("orders", []);
  const index = orders.findIndex(o => [o.id, o.orderNumber].map(String).includes(String(id)));
  if (index < 0) return null;
  const [deleted] = orders.splice(index, 1);
  const deletedOrders = read("deletedOrders", []);
  deletedOrders.unshift({ ...deleted, deletedAt: now(), deletedBy: actor.email || actor.name || "super_admin" });
  write("orders", orders);
  write("deletedOrders", deletedOrders);
  return deleted;
}

function unpaidOrders() {
  return read("orders", []).filter(o => !["paid", "cancelled", "refunded"].includes(String(o.paymentStatus || "pending")));
}

module.exports = {
  orderStatuses,
  paymentStatuses,
  calculateOrder,
  createOrder,
  updateOrder,
  findOrderByReference,
  trackOrder,
  submitPop,
  reviewPop,
  deleteOrder,
  unpaidOrders,
  contactMatches,
  paymentInstructions
};
