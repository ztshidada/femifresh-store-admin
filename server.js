require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const { read, write, dataDir } = require("./src/db");
require("./src/seed");

const {
  requireAdmin,
  requirePermission,
  requireRole,
  requireAffiliate,
  requireCustomer,
  loginAdmin,
  issueAdminToken,
  setAdminCookie,
  clearAdminCookie,
  sanitizeUser,
  publicCustomer,
  publicAffiliate,
  newToken,
  hashPassword,
  comparePassword
} = require("./src/services/authService");
const productService = require("./src/services/productService");
const orderService = require("./src/services/orderService");
const affiliateService = require("./src/services/affiliateService");
const settingsService = require("./src/services/settingsService");
const notificationService = require("./src/services/notificationService");
const opsService = require("./src/services/opsService");
const commissionRebuildService = require("./src/services/commissionRebuildService");
const { sendMail } = require("./src/mail");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(async (req, res, next) => {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();
  } catch (e) {
    console.error("Storage ready check failed:", e.message);
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function ok(res, data = {}) {
  res.json({ success: true, ...data });
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function routeFile(file) {
  return path.join(__dirname, "public", file);
}

function sendCleanRoute(file) {
  return (req, res) => res.sendFile(routeFile(file));
}

function isAffiliateHost(req) {
  return String(req.get("host") || "").toLowerCase().startsWith("affiliates.");
}

function safeError(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error." });
}

function customerByEmail(email) {
  return read("customers", []).find(c => String(c.email || "").toLowerCase() === String(email || "").toLowerCase());
}

function affiliateByEmail(email) {
  return read("affiliates", []).find(a => String(a.email || "").toLowerCase() === String(email || "").toLowerCase());
}

function requireOrderOps(req, res, next) {
  if (!req.user || !["super_admin", "orders_admin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Orders access only." });
  }
  next();
}

function renderTemplate(template, data = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function adminAffiliateList(includeBankDetails = false) {
  const affiliates = read("affiliates", []);
  return affiliates.map(a => ({
    ...publicAffiliate(a, { includeBankDetails }),
    joined: affiliateService.affiliateJoined(a),
    approved: affiliateService.affiliateApproved(a),
    stats: affiliateService.calculateCommission(a, affiliates)
  }));
}

function saveDeliveryMethod(input = {}, id = "") {
  const methods = read("deliveryMethods", []);
  const now = new Date().toISOString();
  const payload = {
    name: String(input.name || "").trim(),
    description: String(input.description || "").trim(),
    price: Number(input.price || 0),
    active: input.active !== false
  };

  if (!payload.name) {
    const err = new Error("Delivery method name is required.");
    err.status = 400;
    throw err;
  }

  if (id) {
    const row = methods.find(m => m.id === id);
    if (!row) return null;
    Object.assign(row, payload, { updatedAt: now });
    write("deliveryMethods", methods);
    return row;
  }

  const row = { id: uuid(), ...payload, createdAt: now, updatedAt: now };
  methods.unshift(row);
  write("deliveryMethods", methods);
  return row;
}

function saveDiscount(input = {}, id = "") {
  const settings = settingsService.getSettings();
  const discounts = Array.isArray(settings.discountCodes) ? settings.discountCodes : [];
  const now = new Date().toISOString();
  const payload = {
    code: String(input.code || "").trim().toUpperCase(),
    name: String(input.name || input.code || "").trim(),
    type: input.type === "percent" ? "percent" : "fixed",
    value: Number(input.value || 0),
    minSubtotal: Number(input.minSubtotal || 0),
    campaignId: String(input.campaignId || "").trim(),
    active: input.active !== false
  };

  if (!payload.code || payload.value <= 0) {
    const err = new Error("Discount code and value are required.");
    err.status = 400;
    throw err;
  }

  if (id) {
    const row = discounts.find(d => d.id === id || d.code === id.toUpperCase());
    if (!row) return null;
    Object.assign(row, payload, { updatedAt: now });
  } else {
    discounts.unshift({ id: uuid(), ...payload, createdAt: now, updatedAt: now });
  }

  return settingsService.saveSettings({ discountCodes: discounts }).discountCodes;
}

app.get("/", (req, res) => {
  if (isAffiliateHost(req)) return res.sendFile(routeFile("join.html"));
  res.sendFile(routeFile("index.html"));
});
app.get("/products", sendCleanRoute("products.html"));
app.get("/product/:id", sendCleanRoute("product.html"));
app.get("/cart", sendCleanRoute("cart.html"));
app.get("/checkout", sendCleanRoute("checkout.html"));
app.get("/thank-you", sendCleanRoute("thank-you.html"));
app.get("/track-order", sendCleanRoute("track-order.html"));
app.get("/reviews", sendCleanRoute("reviews.html"));
app.get("/returns", sendCleanRoute("returns.html"));
app.get("/contact", sendCleanRoute("contact.html"));
app.get("/policies", sendCleanRoute("policies.html"));
app.get("/join", sendCleanRoute("join.html"));
app.get("/login", sendCleanRoute("affiliate-login.html"));
app.get("/affiliate-login", sendCleanRoute("affiliate-login.html"));
app.get("/dashboard", sendCleanRoute("affiliate-dashboard.html"));
app.get("/affiliate-dashboard", sendCleanRoute("affiliate-dashboard.html"));
app.get("/success", sendCleanRoute("join-success.html"));
app.get("/join-success", sendCleanRoute("join-success.html"));
app.get("/settings", sendCleanRoute("affiliate-dashboard.html"));
app.get("/reset-password", sendCleanRoute("affiliate-reset-password.html"));

for (const [oldPath, cleanPath] of [
  ["/index.html", "/"],
  ["/products.html", "/products"],
  ["/cart.html", "/cart"],
  ["/checkout.html", "/checkout"],
  ["/thank-you.html", "/thank-you"],
  ["/contact.html", "/contact"],
  ["/policies.html", "/policies"]
]) {
  app.get(oldPath, (req, res) => {
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, cleanPath + query);
  });
}

app.get("/api/health", (req, res) => ok(res, { name: "FemiFresh Platform API", time: new Date().toISOString() }));
app.get("/api/settings/public", (req, res) => ok(res, { settings: settingsService.publicPaymentSettings() }));
app.get("/api/payment-settings", (req, res) => ok(res, { settings: settingsService.publicPaymentSettings().payment }));
app.get("/api/manual-joining-settings", (req, res) => ok(res, { settings: settingsService.publicPaymentSettings() }));

app.get("/api/products", (req, res) => ok(res, { products: productService.publicProducts() }));
app.get("/api/products/:id", (req, res) => {
  const product = productService.findProduct(req.params.id);
  if (!product || product.active === false) return res.status(404).json({ success: false, message: "Product not found." });
  ok(res, { product });
});
app.get("/api/delivery-methods", (req, res) => ok(res, {
  deliveryMethods: read("deliveryMethods", []).filter(d => d.active !== false),
  deliveryZones: settingsService.getSettings().deliveryZones || []
}));
app.post("/api/orders/preview", (req, res) => ok(res, { totals: orderService.calculateOrder(req.body.items || [], req.body || {}) }));
app.post("/api/orders", asyncRoute(async (req, res) => {
  const order = orderService.createOrder(req.body || {});
  await sendMail({
    to: order.customer.email,
    subject: `FemiFresh order ${order.orderNumber} received`,
    html: `<p>Thank you for your FemiFresh order <b>${order.orderNumber}</b>.</p><p>Total: R${order.total}</p><p>Please send proof of payment to WhatsApp ${order.paymentInstructions.bank.proofWhatsapp} using reference ${order.orderNumber}.</p>`,
    text: `Thank you for your FemiFresh order ${order.orderNumber}. Total R${order.total}. Send proof of payment using reference ${order.orderNumber}.`
  });
  ok(res, { order, payment: "manual", checkoutUrl: `/thank-you?order=${encodeURIComponent(order.orderNumber)}`, paymentInstructions: order.paymentInstructions });
}));
app.post("/api/orders/track", (req, res) => {
  const order = orderService.trackOrder(req.body.orderNumber || req.body.reference, req.body.contact);
  if (!order) return res.status(404).json({ success: false, message: "Order not found. Check your order number and matching phone/email." });
  ok(res, { order });
});
app.post("/api/pop-submissions", (req, res) => ok(res, { submission: orderService.submitPop(req.body || {}) }));
app.get("/api/reviews", (req, res) => ok(res, { reviews: read("reviews", []).filter(r => r.status === "approved") }));
app.post("/api/reviews", (req, res) => ok(res, { review: opsService.submitReview(req.body || {}) }));
app.post("/api/returns", (req, res) => ok(res, { returnRequest: opsService.submitReturn(req.body || {}) }));

app.post("/api/customer/register", (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body || {};
  if (!firstName || !lastName || !email || !phone || !password) return res.status(400).json({ success: false, message: "Please complete all account fields." });
  const customers = read("customers", []);
  if (customerByEmail(email)) return res.status(400).json({ success: false, message: "An account with this email already exists." });
  const customer = { id: uuid(), firstName, lastName, email, phone, passwordHash: hashPassword(password), token: newToken(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  customers.unshift(customer);
  write("customers", customers);
  ok(res, { customer: publicCustomer(customer), token: customer.token });
});
app.post("/api/customer/login", (req, res) => {
  const customer = customerByEmail(req.body.email);
  if (!customer || !comparePassword(req.body.password, customer.passwordHash)) return res.status(401).json({ success: false, message: "Wrong email or password." });
  const customers = read("customers", []);
  const row = customers.find(c => c.id === customer.id);
  row.token = newToken();
  row.updatedAt = new Date().toISOString();
  write("customers", customers);
  ok(res, { customer: publicCustomer(row), token: row.token });
});
app.get("/api/customer/me", requireCustomer, (req, res) => ok(res, { customer: publicCustomer(req.customer) }));
app.get("/api/customer/orders", requireCustomer, (req, res) => ok(res, { orders: read("orders", []).filter(o => String(o.customer?.email || "").toLowerCase() === String(req.customer.email || "").toLowerCase()) }));
app.get("/api/customer/notifications", requireCustomer, (req, res) => ok(res, { notifications: notificationService.listNotifications({ audience: "customer", userId: req.customer.id }) }));

app.post("/api/affiliate/register", (req, res) => {
  const affiliate = affiliateService.registerAffiliate(req.body || {});
  ok(res, { affiliate: publicAffiliate(affiliate), token: affiliate.token, payment: "manual", paymentInstructions: affiliate.paymentInstructions, checkoutUrl: "/join-success" });
});
app.post("/api/affiliate/login", (req, res) => {
  const affiliate = affiliateService.loginAffiliate(req.body.email, req.body.password);
  if (!affiliate) return res.status(401).json({ success: false, message: "Wrong email or password." });
  ok(res, { affiliate: publicAffiliate(affiliate), token: affiliate.token });
});
app.get("/api/affiliate/me", requireAffiliate, (req, res) => ok(res, { affiliate: publicAffiliate(req.affiliate, { includeBankDetails: true }) }));
app.get("/api/affiliate/dashboard", requireAffiliate, (req, res) => ok(res, affiliateService.dashboardFor(req.affiliate, req)));
app.get("/api/affiliate/dashboard-v2", requireAffiliate, (req, res) => ok(res, affiliateService.dashboardFor(req.affiliate, req)));
app.post("/api/affiliate/referral-link-copied", requireAffiliate, (req, res) => {
  const affiliates = read("affiliates", []);
  const row = affiliates.find(a => a.id === req.affiliate.id);
  row.referralLinkCopiedAt = new Date().toISOString();
  write("affiliates", affiliates);
  ok(res, { affiliate: publicAffiliate(row) });
});
app.post("/api/affiliate/bank-details", requireAffiliate, (req, res) => ok(res, { affiliate: publicAffiliate(affiliateService.saveBankDetails(req.affiliate.id, req.body || {}), { includeBankDetails: true }) }));
app.post("/api/affiliate/femi-bank-details", requireAffiliate, (req, res) => ok(res, { affiliate: publicAffiliate(affiliateService.saveBankDetails(req.affiliate.id, req.body || {}), { includeBankDetails: true }) }));
app.get("/api/affiliate/resources", requireAffiliate, (req, res) => ok(res, { resources: read("resources", []).filter(r => r.active !== false) }));
app.get("/api/affiliate/notifications", requireAffiliate, (req, res) => ok(res, { notifications: notificationService.listNotifications({ audience: "affiliate", userId: req.affiliate.id }) }));
app.post("/api/affiliate/forgot-password", asyncRoute(async (req, res) => {
  const affiliate = affiliateService.resetPasswordRequest(req.body.email);
  if (affiliate) {
    const link = `${(process.env.AFFILIATE_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(affiliate.resetPasswordToken)}`;
    await sendMail({ to: affiliate.email, subject: "Reset your FemiFresh affiliate password", html: `<p>Reset your password: <a href="${link}">${link}</a></p>`, text: `Reset your password: ${link}` });
  }
  ok(res, { message: "If this email exists, a reset link has been sent." });
}));
app.post("/api/affiliate/reset-password", (req, res) => {
  if (!req.body.password || String(req.body.password).length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  const affiliate = affiliateService.resetPassword(req.body.token, req.body.password);
  if (!affiliate) return res.status(400).json({ success: false, message: "Invalid or expired reset link." });
  ok(res, { message: "Password updated. You can login now." });
});
app.get("/api/affiliate/femi-features", requireAffiliate, (req, res) => {
  const dashboard = affiliateService.dashboardFor(req.affiliate, req);
  ok(res, { affiliate: dashboard.affiliate, referralLink: dashboard.referralLink, directReferrals: dashboard.directs, downline: dashboard.downline });
});

app.post("/api/admin/login", (req, res) => {
  const user = loginAdmin(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ success: false, message: "Wrong email or password." });
  const token = issueAdminToken(user);
  setAdminCookie(res, token);
  ok(res, { user: sanitizeUser(user) });
});
app.post("/api/admin/logout", (req, res) => {
  clearAdminCookie(res);
  ok(res);
});
app.get("/api/admin/me", requireAdmin, (req, res) => ok(res, { user: req.user }));
app.get("/api/admin/dashboard", requireAdmin, requirePermission("dashboard:read"), (req, res) => {
  ok(res, { stats: opsService.analytics(), lowStock: productService.lowStockProducts(), unpaidOrders: orderService.unpaidOrders(), pendingJoiningFees: affiliateService.pendingJoiningFees().map(a => publicAffiliate(a)) });
});
app.get("/api/admin/analytics", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { analytics: opsService.analytics() }));
app.get("/api/admin/fraud-flags", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { flags: opsService.fraudFlags() }));

app.get("/api/admin/orders", requireAdmin, requirePermission("orders:read"), (req, res) => ok(res, { orders: read("orders", []) }));
app.patch("/api/admin/orders/:id", requireAdmin, requirePermission("orders:update"), (req, res) => {
  const order = orderService.updateOrder(req.params.id, req.body || {}, req.user);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  ok(res, { order });
});
app.delete("/api/admin/orders/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const deletedOrder = orderService.deleteOrder(req.params.id, req.user);
  if (!deletedOrder) return res.status(404).json({ success: false, message: "Order not found." });
  ok(res, { deletedOrder, message: "Order deleted with backup." });
});
app.post("/api/admin/orders/:id/delete", requireAdmin, requireRole("super_admin"), (req, res) => {
  const deletedOrder = orderService.deleteOrder(req.params.id, req.user);
  if (!deletedOrder) return res.status(404).json({ success: false, message: "Order not found." });
  ok(res, { deletedOrder, message: "Order deleted with backup." });
});

// FEMIFRESH_POP_FILE_VIEW_V1
app.get("/api/admin/pop-submissions/:id/file", requireAdmin, requirePermission("pop:review"), (req, res) => {
  const submission = read("popSubmissions", []).find(p => String(p.id) === String(req.params.id));

  if (!submission || !submission.file || !submission.file.storedName) {
    return res.status(404).json({ success: false, message: "Proof file not found." });
  }

  const safeName = path.basename(String(submission.file.storedName));
  const filePath = path.join(dataDir, "private", "pop", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Proof file is unavailable." });
  }

  res.setHeader("Content-Type", submission.file.fileType || "application/octet-stream");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(filePath);
});

app.post("/api/admin/orders/:id/pop-whatsapp", requireAdmin, requirePermission("pop:review"), (req, res) => {
  const orders = read("orders", []);
  const order = orders.find(o =>
    String(o.id) === String(req.params.id) ||
    String(o.orderNumber) === String(req.params.id)
  );

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  const createdAt = new Date().toISOString();
  const submissions = read("popSubmissions", []);

  const submission = {
    id: uuid(),
    kind: "order",
    reference: order.orderNumber,
    contact: order.customer?.email || order.customer?.phone || "",
    note: String(req.body?.note || "Proof of payment received via WhatsApp."),
    file: null,
    channel: "whatsapp",
    status: "submitted",
    createdAt,
    updatedAt: createdAt
  };

  submissions.unshift(submission);
  write("popSubmissions", submissions);

  const updatedOrder = orderService.updateOrder(order.id, {
    paymentStatus: "pop_submitted",
    orderStatus: "pop_submitted",
    popChannel: "whatsapp",
    popReceivedAt: createdAt
  }, req.user);

  ok(res, { submission, order: updatedOrder });
});


app.get("/api/admin/pop-submissions", requireAdmin, requirePermission("pop:review"), (req, res) => ok(res, { submissions: read("popSubmissions", []) }));
app.post("/api/admin/pop-submissions/:id/review", requireAdmin, requirePermission("pop:review"), (req, res) => {
  const submission = orderService.reviewPop(req.params.id, req.body.status || "under_review", req.user);
  if (!submission) return res.status(404).json({ success: false, message: "POP submission not found." });
  if (req.body.status === "approved") {
    if (submission.kind === "order") orderService.updateOrder(submission.reference, { paymentStatus: "paid", orderStatus: "paid" }, req.user);
    if (submission.kind === "joining_fee") {
      const affiliate = affiliateByEmail(submission.contact) || read("affiliates", []).find(a => a.id === submission.reference || a.referralCode === submission.reference);
      if (affiliate) affiliateService.approveJoiningFee(affiliate.id, req.user);
    }
  }
  ok(res, { submission });
});


app.get("/api/admin/commission-rebuild/preview", requireAdmin, requireRole("super_admin"), (req, res) => {
  ok(res, commissionRebuildService.previewCommissionRebuild());
});

app.post("/api/admin/commission-rebuild/apply", requireAdmin, requireRole("super_admin"), (req, res) => {
  ok(res, commissionRebuildService.applyCommissionRebuild(req.user));
});

app.get("/api/admin/products", requireAdmin, requirePermission("products:read"), (req, res) => ok(res, { products: productService.allProducts({ includeInactive: true }) }));
app.post("/api/admin/products", requireAdmin, requirePermission("products:write"), (req, res) => ok(res, { product: productService.saveProduct(req.body || {}) }));
app.patch("/api/admin/products/:id", requireAdmin, requirePermission("products:write"), (req, res) => {
  const product = productService.saveProduct(req.body || {}, req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  ok(res, { product });
});
app.delete("/api/admin/products/:id", requireAdmin, requirePermission("products:write"), (req, res) => {
  const product = productService.archiveProduct(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  ok(res, { product });
});
app.get("/api/admin/low-stock", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { products: productService.lowStockProducts() }));
app.get("/api/admin/product-migration/preview", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, productService.productMigrationPreview()));
app.post("/api/admin/product-migration/apply", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, productService.applyProductMigration()));

