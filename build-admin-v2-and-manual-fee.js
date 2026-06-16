const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const cssDir = path.join(publicDir, "css");

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });

/* 1) Make seed always include R100 joining fee product */
const seedFile = path.join(root, "src", "seed.js");
let seed = fs.readFileSync(seedFile, "utf8");

if (!seed.includes("affiliate-joining-fee")) {
  seed += `

/* Ensure manual affiliate joining fee product exists */
try {
  const productsNow = read('products', []);
  const hasJoiningFee = productsNow.some(p =>
    String(p.slug || '').toLowerCase() === 'affiliate-joining-fee' ||
    String(p.name || '').toLowerCase() === 'affiliate joining fee'
  );

  if (!hasJoiningFee) {
    productsNow.unshift({
      id: uuid(),
      name: 'Affiliate Joining Fee',
      slug: 'affiliate-joining-fee',
      category: 'Affiliate',
      price: 100,
      stockPrice: 0,
      stock: 9999,
      image: '/images/femifresh-logo.jpg',
      description: 'Once-off FemiFresh affiliate registration fee. Please use the same email used when registering as an affiliate.',
      active: true,
      manualPayment: true,
      createdAt: new Date().toISOString()
    });
    write('products', productsNow);
    console.log('Affiliate Joining Fee product added.');
  }
} catch (e) {
  console.error('Could not ensure affiliate joining fee product:', e.message);
}
`;
  fs.writeFileSync(seedFile, seed);
}

