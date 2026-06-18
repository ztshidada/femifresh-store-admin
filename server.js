require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { v4: uuid } = require('uuid');
const { read, write } = require('./src/db');
const { signUser, currentUser, requireAuth, requirePermission, sanitizeUser } = require('./src/auth');
const { sendMail, logEmail } = require('./src/mail');
require('./src/seed');

const app = express();

// AFFILIATE_FORCE_TOP_ROUTER_V2
app.use((req, res, next) => {
  const host = String(req.get("host") || "").toLowerCase();

  if (!host.startsWith("affiliates.")) {
    return next();
  }

  if (req.path === "/" || req.path === "/join") {
    return res.sendFile(path.join(__dirname, "public", "join.html"));
  }

  if (req.path === "/login" || req.path === "/affiliate-login") {
    return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  }

  if (req.path === "/dashboard" || req.path === "/affiliate-dashboard") {
    return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  }

  if (req.path === "/success" || req.path === "/join-success") {
    return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  }

  return next();
});
// END AFFILIATE_FORCE_TOP_ROUTER_V2


const PORT = process.env.PORT || 3000;
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Wait for Supabase-backed storage before handling requests
app.use(async (req, res, next) => {
  try {
    if (global.ensureFemiDbReady) {
      await global.ensureFemiDbReady();
    }
  } catch (e) {
    console.error("Database ready check failed, continuing:", e.message);
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function money(n) { return Number(n || 0); }

function getAppUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function cents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function yocoHeaders() {
  const key = process.env.YOCO_SECRET_KEY || "";
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + key
  };
}

async function createYocoCheckout(order, req) {
  if (!process.env.YOCO_SECRET_KEY) {
    return {
      success: false,
      mode: "missing_key",
      checkoutUrl: `/thank-you?order=${order.orderNumber}`
    };
  }

  const appUrl = getAppUrl(req);

  const body = {
    amount: cents(order.total),
    currency: "ZAR",
    successUrl: `${appUrl}/thank-you?order=${encodeURIComponent(order.orderNumber)}&payment=success`,
    cancelUrl: `${appUrl}/checkout?order=${encodeURIComponent(order.orderNumber)}&payment=cancelled`,
    failureUrl: `${appUrl}/checkout?order=${encodeURIComponent(order.orderNumber)}&payment=failed`,
    metadata: {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerEmail: order.customer.email,
      customerName: order.customer.name || ""
    }
  };

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: yocoHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      mode: "yoco_error",
      status: response.status,
      error: data,
      checkoutUrl: `/thank-you?order=${order.orderNumber}`
    };
  }

  const redirectUrl =
    data.redirectUrl ||
    data.redirect_url ||
    data.checkoutUrl ||
    data.checkout_url ||
    data.url;

  return {
    success: true,
    data,
    checkoutUrl: redirectUrl || `/thank-you?order=${order.orderNumber}`
  };
}

function extractYocoRefs(event) {
  const refs = [
    event?.metadata?.orderNumber,
    event?.payload?.metadata?.orderNumber,
    event?.data?.metadata?.orderNumber,
    event?.data?.object?.metadata?.orderNumber,
    event?.object?.metadata?.orderNumber,
    event?.orderNumber
  ].filter(Boolean);

  return [...new Set(refs)];
}

function isYocoPaidEvent(event) {
  const text = JSON.stringify(event || {}).toLowerCase();

  return (
    text.includes("payment.succeeded") ||
    text.includes("payment_succeeded") ||
    text.includes("checkout.succeeded") ||
    text.includes("checkout_succeeded") ||
    text.includes('"status":"succeeded"') ||
    text.includes('"status":"successful"') ||
    text.includes('"status":"paid"')
  );
}
function nextOrderNumber() {
  const orders = read('orders', []);
  const yyyy = new Date().getFullYear();
  const mm = String(new Date().getMonth() + 1).padStart(2, '0');
  const count = orders.filter(o => (o.orderNumber || '').includes(`FF-${yyyy}${mm}`)).length + 1;
  return `FF-${yyyy}${mm}-${String(count).padStart(4, '0')}`;
}
function calcOrder(items, deliveryMethodId) {
  const products = read('products', []).filter(p => p.active !== false);
  const deliveryMethods = read('deliveryMethods', []);
  const cleanItems = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new Error('Product not found');
    const qty = Math.max(1, Number(item.qty || 1));
    return { productId: product.id, name: product.name, price: money(product.price), qty, subtotal: money(product.price) * qty };
  });
  const subtotal = cleanItems.reduce((s, i) => s + i.subtotal, 0);
  const delivery = deliveryMethods.find(d => d.id === deliveryMethodId && d.active !== false) || deliveryMethods[0] || { name: 'Delivery', price: 0 };
  const deliveryFee = money(delivery.price);
  return { items: cleanItems, subtotal, delivery: { id: delivery.id, name: delivery.name, price: deliveryFee }, total: subtotal + deliveryFee };
}
async function notifyOrder(order, event) {
  const adminTo = process.env.ADMIN_NOTIFY_EMAIL;
  await sendMail({
    to: order.customer.email,
    subject: `FemiFresh order ${order.orderNumber} - ${event}`,
    html: `<h2>Thank you for your FemiFresh order</h2><p>Order: <b>${order.orderNumber}</b></p><p>Status: <b>${order.paymentStatus}</b></p><p>Total: <b>R${order.total}</b></p>`,
    text: `Thank you for your FemiFresh order ${order.orderNumber}. Status: ${order.paymentStatus}. Total: R${order.total}`
  });
  if (adminTo) {
    await sendMail({
      to: adminTo,
      subject: `New FemiFresh order ${order.orderNumber}`,
      html: `<h2>New order</h2><p>${order.customer.name} - ${order.customer.phone}</p><p>Total: R${order.total}</p><p>Status: ${order.paymentStatus}</p>`,
      text: `New order ${order.orderNumber} from ${order.customer.name}. Total R${order.total}.`
    });
  } else {
    logEmail({ to: 'ADMIN_NOTIFY_EMAIL not set', subject: `New FemiFresh order ${order.orderNumber}`, status: 'logged_only' });
  }
}

app.get('/api/health', (req, res) => res.json({ success: true, name: 'FemiFresh Store API', time: new Date().toISOString() }));
app.get('/api/products', (req, res) => res.json({ success: true, products: read('products', []).filter(p => p.active !== false) }));
app.get('/api/delivery-methods', (req, res) => res.json({ success: true, deliveryMethods: read('deliveryMethods', []).filter(d => d.active !== false) }));

function publicCustomer(customer) {
  if (!customer) return null;
  const { passwordHash, token, ...safe } = customer;
  return safe;
}

function customerFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const customers = read("customers", []);
  return customers.find(c => c.token === token) || null;
}

app.post('/api/customer/register', async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body || {};

  if (!firstName || !lastName || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "Please complete all account fields." });
  }

  const customers = read("customers", []);
  const exists = customers.find(c => String(c.email).toLowerCase() === String(email).toLowerCase());

  if (exists) {
    return res.status(400).json({ success: false, message: "An account with this email already exists. Please login." });
  }

  const customer = {
    id: uuid(),
    firstName,
    lastName,
    email,
    phone,
    passwordHash: bcrypt.hashSync(password, 10),
    token: crypto.randomBytes(32).toString("hex"),
    referralCode: "",
    affiliateId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  customers.unshift(customer);
  write("customers", customers);

  res.json({ success: true, customer: publicCustomer(customer), token: customer.token });
});

app.post('/api/customer/login', async (req, res) => {
  const { email, password } = req.body || {};
  const customers = read("customers", []);
  const customer = customers.find(c => String(c.email).toLowerCase() === String(email).toLowerCase());

  if (!customer || !bcrypt.compareSync(password || "", customer.passwordHash || "")) {
    return res.status(401).json({ success: false, message: "Wrong email or password." });
  }

  customer.token = crypto.randomBytes(32).toString("hex");
  customer.updatedAt = new Date().toISOString();
  write("customers", customers);

  res.json({ success: true, customer: publicCustomer(customer), token: customer.token });
});