app.get("/api/admin/delivery-methods", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, {
  deliveryMethods: read("deliveryMethods", []),
  deliveryZones: settingsService.getSettings().deliveryZones || []
}));
app.post("/api/admin/delivery-methods", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { deliveryMethod: saveDeliveryMethod(req.body || {}) }));
app.patch("/api/admin/delivery-methods/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const deliveryMethod = saveDeliveryMethod(req.body || {}, req.params.id);
  if (!deliveryMethod) return res.status(404).json({ success: false, message: "Delivery method not found." });
  ok(res, { deliveryMethod });
});
app.delete("/api/admin/delivery-methods/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const deliveryMethod = saveDeliveryMethod({ ...(read("deliveryMethods", []).find(m => m.id === req.params.id) || {}), active: false }, req.params.id);
  if (!deliveryMethod) return res.status(404).json({ success: false, message: "Delivery method not found." });
  ok(res, { deliveryMethod });
});

app.get("/api/admin/discounts", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { discounts: settingsService.getSettings().discountCodes || [] }));
app.post("/api/admin/discounts", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { discounts: saveDiscount(req.body || {}) }));
app.patch("/api/admin/discounts/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const discounts = saveDiscount(req.body || {}, req.params.id);
  if (!discounts) return res.status(404).json({ success: false, message: "Discount not found." });
  ok(res, { discounts });
});
app.delete("/api/admin/discounts/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const current = (settingsService.getSettings().discountCodes || []).find(d => d.id === req.params.id || d.code === String(req.params.id).toUpperCase());
  const discounts = current ? saveDiscount({ ...current, active: false }, req.params.id) : null;
  if (!discounts) return res.status(404).json({ success: false, message: "Discount not found." });
  ok(res, { discounts });
});

