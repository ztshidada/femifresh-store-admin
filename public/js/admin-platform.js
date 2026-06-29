(function(){
  const { api, qs, esc, money, toast, badge, confirmModal } = window.Femi;
  let me = null;
  let state = {};

  const navAll = [
    ["Dashboard", "/admin/dashboard.html", ["super_admin","orders_admin"]],
    ["Orders", "/admin/orders.html", ["super_admin","orders_admin"]],
    ["Joining Fees", "/admin/joining-fees.html", ["super_admin","orders_admin"]],
    ["Products", "/admin/products.html", ["super_admin"]],
    ["Affiliates", "/admin/affiliates.html", ["super_admin"]],
    ["Payouts", "/admin/payouts.html", ["super_admin"]],
    ["Operations", "/admin/operations.html", ["super_admin"]],
    ["Users", "/admin/users.html", ["super_admin"]],
    ["Settings", "/admin/settings.html", ["super_admin"]],
    ["Logs", "/admin/logs.html", ["super_admin"]]
  ];

  async function requireMe(){
    if (me) return me;
    try {
      const data = await api("/api/admin/me");
      me = data.user;
      return me;
    } catch {
      location.href = "/admin/login.html";
    }
  }

  async function login(){
    const form = qs("#adminLogin");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        await api("/api/admin/login", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        location.href = "/admin/dashboard.html";
      } catch(err) { toast(err.message, "error"); }
    });
  }

  async function logout(){
    await api("/api/admin/logout", { method:"POST" }).catch(()=>{});
    location.href = "/admin/login.html";
  }
  window.adminLogout = logout;

  async function shell(active){
    await requireMe();
    const links = navAll.filter(([, , roles]) => roles.includes(me.role));
    document.body.innerHTML = `
      <div class="ff-admin-layout">
        <aside class="ff-sidebar">
          <a class="ff-brand" href="/admin/dashboard.html"><img src="/images/femifresh-logo.jpg" alt="">FemiFresh Admin</a>
          <nav>
            ${links.map(([label, href]) => `<a class="${label===active ? "active" : ""}" href="${href}">${label}</a>`).join("")}
            <button onclick="adminLogout()">Logout</button>
          </nav>
        </aside>
        <main class="ff-admin-main">
          <div class="ff-toolbar">
            <div><p class="ff-eyebrow" style="color:#68235f">${esc(me.role)}</p><h1 class="ff-page-title">${esc(active)}</h1></div>
            <a class="ff-btn secondary" href="/">Open Store</a>
          </div>
          <div id="adminRoot" class="ff-stack"></div>
        </main>
      </div>`;
    return qs("#adminRoot");
  }

  function table(headers, rows){
    if (!rows.length) return `<div class="ff-empty">Nothing to show yet.</div>`;
    return `<div class="ff-table-wrap"><table class="ff-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  function stat(label, value){ return `<div class="ff-card ff-stat"><span class="ff-muted">${esc(label)}</span><strong>${esc(value)}</strong></div>`; }
  function itemImage(item){ return item.image || item.imageUrl || "/images/femifresh-logo.jpg"; }
  function qty(item){ return Number(item.qty || item.quantity || 1); }
  function unitPrice(item){ return Number(item.unitPrice ?? item.price ?? 0); }
  function lineTotal(item){ return Number(item.lineTotal ?? item.subtotal ?? (unitPrice(item) * qty(item))); }
  function adminLineItem(item){
    return `<div class="ff-line-item compact">
      <img class="ff-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name || "FemiFresh product")}">
      <div><strong>${esc(item.name || "FemiFresh product")}</strong><p class="ff-muted">${qty(item)} x ${money(unitPrice(item))}</p></div>
      <strong>${money(lineTotal(item))}</strong>
    </div>`;
  }
  function packingSlip(o){
    const items = o.items || [];
    const customerAddress = o.customer?.address || o.deliveryAddress || "";
    return `<section class="ff-print-slip">
      <div class="ff-slip">
        <header class="ff-slip-header">
          <div class="ff-slip-brand">
            <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
            <div><h1 class="ff-slip-title">FemiFresh Packing Slip</h1><strong>Fresh care, clear orders.</strong></div>
          </div>
          <div class="ff-slip-meta">
            <strong>${esc(o.orderNumber || "")}</strong>
            <span>Date: ${esc((o.createdAt || "").slice(0, 10))}</span>
            <span>Payment: ${esc(o.paymentStatus || "pending")}</span>
            <span>Fulfilment: ${esc(o.fulfillmentStatus || o.orderStatus || "new")}</span>
            <span>Tracking: ${esc(o.trackingNumber || "Not added")}</span>
          </div>
        </header>
        <div class="ff-slip-grid">
          <div class="ff-slip-box"><h3>Customer</h3><strong>${esc(o.customer?.name || "")}</strong><br>${esc(o.customer?.phone || "")}<br>${esc(o.customer?.email || "")}</div>
          <div class="ff-slip-box"><h3>Delivery</h3>${esc(customerAddress).replace(/\n/g, "<br>")}<br><strong>${esc(o.delivery?.name || "Delivery method not set")}</strong></div>
        </div>
        <table class="ff-slip-table">
          <thead><tr><th>Item</th><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>${items.map(i => `<tr><td><img class="ff-slip-thumb" src="${esc(itemImage(i))}" alt=""></td><td>${esc(i.name || "FemiFresh product")}</td><td>${qty(i)}</td><td>${money(unitPrice(i))}</td><td>${money(lineTotal(i))}</td></tr>`).join("")}</tbody>
        </table>
        <div class="ff-slip-totals">
          <div class="ff-row"><span>Subtotal</span><strong>${money(o.subtotal || items.reduce((s, i) => s + lineTotal(i), 0))}</strong></div>
          <div class="ff-row"><span>Delivery</span><strong>${money(o.delivery?.price || 0)}</strong></div>
          ${o.discount?.amount ? `<div class="ff-row"><span>Discount</span><strong>-${money(o.discount.amount)}</strong></div>` : ""}
          <div class="ff-row"><span>Total</span><strong>${money(o.total)}</strong></div>
        </div>
        ${o.adminNote ? `<div class="ff-slip-box"><h3>Admin Note</h3>${esc(o.adminNote)}</div>` : ""}
        <div class="ff-slip-signatures"><div class="ff-slip-line">Packed by</div><div class="ff-slip-line">Checked by</div></div>
        <footer class="ff-slip-support"><span>FemiFresh Support</span><span>WhatsApp: 0632180372</span><span>Email: femifresh02@gmail.com</span></footer>
      </div>
    </section>`;
  }

  async function dashboard(){
    const root = await shell("Dashboard");
    const data = await api("/api/admin/dashboard");
    const s = data.stats;
    root.innerHTML = `
      <section class="ff-grid four">
        ${stat("Orders", s.orders.total)}
        ${stat("Unpaid", s.orders.unpaid)}
        ${stat("Paid Sales", money(s.orders.paidSales))}
        ${stat("Pending Joining", s.affiliates.pendingJoining)}
      </section>
      <section class="ff-grid two">
        <div class="ff-card"><h2>Low Stock</h2>${table(["Product","Stock"], data.lowStock.map(p => `<tr><td>${esc(p.name)}</td><td>${p.stock}</td></tr>`))}</div>
        <div class="ff-card"><h2>Follow Ups</h2><p>Unpaid orders: <strong>${data.unpaidOrders.length}</strong></p><p>Pending joining fees: <strong>${data.pendingJoiningFees.length}</strong></p><a class="ff-btn secondary" href="/admin/operations.html">Open Operations</a></div>
      </section>`;
  }

  async function orders(){
    const root = await shell("Orders");
    const data = await api("/api/admin/orders");
    state.orders = data.orders;
    root.innerHTML = `
      <div class="ff-card"><input class="ff-input" id="orderSearch" placeholder="Search orders" oninput="renderOrders()"></div>
      <div id="ordersTable"></div>`;
    renderOrders();
  }
  window.renderOrders = function(){
    const q = (qs("#orderSearch")?.value || "").toLowerCase();
    const rows = (state.orders || []).filter(o => JSON.stringify(o).toLowerCase().includes(q)).map(o => `
      <tr>
        <td><strong>${esc(o.orderNumber)}</strong><br><small>${esc(o.createdAt || "")}</small></td>
        <td>${esc(o.customer?.name || "")}<br><small>${esc(o.customer?.email || "")}<br>${esc(o.customer?.phone || "")}</small></td>
        <td>${badge(o.paymentStatus)} ${String(o.paymentStatus || "").toLowerCase() === "pop_submitted" || o.popReceivedAt ? badge("POP Submitted") : ""}</td>
        <td>${badge(o.orderStatus || o.fulfillmentStatus)}</td>
        <td><strong>${money(o.total)}</strong></td>
        <td>${(o.items || []).map(i => `${esc(qty(i))}x ${esc(i.name)}`).join("<br>")}</td>
        <td><a class="ff-btn secondary" href="/admin/order-detail.html?id=${encodeURIComponent(o.id)}">Open</a></td>
      </tr>`);
    qs("#ordersTable").innerHTML = table(["Order","Customer","Payment","Status","Total","Items","Action"], rows);
  };

  async function orderDetail(){
    const root = await shell("Orders");
    const id = new URLSearchParams(location.search).get("id");

    const [data, popData] = await Promise.all([
      api("/api/admin/orders"),
      api("/api/admin/pop-submissions")
    ]);

    const o = data.orders.find(x =>
      String(x.id) === String(id) ||
      String(x.orderNumber) === String(id)
    );

    if (!o) {
      root.innerHTML = `<div class="ff-empty">Order not found.</div>`;
      return;
    }

    const relatedPops = (popData.submissions || []).filter(p =>
      String(p.kind || "") === "order" &&
      (
        String(p.reference || "") === String(o.orderNumber || "") ||
        String(p.reference || "") === String(o.id || "")
      )
    );

    root.innerHTML = `
      <section class="ff-grid two">
        <div class="ff-card ff-stack">
          <h2>${esc(o.orderNumber)}</h2>
          <p>${badge(o.paymentStatus)} ${badge(o.orderStatus || o.fulfillmentStatus)}</p>

          <p>
            <strong>${esc(o.customer?.name || "")}</strong><br>
            ${esc(o.customer?.email || "")}<br>
            ${esc(o.customer?.phone || "")}
          </p>

          <p class="ff-muted">${esc(o.customer?.address || "")}</p>

          <h3>Items</h3>
          <div class="ff-stack">${(o.items || []).map(adminLineItem).join("")}</div>

          <hr>
          <div class="ff-row">
            <span>Total</span>
            <strong>${money(o.total)}</strong>
          </div>

          <div id="orderPopPanel"></div>
        </div>

        <div class="ff-card ff-stack">
          <h2>Workflow</h2>

          ${select("paymentStatus", ["pending","pop_submitted","under_review","paid","failed","refunded","cancelled"], o.paymentStatus)}

          ${select("orderStatus", ["new","pop_submitted","under_review","paid","packing","packed","fulfilled","tracking_added","delivered","cancelled"], o.orderStatus || o.fulfillmentStatus)}

          <label class="ff-field">
            Tracking Number
            <input id="trackingNumber" value="${esc(o.trackingNumber || "")}">
          </label>

          <label class="ff-field">
            Admin Note
            <textarea id="adminNote">${esc(o.adminNote || "")}</textarea>
          </label>

          <button class="ff-btn" onclick="saveOrder('${esc(o.id)}')">
            Save Order
          </button>

          <button class="ff-btn secondary" onclick="markWhatsappPop('${esc(o.id)}')">
            Mark POP via WhatsApp
          </button>

          <button class="ff-btn secondary" onclick="printSlip()">
            Print Packing Slip
          </button>

          ${me.role === "super_admin"
            ? `<button class="ff-btn danger" onclick="deleteOrder('${esc(o.id)}')">Delete Order</button>`
            : ""}
        </div>
      </section>

      ${packingSlip(o)}
    `;

    renderOrderPops(relatedPops);
  }

  function renderOrderPops(pops){
    const target = qs("#orderPopPanel");
    if (!target) return;

    if (!pops.length) {
      target.innerHTML = `
        <section class="ff-card ff-stack">
          <h3>Proof of Payment</h3>
          <div class="ff-empty">No proof of payment has been submitted yet.</div>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <section class="ff-card ff-stack">
        <h3>Proof of Payment</h3>

        ${pops.map(p => {
          const source = p.channel === "whatsapp"
            ? "Received via WhatsApp"
            : "Uploaded through website";

          const preview = p.file
            ? (
              String(p.file.fileType || "").startsWith("image/")
                ? `<a href="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" target="_blank" rel="noopener">
                    <img class="ff-pop-preview" src="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" alt="Proof of payment">
                   </a>`
                : `<a class="ff-btn secondary" href="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" target="_blank" rel="noopener">
                    Open Uploaded POP
                   </a>`
            )
            : `<p class="ff-muted">No file was uploaded. POP was received through WhatsApp.</p>`;

          const approveButton = p.status !== "approved"
            ? `<button class="ff-btn" onclick="approveOrderPop('${esc(p.id)}')">Approve POP & Mark Paid</button>`
            : "";

          return `
            <div class="ff-card ff-stack" style="padding:16px">
              <div class="ff-row ff-wrap">
                <div>
                  <strong>${esc(source)}</strong>
                  <p class="ff-muted">${esc(p.createdAt || "")}</p>
                </div>
                <div>${badge(p.status || "submitted")}</div>
              </div>

              <p><strong>Order number:</strong> ${esc(p.reference || "")}</p>
              <p><strong>Customer:</strong> ${esc(p.contact || "Saved on order")}</p>
              <p><strong>Uploaded:</strong> ${esc(p.createdAt || "")}</p>
              <p><strong>Customer note:</strong> ${esc(p.note || "No note added.")}</p>
              ${preview}
              ${approveButton}
            </div>
          `;
        }).join("")}
      </section>
    `;
  }

  function select(name, values, current){
    return `<label class="ff-field">${name}<select id="${name}">${values.map(v => `<option value="${v}" ${String(current)===v?"selected":""}>${v}</option>`).join("")}</select></label>`;
  }
  window.saveOrder = async function(id){
    try {
      await api("/api/admin/orders/" + encodeURIComponent(id), { method:"PATCH", body: JSON.stringify({ paymentStatus: qs("#paymentStatus").value, orderStatus: qs("#orderStatus").value, fulfillmentStatus: qs("#orderStatus").value, trackingNumber: qs("#trackingNumber").value, adminNote: qs("#adminNote").value }) });
      toast("Order saved.");
    } catch(err){ toast(err.message, "error"); }
  };
  window.approveOrderPop = async function(id){
    try {
      await api("/api/admin/pop-submissions/" + encodeURIComponent(id) + "/review", {
        method: "POST",
        body: JSON.stringify({ status: "approved" })
      });
      toast("POP approved and order marked paid.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.markWhatsappPop = async function(orderId){
    try {
      await api("/api/admin/orders/" + encodeURIComponent(orderId) + "/pop-whatsapp", {
        method: "POST",
        body: JSON.stringify({
          note: "Proof of payment received via WhatsApp."
        })
      });
      toast("WhatsApp POP recorded.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.printSlip = () => window.print();
  window.deleteOrder = async function(id){
    const ok = await confirmModal({ title:"Delete order", message:"Only super admin can delete orders. A backup audit record will be kept.", confirmText:"Delete", danger:true });
    if (!ok) return;
    try { await api("/api/admin/orders/" + encodeURIComponent(id), { method:"DELETE" }); toast("Order deleted."); location.href="/admin/orders.html"; }
    catch(err){ toast(err.message, "error"); }
  };

  async function joiningFees(){
    const root = await shell("Joining Fees");
    const data = await api("/api/admin/joining-fees");
    root.innerHTML = `<section class="ff-card">${table(["Name","Email","Phone","Code","Action"], data.affiliates.map(a => `<tr><td>${esc(a.fullName || a.email)}</td><td>${esc(a.email)}</td><td>${esc(a.phone)}</td><td>${esc(a.referralCode)}</td><td><button class="ff-btn" onclick="approveJoining('${esc(a.id)}')">Mark Joined</button></td></tr>`))}</section>`;
  }
  window.approveJoining = async function(id){
    try { await api("/api/admin/joining-fees/" + encodeURIComponent(id) + "/approve", { method:"POST" }); toast("Affiliate approved."); joiningFees(); }
    catch(err){ toast(err.message, "error"); }
  };

  async function products(){
    const root = await shell("Products");
    const data = await api("/api/admin/products");
    root.innerHTML = `
      <section class="ff-card"><h2>Add / Update Product</h2>${productForm()}</section>
      <section class="ff-card"><h2>Products</h2>${table(["Name","Price","Referral Bonus","Level Commission","Stock","Status","Action"], data.products.map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${money(p.commissionRules?.directReferralCommission || 0)}</td><td>${money(p.commissionRules?.levelCommission || 0)}</td><td>${p.stock}</td><td>${badge(p.available ? "Active" : "Out of stock")}</td><td><button class="ff-btn secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`))}</section>`;
    bindProductForm();
  }
  function productForm(p={}){
    return `<form class="ff-form" id="productForm">
      <input type="hidden" name="id" value="${esc(p.id || "")}">
      <label class="ff-field">Name<input name="name" value="${esc(p.name || "")}" required></label>
      <label class="ff-field">Category<input name="category" value="${esc(p.category || "")}"></label>
      <div class="ff-grid two"><label class="ff-field">Price<input name="price" type="number" value="${esc(p.price || "")}" required></label><label class="ff-field">Stock<input name="stock" type="number" value="${esc(p.stock ?? "")}" required></label></div>
      <label class="ff-field">Image<input name="image" value="${esc(p.image || "")}"></label>
      <label class="ff-field">Description<textarea name="description">${esc(p.description || "")}</textarea></label>
      <div class="ff-grid two">
        <label class="ff-field">Direct Referral Commission<input name="directReferralCommission" type="number" value="${esc(p.commissionRules?.directReferralCommission || "")}"></label>
        <label class="ff-field">Level Commission<input name="levelCommission" type="number" value="${esc(p.commissionRules?.levelCommission || "")}"></label>
      </div>
      <div class="ff-grid two">
        <label class="ff-field">Product Active<select name="active"><option value="true" ${p.active === false ? "" : "selected"}>Active</option><option value="false" ${p.active === false ? "selected" : ""}>Inactive</option></select></label>
        <label class="ff-field">Stock Status<select name="outOfStock"><option value="false" ${p.outOfStock ? "" : "selected"}>In stock</option><option value="true" ${p.outOfStock ? "selected" : ""}>Out of stock</option></select></label>
      </div>
      <button class="ff-btn">Save Product</button>
    </form>`;
  }
  function bindProductForm(){
    qs("#productForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get("id");
      const body = Object.fromEntries(fd.entries());
      body.active = body.active !== "false";
      body.outOfStock = body.outOfStock === "true";
      body.status = body.active ? (body.outOfStock ? "out_of_stock" : "active") : "archived";
      body.commissionRules = {
        directReferralCommission: Number(body.directReferralCommission || 0),
        levelCommission: Number(body.levelCommission || 0)
      };
      delete body.directReferralCommission;
      delete body.levelCommission;
      try { await api(id ? "/api/admin/products/" + encodeURIComponent(id) : "/api/admin/products", { method: id ? "PATCH" : "POST", body: JSON.stringify(body) }); toast("Product saved."); products(); }
      catch(err){ toast(err.message, "error"); }
    });
  }
  window.editProduct = function(p){ qs("#productForm").outerHTML = productForm(p); bindProductForm(); scrollTo({top:0, behavior:"smooth"}); };

  async function affiliates(){
    const root = await shell("Affiliates");
    const data = await api("/api/admin/affiliates");
    root.innerHTML = `<section class="ff-card">${table(["Name","Code","Status","Directs","Payable","Bank"], data.affiliates.map(a => `<tr><td>${esc(a.fullName || a.email)}<br><small>${esc(a.email)}</small></td><td>${esc(a.referralCode)}</td><td>${badge(a.approved ? "Approved" : "Pending")}</td><td>${a.stats.directRecruits}</td><td>${money(a.stats.totalPayable)}</td><td>${esc(a.bankDetails?.bankName || "Not saved")}</td></tr>`))}</section>`;
  }
  async function payouts(){
    const root = await shell("Payouts");
    const statements = await api("/api/admin/commission-statements");
    const payouts = await api("/api/admin/payouts");
    root.innerHTML = `<section class="ff-card"><h2>Commission Statements</h2>${table(["Affiliate","Month","Payable","Status"], statements.statements.map(s => `<tr><td>${esc(s.fullName)}</td><td>${esc(s.month)}</td><td>${money(s.stats?.totalPayable)}</td><td>${badge(s.payoutStatus)}</td></tr>`))}</section><section class="ff-card"><h2>Payout History</h2>${table(["Affiliate","Month","Amount","Status"], payouts.payouts.map(p => `<tr><td>${esc(p.affiliateId)}</td><td>${esc(p.month)}</td><td>${money(p.amount)}</td><td>${badge(p.status)}</td></tr>`))}</section>`;
  }
  async function operations(){
    const root = await shell("Operations");
    const [followups, pop, reviews, returns, fraud] = await Promise.all([api("/api/admin/followups"), api("/api/admin/pop-submissions"), me.role === "super_admin" ? api("/api/admin/reviews") : Promise.resolve({reviews:[]}), api("/api/admin/returns"), me.role === "super_admin" ? api("/api/admin/fraud-flags") : Promise.resolve({flags:[]})]);
    root.innerHTML = `
      <section class="ff-card"><h2>Unpaid Order Follow Ups</h2>${table(["Order","Customer","Action"], followups.unpaidOrders.map(x => `<tr><td>${esc(x.order.orderNumber)}</td><td>${esc(x.order.customer?.name || "")}</td><td><a class="ff-btn secondary" href="${esc(x.whatsappUrl)}">WhatsApp</a></td></tr>`))}</section>
      <section class="ff-card"><h2>Pending Joining Follow Ups</h2>${table(["Affiliate","Email","Action"], followups.pendingJoiningFees.map(x => `<tr><td>${esc(x.affiliate.fullName || "")}</td><td>${esc(x.affiliate.email)}</td><td><a class="ff-btn secondary" href="${esc(x.whatsappUrl)}">WhatsApp</a></td></tr>`))}</section>
      <section class="ff-card"><h2>POP Review</h2>${table(["Kind","Reference","Status","Action"], pop.submissions.map(p => `<tr><td>${esc(p.kind)}</td><td>${esc(p.reference)}</td><td>${badge(p.status)}</td><td><button class="ff-btn" onclick="reviewPop('${esc(p.id)}','approved')">Approve</button></td></tr>`))}</section>
      <section class="ff-card"><h2>Reviews</h2>${table(["Name","Rating","Status","Action"], reviews.reviews.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.rating)}</td><td>${badge(r.status)}</td><td><button class="ff-btn secondary" onclick="moderateReview('${esc(r.id)}','approved')">Approve</button></td></tr>`))}</section>
      <section class="ff-card"><h2>Returns / Refunds</h2>${table(["Order","Contact","Reason","Status"], returns.returns.map(r => `<tr><td>${esc(r.orderNumber)}</td><td>${esc(r.contact)}</td><td>${esc(r.reason)}</td><td>${badge(r.status)}</td></tr>`))}</section>
      <section class="ff-card"><h2>Fraud Review Flags</h2>${table(["Type","Severity","Message"], fraud.flags.map(f => `<tr><td>${esc(f.type)}</td><td>${badge(f.severity)}</td><td>${esc(f.message)}</td></tr>`))}</section>`;
  }
  window.reviewPop = async function(id,status){ try { await api("/api/admin/pop-submissions/" + id + "/review", { method:"POST", body: JSON.stringify({ status }) }); toast("POP reviewed."); operations(); } catch(err){ toast(err.message, "error"); } };
  window.moderateReview = async function(id,status){ try { await api("/api/admin/reviews/" + id + "/moderate", { method:"POST", body: JSON.stringify({ status }) }); toast("Review updated."); operations(); } catch(err){ toast(err.message, "error"); } };

  async function users(){
    const root = await shell("Users");
    const data = await api("/api/admin/users");
    root.innerHTML = `<section class="ff-card"><h2>Create Admin</h2><form class="ff-form" id="userForm"><input class="ff-input" name="name" placeholder="Name"><input class="ff-input" name="email" type="email" placeholder="Email"><input class="ff-input" name="password" placeholder="Temporary password"><select class="ff-input" name="role"><option>orders_admin</option><option>product_admin</option><option>support_admin</option><option>super_admin</option></select><button class="ff-btn">Create</button></form></section><section class="ff-card">${table(["Name","Email","Role"], data.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${badge(u.role)}</td></tr>`))}</section>`;
    qs("#userForm").onsubmit = async e => { e.preventDefault(); try { await api("/api/admin/users", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); toast("User created."); users(); } catch(err){ toast(err.message, "error"); } };
  }
  async function settings(){
    const root = await shell("Settings");
    const data = await api("/api/admin/settings");
    const s = data.settings;

    root.innerHTML = `
      <section class="ff-card">
        <form class="ff-form" id="settingsForm">
          <h2>Business</h2>
          <input class="ff-input" name="business.email" value="${esc(s.business.email || "")}" placeholder="Business email">
          <input class="ff-input" name="business.whatsapp" value="${esc(s.business.whatsapp || "")}" placeholder="WhatsApp number">

          <h2>Bank</h2>
          <input class="ff-input" name="bank.bankName" value="${esc(s.bank.bankName || "")}" placeholder="Bank name">
          <input class="ff-input" name="bank.accountHolder" value="${esc(s.bank.accountHolder || "")}" placeholder="Account holder">
          <input class="ff-input" name="bank.accountNumber" value="${esc(s.bank.accountNumber || "")}" placeholder="Account number">

          <h2>Manual Payment Message</h2>
          <textarea class="ff-input" name="payment.manualInstructions">${esc(s.payment.manualInstructions || "")}</textarea>

          <button class="ff-btn">Save Business Settings</button>
        </form>
      </section>

      <section class="ff-card">
        <form class="ff-form" id="commissionSettingsForm">
          <h2>Target Bonus Settings</h2>

          <label class="ff-field">
            Target Active Direct Referrals
            <input class="ff-input" name="targetActiveDirects" type="number" min="1" value="${esc(s.commission?.targetActiveDirects ?? 10)}">
          </label>

          <label class="ff-field">
            Target Bonus Amount (R)
            <input class="ff-input" name="targetBonusAmount" type="number" min="0" value="${esc(s.commission?.targetBonusAmount ?? 1000)}">
          </label>

          <button class="ff-btn">Save Commission Settings</button>
        </form>
      </section>
    `;

    qs("#settingsForm").onsubmit = async e => {
      e.preventDefault();

      const patch = {};
      new FormData(e.target).forEach((value, key) => {
        const [group, field] = key.split(".");
        patch[group] ||= {};
        patch[group][field] = value;
      });

      try {
        await api("/api/admin/settings", {
          method: "POST",
          body: JSON.stringify(patch)
        });
        toast("Business settings saved.");
      } catch(err) {
        toast(err.message, "error");
      }
    };

    qs("#commissionSettingsForm").onsubmit = async e => {
      e.preventDefault();
      const form = new FormData(e.target);

      try {
        await api("/api/admin/settings", {
          method: "POST",
          body: JSON.stringify({
            commission: {
              referralBonusPerActiveDirect: Number(form.get("referralBonusPerActiveDirect") || 0),
              targetActiveDirects: Number(form.get("targetActiveDirects") || 10),
              targetBonusAmount: Number(form.get("targetBonusAmount") || 0)
            }
          })
        });
        toast("Commission settings saved.");
      } catch(err) {
        toast(err.message, "error");
      }
    };
  }

  async function logs(){
    const root = await shell("Logs");
    const [payments, emails] = await Promise.all([api("/api/admin/payment-logs"), api("/api/admin/email-logs")]);
    root.innerHTML = `<section class="ff-card"><h2>Payment Logs</h2><pre>${esc(JSON.stringify(payments.paymentLogs.slice(0,20), null, 2))}</pre></section><section class="ff-card"><h2>Email Logs</h2><pre>${esc(JSON.stringify(emails.emailLogs.slice(0,20), null, 2))}</pre></section>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    login();
    const page = document.body.dataset.adminPage;
    if (!page) return;
    ({ dashboard, orders, orderDetail, joiningFees, products, affiliates, payouts, operations, users, settings, logs }[page] || dashboard)().catch(err => toast(err.message, "error"));
  });
})();
