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
    res.json({ success: true, order, checkoutUrl: `/thank-you.html?order=${order.orderNumber}` });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

app.post('/api/payments/yoco/create-checkout', async (req, res) => {
  const { orderNumber } = req.body;
  const orders = read('orders', []);
  const order = orders.find(o => o.orderNumber === orderNumber);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  // Live Yoco checkout can be added here when keys are ready. Webhook route below is already prepared.
  res.json({ success: true, mode: 'placeholder', message: 'Add YOCO_SECRET_KEY to connect live checkout.', checkoutUrl: `/thank-you.html?order=${order.orderNumber}` });
});

app.post('/api/webhooks/yoco', express.json({ type: '*/*' }), async (req, res) => {
  const event = req.body || {};
  const logs = read('paymentLogs', []);
  logs.unshift({ id: uuid(), provider: 'yoco', event, createdAt: new Date().toISOString() });
  write('paymentLogs', logs.slice(0, 500));
  const refs = [event?.payload?.metadata?.orderNumber, event?.data?.metadata?.orderNumber, event?.metadata?.orderNumber, event?.orderNumber].filter(Boolean);
  if (refs.length) {
    const orders = read('orders', []);
    const idx = orders.findIndex(o => refs.includes(o.orderNumber));
    if (idx >= 0) {
      orders[idx].paymentStatus = 'paid';
      orders[idx].paidAt = new Date().toISOString();
      orders[idx].updatedAt = new Date().toISOString();
      write('orders', orders);
    }
  }
  res.json({ success: true, received: true, refs });
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

app.listen(PORT, () => console.log(`FemiFresh running on http://localhost:${PORT}`));