app.get("/api/admin/affiliates", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { affiliates: adminAffiliateList(true) }));
app.get("/api/aff-admin/overview", requireAdmin, requireRole("super_admin"), (req, res) => {
  const analytics = opsService.analytics();
  ok(res, { overview: { totalAffiliates: analytics.affiliates.total, approved: analytics.affiliates.approved, pendingJoining: analytics.affiliates.pendingJoining, totalPayable: read("commissionStatements", []).reduce((s, x) => s + Number(x.stats?.totalPayable || 0), 0) } });
});
app.get("/api/aff-admin/affiliates", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { affiliates: adminAffiliateList(true) }));
app.get("/api/aff-admin/affiliates/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id || a.referralCode === req.params.id);
  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });
  ok(res, { affiliate: publicAffiliate(affiliate, { includeBankDetails: true }), stats: affiliateService.calculateCommission(affiliate, affiliates), tree: affiliateService.downlineTree(affiliate, affiliates), directs: affiliateService.directReferrals(affiliate, affiliates).map(a => publicAffiliate(a)) });
});
app.post("/api/aff-admin/affiliates/:id/mark-joining-paid", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { affiliate: publicAffiliate(affiliateService.approveJoiningFee(req.params.id, req.user), { includeBankDetails: true }) }));
app.post("/api/admin/affiliates/:id/mark-joining-paid", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { affiliate: publicAffiliate(affiliateService.approveJoiningFee(req.params.id, req.user), { includeBankDetails: true }) }));
app.post("/api/aff-admin/affiliates/:id/mark-active", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const row = affiliates.find(a => a.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Affiliate not found." });
  const month = req.body.month || affiliateService.monthKey();
  row.activeMonths = Array.isArray(row.activeMonths) ? row.activeMonths : [];
  if (!row.activeMonths.includes(month)) row.activeMonths.push(month);
  row.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);
  ok(res, { affiliate: publicAffiliate(row, { includeBankDetails: true }) });
});
app.post("/api/aff-admin/affiliates/:id/mark-inactive", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const row = affiliates.find(a => a.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Affiliate not found." });
  const month = req.body.month || affiliateService.monthKey();
  row.activeMonths = (Array.isArray(row.activeMonths) ? row.activeMonths : []).filter(m => m !== month);
  row.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);
  ok(res, { affiliate: publicAffiliate(row, { includeBankDetails: true }) });
});
app.post("/api/aff-admin/affiliates/:id/block-payout", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const row = affiliates.find(a => a.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Affiliate not found." });
  row.payoutBlocked = true;
  row.payoutBlockedReason = req.body.reason || "Blocked by admin review.";
  row.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);
  ok(res, { affiliate: publicAffiliate(row, { includeBankDetails: true }) });
});
app.post("/api/aff-admin/affiliates/:id/unblock-payout", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const row = affiliates.find(a => a.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Affiliate not found." });
  row.payoutBlocked = false;
  row.payoutBlockedReason = "";
  row.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);
  ok(res, { affiliate: publicAffiliate(row, { includeBankDetails: true }) });
});
app.delete("/api/aff-admin/affiliates/:id", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const index = affiliates.findIndex(a => a.id === req.params.id);
  if (index < 0) return res.status(404).json({ success: false, message: "Affiliate not found." });
  const [deleted] = affiliates.splice(index, 1);
  const deletedAffiliates = read("deletedAffiliates", []);
  deletedAffiliates.unshift({ affiliate: deleted, deletedAt: new Date().toISOString(), deletedBy: req.user.email });
  for (const a of affiliates) {
    if (a.sponsorId === deleted.id) a.sponsorId = "";
    if (String(a.sponsorCode || "").toUpperCase() === String(deleted.referralCode || "").toUpperCase()) a.sponsorCode = "";
  }
  write("affiliates", affiliates);
  write("deletedAffiliates", deletedAffiliates);
  ok(res, { deletedAffiliate: publicAffiliate(deleted), message: "Affiliate deleted with backup." });
});
app.post("/api/aff-admin/recalculate", requireAdmin, requireRole("super_admin"), (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.body.month || affiliateService.monthKey();
  const summary = affiliates.map(a => affiliateService.generateCommissionStatement(a.id, month));
  ok(res, { month, summary });
});
app.get("/api/admin/joining-fees", requireAdmin, requirePermission("joining_fees:read"), (req, res) => ok(res, { affiliates: affiliateService.pendingJoiningFees().map(a => publicAffiliate(a)) }));
app.post("/api/admin/joining-fees/:id/approve", requireAdmin, requirePermission("joining_fees:update"), (req, res) => {
  const affiliate = affiliateService.approveJoiningFee(req.params.id, req.user);
  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });
  ok(res, { affiliate: publicAffiliate(affiliate) });
});
app.post("/api/aff-admin/affiliates/:id/statement", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { statement: affiliateService.generateCommissionStatement(req.params.id, req.body.month) }));
app.get("/api/admin/commission-statements", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { statements: read("commissionStatements", []) }));
app.post("/api/admin/payouts", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { payout: affiliateService.payoutRecord(req.body || {}, req.user) }));
app.get("/api/admin/payouts", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { payouts: read("payoutHistory", []) }));
app.get("/api/admin/distributor-bank-details", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { affiliates: adminAffiliateList(true).map(a => ({ id: a.id, fullName: a.fullName, email: a.email, referralCode: a.referralCode, bankDetails: a.bankDetails || {} })) }));