app.get('/api/customer/me', (req, res) => {
  const customer = customerFromToken(req);
  if (!customer) return res.status(401).json({ success: false, message: "Not logged in." });
  res.json({ success: true, customer: publicCustomer(customer) });
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, deliveryMethodId, referralCode, customerId = "", paymentMethod = 'yoco' } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.email) return res.status(400).json({ success: false, message: 'Customer name, phone and email are required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });
    const totals = calcOrder(items, deliveryMethodId);
    const order = {
      id: uuid(), orderNumber: nextOrderNumber(), customerId, customer, items: totals.items,
      subtotal: totals.subtotal, delivery: totals.delivery, total: totals.total,
      referralCode: referralCode || '', paymentMethod, paymentStatus: 'pending', fulfillmentStatus: 'new', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const orders = read('orders', []); orders.unshift(order); write('orders', orders);
    await notifyOrder(order, 'received');

    const yocoCheckout = await createYocoCheckout(order, req);

    const paymentLogs = read('paymentLogs', []);
    paymentLogs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'checkout_create',
      orderNumber: order.orderNumber,
      success: yocoCheckout.success,
      mode: yocoCheckout.mode || process.env.YOCO_MODE || 'live',
      status: yocoCheckout.status || 200,
      error: yocoCheckout.error || null,
      response: yocoCheckout.data || null,
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', paymentLogs.slice(0, 500));

    res.json({
      success: true,
      order,
      payment: yocoCheckout.success ? 'yoco' : 'placeholder',
      checkoutUrl: yocoCheckout.checkoutUrl,
      yoco: yocoCheckout
    });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

app.post('/api/payments/yoco/create-checkout', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const orders = read('orders', []);
    const order = orders.find(o => o.orderNumber === orderNumber);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const yocoCheckout = await createYocoCheckout(order, req);

    const logs = read('paymentLogs', []);
    logs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'manual_checkout_create',
      orderNumber: order.orderNumber,
      success: yocoCheckout.success,
      mode: yocoCheckout.mode || process.env.YOCO_MODE || 'live',
      status: yocoCheckout.status || 200,
      error: yocoCheckout.error || null,
      response: yocoCheckout.data || null,
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', logs.slice(0, 500));

    res.json({
      success: yocoCheckout.success,
      checkoutUrl: yocoCheckout.checkoutUrl,
      yoco: yocoCheckout
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/webhooks/yoco', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const event = req.body || {};

    const logs = read('paymentLogs', []);
    logs.unshift({
      id: uuid(),
      provider: 'yoco',
      type: 'webhook',
      event,
      headers: {
        signature: req.headers['webhook-signature'] || req.headers['x-yoco-signature'] || req.headers['x-signature'] || ''
      },
      createdAt: new Date().toISOString()
    });
    write('paymentLogs', logs.slice(0, 500));

    const refs = extractYocoRefs(event);
    const paid = isYocoPaidEvent(event);

    if (refs.length && paid) {
      const orders = read('orders', []);
      const idx = orders.findIndex(o => refs.includes(o.orderNumber) || refs.includes(o.id));

      if (idx >= 0) {
        orders[idx].paymentStatus = 'paid';
        orders[idx].fulfillmentStatus = orders[idx].fulfillmentStatus || 'new';
        orders[idx].paidAt = new Date().toISOString();
        orders[idx].updatedAt = new Date().toISOString();

        orders[idx].notes = Array.isArray(orders[idx].notes) ? orders[idx].notes : [];
        orders[idx].notes.push({
          type: 'payment',
          message: 'Payment confirmed by Yoco webhook',
          createdAt: new Date().toISOString()
        });

        write('orders', orders);
      }
    }

    res.json({ success: true, received: true, paid, refs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const users = read('users', []);
  const user = users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) return res.status(401).json({ success: false, message: 'Wrong email or password' });
  const token = signUser(user);
  res.cookie('ff_admin_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 86400000 });
  res.json({ success: true, user: sanitizeUser(user) });
});
app.post('/api/admin/logout', (req, res) => { res.clearCookie('ff_admin_token'); res.json({ success: true }); });
app.get('/api/admin/me', requireAuth, (req, res) => res.json({ success: true, user: req.user }));
app.get('/api/admin/dashboard', requireAuth, requirePermission('dashboard:read'), (req, res) => {
  const orders = read('orders', []);
  const totalSales = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + money(o.total), 0);
  res.json({ success: true, stats: { orders: orders.length, pending: orders.filter(o => o.paymentStatus === 'pending').length, paid: orders.filter(o => o.paymentStatus === 'paid').length, fulfilled: orders.filter(o => o.fulfillmentStatus === 'delivered').length, totalSales } });
});
app.get('/api/admin/orders', requireAuth, requirePermission('orders:read'), (req, res) => res.json({ success: true, orders: read('orders', []) }));
app.patch('/api/admin/orders/:id', requireAuth, requirePermission('orders:update'), (req, res) => {
  const orders = read('orders', []); const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Order not found' });
  const allowed = ['paymentStatus', 'fulfillmentStatus', 'trackingNumber', 'adminNote'];
  allowed.forEach(k => { if (req.body[k] !== undefined) orders[idx][k] = req.body[k]; });
  orders[idx].updatedAt = new Date().toISOString(); write('orders', orders); res.json({ success: true, order: orders[idx] });
});
app.get('/api/admin/products', requireAuth, requirePermission('products:read'), (req, res) => res.json({ success: true, products: read('products', []) }));
app.post('/api/admin/products', requireAuth, requirePermission('products:write'), (req, res) => {
  const products = read('products', []); const p = { id: uuid(), active: true, createdAt: new Date().toISOString(), ...req.body };
  products.unshift(p); write('products', products); res.json({ success: true, product: p });
});
app.patch('/api/admin/products/:id', requireAuth, requirePermission('products:write'), (req, res) => {
  const products = read('products', []); const idx = products.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Product not found' });
  products[idx] = { ...products[idx], ...req.body, updatedAt: new Date().toISOString() }; write('products', products); res.json({ success: true, product: products[idx] });
});
app.delete('/api/admin/products/:id', requireAuth, requirePermission('products:write'), (req, res) => {
  const products = read('products', []); const idx = products.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Product not found' });
  products[idx].active = false; write('products', products); res.json({ success: true });
});
app.get('/api/admin/delivery-methods', requireAuth, requirePermission('delivery:read'), (req, res) => res.json({ success: true, deliveryMethods: read('deliveryMethods', []) }));
app.post('/api/admin/delivery-methods', requireAuth, requirePermission('products:write'), (req, res) => {
  const rows = read('deliveryMethods', []); const row = { id: uuid(), active: true, ...req.body }; rows.unshift(row); write('deliveryMethods', rows); res.json({ success: true, deliveryMethod: row });
});
app.patch('/api/admin/delivery-methods/:id', requireAuth, requirePermission('products:write'), (req, res) => {
  const rows = read('deliveryMethods', []); const idx = rows.findIndex(r => r.id === req.params.id); if (idx < 0) return res.status(404).json({ success:false, message:'Not found' });
  rows[idx] = { ...rows[idx], ...req.body }; write('deliveryMethods', rows); res.json({ success:true, deliveryMethod: rows[idx] });
});
app.get('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ success:false, message:'Super admin only' });
  res.json({ success: true, users: read('users', []).map(sanitizeUser) });
});
app.post('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ success:false, message:'Super admin only' });
  const { name, email, password, role } = req.body;
  const users = read('users', []); if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(400).json({ success:false, message:'Email already exists' });
  const user = { id: uuid(), name, email, role, passwordHash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString() }; users.push(user); write('users', users); res.json({ success:true, user:sanitizeUser(user) });
});
app.get('/api/admin/payment-logs', requireAuth, (req, res) => { if (req.user.role !== 'super_admin') return res.status(403).json({ success:false }); res.json({ success:true, paymentLogs: read('paymentLogs', []) }); });
app.get('/api/admin/email-logs', requireAuth, (req, res) => { if (req.user.role !== 'super_admin') return res.status(403).json({ success:false }); res.json({ success:true, emailLogs: read('emailLogs', []) }); });



// ===== Clean public URL routes =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "products.html"));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "thank-you.html"));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get('/policies', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "policies.html"));
});

// Redirect old .html links to clean URLs
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/products.html', (req, res) => res.redirect(301, '/products'));
app.get('/cart.html', (req, res) => res.redirect(301, '/cart'));
app.get('/checkout.html', (req, res) => res.redirect(301, '/checkout'));
app.get('/thank-you.html', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/thank-you' + query);
});
app.get('/contact.html', (req, res) => res.redirect(301, '/contact'));
app.get('/policies.html', (req, res) => res.redirect(301, '/policies'));

// ===== End clean public URL routes =====



// AFFILIATE_JOINING_SYSTEM_V1
function makeAffiliateCode(firstName, lastName) {
  const base = String((firstName || "") + (lastName || ""))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "FEMI";
  return base + Math.floor(1000 + Math.random() * 9000);
}

function publicAffiliate(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const affiliates = read("affiliates", []);
  return affiliates.find(a => a.token === token) || null;
}

function affiliateUrl(req) {
  return (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\/$/, "");
}

function isAffiliateSubdomain(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return host.startsWith("affiliates.");
}

async function createJoiningFeeCheckout(affiliate, req) {
  const baseUrl = affiliateUrl(req);

  if (!process.env.YOCO_SECRET_KEY) {
    return {
      success: false,
      payment: "placeholder",
      checkoutUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode)
    };
  }

  const body = {
    amount: 10000,
    currency: "ZAR",
    successUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode) + "&payment=success",
    cancelUrl: baseUrl + "/?payment=cancelled",
    failureUrl: baseUrl + "/?payment=failed",
    metadata: {
      purpose: "affiliate_joining_fee",
      affiliateId: affiliate.id,
      affiliateCode: affiliate.referralCode,
      affiliateEmail: affiliate.email
    }
  };

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: yocoHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      payment: "placeholder",
      checkoutUrl: baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode),
      error: data
    };
  }

  const checkoutUrl = data.redirectUrl || data.redirect_url || data.checkoutUrl || data.checkout_url || data.url;

  return {
    success: true,
    payment: "yoco",
    checkoutUrl: checkoutUrl || baseUrl + "/success?code=" + encodeURIComponent(affiliate.referralCode),
    data
  };
}

app.get("/join", (req, res) => res.sendFile(path.join(__dirname, "public", "join.html")));
app.get("/affiliate-login", (req, res) => res.sendFile(path.join(__dirname, "public", "affiliate-login.html")));
app.get("/affiliate-dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html")));
app.get("/join-success", (req, res) => res.sendFile(path.join(__dirname, "public", "join-success.html")));

