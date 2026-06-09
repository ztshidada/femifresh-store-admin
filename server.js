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
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
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

app.listen(PORT, () => console.log(`FemiFresh running on http://localhost:${PORT}`));
