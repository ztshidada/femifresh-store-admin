const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const adminDir = path.join(publicDir, "admin");

fs.mkdirSync(adminDir, { recursive: true });

const adminJsFile = path.join(adminDir, "admin-v2.js");
let js = fs.readFileSync(adminJsFile, "utf8");

/* Replace ordersPage and orderDetail with stronger Wix-like versions */
js = js.replace(/async function ordersPage\(\)\{[\s\S]*?\nasync function orderDetail\(\)\{/, `
async function ordersPage(){
  shell('Orders','Sales');
  await loadMe();

  const r = await api('/api/admin/orders');
  allOrders = r.orders || [];

  document.getElementById('app').innerHTML = \`
    <section class="grid stats">
      <div class="card">
        <div class="card-label">Total orders</div>
        <div class="card-value">\${allOrders.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Paid orders</div>
        <div class="card-value">\${allOrders.filter(o => String(o.paymentStatus).toLowerCase() === 'paid').length}</div>
      </div>
      <div class="card">
        <div class="card-label">Pending payments</div>
        <div class="card-value">\${allOrders.filter(o => String(o.paymentStatus).toLowerCase() === 'pending').length}</div>
      </div>
      <div class="card">
        <div class="card-label">Total sales</div>
        <div class="card-value">\${money(allOrders.filter(o => String(o.paymentStatus).toLowerCase() === 'paid').reduce((s,o)=>s+Number(o.total||0),0))}</div>
      </div>
    </section>

    <div class="toolbar">
      <div>
        <input class="search" id="q" placeholder="Search order number, customer, email..." oninput="renderOrders()">
        <select id="pay" onchange="renderOrders()">
          <option value="">All payments</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="manual_pending">Manual pending</option>
        </select>
        <select id="ful" onchange="renderOrders()">
          <option value="">All fulfillment</option>
          <option value="new">New</option>
          <option value="packed">Packed</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <a class="btn light" href="/admin/dashboard.html">Back to Dashboard</a>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order Number</th>
            <th>Customer</th>
            <th>Payment</th>
            <th>Fulfillment</th>
            <th>Total</th>
            <th>Items</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="ordersBody"></tbody>
      </table>
    </div>
  \`;

  renderOrders();
}

function renderOrders(){
  const q = (document.getElementById('q')?.value || '').toLowerCase();
  const pay = document.getElementById('pay')?.value || '';
  const ful = document.getElementById('ful')?.value || '';

  const list = allOrders.filter(o => {
    const text = [
      o.orderNumber,
      o.id,
      o.customer?.name,
      o.customer?.email,
      o.customer?.phone,
      o.paymentStatus,
      o.fulfillmentStatus,
      o.total
    ].join(' ').toLowerCase();

    return (!q || text.includes(q)) &&
      (!pay || String(o.paymentStatus || '').toLowerCase() === pay) &&
      (!ful || String(o.fulfillmentStatus || '').toLowerCase() === ful);
  });

  document.getElementById('ordersBody').innerHTML = list.map(o => {
    const orderNo = o.orderNumber || o.orderNo || o.reference || o.id;
    const openUrl = '/admin/order-detail.html?id=' + encodeURIComponent(o.id || orderNo);
    const items = (o.items || []).map(i => \`\${i.qty || 1} x \${i.name || i.title || 'Item'}\`).join('<br>');

    return \`
      <tr>
        <td>
          <b style="font-size:16px;">\${orderNo}</b><br>
          <small>ID: \${o.id || '--'}</small>
        </td>
        <td>
          <b>\${o.customer?.name || '--'}</b><br>
          <small>\${o.customer?.email || ''}</small>
        </td>
        <td>\${badge(o.paymentStatus || 'pending')}</td>
        <td>\${badge(o.fulfillmentStatus || 'new')}</td>
        <td><b>\${money(o.total)}</b></td>
        <td>\${items || '--'}</td>
        <td>\${date(o.createdAt)}</td>
        <td>
          <a class="btn light" href="\${openUrl}">Open</a>
        </td>
      </tr>
    \`;
  }).join('');
}

async function orderDetail(){`);

/* Replace orderDetail function body to be fuller and more stable */
js = js.replace(/async function orderDetail\(\)\{[\s\S]*?\nfunction sel\(a,b\)\{/, `
async function orderDetail(){
  shell('Order Details','Orders');
  await loadMe();

  const id = qs.get('id');
  const r = await api('/api/admin/orders');
  const orders = r.orders || [];

  const o = orders.find(x =>
    String(x.id) === String(id) ||
    String(x.orderNumber) === String(id) ||
    String(x.orderNo) === String(id) ||
    String(x.reference) === String(id)
  );

  if (!o) {
    document.getElementById('app').innerHTML = \`
      <div class="card">
        <h2>Order not found</h2>
        <p>The order could not be opened. Go back to orders and try again.</p>
        <a class="btn" href="/admin/orders.html">Back to Orders</a>
      </div>
    \`;
    return;
  }

  const orderNo = o.orderNumber || o.orderNo || o.reference || o.id;
  document.querySelector('h1').textContent = orderNo;

  const itemRows = (o.items || []).map(i => {
    const name = i.name || i.title || 'Item';
    const qty = Number(i.qty || i.quantity || 1);
    const price = Number(i.price || i.amount || 0);
    const subtotal = Number(i.subtotal || i.total || (price * qty));
    return \`
      <div class="item-row">
        <div>
          <b>\${name}</b><br>
          <small>Quantity: \${qty}</small>
        </div>
        <div>\${money(price)}</div>
        <div><b>\${money(subtotal)}</b></div>
      </div>
    \`;
  }).join('');

  document.getElementById('app').innerHTML = \`
    <div class="topbar" style="margin-top:-10px">
      <div>
        \${badge(o.paymentStatus || 'pending')}
        \${badge(o.fulfillmentStatus || 'new')}
      </div>
      <div>
        <a class="btn light" href="/admin/orders.html">Back to Orders</a>
      </div>
    </div>

    <div class="grid two">
      <section>
        <div class="card" style="margin-bottom:16px;">
          <h2 style="margin-top:0;">Items (\${(o.items || []).length})</h2>
          \${itemRows || '<p>No items found.</p>'}
        </div>

        <div class="card" style="margin-bottom:16px;">
          <h2 style="margin-top:0;">Payment info</h2>
          <div class="kv">
            <div><span>Items</span><b>\${money(o.subtotal)}</b></div>
            <div><span>Shipping</span><b>\${money(o.delivery?.price || o.shipping || 0)}</b></div>
            <div><span>Tax</span><b>\${money(o.tax || 0)}</b></div>
            <div style="font-size:18px;"><span>Total</span><b>\${money(o.total)}</b></div>
            <div><span>Payment method</span><b>\${o.paymentMethod || '--'}</b></div>
            <div><span>Amount customer paid</span><b>\${money(o.total)}</b></div>
          </div>
        </div>

        <div class="card">
          <h2 style="margin-top:0;">Order activity</h2>
          <div class="timeline">
            <p>• Order placed: \${date(o.createdAt)}</p>
            <p>• Payment status: \${o.paymentStatus || 'pending'}</p>
            <p>• Fulfillment status: \${o.fulfillmentStatus || 'new'}</p>
          </div>

          <label>Add note</label>
          <textarea class="note" placeholder="Internal admin note" onchange="updateOrder('\${o.id}','adminNote',this.value)">\${o.adminNote || ''}</textarea>
        </div>
      </section>

      <aside>
        <div class="card" style="margin-bottom:16px;">
          <h2 style="margin-top:0;">Order status</h2>

          <label>Payment status</label>
          <select onchange="updateOrder('\${o.id}','paymentStatus',this.value)">
            <option value="pending" \${sel(o.paymentStatus,'pending')}>Pending</option>
            <option value="paid" \${sel(o.paymentStatus,'paid')}>Paid</option>
            <option value="failed" \${sel(o.paymentStatus,'failed')}>Failed</option>
            <option value="refunded" \${sel(o.paymentStatus,'refunded')}>Refunded</option>
          </select>

          <label>Fulfillment status</label>
          <select onchange="updateOrder('\${o.id}','fulfillmentStatus',this.value)">
            <option value="new" \${sel(o.fulfillmentStatus,'new')}>New</option>
            <option value="packed" \${sel(o.fulfillmentStatus,'packed')}>Packed</option>
            <option value="out_for_delivery" \${sel(o.fulfillmentStatus,'out_for_delivery')}>Out for delivery</option>
            <option value="delivered" \${sel(o.fulfillmentStatus,'delivered')}>Delivered</option>
            <option value="cancelled" \${sel(o.fulfillmentStatus,'cancelled')}>Cancelled</option>
          </select>

          <label>Tracking number</label>
          <input value="\${o.trackingNumber || ''}" placeholder="Tracking number" onchange="updateOrder('\${o.id}','trackingNumber',this.value)">
        </div>

        <div class="card" style="margin-bottom:16px;">
          <h2 style="margin-top:0;">Customer info</h2>
          <p>
            <b>\${o.customer?.name || '--'}</b><br>
            \${o.customer?.email || ''}<br>
            \${o.customer?.phone || ''}
          </p>
        </div>

        <div class="card" style="margin-bottom:16px;">
          <h2 style="margin-top:0;">Delivery info</h2>
          <p><b>Delivery method</b><br>\${o.delivery?.name || o.deliveryMethod || '--'}</p>
          <p><b>Shipping address</b><br>\${o.customer?.address || o.shippingAddress || 'No address'}</p>
        </div>

        <div class="card">
          <h2 style="margin-top:0;">Additional info</h2>
          <p><b>Referral code</b><br>\${o.referralCode || '--'}</p>
          <p><b>Order ID</b><br>\${o.id || '--'}</p>
        </div>
      </aside>
    </div>
  \`;
}

function sel(a,b){`);

/* Add helpful CSS for order details */
if (!js.includes("window.renderOrders = renderOrders")) {
  js += `
window.renderOrders = renderOrders;
`;
}

fs.writeFileSync(adminJsFile, js);

/* CSS improvements */
const cssFile = path.join(adminDir, "admin-v2.css");
let css = fs.readFileSync(cssFile, "utf8");

if (!css.includes("ORDER_DETAIL_WIX_STYLE_V2")) {
  css += `

/* ORDER_DETAIL_WIX_STYLE_V2 */
.timeline p {
  margin: 10px 0;
  color: var(--muted);
}

label {
  display: block;
  margin: 14px 0 7px;
  font-weight: 850;
  color: var(--d);
}

select,
textarea,
input {
  width: 100%;
}

.table-wrap tr:hover {
  background: #fff7fd;
}

td .btn {
  min-height: 38px;
  padding: 9px 15px;
}

.item-row:last-child {
  border-bottom: 0;
}
`;
}

fs.writeFileSync(cssFile, css);

/* Rebuild pages to make sure correct JS is used */
function page(title, fn){
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | FemiFresh Admin</title>
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/admin/admin-v2.css">
</head>
<body>
  <script src="/admin/admin-v2.js"></script>
  <script>${fn}();</script>
</body>
</html>`;
}

fs.writeFileSync(path.join(adminDir, "orders.html"), page("Orders", "ordersPage"));
fs.writeFileSync(path.join(adminDir, "order-detail.html"), page("Order Details", "orderDetail"));

/* Remove R100 payment button from affiliate pages */
const affiliatePages = [
  "affiliate-login.html",
  "affiliate-dashboard.html",
  "join.html",
  "join-success.html",
  "affiliate-reset-password.html"
];

for (const name of affiliatePages) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/<div style="position:fixed;right:18px;bottom:18px;z-index:99">[\s\S]*?Pay R100 Joining Fee[\s\S]*?<\/div>/gi, "")
    .replace(/<a[^>]+affiliate-fee\.html[^>]*>[\s\S]*?Pay R100[\s\S]*?<\/a>/gi, "")
    .replace(/<a[^>]+affiliate-fee\.html[^>]*>[\s\S]*?Joining Fee[\s\S]*?<\/a>/gi, "");

  if (!html.includes("MANUAL_JOINING_FEE_NOTICE_V1") && name.includes("dashboard")) {
    html = html.replace("</body>", `
<div id="manualFeeNotice" class="MANUAL_JOINING_FEE_NOTICE_V1" style="position:fixed;right:18px;bottom:18px;z-index:99;max-width:360px;background:#fff;border:1px solid rgba(104,35,95,.14);box-shadow:0 18px 44px rgba(104,35,95,.16);border-radius:22px;padding:16px;color:#35112f;font-family:Inter,system-ui;">
  <strong>Manual joining fee</strong><br>
  Pay the R100 manually and email proof to <strong>femifresh02@gmail.com</strong>. Use your affiliate email as reference.
</div>
</body>`);
  }

  fs.writeFileSync(file, html);
}

/* Make affiliate-fee page manual instructions only, no submit order button */
const feeFile = path.join(publicDir, "affiliate-fee.html");
if (fs.existsSync(feeFile)) {
  let fee = fs.readFileSync(feeFile, "utf8");

  fee = fee.replace(/<form id="feeForm">[\s\S]*?<\/form>/i, `
<div class="notice">
  <h2 style="margin-top:0;">Manual payment only for now</h2>
  <p>Please pay the once-off <strong>R100 affiliate joining fee</strong> manually.</p>
  <p>Email your proof of payment to:</p>
  <p style="font-size:22px;color:var(--p);font-weight:950;">femifresh02@gmail.com</p>
  <p>Use your registered affiliate email as the payment reference.</p>
</div>
`);

  fee = fee.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/i, "</body>");

  fs.writeFileSync(feeFile, fee);
}

console.log("Orders list/detail fixed and R100 pay button removed.");