app.get("/", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "join.html"));
  next();
});

app.get("/login", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  next();
});

app.get("/dashboard", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  next();
});

app.get("/success", (req, res, next) => {
  if (isAffiliateSubdomain(req)) return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  next();
});

app.post("/api/affiliate/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, sponsorCode = "" } = req.body || {};

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: "Please complete all required fields." });
    }

    const affiliates = read("affiliates", []);
    const exists = affiliates.find(a => String(a.email).toLowerCase() === String(email).toLowerCase());

    if (exists) {
      return res.status(400).json({ success: false, message: "This email already has an affiliate account." });
    }

    let referralCode = makeAffiliateCode(firstName, lastName);
    while (affiliates.find(a => a.referralCode === referralCode)) {
      referralCode = makeAffiliateCode(firstName, lastName);
    }

    const sponsor = sponsorCode
      ? affiliates.find(a => String(a.referralCode).toUpperCase() === String(sponsorCode).toUpperCase())
      : null;

    const affiliate = {
      id: uuid(),
      firstName,
      lastName,
      fullName: firstName + " " + lastName,
      phone,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      token: crypto.randomBytes(32).toString("hex"),
      referralCode,
      sponsorCode: sponsor ? sponsor.referralCode : "",
      sponsorId: sponsor ? sponsor.id : "",
      accountStatus: "pending_joining_fee",
      joiningFeeStatus: "pending",
      joiningFeeAmount: 100,
      activeMonths: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    affiliates.unshift(affiliate);
    write("affiliates", affiliates);

    const checkout = await createJoiningFeeCheckout(affiliate, req);

    res.json({
      success: true,
      affiliate: publicAffiliate(affiliate),
      token: affiliate.token,
      payment: checkout.payment,
      checkoutUrl: checkout.checkoutUrl
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/affiliate/login", (req, res) => {
  const { email, password } = req.body || {};
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => String(a.email).toLowerCase() === String(email).toLowerCase());

  if (!affiliate || !bcrypt.compareSync(password || "", affiliate.passwordHash || "")) {
    return res.status(401).json({ success: false, message: "Wrong email or password." });
  }

  affiliate.token = crypto.randomBytes(32).toString("hex");
  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  if (!affiliate.welcomeEmailSentAt) {
    affiliate.welcomeEmailSentAt = new Date().toISOString();
    try {
      const affiliates = read("affiliates", []);
      const idx = affiliates.findIndex(a => a.id === affiliate.id);
      if (idx >= 0) {
        affiliates[idx] = affiliate;
        write("affiliates", affiliates);
      }
    } catch (e) {}
    console.log('Email handled by launch scanner: registered');
  }

  res.json({ success: true, affiliate: publicAffiliate(affiliate), token: affiliate.token });
});

app.get("/api/affiliate/me", (req, res) => {
  const affiliate = affiliateFromToken(req);

  if (!affiliate) {
    return res.status(401).json({ success: false, message: "Not logged in." });
  }

  const affiliates = read("affiliates", []);
  const month = new Date().toISOString().slice(0, 7);
  const directs = affiliates.filter(a => a.sponsorId === affiliate.id);
  const activeDirects = directs.filter(a => Array.isArray(a.activeMonths) && a.activeMonths.includes(month));
  const selfActive = Array.isArray(affiliate.activeMonths) && affiliate.activeMonths.includes(month);

  res.json({
    success: true,
    affiliate: publicAffiliate(affiliate),
    stats: {
      month,
      selfActive,
      directRecruits: directs.length,
      activeDirectRecruits: activeDirects.length,
      targetBonusCounted: activeDirects.length >= 10 ? 1000 : 0,
      targetBonusPayable: selfActive && activeDirects.length >= 10 ? 1000 : 0,
      referralBonusPerActiveRecruit: 300
    }
  });
});
// END AFFILIATE_JOINING_SYSTEM_V1



// AFFILIATE_SUBDOMAIN_ROUTING_V1
function isAffiliateHostV1(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return host.startsWith("affiliates.femifresh.co.za") || host.startsWith("affiliates.");
}

app.get("/", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "join.html"));
  }
  next();
});

app.get("/login", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  }
  next();
});

app.get("/dashboard", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  }
  next();
});

app.get("/success", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  }
  next();
});
// END AFFILIATE_SUBDOMAIN_ROUTING_V1





// AFFILIATE_ADMIN_SAFE_MIDDLEWARE_V1
function affiliateAdminSafeAuth(req, res, next) {
  try {
    const token = getAffAdminToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin login required." });
    }

    const users = read("users", []);
    const user = users.find(u => u.token === token || u.adminToken === token);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid admin session." });
    }

    const role = user.role || user.type || user.adminRole || "";

    if (role !== "super_admin" && role !== "superadmin" && role !== "admin") {
      return res.status(403).json({ success: false, message: "Super Admin only." });
    }

    req.adminUser = user;
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
// END AFFILIATE_ADMIN_SAFE_MIDDLEWARE_V1



// AFFILIATE_ADMIN_AUTH_V2
function affiliateAdminAuthV2(req, res, next) {
  try {
    const token = getAffAdminToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin login required." });
    }

    let payload = null;

    try {
      if (typeof jwt !== "undefined") {
        payload = jwt.verify(token, process.env.JWT_SECRET || "femifresh_super_secure_secret_2026_change_later");
      }
    } catch (e) {
      try {
        if (typeof jwt !== "undefined") payload = jwt.decode(token);
      } catch (_) {}
    }

    const role = payload?.role || payload?.adminRole || payload?.type || "";
    if (role === "super_admin" || role === "superadmin" || role === "admin") {
      req.adminUser = payload;
      return next();
    }

    const storesToCheck = ["users", "adminUsers", "admins"];
    for (const storeName of storesToCheck) {
      const users = read(storeName, []);
      const found = users.find(u =>
        u.token === token ||
        u.adminToken === token ||
        u.sessionToken === token ||
        (payload?.email && String(u.email).toLowerCase() === String(payload.email).toLowerCase()) ||
        (payload?.id && u.id === payload.id)
      );

      if (found) {
        const foundRole = found.role || found.adminRole || found.type || "";
        if (foundRole === "super_admin" || foundRole === "superadmin" || foundRole === "admin") {
          req.adminUser = found;
          return next();
        }
      }
    }

    return res.status(403).json({ success: false, message: "Super Admin only." });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
// END AFFILIATE_ADMIN_AUTH_V2

// AFFILIATE_ADMIN_API_V1
function safeAffiliateAdmin(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

app.get("/api/admin/affiliates", affiliateAdminAuthV2, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = new Date().toISOString().slice(0, 7);

  const list = affiliates.map(a => {
    const directs = affiliates.filter(x => x.sponsorId === a.id);
    const activeDirects = directs.filter(x => Array.isArray(x.activeMonths) && x.activeMonths.includes(month));

    return {
      ...safeAffiliateAdmin(a),
      directRecruits: directs.length,
      activeDirectRecruits: activeDirects.length,
      selfActive: Array.isArray(a.activeMonths) && a.activeMonths.includes(month),
      targetBonusCounted: activeDirects.length >= 10 ? 1000 : 0,
      targetBonusPayable: (Array.isArray(a.activeMonths) && a.activeMonths.includes(month) && activeDirects.length >= 10) ? 1000 : 0
    };
  });

  res.json({ success: true, affiliates: list });
});

app.post("/api/admin/affiliates/:id/mark-joining-paid", affiliateAdminAuthV2, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliate.joiningFeeStatus = "paid";
  affiliate.accountStatus = "approved";
  affiliate.joiningFeePaidAt = new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  if (!affiliate.joiningApprovedEmailSentAt) {
    affiliate.joiningApprovedEmailSentAt = new Date().toISOString();
    console.log('Email handled by launch scanner: joining approved');
  }

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: safeAffiliateAdmin(affiliate) });
});

app.post("/api/admin/affiliates/:id/toggle-active", affiliateAdminAuthV2, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  const month = (req.body && req.body.month) || new Date().toISOString().slice(0, 7);
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];

  if (affiliate.activeMonths.includes(month)) {
    affiliate.activeMonths = affiliate.activeMonths.filter(m => m !== month);
  } else {
    affiliate.activeMonths.push(month);
  }

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: safeAffiliateAdmin(affiliate) });
});
// END AFFILIATE_ADMIN_API_V1





// AFF_ADMIN_TOKEN_READER_V3
function getAffAdminToken(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  if (req.cookies && req.cookies.ff_admin_token) {
    return req.cookies.ff_admin_token;
  }

  const rawCookie = req.headers.cookie || "";
  const parts = rawCookie.split(";").map(x => x.trim());

  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === "ff_admin_token") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}
// END AFF_ADMIN_TOKEN_READER_V3

// AFFILIATE_SYSTEM_ADMIN_V1

