
const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts
  });

  const j = await r.json().catch(() => ({ success:false, message:"Bad response" }));

  if (r.status === 401) {
    location.href = "/admin/login.html";
    return {};
  }

  return j;
};

const money = n => "R" + Number(n || 0).toLocaleString("en-ZA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const date = d => d ? new Date(d).toLocaleString("en-ZA") : "--";

function badge(v){
  const s = String(v || "pending").toLowerCase();
  let c = "";
  if (s.includes("paid") || s.includes("fulfilled") || s.includes("delivered")) c = "green";
  else if (s.includes("failed") || s.includes("cancel") || s.includes("refund")) c = "red";
  else if (s.includes("pending") || s.includes("new") || s.includes("manual")) c = "amber";
  return '<span class="badge '+c+'">'+(v || "--")+'</span>';
}

function orderNumber(o){
  return o.orderNumber || o.orderNo || o.reference || o.number || o.id || "--";
}

function customerName(o){
  return o.customer?.name || o.name || o.customerName || "--";
}

function customerEmail(o){
  return o.customer?.email || o.email || "";
}

function customerPhone(o){
  return o.customer?.phone || o.phone || "";
}

function orderItems(o){
  return Array.isArray(o.items) ? o.items : [];
}

function itemName(i){
  return i.name || i.title || i.productName || "Item";
}

function itemQty(i){
  return Number(i.qty || i.quantity || 1);
}

function itemPrice(i){
  return Number(i.price || i.amount || i.unitPrice || 0);
}

function itemTotal(i){
  return Number(i.subtotal || i.total || (itemPrice(i) * itemQty(i)));
}

function sidebar(active){
  const links = [
    ["Dashboard","/admin/dashboard.html"],
    ["Orders","/admin/orders.html"],
    ["Affiliates","/admin/affiliates.html"],
    ["Products","/admin/products.html"],
    ["Delivery Methods","/admin/delivery.html"],
    ["Admin Users","/admin/users.html"],
    ["Payment & Email Logs","/admin/logs.html"],
    ["Logout","#logout"]
  ];

  return `
    <aside class="sidebar">
      <div class="logo">
        <img src="/images/femifresh-logo.jpg">
        <span>FemiFresh Admin</span>
      </div>
      <nav class="menu">
        ${links.map(([label, href]) => {
          if (href === "#logout") return '<a href="#" onclick="logout()">Logout</a>';
          return '<a class="'+(label === active ? 'active' : '')+'" href="'+href+'">'+label+'</a>';
        }).join("")}
      </nav>
    </aside>
  `;
}

async function logout(){
  await api("/api/admin/logout", { method:"POST" });
  location.href = "/admin/login.html";
}

async function getOrders(){
  const r = await api("/api/admin/orders");
  return r.orders || r.data || [];
}

let allOrders = [];

async function ordersPage(){
  allOrders = await getOrders();

  document.body.innerHTML = `
    <div class="admin-shell">
      ${sidebar("Orders")}
      <main class="main">
        <div class="top">
          <div>
            <div class="crumb">Sales</div>
            <h1>Orders</h1>
          </div>
          <a class="btn light" href="/">Open Store</a>
        </div>

        <section class="stats">
          <div class="card"><div class="label">Total orders</div><div class="value">${allOrders.length}</div></div>
          <div class="card"><div class="label">Paid</div><div class="value">${allOrders.filter(o => String(o.paymentStatus).toLowerCase() === "paid").length}</div></div>
          <div class="card"><div class="label">Pending</div><div class="value">${allOrders.filter(o => String(o.paymentStatus || "pending").toLowerCase().includes("pending")).length}</div></div>
          <div class="card"><div class="label">Paid sales</div><div class="value">${money(allOrders.filter(o => String(o.paymentStatus).toLowerCase() === "paid").reduce((s,o)=>s+Number(o.total||0),0))}</div></div>
        </section>

        <div class="toolbar">
          <div class="left">
            <input class="search" id="q" placeholder="Search order number, customer, email..." oninput="renderOrders()">
            <select id="pay" onchange="renderOrders()">
              <option value="">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
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
                <th>Name</th>
                <th>Paid / Pending</th>
                <th>Fulfillment</th>
                <th>Total</th>
                <th>Items</th>
                <th>Date</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody id="ordersBody"></tbody>
          </table>
        </div>
      </main>
    </div>
  `;

  renderOrders();
}

function renderOrders(){
  const q = (document.getElementById("q")?.value || "").toLowerCase();
  const pay = document.getElementById("pay")?.value || "";
  const ful = document.getElementById("ful")?.value || "";

  const list = allOrders.filter(o => {
    const text = [
      orderNumber(o),
      customerName(o),
      customerEmail(o),
      customerPhone(o),
      o.paymentStatus,
      o.fulfillmentStatus,
      o.total
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!pay || String(o.paymentStatus || "pending").toLowerCase() === pay) &&
      (!ful || String(o.fulfillmentStatus || "new").toLowerCase() === ful);
  });

  document.getElementById("ordersBody").innerHTML = list.map(o => {
    const no = orderNumber(o);
    const id = encodeURIComponent(o.id || no);
    const items = orderItems(o).map(i => itemQty(i) + "x " + itemName(i)).join("<br>");

    return `
      <tr>
        <td><b style="font-size:16px">${no}</b><br><small>${o.id || ""}</small></td>
        <td><b>${customerName(o)}</b><br><small>${customerEmail(o)}</small></td>
        <td>${badge(o.paymentStatus || "pending")}</td>
        <td>${badge(o.fulfillmentStatus || "new")}</td>
        <td><b>${money(o.total)}</b></td>
        <td>${items || "--"}</td>
        <td>${date(o.createdAt)}</td>
        <td><a class="btn small light" href="/admin/order-detail.html?id=${id}">Open</a></td>
      </tr>
    `;
  }).join("");
}

async function orderDetail(){
  const id = new URLSearchParams(location.search).get("id");
  const orders = await getOrders();

  const o = orders.find(x =>
    String(x.id) === String(id) ||
    String(orderNumber(x)) === String(id)
  );

  if (!o) {
    document.body.innerHTML = `
      <div class="admin-shell">
        ${sidebar("Orders")}
        <main class="main">
          <div class="card">
            <h1>Order not found</h1>
            <p>This order could not be opened.</p>
            <a class="btn" href="/admin/orders.html">Back to Orders</a>
          </div>
        </main>
      </div>
    `;
    return;
  }

  const no = orderNumber(o);
  const items = orderItems(o);

  document.body.innerHTML = `
    <div class="admin-shell">
      ${sidebar("Orders")}
      <main class="main">
        <div class="top">
          <div>
            <div class="crumb">Orders › ${no}</div>
            <h1>${no}</h1>
            <div style="margin-top:12px">${badge(o.paymentStatus || "pending")} ${badge(o.fulfillmentStatus || "new")}</div>
          </div>
          <a class="btn light" href="/admin/orders.html">Back to Orders</a>
        </div>

        <div class="two">
          <section>
            <div class="card" style="margin-bottom:16px">
              <h2>Items (${items.length})</h2>
              ${items.map(i => `
                <div class="item-row">
                  <div><b>${itemName(i)}</b><br><small>Qty: ${itemQty(i)}</small></div>
                  <div>${money(itemPrice(i))}</div>
                  <div><b>${money(itemTotal(i))}</b></div>
                </div>
              `).join("") || "<p>No items found.</p>"}
            </div>

            <div class="card" style="margin-bottom:16px">
              <h2>Payment info</h2>
              <div class="kv">
                <div><span>Items</span><b>${money(o.subtotal)}</b></div>
                <div><span>Shipping</span><b>${money(o.delivery?.price || o.shipping || 0)}</b></div>
                <div><span>Tax</span><b>${money(o.tax || 0)}</b></div>
                <div style="font-size:18px"><span>Total</span><b>${money(o.total)}</b></div>
                <div><span>Payment method</span><b>${o.paymentMethod || "--"}</b></div>
                <div><span>Amount customer paid</span><b>${money(o.total)}</b></div>
              </div>
            </div>

            <div class="card">
              <h2>Order activity</h2>
              <p>• Order placed: ${date(o.createdAt)}</p>
              <p>• Payment status: ${o.paymentStatus || "pending"}</p>
              <p>• Fulfillment status: ${o.fulfillmentStatus || "new"}</p>
              <label>Internal note</label>
              <textarea class="note" onchange="updateOrder('${o.id}','adminNote',this.value)">${o.adminNote || ""}</textarea>
            </div>
          </section>

          <aside>
            <div class="card side-card">
              <h2>Order status</h2>

              <label>Payment status</label>
              <select onchange="updateOrder('${o.id}','paymentStatus',this.value)">
                <option value="pending" ${sel(o.paymentStatus,"pending")}>Pending</option>
                <option value="paid" ${sel(o.paymentStatus,"paid")}>Paid</option>
                <option value="failed" ${sel(o.paymentStatus,"failed")}>Failed</option>
                <option value="refunded" ${sel(o.paymentStatus,"refunded")}>Refunded</option>
              </select>

              <label>Fulfillment status</label>
              <select onchange="updateOrder('${o.id}','fulfillmentStatus',this.value)">
                <option value="new" ${sel(o.fulfillmentStatus,"new")}>New</option>
                <option value="packed" ${sel(o.fulfillmentStatus,"packed")}>Packed</option>
                <option value="out_for_delivery" ${sel(o.fulfillmentStatus,"out_for_delivery")}>Out for delivery</option>
                <option value="delivered" ${sel(o.fulfillmentStatus,"delivered")}>Delivered</option>
                <option value="cancelled" ${sel(o.fulfillmentStatus,"cancelled")}>Cancelled</option>
              </select>

              <label>Tracking number</label>
              <input value="${o.trackingNumber || ""}" onchange="updateOrder('${o.id}','trackingNumber',this.value)">
            </div>

            <div class="card side-card">
              <h2>Customer info</h2>
              <p><b>${customerName(o)}</b><br>${customerEmail(o)}<br>${customerPhone(o)}</p>
            </div>

            <div class="card side-card">
              <h2>Delivery info</h2>
              <p><b>Delivery method</b><br>${o.delivery?.name || o.deliveryMethod || "--"}</p>
              <p><b>Shipping address</b><br>${o.customer?.address || o.shippingAddress || "No address"}</p>
            </div>

            <div class="card">
              <h2>Additional info</h2>
              <p><b>Referral code</b><br>${o.referralCode || "--"}</p>
              <p><b>Order ID</b><br>${o.id || "--"}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  `;
}

function sel(a,b){
  return String(a || "").toLowerCase() === String(b).toLowerCase() ? "selected" : "";
}

async function updateOrder(id,key,value){
  const r = await api("/api/admin/orders/" + id, {
    method:"PATCH",
    body: JSON.stringify({ [key]: value })
  });

  if (!r.success) alert(r.message || "Update failed");
}