/* 2) Public manual R100 payment page */
fs.writeFileSync(path.join(publicDir, "affiliate-fee.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Affiliate Joining Fee | FemiFresh</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <style>
    :root{--p:#68235f;--d:#35112f;--pink:#f4a7d8;--b:rgba(104,35,95,.14)}
    *{box-sizing:border-box}
    body{
      margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:radial-gradient(circle at 10% 12%,rgba(244,167,216,.3),transparent 28%),
      radial-gradient(circle at 90% 16%,rgba(104,35,95,.14),transparent 24%),
      linear-gradient(180deg,#fff8fd,#fff1fa 55%,#fffaf7); color:#241126;
    }
    header{height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 8vw;background:rgba(255,255,255,.78);backdrop-filter:blur(16px);border-bottom:1px solid var(--b)}
    .brand{display:flex;align-items:center;gap:12px;color:var(--p);font-weight:950;font-size:28px;text-decoration:none}
    .brand img{width:54px;height:54px;object-fit:cover;border-radius:18px;box-shadow:0 12px 28px rgba(104,35,95,.16)}
    .nav{display:flex;gap:18px;font-weight:850}
    .nav a{text-decoration:none;color:#4d2b50}
    main{width:min(1080px,calc(100% - 32px));margin:auto;padding:70px 0}
    .grid{display:grid;grid-template-columns:1fr .9fr;gap:28px;align-items:center}
    h1{font-size:clamp(50px,8vw,94px);line-height:.96;margin:0 0 18px;letter-spacing:-.07em;background:linear-gradient(120deg,var(--d),var(--p),#d55cbb);-webkit-background-clip:text;background-clip:text;color:transparent}
    p{color:#6f5e72;line-height:1.7;font-size:18px}
    .card{background:rgba(255,255,255,.78);border:1px solid var(--b);border-radius:34px;padding:34px;box-shadow:0 28px 70px rgba(104,35,95,.12);backdrop-filter:blur(18px)}
    .amount{font-size:64px;font-weight:950;color:var(--p);letter-spacing:-.06em;margin:10px 0}
    label{display:block;font-weight:850;margin:14px 0 7px;color:var(--d)}
    input,textarea{width:100%;min-height:52px;border:1px solid var(--b);border-radius:16px;padding:14px 16px;font-size:16px;background:#fff}
    textarea{min-height:100px}
    button,.btn{width:100%;min-height:54px;border:0;border-radius:999px;margin-top:18px;background:linear-gradient(135deg,var(--p),#8c2e80,var(--pink));color:white;font-weight:950;font-size:16px;cursor:pointer;box-shadow:0 16px 34px rgba(104,35,95,.2)}
    .notice{background:#fff1fa;border:1px solid var(--b);border-radius:22px;padding:18px;margin-top:18px;color:#4d2b50}
    .success{display:none;background:#e9fff1;border:1px solid #b8efc9;color:#14592b;border-radius:22px;padding:18px;margin-top:18px}
    @media(max-width:850px){header{padding:0 18px}.nav{display:none}.grid{grid-template-columns:1fr}.card{padding:24px}}
  </style>
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/images/femifresh-logo.jpg" alt="FemiFresh"><span>FemiFresh</span></a>
  <nav class="nav"><a href="/">Home</a><a href="/products.html">Products</a><a href="/contact.html">Contact</a></nav>
</header>

<main>
  <div class="grid">
    <section>
      <h1>Affiliate Joining Fee.</h1>
      <p>Pay the once-off R100 FemiFresh affiliate joining fee manually. Use the same email address you used when registering as an affiliate.</p>
      <div class="notice">
        <strong>Manual payment for now:</strong><br>
        After paying, send your proof of payment to <strong>femifresh02@gmail.com</strong>. Use your registered affiliate email as the reference.
      </div>
    </section>

    <section class="card">
      <h2 style="margin:0;color:var(--d);font-size:34px;">Once-off fee</h2>
      <div class="amount">R100</div>
      <p style="margin-top:0;">Create a pending joining-fee order. Admin will approve after proof is received.</p>

      <form id="feeForm">
        <label>Full name</label>
        <input name="name" required placeholder="Your full name">

        <label>Email used for affiliate registration</label>
        <input name="email" type="email" required placeholder="you@example.com">

        <label>Optional note / reference</label>
        <textarea name="note" placeholder="Example: I have paid R100 joining fee"></textarea>

        <button type="submit">Submit Joining Fee Order</button>
      </form>

      <div class="success" id="successBox"></div>
    </section>
  </div>
</main>

<script>
async function json(url, opts){
  const r = await fetch(url, {headers:{'Content-Type':'application/json'}, ...opts});
  return r.json();
}

async function getJoiningFeeProduct(){
  const res = await json('/api/products');
  const products = res.products || res.data || [];
  return products.find(p =>
    String(p.slug || '').toLowerCase() === 'affiliate-joining-fee' ||
    String(p.name || '').toLowerCase() === 'affiliate joining fee'
  );
}

async function getFreeDelivery(){
  const res = await json('/api/delivery-methods');
  const methods = res.deliveryMethods || [];
  return methods.find(d => Number(d.price || 0) === 0) || methods[0] || null;
}

document.getElementById('feeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);
  const product = await getJoiningFeeProduct();

  if (!product) {
    alert('Affiliate Joining Fee product is not ready yet. Redeploy and try again.');
    return;
  }

  const delivery = await getFreeDelivery();

  const orderRes = await json('/api/orders', {
    method:'POST',
    body: JSON.stringify({
      customer:{
        name: fd.get('name'),
        email: fd.get('email'),
        phone: '',
        address: 'Manual affiliate joining fee'
      },
      items:[{productId: product.id, qty: 1}],
      deliveryMethodId: delivery ? delivery.id : undefined,
      paymentMethod:'manual_affiliate_joining_fee',
      referralCode:'',
      note: fd.get('note')
    })
  });

  if (!orderRes.success) {
    alert(orderRes.message || 'Could not create joining fee order.');
    return;
  }

  const order = orderRes.order;
  document.getElementById('successBox').style.display = 'block';
  document.getElementById('successBox').innerHTML =
    '<strong>Joining fee order created.</strong><br>Order: ' + order.orderNumber +
    '<br><br>Please send proof of payment to <strong>femifresh02@gmail.com</strong> with this order number and your affiliate email.';
  e.target.reset();
});
</script>
</body>
</html>`);

/* 3) Admin V2 CSS */
fs.writeFileSync(path.join(adminDir, "admin-v2.css"), `
:root{--p:#68235f;--d:#35112f;--m:#8c2e80;--pink:#f4a7d8;--bg:#f7f3f8;--b:rgba(104,35,95,.13);--text:#241126;--muted:#6f5e72}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--text)}
.admin-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{background:#16111a;color:white;padding:22px;position:sticky;top:0;height:100vh}
.logo{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:950;margin-bottom:26px}
.logo img{width:48px;height:48px;border-radius:16px;object-fit:cover}
.menu{display:grid;gap:8px}
.menu a{color:rgba(255,255,255,.78);padding:13px 14px;border-radius:16px;text-decoration:none;font-weight:850}
.menu a:hover,.menu a.active{background:rgba(255,255,255,.12);color:#fff}
.main{padding:34px;min-width:0}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:24px}
.crumb{color:var(--muted);font-weight:750;margin-bottom:8px}
h1{font-size:clamp(38px,5vw,68px);letter-spacing:-.07em;line-height:.95;margin:0;background:linear-gradient(120deg,var(--d),var(--p),#c24eae);-webkit-background-clip:text;background-clip:text;color:transparent}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--p),var(--m),var(--pink));color:white;font-weight:950;padding:12px 18px;text-decoration:none;cursor:pointer;min-height:44px}
.btn.light{background:white;color:var(--p);border:1px solid var(--b)}
.btn.danger{background:#b00020}
.grid{display:grid;gap:16px}
.stats{grid-template-columns:repeat(4,1fr);margin-bottom:18px}
.card{background:white;border:1px solid var(--b);border-radius:24px;box-shadow:0 18px 44px rgba(104,35,95,.07);padding:20px}
.card-label{color:var(--muted);font-weight:850;margin-bottom:10px}
.card-value{font-size:34px;font-weight:950;color:var(--p);letter-spacing:-.04em}
.toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap}
input,select,textarea{border:1px solid var(--b);border-radius:14px;padding:12px 14px;background:white;min-height:44px;font-size:15px}
.search{min-width:280px}
.table-wrap{background:white;border:1px solid var(--b);border-radius:24px;overflow:auto;box-shadow:0 18px 44px rgba(104,35,95,.07)}
table{width:100%;border-collapse:collapse;min-width:860px}
th,td{padding:14px 16px;border-bottom:1px solid rgba(104,35,95,.09);vertical-align:top;text-align:left}
th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--p);background:#fbf6fb}
.badge{display:inline-flex;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:950;background:#f1e3f0;color:var(--p)}
.badge.green{background:#e6f8ee;color:#16723d}.badge.red{background:#ffe2e8;color:#a40024}.badge.amber{background:#fff1d8;color:#8a5700}
.two{grid-template-columns:1fr 380px}
.item-row{display:grid;grid-template-columns:1fr auto auto;gap:14px;border-bottom:1px solid rgba(104,35,95,.09);padding:14px 0}
.kv{display:grid;gap:10px}.kv div{display:flex;justify-content:space-between;gap:14px}
.note{width:100%;min-height:90px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-grid .full{grid-column:1/-1}
@media(max-width:900px){.admin-shell{display:block}.sidebar{position:relative;height:auto}.menu{grid-template-columns:1fr 1fr}.main{padding:18px}.stats,.two,.form-grid{grid-template-columns:1fr}.topbar{display:block}table{min-width:720px}}
`);

/* 4) Admin V2 JS */
fs.writeFileSync(path.join(adminDir, "admin-v2.js"), `
const api = async (url, opts={}) => {
  const r = await fetch(url, { credentials:'include', headers:{'Content-Type':'application/json'}, ...opts });
  const j = await r.json().catch(()=>({success:false,message:'Bad response'}));
  if (r.status === 401) location.href = '/admin/login.html';
  return j;
};
const money = n => 'R' + Number(n || 0).toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2});
const date = d => d ? new Date(d).toLocaleString('en-ZA') : '--';
const qs = new URLSearchParams(location.search);
function badge(v){
  const s = String(v || '').toLowerCase();
  let c = s.includes('paid') || s.includes('delivered') || s.includes('fulfilled') ? 'green' : s.includes('failed') || s.includes('cancel') ? 'red' : s.includes('pending') || s.includes('new') ? 'amber' : '';
  return '<span class="badge '+c+'">'+(v || '--')+'</span>';
}
async function logout(){ await api('/api/admin/logout',{method:'POST'}); location.href='/admin/login.html'; }
function shell(title, sub=''){
  document.write(\`
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="logo"><img src="/images/femifresh-logo.jpg"><span>FemiFresh Admin</span></div>
      <nav class="menu">
        <a href="/admin/dashboard.html">Dashboard</a>
        <a href="/admin/orders.html">Orders</a>
        <a href="/admin/products.html">Products</a>
        <a href="/admin/affiliates.html">Affiliates</a>
        <a href="/admin/delivery.html">Delivery</a>
        <a href="/admin/logs.html">Logs</a>
        <a href="#" onclick="logout()">Logout</a>
      </nav>
    </aside>
    <main class="main">
      <div class="topbar">
        <div><div class="crumb">\${sub}</div><h1>\${title}</h1></div>
        <div><a class="btn light" href="/">Open Store</a></div>
      </div>
      <div id="app"></div>
    </main>
  </div>\`);
}
async function loadMe(){ return api('/api/admin/me'); }

async function dashboard(){
  shell('Dashboard','Overview');
  await loadMe();
  const d = await api('/api/admin/dashboard');
  const o = await api('/api/admin/orders');
  const orders = o.orders || [];
  const today = new Date().toISOString().slice(0,10);
  const todaySales = orders.filter(x => String(x.createdAt||'').slice(0,10) === today && x.paymentStatus === 'paid').reduce((s,x)=>s+Number(x.total||0),0);
  const pending = orders.filter(x => x.paymentStatus === 'pending').length;
  const app = document.getElementById('app');
  app.innerHTML = \`
    <section class="grid stats">
      <div class="card"><div class="card-label">Today’s sales</div><div class="card-value">\${money(todaySales)}</div></div>
      <div class="card"><div class="card-label">Total orders</div><div class="card-value">\${orders.length}</div></div>
      <div class="card"><div class="card-label">Pending payments</div><div class="card-value">\${pending}</div></div>
      <div class="card"><div class="card-label">Paid sales</div><div class="card-value">\${money(d.stats?.totalSales || 0)}</div></div>
    </section>
    <section class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
      <a class="card" href="/admin/orders.html"><b>Orders</b><p>View and manage orders</p></a>
      <a class="card" href="/admin/products.html"><b>Add Product</b><p>Create or edit products</p></a>
      <a class="card" href="/admin/affiliates.html"><b>Affiliates</b><p>Manage affiliate accounts</p></a>
      <a class="card" href="/affiliate-fee.html"><b>R100 Joining Fee</b><p>Manual fee payment page</p></a>
    </section>
    <div class="table-wrap">
      <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Fulfillment</th><th>Date</th></tr></thead>
      <tbody>\${orders.slice(0,8).map(row).join('')}</tbody></table>
    </div>\`;
}

function row(o){
  return \`<tr onclick="location.href='/admin/order-detail.html?id=\${o.id}'" style="cursor:pointer">
    <td><b>\${o.orderNumber || o.id}</b></td>
    <td>\${o.customer?.name || '--'}<br><small>\${o.customer?.email || ''}</small></td>
    <td><b>\${money(o.total)}</b></td>
    <td>\${badge(o.paymentStatus)}</td>
    <td>\${badge(o.fulfillmentStatus)}</td>
    <td>\${date(o.createdAt)}</td>
  </tr>\`;
}

let allOrders = [];
async function ordersPage(){
  shell('Orders','Sales');
  await loadMe();
  const r = await api('/api/admin/orders');
  allOrders = r.orders || [];
  document.getElementById('app').innerHTML = \`
    <div class="toolbar">
      <div>
        <input class="search" id="q" placeholder="Search order, customer, email..." oninput="renderOrders()">
        <select id="pay" onchange="renderOrders()"><option value="">All payments</option><option>pending</option><option>paid</option><option>failed</option></select>
        <select id="ful" onchange="renderOrders()"><option value="">All fulfillment</option><option>new</option><option>packed</option><option>out_for_delivery</option><option>delivered</option><option>cancelled</option></select>
      </div>
      <a class="btn" href="/affiliate-fee.html">Manual R100 Fee</a>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfillment</th><th>Date</th></tr></thead><tbody id="ordersBody"></tbody></table></div>\`;
  renderOrders();
}
function renderOrders(){
  const q = (document.getElementById('q')?.value || '').toLowerCase();
  const pay = document.getElementById('pay')?.value || '';
  const ful = document.getElementById('ful')?.value || '';
  const list = allOrders.filter(o => {
    const text = JSON.stringify(o).toLowerCase();
    return (!q || text.includes(q)) && (!pay || o.paymentStatus === pay) && (!ful || o.fulfillmentStatus === ful);
  });
  document.getElementById('ordersBody').innerHTML = list.map(o => \`<tr onclick="location.href='/admin/order-detail.html?id=\${o.id}'" style="cursor:pointer">
    <td><b>\${o.orderNumber || o.id}</b><br><small>\${date(o.createdAt)}</small></td>
    <td>\${o.customer?.name || '--'}<br><small>\${o.customer?.email || ''}</small></td>
    <td>\${(o.items||[]).map(i=>\`\${i.qty} x \${i.name}\`).join('<br>')}</td>
    <td><b>\${money(o.total)}</b></td>
    <td>\${badge(o.paymentStatus)}</td>
    <td>\${badge(o.fulfillmentStatus)}</td>
    <td>\${date(o.createdAt)}</td>
  </tr>\`).join('');
}

async function orderDetail(){
  shell('Order Details','Orders');
  await loadMe();
  const id = qs.get('id');
  const r = await api('/api/admin/orders');
  const o = (r.orders || []).find(x => x.id === id || x.orderNumber === id);
  if (!o){ document.getElementById('app').innerHTML='<div class="card">Order not found.</div>'; return; }
  window.currentOrder = o;
  document.querySelector('h1').textContent = o.orderNumber || 'Order';
  document.getElementById('app').innerHTML = \`
    <div class="grid two">
      <section>
        <div class="card" style="margin-bottom:16px">
          <h2>Items</h2>
          \${(o.items||[]).map(i=>\`<div class="item-row"><div><b>\${i.name}</b><br><small>Qty: \${i.qty}</small></div><div>\${money(i.price)}</div><div><b>\${money(i.subtotal)}</b></div></div>\`).join('')}
        </div>
        <div class="card">
          <h2>Payment info</h2>
          <div class="kv">
            <div><span>Items</span><b>\${money(o.subtotal)}</b></div>
            <div><span>Shipping</span><b>\${money(o.delivery?.price || 0)}</b></div>
            <div><span>Total</span><b>\${money(o.total)}</b></div>
            <div><span>Method</span><b>\${o.paymentMethod || '--'}</b></div>
          </div>
        </div>
      </section>
      <aside>
        <div class="card" style="margin-bottom:16px">
          <h2>Status</h2>
          <label>Payment</label>
          <select onchange="updateOrder('\${o.id}','paymentStatus',this.value)"><option \${sel(o.paymentStatus,'pending')}>pending</option><option \${sel(o.paymentStatus,'paid')}>paid</option><option \${sel(o.paymentStatus,'failed')}>failed</option><option \${sel(o.paymentStatus,'refunded')}>refunded</option></select>
          <label>Fulfillment</label>
          <select onchange="updateOrder('\${o.id}','fulfillmentStatus',this.value)"><option \${sel(o.fulfillmentStatus,'new')}>new</option><option \${sel(o.fulfillmentStatus,'packed')}>packed</option><option \${sel(o.fulfillmentStatus,'out_for_delivery')}>out_for_delivery</option><option \${sel(o.fulfillmentStatus,'delivered')}>delivered</option><option \${sel(o.fulfillmentStatus,'cancelled')}>cancelled</option></select>
          <label>Tracking number</label>
          <input value="\${o.trackingNumber||''}" onchange="updateOrder('\${o.id}','trackingNumber',this.value)">
        </div>
        <div class="card" style="margin-bottom:16px">
          <h2>Customer</h2>
          <p><b>\${o.customer?.name || '--'}</b><br>\${o.customer?.email || ''}<br>\${o.customer?.phone || ''}</p>
          <p><b>Address</b><br>\${o.customer?.address || 'No address'}</p>
          <p><b>Delivery</b><br>\${o.delivery?.name || '--'}</p>
          <p><b>Referral</b><br>\${o.referralCode || '--'}</p>
        </div>
        <div class="card">
          <h2>Admin note</h2>
          <textarea class="note" onchange="updateOrder('\${o.id}','adminNote',this.value)">\${o.adminNote || ''}</textarea>
        </div>
      </aside>
    </div>\`;
}
function sel(a,b){ return a===b ? 'selected' : ''; }
async function updateOrder(id,key,value){
  const r = await api('/api/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({[key]:value})});
  if(!r.success) alert(r.message || 'Update failed');
}

async function productsPage(){
  shell('Products','Catalog');
  await loadMe();
  document.getElementById('app').innerHTML = \`
    <section class="card" style="margin-bottom:18px">
      <h2>Add Product</h2>
      <form onsubmit="addProduct(event)" class="form-grid">
        <input name="name" placeholder="Product name" required>
        <input name="category" placeholder="Category">
        <input name="price" type="number" step="0.01" placeholder="Price" required>
        <input name="stock" type="number" placeholder="Stock">
        <input class="full" name="image" placeholder="Image path e.g. /images/product.jpg">
        <textarea class="full" name="description" placeholder="Description"></textarea>
        <button class="btn full">Add Product</button>
      </form>
    </section>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody id="productsBody"></tbody></table></div>\`;
  loadProducts();
}
async function addProduct(e){
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.price = Number(body.price || 0); body.stock = Number(body.stock || 0);
  const r = await api('/api/admin/products',{method:'POST',body:JSON.stringify(body)});
  if(!r.success) return alert(r.message || 'Could not add product');
  e.target.reset(); loadProducts();
}
async function loadProducts(){
  const r = await api('/api/admin/products');
  const products = r.products || [];
  document.getElementById('productsBody').innerHTML = products.map(p => \`
    <tr><td><b>\${p.name}</b><br><small>\${p.description || ''}</small></td><td>\${p.category || ''}</td><td>\${money(p.price)}</td><td>\${p.stock || 0}</td><td>\${p.active===false ? badge('hidden') : badge('active')}</td><td><button class="btn light" onclick="hideProduct('\${p.id}')">Hide</button></td></tr>\`).join('');
}
async function hideProduct(id){ if(!confirm('Hide this product?'))return; await api('/api/admin/products/'+id,{method:'DELETE'}); loadProducts(); }
`);

/* 5) Rebuild admin pages */
function adminPage(title, fn){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | FemiFresh Admin</title><link rel="icon" href="/images/femifresh-logo.jpg"><link rel="stylesheet" href="/admin/admin-v2.css"></head><body><script src="/admin/admin-v2.js"></script><script>${fn}();</script></body></html>`;
}
fs.writeFileSync(path.join(adminDir, "dashboard.html"), adminPage("Dashboard", "dashboard"));
fs.writeFileSync(path.join(adminDir, "orders.html"), adminPage("Orders", "ordersPage"));
fs.writeFileSync(path.join(adminDir, "order-detail.html"), adminPage("Order Details", "orderDetail"));
fs.writeFileSync(path.join(adminDir, "products.html"), adminPage("Products", "productsPage"));

/* 6) Remove featured products from homepage if still present */
const indexFile = path.join(publicDir, "index.html");
if (fs.existsSync(indexFile)) {
  let index = fs.readFileSync(indexFile, "utf8");
  index = index.replace(/<section class="products" id="featured">[\\s\\S]*?<\\/section>/i, "");
  index = index.replace(/<section[^>]*id=["']featured["'][\\s\\S]*?<\\/section>/i, "");
  index = index.replace(/<a class="floating-cart"[\\s\\S]*?<\\/a>/gi, "");
  fs.writeFileSync(indexFile, index);
}

/* 7) Remove public header from affiliate pages and add manual fee button */
for (const name of ["affiliate-login.html","affiliate-dashboard.html","join.html","join-success.html","affiliate-reset-password.html"]) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/<header class="ff-site-header">[\\s\\S]*?<\\/header>/gi, "");
  html = html.replace(/<script>\\s*const ffMenuBtn[\\s\\S]*?<\\/script>/gi, "");
  if (!html.includes("/affiliate-fee.html")) {
    html = html.replace("</body>", `<div style="position:fixed;right:18px;bottom:18px;z-index:99"><a href="https://www.femifresh.co.za/affiliate-fee.html" style="display:inline-flex;padding:14px 18px;border-radius:999px;background:#68235f;color:#fff;text-decoration:none;font-weight:900;box-shadow:0 16px 34px rgba(104,35,95,.22)">Pay R100 Joining Fee</a></div>\\n</body>`);
  }
  fs.writeFileSync(file, html);
}

console.log("Admin V2 + manual R100 joining fee installed.");