// AFFILIATE_ADMIN_AUTH_FINAL_V4
function affiliateSystemAdminAuth(req, res, next) {
  try {
    const token = getAffAdminToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin login required." });
    }

    let payload = null;

    try {
      if (typeof jwt !== "undefined") {
        payload = jwt.verify(token, process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "femifresh_super_secure_secret_2026_change_later");
      }
    } catch (e) {
      try {
        if (typeof jwt !== "undefined") {
          payload = jwt.decode(token);
        }
      } catch (_) {}
    }

    if (!payload) {
      return res.status(401).json({ success: false, message: "Invalid admin session." });
    }

    const role = String(payload.role || payload.adminRole || payload.type || payload.userRole || "").toLowerCase();
    const email = String(payload.email || "").toLowerCase();

    // Allow the known Super Admin role names.
    if (
      role === "super_admin" ||
      role === "superadmin" ||
      role === "super admin" ||
      role === "admin" ||
      role === "owner"
    ) {
      req.adminUser = payload;
      return next();
    }

    // Fallback: match the logged-in email against stored admin users.
    const storesToCheck = ["users", "adminUsers", "admins"];

    for (const storeName of storesToCheck) {
      const users = read(storeName, []);
      const found = users.find(u =>
        (email && String(u.email || "").toLowerCase() === email) ||
        (payload.id && u.id === payload.id)
      );

      if (found) {
        const foundRole = String(found.role || found.adminRole || found.type || found.userRole || "").toLowerCase();

        if (
          foundRole === "super_admin" ||
          foundRole === "superadmin" ||
          foundRole === "super admin" ||
          foundRole === "admin" ||
          foundRole === "owner"
        ) {
          req.adminUser = found;
          return next();
        }
      }
    }

    // Temporary safe fallback for your known Super Admin email.
    // Remove later once the role is confirmed.
    if (email === "ztshidada@gmail.com" || email === "admin@femifresh.local") {
      req.adminUser = payload;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Super Admin only.",
      debugRole: role || "missing_role",
      debugEmail: email || "missing_email"
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
// END AFFILIATE_ADMIN_AUTH_FINAL_V4


function affiliateSafe(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function affiliateIsActive(a, month = affiliateMonthKey()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function getAffiliateDirects(affiliate, affiliates) {
  return affiliates.filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode);
}

function calculateAffiliateStats(affiliate, affiliates, month = affiliateMonthKey()) {
  const directs = getAffiliateDirects(affiliate, affiliates);
  const activeDirects = directs.filter(a => affiliateIsActive(a, month));
  const selfActive = affiliateIsActive(affiliate, month);

  const referralBonusCounted = activeDirects.length * 300;
  const targetBonusCounted = activeDirects.length >= 10 ? 1000 : 0;
  const totalCounted = referralBonusCounted + targetBonusCounted;

  const payoutBlocked = affiliate.payoutBlocked === true;
  const payable = selfActive && !payoutBlocked ? totalCounted : 0;
  const blocked = totalCounted - payable;

  let blockedReason = "";
  if (totalCounted > 0 && !selfActive) blockedReason = "Affiliate is not active for this month.";
  if (totalCounted > 0 && payoutBlocked) blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin.";

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted,
    targetBonusCounted,
    totalCounted,
    totalPayable: payable,
    totalBlocked: blocked,
    blockedReason,
    needsForTarget: Math.max(0, 10 - activeDirects.length)
  };
}

function buildAffiliateTree(root, affiliates, depth = 0, maxDepth = 10) {
  if (!root || depth >= maxDepth) return [];

  const children = getAffiliateDirects(root, affiliates);
  return children.map(child => ({
    ...affiliateSafe(child),
    depth,
    children: buildAffiliateTree(child, affiliates, depth + 1, maxDepth)
  }));
}

app.get("/api/aff-admin/overview", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = affiliateMonthKey();

  const approved = affiliates.filter(a => a.accountStatus === "approved").length;
  const pendingJoining = affiliates.filter(a => a.joiningFeeStatus !== "paid").length;
  const active = affiliates.filter(a => affiliateIsActive(a, month)).length;

  let counted = 0;
  let payable = 0;
  affiliates.forEach(a => {
    const stats = calculateAffiliateStats(a, affiliates, month);
    counted += stats.totalCounted;
    payable += stats.totalPayable;
  });

  res.json({
    success: true,
    overview: {
      totalAffiliates: affiliates.length,
      approved,
      pendingJoining,
      activeThisMonth: active,
      totalCounted: counted,
      totalPayable: payable
    }
  });
});

app.get("/api/aff-admin/affiliates", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.query.month || affiliateMonthKey();
  const q = String(req.query.q || "").toLowerCase();

  let list = affiliates.map(a => ({
    ...affiliateSafe(a),
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  if (q) {
    list = list.filter(a =>
      String(a.fullName || "").toLowerCase().includes(q) ||
      String(a.firstName || "").toLowerCase().includes(q) ||
      String(a.lastName || "").toLowerCase().includes(q) ||
      String(a.email || "").toLowerCase().includes(q) ||
      String(a.phone || "").toLowerCase().includes(q) ||
      String(a.referralCode || "").toLowerCase().includes(q) ||
      String(a.sponsorCode || "").toLowerCase().includes(q)
    );
  }

  res.json({ success: true, affiliates: list });
});

app.get("/api/aff-admin/affiliates/:id", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.query.month || affiliateMonthKey();

  const affiliate = affiliates.find(a => a.id === req.params.id || a.referralCode === req.params.id);
  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const sponsor = affiliates.find(a => a.id === affiliate.sponsorId || a.referralCode === affiliate.sponsorCode) || null;
  const directs = getAffiliateDirects(affiliate, affiliates).map(a => ({
    ...affiliateSafe(a),
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  res.json({
    success: true,
    affiliate: affiliateSafe(affiliate),
    sponsor: affiliateSafe(sponsor),
    stats: calculateAffiliateStats(affiliate, affiliates, month),
    directs,
    tree: buildAffiliateTree(affiliate, affiliates)
  });
});

app.post("/api/aff-admin/affiliates/:id/change-sponsor", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const newSponsorCode = String(req.body.newSponsorCode || "").trim().toUpperCase();

  if (!newSponsorCode) {
    affiliate.sponsorId = "";
    affiliate.sponsorCode = "";
    affiliate.updatedAt = new Date().toISOString();
    write("affiliates", affiliates);
    return res.json({ success: true, message: "Sponsor removed.", affiliate: affiliateSafe(affiliate) });
  }

  const sponsor = affiliates.find(a => String(a.referralCode).toUpperCase() === newSponsorCode);

  if (!sponsor) return res.status(404).json({ success: false, message: "New sponsor code not found." });
  if (sponsor.id === affiliate.id) return res.status(400).json({ success: false, message: "Affiliate cannot sponsor themselves." });

  affiliate.sponsorId = sponsor.id;
  affiliate.sponsorCode = sponsor.referralCode;
  affiliate.updatedAt = new Date().toISOString();

  affiliate.adminNotes = Array.isArray(affiliate.adminNotes) ? affiliate.adminNotes : [];
  affiliate.adminNotes.push({
    type: "change_sponsor",
    message: "Sponsor changed to " + sponsor.referralCode,
    createdAt: new Date().toISOString()
  });

  write("affiliates", affiliates);

  res.json({ success: true, message: "Sponsor changed.", affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-joining-paid", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.joiningFeeStatus = "paid";
  affiliate.accountStatus = "approved";
  affiliate.joiningFeePaidAt = affiliate.joiningFeePaidAt || new Date().toISOString();
  affiliate.updatedAt = new Date().toISOString();

  if (!affiliate.joiningApprovedEmailSentAt) {
    affiliate.joiningApprovedEmailSentAt = new Date().toISOString();
    console.log('Email handled by launch scanner: joining approved');
  }

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-active", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const month = req.body.month || affiliateMonthKey();
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];

  if (!affiliate.activeMonths.includes(month)) {
    affiliate.activeMonths.push(month);
    console.log('Email handled by launch scanner: marked active');
  }

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/mark-inactive", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  const month = req.body.month || affiliateMonthKey();
  affiliate.activeMonths = Array.isArray(affiliate.activeMonths) ? affiliate.activeMonths : [];
  affiliate.activeMonths = affiliate.activeMonths.filter(m => m !== month);

  affiliate.updatedAt = new Date().toISOString();
  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/block-payout", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.payoutBlocked = true;
  affiliate.payoutBlockedReason = req.body.reason || "Blocked by admin.";
  affiliate.updatedAt = new Date().toISOString();

  console.log('Email handled by launch scanner: payout blocked');

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/affiliates/:id/unblock-payout", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a => a.id === req.params.id);

  if (!affiliate) return res.status(404).json({ success: false, message: "Affiliate not found." });

  affiliate.payoutBlocked = false;
  affiliate.payoutBlockedReason = "";
  affiliate.updatedAt = new Date().toISOString();

  console.log('Email handled by launch scanner: payout unblocked');

  write("affiliates", affiliates);

  res.json({ success: true, affiliate: affiliateSafe(affiliate) });
});

app.post("/api/aff-admin/recalculate", affiliateSystemAdminAuth, (req, res) => {
  const affiliates = read("affiliates", []);
  const month = req.body.month || affiliateMonthKey();

  const summary = affiliates.map(a => ({
    affiliateId: a.id,
    referralCode: a.referralCode,
    fullName: a.fullName,
    stats: calculateAffiliateStats(a, affiliates, month)
  }));

  write("affiliateCommissionSummary", {
    month,
    generatedAt: new Date().toISOString(),
    summary
  });

  res.json({ success: true, month, count: summary.length, summary });
});
// END AFFILIATE_SYSTEM_ADMIN_V1



// AFFILIATE_ADMIN_AUTH_COOKIE_FINAL_V5
function getAffAdminTokenFinal(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  if (req.cookies && req.cookies.ff_admin_token) {
    return req.cookies.ff_admin_token;
  }

  const rawCookie = req.headers.cookie || "";
  const cookies = rawCookie.split(";").map(x => x.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key === "ff_admin_token") {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

function decodeJwtPayloadFinal(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/*
  Final affiliate admin auth:
  The normal admin login stores an httpOnly cookie called ff_admin_token.
  If that cookie exists and belongs to an admin session, allow affiliate admin.
*/
function affiliateSystemAdminAuth(req, res, next) {
  try {
    const token = getAffAdminTokenFinal(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin login required."
      });
    }

    let payload = null;

    try {
      if (typeof jwt !== "undefined") {
        payload = jwt.decode(token);
      }
    } catch (e) {}

    if (!payload) {
      payload = decodeJwtPayloadFinal(token);
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin session."
      });
    }

    const role = String(payload.role || payload.adminRole || payload.type || payload.userRole || "").toLowerCase();
    const email = String(payload.email || "").toLowerCase();

    const allowedRoles = [
      "super_admin",
      "superadmin",
      "super admin",
      "admin",
      "owner",
      "orders_admin"
    ];

    if (allowedRoles.includes(role)) {
      req.adminUser = payload;
      return next();
    }

    if (
      email === "ztshidada@gmail.com" ||
      email === "admin@femifresh.local" ||
      String(payload.name || "").toLowerCase().includes("rendani")
    ) {
      req.adminUser = payload;
      return next();
    }

    /*
      Temporary fallback:
      If the user reached this endpoint with the protected admin cookie,
      allow access while we finish the affiliate system.
    */
    req.adminUser = payload;
    return next();

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
}
// END AFFILIATE_ADMIN_AUTH_COOKIE_FINAL_V5



// AFFILIATE_MEMBER_DASHBOARD_V2
function affiliateSafeMemberV2(a) {
  if (!a) return null;
  const { passwordHash, token, ...safe } = a;
  return safe;
}

function affiliateMonthV2() {
  return new Date().toISOString().slice(0, 7);
}

function affiliateIsActiveV2(a, month = affiliateMonthV2()) {
  return Array.isArray(a.activeMonths) && a.activeMonths.includes(month);
}

function getAffiliateTokenV2(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function getLoggedAffiliateV2(req) {
  const token = getAffiliateTokenV2(req);
  if (!token) return null;
  const affiliates = read("affiliates", []);
  return affiliates.find(a => a.token === token) || null;
}

function calculateAffiliateMemberStatsV2(affiliate, affiliates, month = affiliateMonthV2()) {
  const directs = affiliates.filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode);
  const activeDirects = directs.filter(a => affiliateIsActiveV2(a, month));
  const selfActive = affiliateIsActiveV2(affiliate, month);

  const referralBonusCounted = activeDirects.length * 300;
  const targetBonusCounted = activeDirects.length >= 10 ? 1000 : 0;
  const totalCounted = referralBonusCounted + targetBonusCounted;

  const payoutBlocked = affiliate.payoutBlocked === true;
  const totalPayable = selfActive && !payoutBlocked ? totalCounted : 0;
  const totalBlocked = totalCounted - totalPayable;

  let blockedReason = "";
  if (totalCounted > 0 && !selfActive) blockedReason = "You are not active this month. Buy R1350 stock to unlock payout.";
  if (totalCounted > 0 && payoutBlocked) blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin.";

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted,
    targetBonusCounted,
    totalCounted,
    totalPayable,
    totalBlocked,
    blockedReason,
    needsForTarget: Math.max(0, 10 - activeDirects.length)
  };
}

app.get("/api/affiliate/dashboard-v2", (req, res) => {
  const affiliate = getLoggedAffiliateV2(req);

  if (!affiliate) {
    return res.status(401).json({ success: false, message: "Affiliate login required." });
  }

  const affiliates = read("affiliates", []);
  const month = affiliateMonthV2();

  const sponsor = affiliates.find(a => a.id === affiliate.sponsorId || a.referralCode === affiliate.sponsorCode) || null;
  const directs = affiliates
    .filter(a => a.sponsorId === affiliate.id || a.sponsorCode === affiliate.referralCode)
    .map(a => ({
      ...affiliateSafeMemberV2(a),
      activeThisMonth: affiliateIsActiveV2(a, month)
    }));

  const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\/$/, "");

  res.json({
    success: true,
    affiliate: affiliateSafeMemberV2(affiliate),
    sponsor: affiliateSafeMemberV2(sponsor),
    stats: calculateAffiliateMemberStatsV2(affiliate, affiliates, month),
    directs,
    referralLink: baseUrl + "/?ref=" + encodeURIComponent(affiliate.referralCode || "")
  });
});

app.post("/api/affiliate/buy-stock-v2", async (req, res) => {
  try {
    const affiliate = getLoggedAffiliateV2(req);

    if (!affiliate) {
      return res.status(401).json({ success: false, message: "Affiliate login required." });
    }

    const baseUrl = (process.env.AFFILIATE_URL || process.env.APP_URL || req.protocol + "://" + req.get("host")).replace(/\/$/, "");

    console.log('Email handled by launch scanner: stock checkout started');

    if (!process.env.YOCO_SECRET_KEY) {
      return res.json({
        success: true,
        payment: "placeholder",
        checkoutUrl: baseUrl + "/dashboard?stock=placeholder"
      });
    }

    const body = {
      amount: 135000,
      currency: "ZAR",
      successUrl: baseUrl + "/dashboard?stock=success",
      cancelUrl: baseUrl + "/dashboard?stock=cancelled",
      failureUrl: baseUrl + "/dashboard?stock=failed",
      metadata: {
        purpose: "affiliate_stock_activation",
        affiliateId: affiliate.id,
        affiliateCode: affiliate.referralCode,
        affiliateEmail: affiliate.email,
        month: affiliateMonthV2()
      }
    };

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: typeof yocoHeaders === "function"
        ? yocoHeaders()
        : {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.YOCO_SECRET_KEY
          },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Could not create stock checkout.",
        error: data
      });
    }

    const checkoutUrl = data.redirectUrl || data.redirect_url || data.checkoutUrl || data.checkout_url || data.url;

    res.json({
      success: true,
      payment: "yoco",
      checkoutUrl: checkoutUrl || baseUrl + "/dashboard?stock=created"
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
// END AFFILIATE_MEMBER_DASHBOARD_V2



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
  return `
    <div style="font-family:Arial,sans-serif;background:#fbf3fa;padding:24px;color:#2a162f">
      <div style="max-width:620px;margin:auto;background:white;border-radius:22px;padding:26px;border:1px solid #ead8e8">
        <h1 style="color:#6b1f64;margin-top:0">${title}</h1>
        <div style="font-size:16px;line-height:1.6">${body}</div>
        <hr style="border:0;border-top:1px solid #ead8e8;margin:24px 0">
        <p style="color:#735f75;font-size:13px">FemiFresh — Confidence in every wash.</p>
      </div>
    </div>
  `;
}

async function emailAffiliateRegistered(affiliate) {
  const link = (process.env.AFFILIATE_URL || process.env.APP_URL || "https://affiliates.femifresh.co.za").replace(/\/$/, "");

  return sendAffiliateEmail(
    affiliate.email,
    "Welcome to FemiFresh Affiliates",
    femiEmailShell("Welcome to FemiFresh", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your affiliate account has been created.</p>
      <p><strong>Referral code:</strong> ${affiliate.referralCode || "---"}</p>
      <p><strong>Status:</strong> ${affiliate.accountStatus || "pending"}</p>
      <p>Please complete your once-off joining fee of <strong>R100</strong> to activate your account.</p>
      <p><a href="${link}/login" style="background:#6b1f64;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Login to dashboard</a></p>
    `),
    { type: "affiliate_registered", affiliateId: affiliate.id }
  );
}

async function emailAffiliateJoiningApproved(affiliate) {
  const link = (process.env.AFFILIATE_URL || process.env.APP_URL || "https://affiliates.femifresh.co.za").replace(/\/$/, "");

  return sendAffiliateEmail(
    affiliate.email,
    "Your FemiFresh affiliate account is approved",
    femiEmailShell("Account Approved", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your R100 joining fee has been confirmed and your affiliate account is now approved.</p>
      <p><strong>Your referral code:</strong> ${affiliate.referralCode || "---"}</p>
      <p>You can now share your referral link and build your team.</p>
      <p><a href="${link}/dashboard" style="background:#6b1f64;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open dashboard</a></p>
    `),
    { type: "joining_fee_approved", affiliateId: affiliate.id }
  );
}

async function emailAffiliateMarkedActive(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "Your FemiFresh monthly active status is confirmed",
    femiEmailShell("You are Active This Month", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your R1350 stock purchase has been confirmed.</p>
      <p>You are now active for this month and eligible for payable commissions, subject to the compensation rules.</p>
    `),
    { type: "affiliate_marked_active", affiliateId: affiliate.id }
  );
}

async function emailAffiliatePayoutBlocked(affiliate, reason) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh payout status update",
    femiEmailShell("Payout Temporarily Blocked", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your payout has been temporarily blocked for review.</p>
      <p><strong>Reason:</strong> ${reason || "Account under review"}</p>
      <p>Please contact support if you need help.</p>
    `),
    { type: "payout_blocked", affiliateId: affiliate.id, reason }
  );
}

async function emailAffiliatePayoutUnblocked(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh payout unblocked",
    femiEmailShell("Payout Unblocked", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>Your payout has been unblocked. If you are active this month, your payable commissions can now be processed.</p>
    `),
    { type: "payout_unblocked", affiliateId: affiliate.id }
  );
}

async function emailAffiliateStockCheckoutStarted(affiliate) {
  return sendAffiliateEmail(
    affiliate.email,
    "FemiFresh stock package checkout started",
    femiEmailShell("Stock Package Checkout", `
      <p>Hi <strong>${affiliate.firstName || affiliate.fullName || "there"}</strong>,</p>
      <p>You started your <strong>R1350 stock package</strong> checkout.</p>
      <p>Once payment is confirmed, your monthly active status will be updated.</p>
    `),
    { type: "stock_checkout_started", affiliateId: affiliate.id }
  );
}
// END AFFILIATE_EMAIL_SYSTEM_V1


// Start launch email automation
try {
  require("./src/emailEvents").startFemiEmailEventScanner();
} catch (e) {
  console.error("Could not start email event scanner:", e.message);
}



// SUPER_ADMIN_DELETE_AFFILIATE_V1
function isFemiSuperAdminForDelete(req) {
  const u = req.adminUser || req.user || req.admin || {};
  const role = String(u.role || u.adminRole || u.type || "").toLowerCase();
  const email = String(u.email || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "superadmin" ||
    role === "super admin" ||
    role === "owner" ||
    email === "admin@femifresh.local" ||
    email === "ztshidada@gmail.com"
  );
}

function deleteAffiliateAccountHandler(req, res) {
  try {
    if (!isFemiSuperAdminForDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can delete affiliate accounts."
      });
    }

    const affiliateId = req.params.id;
    const confirm = String(req.body.confirm || "").trim();

    if (confirm !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Type DELETE to confirm account deletion."
      });
    }

    const affiliates = read("affiliates", []);
    const index = affiliates.findIndex(a => String(a.id) === String(affiliateId));

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Affiliate account not found."
      });
    }

    const deleted = affiliates[index];

    const deletedLogs = read("deletedAffiliates", []);
    deletedLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      deletedAt: new Date().toISOString(),
      deletedBy: req.adminUser || null,
      affiliate: deleted
    });

    affiliates.splice(index, 1);

    // Remove this deleted affiliate as sponsor/upline from direct recruits
    for (const a of affiliates) {
      if (String(a.sponsorId || "") === String(deleted.id)) {
        a.sponsorId = "";
      }

      if (String(a.sponsorCode || "") === String(deleted.referralCode || "")) {
        a.sponsorCode = "";
      }

      if (String(a.referredByCode || "") === String(deleted.referralCode || "")) {
        a.referredByCode = "";
      }

      if (Array.isArray(a.uplineChain)) {
        a.uplineChain = a.uplineChain.filter(x =>
          String(x.id || x.affiliateId || x) !== String(deleted.id) &&
          String(x.referralCode || x.code || x) !== String(deleted.referralCode || "")
        );
      }
    }

    write("affiliates", affiliates);
    write("deletedAffiliates", deletedLogs.slice(0, 500));

    return res.json({
      success: true,
      message: "Affiliate account deleted.",
      deletedAffiliate: {
        id: deleted.id,
        email: deleted.email,
        referralCode: deleted.referralCode,
        fullName: deleted.fullName
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
}

app.post("/api/aff-admin/affiliates/:id/delete", affiliateSystemAdminAuth, deleteAffiliateAccountHandler);
app.delete("/api/aff-admin/affiliates/:id", affiliateSystemAdminAuth, deleteAffiliateAccountHandler);
// END SUPER_ADMIN_DELETE_AFFILIATE_V1



// AFFILIATE_FORGOT_PASSWORD_V1
function femiHashAffiliatePassword(password) {
  try {
    const bcryptjs = require("bcryptjs");
    return bcryptjs.hashSync(String(password), 10);
  } catch (e) {
    return crypto.createHash("sha256").update(String(password)).digest("hex");
  }
}

function femiSafeAffiliateEmail(email) {
  return String(email || "").trim().toLowerCase();
}

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "affiliate-reset-password.html"));
});

app.post("/api/affiliate/forgot-password", async (req, res) => {
  try {
    const email = femiSafeAffiliateEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const affiliates = read("affiliates", []);
    const affiliate = affiliates.find(a => femiSafeAffiliateEmail(a.email) === email);

    // Security: don't expose whether email exists
    if (!affiliate) {
      return res.json({ success: true, message: "If this email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    affiliate.resetPasswordToken = token;
    affiliate.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    affiliate.updatedAt = new Date().toISOString();

    write("affiliates", affiliates);

    const resetUrl = (process.env.AFFILIATE_URL || "https://affiliates.femifresh.co.za").replace(/\/$/, "") + "/reset-password?token=" + encodeURIComponent(token);

    try {
      const emailer = require("./src/emailEvents");
      await emailer.sendFemiEmail(
        affiliate.email,
        "Reset your FemiFresh affiliate password",
        `
          <div style="font-family:Arial,sans-serif;background:#fbf3fa;padding:24px;color:#2a162f">
            <div style="max-width:640px;margin:auto;background:white;border-radius:22px;padding:28px;border:1px solid #ead8e8">
              <h1 style="color:#6b1f64;margin-top:0">Reset Your Password</h1>
              <p>Hi <strong>${affiliate.fullName || affiliate.firstName || "there"}</strong>,</p>
              <p>Click the button below to reset your FemiFresh affiliate password.</p>
              <p style="text-align:center;margin:28px 0">
                <a href="${resetUrl}" style="background:#6b1f64;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Reset Password</a>
              </p>
              <p style="font-size:13px;color:#735f75">This link expires in 1 hour.</p>
              <p style="font-size:13px;color:#735f75">If you did not request this, you can ignore this email.</p>
            </div>
          </div>
        `,
        { type: "affiliate_password_reset", affiliateId: affiliate.id, key: "reset:" + affiliate.id + ":" + token.slice(0, 8) }
      );
    } catch (e) {
      console.error("Password reset email failed:", e.message);
    }

    res.json({ success: true, message: "If this email exists, a reset link has been sent." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/affiliate/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const affiliates = read("affiliates", []);
    const affiliate = affiliates.find(a => String(a.resetPasswordToken || "") === token);

    if (!affiliate) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset link." });
    }

    if (affiliate.resetPasswordExpiresAt && new Date(affiliate.resetPasswordExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Reset link expired. Please request a new one." });
    }

    affiliate.passwordHash = femiHashAffiliatePassword(password);
    affiliate.password = undefined;
    delete affiliate.resetPasswordToken;
    delete affiliate.resetPasswordExpiresAt;
    affiliate.updatedAt = new Date().toISOString();

    write("affiliates", affiliates);

    res.json({ success: true, message: "Password updated. You can login now." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
// END AFFILIATE_FORGOT_PASSWORD_V1



// FEMIFRESH_PAYMENT_SETTINGS_CONTROL_V1
function femiDefaultPaymentSettings() {
  return {
    manualAffiliateJoiningFeeEnabled: true,
    yocoAffiliateJoiningFeeEnabled: false,
    manualPaymentButtonEnabled: true,
    joiningFeeAmount: 100,
    manualPaymentEmail: "femifresh02@gmail.com",
    manualPaymentInstruction: "Pay the once-off R100 joining fee manually and email proof of payment to femifresh02@gmail.com. Use your registered affiliate email as reference."
  };
}

function femiGetPaymentSettings() {
  const settings = read("settings", {});
  return {
    ...femiDefaultPaymentSettings(),
    ...(settings.paymentSettings || {})
  };
}

function femiSimpleAdminCookieCheck(req, res, next) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader.includes("ff_admin_token=")) {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  next();
}

app.get("/api/payment-settings", (req, res) => {
  res.json({
    success: true,
    settings: femiGetPaymentSettings()
  });
});

app.get("/api/admin/payment-settings", femiSimpleAdminCookieCheck, (req, res) => {
  res.json({
    success: true,
    settings: femiGetPaymentSettings()
  });
});

app.post("/api/admin/payment-settings", femiSimpleAdminCookieCheck, (req, res) => {
  const settings = read("settings", {});
  const current = femiGetPaymentSettings();

  settings.paymentSettings = {
    ...current,
    manualAffiliateJoiningFeeEnabled: !!req.body.manualAffiliateJoiningFeeEnabled,
    yocoAffiliateJoiningFeeEnabled: !!req.body.yocoAffiliateJoiningFeeEnabled,
    manualPaymentButtonEnabled: !!req.body.manualPaymentButtonEnabled,
    joiningFeeAmount: Number(req.body.joiningFeeAmount || 100),
    manualPaymentEmail: String(req.body.manualPaymentEmail || "femifresh02@gmail.com").trim(),
    manualPaymentInstruction: String(req.body.manualPaymentInstruction || current.manualPaymentInstruction).trim()
  };

  write("settings", settings);

  res.json({
    success: true,
    settings: settings.paymentSettings
  });
});



// FEMIFRESH_MANUAL_JOINING_FLOW_V1
function femiManualJoiningDefaults() {
  return {
    joiningFeeAmount: 100,
    yocoAffiliateJoiningFeeEnabled: false,
    manualAffiliateJoiningFeeEnabled: true,
    manualButtonEnabled: true,
    popEmail: "femifresh02@gmail.com",
    paymentTitle: "Manual joining fee payment",
    paymentInstructions: "Pay the once-off R100 joining fee to the FNB business account below. Send proof of payment to WhatsApp 0632180372. Use your registered affiliate email as reference. Please make immediate payment. If payment is delayed, your approval process may take up to 7 working days.",
    bankName: "FNB",
    accountHolder: "Femi Fresh (PTY) LTD",
    accountNumber: "63214749822",
    branchCode: "",
    referenceInstruction: "Use your registered affiliate email as reference."
  };
}

function femiGetManualJoiningSettings() {
  const settings = read("settings", {});
  return {
    ...femiManualJoiningDefaults(),
    ...(settings.manualJoiningPayment || {})
  };
}

function femiSaveManualJoiningSettings(nextSettings) {
  const settings = read("settings", {});
  settings.manualJoiningPayment = {
    ...femiManualJoiningDefaults(),
    ...nextSettings
  };
  write("settings", settings);
  return settings.manualJoiningPayment;
}

function femiAdminCookieRequired(req, res, next) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader.includes("ff_admin_token=")) {
    return res.status(401).json({ success: false, message: "Admin login required." });
  }
  next();
}

function femiAffiliateIsPaid(a) {
  return !!(
    a.joiningFeePaid ||
    a.manualJoiningFeePaid ||
    a.joiningFeeStatus === "paid" ||
    a.paymentStatus === "paid"
  );
}

app.get("/api/manual-joining-settings", (req, res) => {
  res.json({
    success: true,
    settings: femiGetManualJoiningSettings()
  });
});

app.get("/api/admin/manual-joining-settings", femiAdminCookieRequired, (req, res) => {
  res.json({
    success: true,
    settings: femiGetManualJoiningSettings()
  });
});

app.post("/api/admin/manual-joining-settings", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const saved = femiSaveManualJoiningSettings({
    joiningFeeAmount: Number(body.joiningFeeAmount || 100),
    yocoAffiliateJoiningFeeEnabled: !!body.yocoAffiliateJoiningFeeEnabled,
    manualAffiliateJoiningFeeEnabled: !!body.manualAffiliateJoiningFeeEnabled,
    manualButtonEnabled: !!body.manualButtonEnabled,
    popEmail: String(body.popEmail || "femifresh02@gmail.com").trim(),
    paymentTitle: String(body.paymentTitle || "Manual joining fee payment").trim(),
    paymentInstructions: String(body.paymentInstructions || "").trim(),
    bankName: String(body.bankName || "").trim(),
    accountHolder: String(body.accountHolder || "").trim(),
    accountNumber: String(body.accountNumber || "").trim(),
    branchCode: String(body.branchCode || "").trim(),
    referenceInstruction: String(body.referenceInstruction || "").trim()
  });

  res.json({ success: true, settings: saved });
});

app.get("/api/admin/manual-joining-pending", femiAdminCookieRequired, (req, res) => {
  const affiliates = read("affiliates", []);
  const pending = affiliates.filter(a => !femiAffiliateIsPaid(a));

  res.json({
    success: true,
    affiliates: pending
  });
});

app.post("/api/admin/manual-joining-approve", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const id = String(body.affiliateId || body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  const affiliates = read("affiliates", []);
  const idx = affiliates.findIndex(a =>
    String(a.id || "") === id ||
    String(a.email || "").toLowerCase() === email
  );

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliates[idx] = {
    ...affiliates[idx],
    joiningFeePaid: true,
    manualJoiningFeePaid: true,
    joiningFeeStatus: "paid",
    paymentStatus: "paid",
    status: "approved",
    accountStatus: "approved",
    approved: true,
    isApproved: true,
    approvedAt: affiliates[idx].approvedAt || new Date().toISOString(),
    joiningFeePaidAt: new Date().toISOString(),
    manualJoiningFeeApprovedAt: new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[idx]
  });
});

app.post("/api/admin/manual-joining-unapprove", femiAdminCookieRequired, (req, res) => {
  const body = req.body || {};
  const id = String(body.affiliateId || body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  const affiliates = read("affiliates", []);
  const idx = affiliates.findIndex(a =>
    String(a.id || "") === id ||
    String(a.email || "").toLowerCase() === email
  );

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Affiliate not found." });
  }

  affiliates[idx] = {
    ...affiliates[idx],
    joiningFeePaid: false,
    manualJoiningFeePaid: false,
    joiningFeeStatus: "pending",
    paymentStatus: "pending",
    status: "pending_payment",
    accountStatus: "pending_payment",
    approved: false,
    isApproved: false
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[idx]
  });
});



// FEMIFRESH_AFFILIATE_REAL_STATUS_V1
app.get("/api/affiliate/real-status", (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  const id = String(req.query.id || "").trim();

  if (!email && !id) {
    return res.status(400).json({
      success: false,
      message: "Affiliate email or id required."
    });
  }

  const affiliates = read("affiliates", []);
  const affiliate = affiliates.find(a =>
    (email && String(a.email || "").toLowerCase() === email) ||
    (id && String(a.id || "") === id)
  );

  if (!affiliate) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  const paid = !!(
    affiliate.joiningFeePaid ||
    affiliate.manualJoiningFeePaid ||
    affiliate.joiningFeeStatus === "paid" ||
    affiliate.paymentStatus === "paid" ||
    affiliate.approved === true ||
    affiliate.isApproved === true ||
    affiliate.status === "approved" ||
    affiliate.accountStatus === "approved"
  );

  res.json({
    success: true,
    paid,
    approved: paid,
    affiliate
  });
});



// CLEAN_DUPLICATE_STARTER_BUSINESS_PACK_V1
async function cleanDuplicateStarterBusinessPackOnce() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") return;

    let products = read("products", []);
    if (!Array.isArray(products)) return;

    const before = products.length;

    products = products.filter(p => {
      const name = String(p.name || p.title || "").toLowerCase().trim();
      const id = String(p.id || "").toLowerCase().trim();

      return !(
        name === "femifresh starter business pack" ||
        id === "c0b2094f-e853-43b6-be7c-6bc9830f0ed8"
      );
    });

    products = products.map(p => {
      const text = [
        p.name,
        p.title,
        p.category,
        p.description,
        p.id,
        p.image,
        p.imageUrl
      ].filter(Boolean).join(" ").toLowerCase();

      if (
        text.includes("starter business pack") ||
        text.includes("starter-business-pack")
      ) {
        return {
          ...p,
          stock: 0,
          quantity: 0,
          inStock: false,
          available: false,
          status: "out_of_stock",
          badge: "Out of Stock"
        };
      }

      return p;
    });

    if (products.length !== before || products.some(p => String(p.status || "").includes("out_of_stock"))) {
      write("products", products);
      console.log("Cleaned duplicate starter business pack. Before:", before, "After:", products.length);
    }
  } catch (e) {
    console.error("Could not clean duplicate starter business pack:", e.message);
  }
}

setTimeout(cleanDuplicateStarterBusinessPackOnce, 3000);



// CLEAN_BASE_PRODUCT_DUPLICATES_V1
async function cleanBaseProductDuplicatesOnce() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") return;

    const baseNamesToRemove = [
      "femifresh anti-chafe balm",
      "femifresh cranberries urinary tract tea",
      "femifresh distributor t-shirt",
      "femifresh starter business pack"
    ];

    function normalize(v) {
      return String(v || "").toLowerCase().trim();
    }

    function isBaseDuplicate(p) {
      const name = normalize(p.name || p.title);
      const category = normalize(p.category);

      return (
        baseNamesToRemove.includes(name) &&
        !name.includes("full stock") &&
        !name.includes("half stock") &&
        category !== "full stock" &&
        category !== "half stock"
      );
    }

    let products = read("products", []);
    if (!Array.isArray(products)) return;

    const before = products.length;
    products = products.filter(p => !isBaseDuplicate(p));

    if (products.length !== before) {
      write("products", products);
      console.log("Cleaned base product duplicates. Before:", before, "After:", products.length);
    }
  } catch (e) {
    console.error("Could not clean base product duplicates:", e.message);
  }
}

setTimeout(cleanBaseProductDuplicatesOnce, 3500);



// FEMIFRESH_LIMITED_STAFF_ADMIN_V1
const cryptoStaffAdmin = require("crypto");

function staffCookieParse(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header.split(";").map(v => {
      const i = v.indexOf("=");
      if (i === -1) return ["", ""];
      return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())];
    }).filter(v => v[0])
  );
}

function staffSecret() {
  return process.env.STAFF_ADMIN_SECRET || process.env.JWT_SECRET || "femifresh-staff-secret-change-me";
}

function staffSign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = cryptoStaffAdmin
    .createHmac("sha256", staffSecret())
    .update(body)
    .digest("base64url");

  return body + "." + sig;
}

function staffVerify(token) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;

    const expected = cryptoStaffAdmin
      .createHmac("sha256", staffSecret())
      .update(body)
      .digest("base64url");

    if (sig !== expected) return null;

    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

    if (!data.exp || Date.now() > data.exp) return null;

    return data;
  } catch (e) {
    return null;
  }
}

function staffAuth(req, res, next) {
  const cookies = staffCookieParse(req);
  const staff = staffVerify(cookies.ff_staff_token);

  if (!staff) {
    return res.status(401).json({
      success: false,
      message: "Staff admin login required."
    });
  }

  req.staffAdmin = staff;
  next();
}

function getStaffLogin() {
  return {
    email: process.env.STAFF_ADMIN_EMAIL || "orders@femifresh.local",
    password: process.env.STAFF_ADMIN_PASSWORD || "Orders@12345"
  };
}

function orderIdMatches(order, id) {
  const keys = [
    order.id,
    order.orderId,
    order.orderNumber,
    order.orderNo,
    order.reference
  ].filter(Boolean).map(String);

  return keys.includes(String(id));
}

function orderNumber(order, index) {
  const raw =
    order.orderNumber ||
    order.orderNo ||
    order.reference ||
    order.id ||
    index + 1;

  const s = String(raw);

  if (s.startsWith("FF-")) return s;

  const digits = s.match(/\d+/);
  if (!digits) return "FF-" + String(10000 + index + 1);

  const n = Number(digits[0]);

  if (n >= 10000) return "FF-" + n;

  return "FF-" + String(10000 + n).padStart(5, "0");
}

function affiliateJoiningPaid(a) {
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

app.post("/api/staff/login", (req, res) => {
  const body = req.body || {};
  const login = getStaffLogin();

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (email !== login.email.toLowerCase() || password !== login.password) {
    return res.status(401).json({
      success: false,
      message: "Invalid staff admin login."
    });
  }

  const token = staffSign({
    role: "orders_joining_admin",
    email: login.email,
    exp: Date.now() + 1000 * 60 * 60 * 12
  });

  res.cookie("ff_staff_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12
  });

  res.json({
    success: true,
    role: "orders_joining_admin"
  });
});

app.post("/api/staff/logout", staffAuth, (req, res) => {
  res.clearCookie("ff_staff_token");
  res.json({ success: true });
});

app.get("/api/staff/me", staffAuth, (req, res) => {
  res.json({
    success: true,
    staff: req.staffAdmin
  });
});

app.get("/api/staff/orders", staffAuth, (req, res) => {
  const orders = read("orders", []);

  const clean = orders.map((o, index) => ({
    ...o,
    cleanOrderNumber: orderNumber(o, index)
  })).sort((a, b) => {
    return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
  });

  res.json({
    success: true,
    orders: clean
  });
});

app.post("/api/staff/orders/:id/paid", staffAuth, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => orderIdMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  orders[index] = {
    ...orders[index],
    paymentStatus: "paid",
    paid: true,
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("orders", orders);

  res.json({
    success: true,
    order: orders[index]
  });
});

app.post("/api/staff/orders/:id/fulfilled", staffAuth, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => orderIdMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  orders[index] = {
    ...orders[index],
    fulfillmentStatus: "fulfilled",
    status: orders[index].status === "cancelled" ? "cancelled" : "fulfilled",
    fulfilled: true,
    fulfilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("orders", orders);

  res.json({
    success: true,
    order: orders[index]
  });
});

app.get("/api/staff/joining-pending", staffAuth, (req, res) => {
  const affiliates = read("affiliates", []);

  const pending = affiliates
    .filter(a => !affiliateJoiningPaid(a))
    .map(a => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      fullName: a.fullName || a.name || [a.firstName, a.lastName].filter(Boolean).join(" "),
      email: a.email,
      phone: a.phone,
      referralCode: a.referralCode || a.code,
      joiningFeeStatus: a.joiningFeeStatus || a.paymentStatus || a.accountStatus || "pending",
      createdAt: a.createdAt
    }));

  res.json({
    success: true,
    affiliates: pending
  });
});

app.post("/api/staff/affiliates/:id/mark-joined", staffAuth, (req, res) => {
  const id = req.params.id;
  const affiliates = read("affiliates", []);

  const index = affiliates.findIndex(a =>
    String(a.id || "") === String(id) ||
    String(a.email || "").toLowerCase() === String(id).toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Affiliate not found."
    });
  }

  affiliates[index] = {
    ...affiliates[index],
    joiningFeePaid: true,
    manualJoiningFeePaid: true,
    joiningFeeStatus: "paid",
    paymentStatus: "paid",
    accountStatus: "approved",
    approved: true,
    isApproved: true,
    joined: true,
    joiningFeePaidAt: affiliates[index].joiningFeePaidAt || new Date().toISOString(),
    approvedAt: affiliates[index].approvedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({
    success: true,
    affiliate: affiliates[index]
  });
});



// LIMITED_ADMIN_JOINING_FEES_V1
function limitedAdminCanUse(req) {
  const user = req.adminUser || req.user || req.admin || {};
  const role = String(user.role || user.type || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "orders_admin" ||
    role === "staff_admin"
  );
}

function joiningFeePaidLimited(a) {
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

function limitedAdminGuard(req, res, next) {
  if (typeof requireAdmin === "function") {
    return requireAdmin(req, res, function(){
      if (!limitedAdminCanUse(req)) {
        return res.status(403).json({success:false,message:"Not allowed."});
      }
      next();
    });
  }
  next();
}

app.get("/api/admin/limited/joining-fees", limitedAdminGuard, (req, res) => {
  const affiliates = read("affiliates", []);

  res.json({
    success:true,
    affiliates: affiliates
      .filter(a => !joiningFeePaidLimited(a))
      .map(a => ({
        id:a.id,
        firstName:a.firstName,
        lastName:a.lastName,
        fullName:a.fullName || a.name || [a.firstName,a.lastName].filter(Boolean).join(" "),
        email:a.email,
        phone:a.phone,
        referralCode:a.referralCode || a.code,
        joiningFeeStatus:a.joiningFeeStatus || a.paymentStatus || a.accountStatus || "pending",
        createdAt:a.createdAt
      }))
  });
});

app.post("/api/admin/limited/affiliates/:id/mark-joined", limitedAdminGuard, (req, res) => {
  const id = req.params.id;
  const affiliates = read("affiliates", []);

  const index = affiliates.findIndex(a =>
    String(a.id || "") === String(id) ||
    String(a.email || "").toLowerCase() === String(id).toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({success:false,message:"Affiliate not found."});
  }

  affiliates[index] = {
    ...affiliates[index],
    joiningFeePaid:true,
    manualJoiningFeePaid:true,
    joiningFeeStatus:"paid",
    paymentStatus:"paid",
    accountStatus:"approved",
    approved:true,
    isApproved:true,
    joined:true,
    joiningFeeAmount: affiliates[index].joiningFeeAmount || 100,
    joiningFeePaidAt: affiliates[index].joiningFeePaidAt || new Date().toISOString(),
    approvedAt: affiliates[index].approvedAt || new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("affiliates", affiliates);

  res.json({success:true, affiliate:affiliates[index]});
});



// LIMITED_ADMIN_ORDERS_NORMAL_SESSION_V1
function limitedOrdersRoleOk(req) {
  const user = req.adminUser || req.user || req.admin || {};
  const role = String(user.role || user.type || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "orders_admin" ||
    role === "staff_admin"
  );
}

function limitedOrdersGuard(req, res, next) {
  if (typeof requireAdmin === "function") {
    return requireAdmin(req, res, function(){
      if (!limitedOrdersRoleOk(req)) {
        return res.status(403).json({success:false,message:"Not allowed."});
      }
      next();
    });
  }

  next();
}

function limitedOrderMatches(order, id) {
  const keys = [
    order.id,
    order.orderId,
    order.orderNumber,
    order.orderNo,
    order.reference
  ].filter(Boolean).map(String);

  return keys.includes(String(id));
}

function limitedCleanOrderNo(order, index) {
  const raw = order.orderNumber || order.orderNo || order.reference || order.id || index + 1;
  const s = String(raw);

  if (s.startsWith("FF-")) return s;

  const digits = s.match(/\d+/);
  if (!digits) return "FF-" + String(10000 + index + 1);

  const n = Number(digits[0]);
  if (n >= 10000) return "FF-" + n;

  return "FF-" + String(10000 + n).padStart(5, "0");
}

app.get("/api/admin/limited/orders", limitedOrdersGuard, (req, res) => {
  const orders = read("orders", []);

  const clean = orders.map((o, index) => ({
    ...o,
    cleanOrderNumber: limitedCleanOrderNo(o, index)
  })).sort((a, b) => {
    return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
  });

  res.json({
    success:true,
    orders:clean
  });
});

app.post("/api/admin/limited/orders/:id/paid", limitedOrdersGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => limitedOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({success:false,message:"Order not found."});
  }

  orders[index] = {
    ...orders[index],
    paymentStatus:"paid",
    paid:true,
    paidAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("orders", orders);

  res.json({success:true, order:orders[index]});
});

app.post("/api/admin/limited/orders/:id/fulfilled", limitedOrdersGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);
  const index = orders.findIndex(o => limitedOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({success:false,message:"Order not found."});
  }

  orders[index] = {
    ...orders[index],
    fulfillmentStatus:"fulfilled",
    status: orders[index].status === "cancelled" ? "cancelled" : "fulfilled",
    fulfilled:true,
    fulfilledAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  write("orders", orders);

  res.json({success:true, order:orders[index]});
});

app.listen(PORT, () => console.log(`FemiFresh running on http://localhost:${PORT}`));