app.get("/api/admin/limited/orders", requireAdmin, requirePermission("orders:read"), requireOrderOps, (req, res) => ok(res, { orders: read("orders", []) }));
app.post("/api/admin/limited/orders/:id/paid", requireAdmin, requirePermission("orders:update"), requireOrderOps, (req, res) => ok(res, { order: orderService.updateOrder(req.params.id, { paymentStatus: "paid", orderStatus: "paid" }, req.user) }));
app.post("/api/admin/limited/orders/:id/fulfilled", requireAdmin, requirePermission("orders:update"), requireOrderOps, (req, res) => ok(res, { order: orderService.updateOrder(req.params.id, { fulfillmentStatus: "fulfilled", orderStatus: "fulfilled" }, req.user) }));
app.get("/api/admin/limited/joining-fees", requireAdmin, requirePermission("joining_fees:read"), requireOrderOps, (req, res) => ok(res, { affiliates: affiliateService.pendingJoiningFees().map(a => publicAffiliate(a)) }));
app.post("/api/admin/limited/affiliates/:id/mark-joined", requireAdmin, requirePermission("joining_fees:update"), requireOrderOps, (req, res) => ok(res, { affiliate: publicAffiliate(affiliateService.approveJoiningFee(req.params.id, req.user)) }));

app.get("/api/admin/users", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { users: read("users", []).map(sanitizeUser) }));
app.post("/api/admin/users", requireAdmin, requireRole("super_admin"), (req, res) => {
  const { name, email, password, role } = req.body || {};
  const users = read("users", []);
  if (!name || !email || !password || !role) return res.status(400).json({ success: false, message: "Name, email, password and role are required." });
  if (users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) return res.status(400).json({ success: false, message: "Email already exists." });
  const user = { id: uuid(), name, email, role, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  users.push(user);
  write("users", users);
  ok(res, { user: sanitizeUser(user) });
});
app.get("/api/admin/settings", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { settings: settingsService.getSettings() }));
app.post("/api/admin/settings", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { settings: settingsService.saveSettings(req.body || {}) }));
app.get("/api/admin/payment-settings", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { settings: settingsService.getSettings().payment }));
app.post("/api/admin/payment-settings", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { settings: settingsService.saveSettings({ payment: req.body || {} }).payment }));
app.get("/api/admin/payment-logs", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { paymentLogs: read("paymentLogs", []) }));
app.get("/api/admin/email-logs", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { emailLogs: read("emailLogs", []) }));
app.get("/api/admin/notifications", requireAdmin, requirePermission("dashboard:read"), (req, res) => ok(res, { notifications: notificationService.listNotifications({ audience: "admin" }) }));
app.post("/api/admin/notifications/:id/read", requireAdmin, requirePermission("dashboard:read"), (req, res) => ok(res, { notification: notificationService.markNotificationRead(req.params.id) }));
app.get("/api/admin/reviews", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { reviews: read("reviews", []) }));
app.post("/api/admin/reviews/:id/moderate", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { review: opsService.moderateReview(req.params.id, req.body.status, req.user) }));
app.get("/api/admin/returns", requireAdmin, requirePermission("orders:read"), (req, res) => ok(res, { returns: read("returns", []) }));
app.patch("/api/admin/returns/:id", requireAdmin, requirePermission("orders:update"), (req, res) => ok(res, { returnRequest: opsService.updateRow("returns", req.params.id, req.body || {}) }));
app.get("/api/admin/resources", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { resources: read("resources", []) }));
app.post("/api/admin/resources", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { resource: opsService.upsertResource(req.body || {}) }));
app.patch("/api/admin/resources/:id", requireAdmin, requireRole("super_admin"), (req, res) => ok(res, { resource: opsService.upsertResource(req.body || {}, req.params.id) }));
app.get("/api/admin/followups", requireAdmin, requirePermission("followups:read"), (req, res) => {
  const settings = settingsService.getSettings();
  const unpaidOrders = orderService.unpaidOrders();
  const pendingJoiningFees = affiliateService.pendingJoiningFees();
  ok(res, {
    unpaidOrders: unpaidOrders.map(order => ({
      order,
      whatsappUrl: `https://wa.me/27${String(order.customer?.phone || "").replace(/\D/g, "").replace(/^27/, "")}?text=${encodeURIComponent(renderTemplate(settings.notificationTemplates.unpaidOrderWhatsapp, { name: order.customer?.name || "there", orderNumber: order.orderNumber, total: `R${order.total}` }))}`
    })),
    pendingJoiningFees: pendingJoiningFees.map(a => ({
      affiliate: publicAffiliate(a),
      whatsappUrl: `https://wa.me/27${String(a.phone || "").replace(/\D/g, "").replace(/^27/, "")}?text=${encodeURIComponent(renderTemplate(settings.notificationTemplates.joiningFeeWhatsapp, { name: a.fullName || a.firstName || "there" }))}`
    }))
  });
});

app.post("/api/webhooks/yoco", (req, res) => {
  const logs = read("paymentLogs", []);
  logs.unshift({ id: uuid(), provider: "yoco", type: "webhook_received_disabled", event: req.body || {}, createdAt: new Date().toISOString() });
  write("paymentLogs", logs.slice(0, 500));
  ok(res, { received: true, yocoEnabled: false });
});

app.use(safeError);

app.listen(PORT, () => {
  console.log(`FemiFresh platform running on port ${PORT}`);
});
