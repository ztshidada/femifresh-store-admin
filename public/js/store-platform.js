(function(){
  const { api, qs, qsa, esc, money, toast, badge, fileToData } = window.Femi;

  const cart = {
    get(){ return JSON.parse(localStorage.getItem("ff_cart") || "[]"); },
    set(items){ localStorage.setItem("ff_cart", JSON.stringify(items)); qsa("[data-cart-count]").forEach(el => el.textContent = items.reduce((s,i)=>s+Number(i.qty||1),0)); },
    add(product){
      if (!product.available) return toast("This product is out of stock.", "error");
      const items = this.get();
      const found = items.find(i => i.productId === product.id);
      if (found) found.qty += 1;
      else items.push({ productId: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
      this.set(items);
      toast("Added to cart.");
    },
    remove(id){ this.set(this.get().filter(i => i.productId !== id)); renderCart(); },
    qty(id, qty){
      const items = this.get();
      const found = items.find(i => i.productId === id);
      if (found) found.qty = Math.max(1, Number(qty || 1));
      this.set(items);
      renderCart();
      renderCheckoutSummary();
    },
    clear(){ this.set([]); }
  };

  window.FemiCart = cart;

  function itemImage(item){
    return item.image || item.imageUrl || "/images/femifresh-logo.jpg";
  }

  function lineItem(item, { compact=false, removable=false, controls=false } = {}){
    const qty = Number(item.qty || item.quantity || 1);
    const price = Number(item.price ?? item.unitPrice ?? 0);
    const total = Number(item.subtotal ?? item.lineTotal ?? (price * qty));
    return `
      <div class="ff-line-item ${compact ? "compact" : ""}">
        <img class="ff-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name || "FemiFresh product")}">
        <div>
          <strong>${esc(item.name || "FemiFresh product")}</strong>
          <p class="ff-muted">${qty} x ${money(price)}</p>
          ${controls ? `<div class="ff-row ff-wrap" style="justify-content:flex-start">
            <button class="ff-btn secondary" onclick="FemiCart.qty('${esc(item.productId)}', ${qty - 1})">-</button>
            <strong>${qty}</strong>
            <button class="ff-btn secondary" onclick="FemiCart.qty('${esc(item.productId)}', ${qty + 1})">+</button>
          </div>` : ""}
        </div>
        <div class="ff-stack" style="gap:8px;justify-items:end">
          <strong>${money(total)}</strong>
          ${removable ? `<button class="ff-btn ghost" onclick="FemiCart.remove('${esc(item.productId)}')">Remove</button>` : ""}
        </div>
      </div>`;
  }

  function productCard(p){
    return `
      <article class="ff-card ff-product-card">
        <a href="/product/${encodeURIComponent(p.id)}"><img src="${esc(p.image || "/images/femifresh-logo.jpg")}" alt="${esc(p.name)}"></a>
        <div class="ff-row ff-wrap">
          <span class="ff-badge">${esc(p.category || "FemiFresh")}</span>
          ${p.available ? badge("Active") : badge("Out of stock")}
        </div>
        <h3>${esc(p.name)}</h3>
        <p class="ff-muted">${esc(p.description || "")}</p>
        <div class="ff-row ff-wrap">
          <strong class="ff-price">${money(p.price)}</strong>
          <small class="ff-muted">Stock: ${Number(p.stock || 0)}</small>
        </div>
        <div class="ff-row ff-wrap">
          <a class="ff-btn secondary" href="/product/${encodeURIComponent(p.id)}">View</a>
          <button class="ff-btn" ${p.available ? "" : "disabled"} data-add="${esc(p.id)}">${p.available ? "Add to Cart" : "Out of Stock"}</button>
        </div>
      </article>`;
  }

  async function loadProducts(targetId="products", limit=0){
    const el = qs("#" + targetId);
    if (!el) return;
    const data = await api("/api/products");
    const products = limit ? data.products.slice(0, limit) : data.products;
    el.innerHTML = products.map(productCard).join("") || `<div class="ff-empty">No products available yet.</div>`;
    qsa("[data-add]", el).forEach(btn => btn.onclick = () => cart.add(products.find(p => p.id === btn.dataset.add)));
  }

  async function loadProductDetail(){
    const el = qs("#productDetail");
    if (!el) return;
    const id = decodeURIComponent(location.pathname.split("/").pop());
    const { product } = await api("/api/products/" + encodeURIComponent(id));
    el.innerHTML = `
      <div class="ff-grid two">
        <div class="ff-card"><img src="${esc(product.image || "/images/femifresh-logo.jpg")}" alt="${esc(product.name)}" style="border-radius:8px;width:100%"></div>
        <div class="ff-card ff-stack">
          <div class="ff-row ff-wrap"><span class="ff-badge">${esc(product.category || "Product")}</span>${product.available ? badge("Active") : badge("Out of Stock")}</div>
          <h1 class="ff-page-title">${esc(product.name)}</h1>
          <p class="ff-lead">${esc(product.description || "")}</p>
          <strong class="ff-price">${money(product.price)}</strong>
          <p class="ff-muted">Available stock: ${Number(product.stock || 0)}</p>
          <button class="ff-btn" ${product.available ? "" : "disabled"} id="detailAdd">${product.available ? "Add to Cart" : "Out of Stock"}</button>
        </div>
      </div>`;
    qs("#detailAdd")?.addEventListener("click", () => cart.add(product));
  }

  function renderCart(){
    const list = qs("#cartItems");
    const summary = qs("#cartSummary");
    if (!list && !summary) return;
    const items = cart.get();
    if (list) {
      list.innerHTML = items.length ? items.map(i => `
        <article class="ff-card compact">${lineItem(i, { controls:true, removable:true })}</article>`).join("") : `<div class="ff-empty">Your cart is empty. <a href="/products"><strong>Shop products</strong></a>.</div>`;
    }
    if (summary) {
      const subtotal = items.reduce((s,i)=>s+Number(i.price)*Number(i.qty),0);
      summary.innerHTML = `<div class="ff-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="ff-row"><span>Delivery</span><span>Calculated at checkout</span></div>`;
    }
  }

  async function setupCheckout(){
    const form = qs("#checkoutForm");
    if (!form) return;
    const delivery = await api("/api/delivery-methods");
    qs("#deliveryMethodId").innerHTML = delivery.deliveryMethods.map(d => `<option value="${esc(d.id)}">${esc(d.name)} - ${money(d.price)}</option>`).join("");
    renderCheckoutSummary();
    qs("#deliveryMethodId").addEventListener("change", renderCheckoutSummary);
    form.addEventListener("submit", submitOrder);
  }

  async function renderCheckoutSummary(){
    const el = qs("#checkoutSummary");
    if (!el) return;
    const items = cart.get();
    if (!items.length) {
      el.innerHTML = `<div class="ff-empty">Add products before checkout.</div>`;
      return;
    }
    try {
      const data = await api("/api/orders/preview", { method:"POST", body: JSON.stringify({ items, deliveryMethodId: qs("#deliveryMethodId")?.value }) });
      el.innerHTML = `
        <div class="ff-stack">
          ${data.totals.items.map(i => lineItem(i, { compact:true })).join("")}
        </div>
        <hr>
        <div class="ff-row"><span>Subtotal</span><strong>${money(data.totals.subtotal)}</strong></div>
        <div class="ff-row"><span>${esc(data.totals.delivery.name)}</span><strong>${money(data.totals.delivery.price)}</strong></div>
        ${data.totals.discount?.amount ? `<div class="ff-row"><span>Discount</span><strong>-${money(data.totals.discount.amount)}</strong></div>` : ""}
        <div class="ff-row"><span>Total</span><strong class="ff-price">${money(data.totals.total)}</strong></div>`;
    } catch(e) {
      el.innerHTML = `<div class="ff-empty">${esc(e.message)}</div>`;
    }
  }

  async function submitOrder(event){
    event.preventDefault();
    const items = cart.get();
    if (!items.length) return toast("Your cart is empty.", "error");
    const fd = new FormData(event.target);
    const customer = {
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      name: `${fd.get("firstName")} ${fd.get("lastName")}`.trim(),
      email: fd.get("email"),
      phone: fd.get("phone"),
      address: [fd.get("lockerOrMall"), fd.get("address"), fd.get("city"), fd.get("region"), fd.get("country"), fd.get("postalCode")].filter(Boolean).join("\n"),
      region: fd.get("region")
    };
    try {
      const data = await api("/api/orders", { method:"POST", body: JSON.stringify({ customer, items, deliveryMethodId: fd.get("deliveryMethodId"), referralCode: fd.get("referralCode"), discountCode: fd.get("discountCode") }) });
      localStorage.setItem("ff_last_order", JSON.stringify(data.order));
      cart.clear();
      location.href = data.checkoutUrl;
    } catch(e) { toast(e.message, "error"); }
  }

  async function thankYou(){
    const el = qs("#thankYou");
    if (!el) return;
    const last = JSON.parse(localStorage.getItem("ff_last_order") || "null");
    const orderNo = new URLSearchParams(location.search).get("order") || last?.orderNumber || "";
    const instructions = last?.paymentInstructions;
    const items = last?.items || [];
    el.innerHTML = `
      <div class="ff-card ff-stack">
        <span>${badge(last?.paymentStatus || "pending")}</span>
        <h1 class="ff-page-title">Order received</h1>
        <p class="ff-lead">Your reference is <strong>${esc(orderNo)}</strong>. Please use this reference when sending proof of payment.</p>
        ${items.length ? `<div class="ff-stack"><h2>Order Items</h2>${items.map(i => lineItem(i, { compact:true })).join("")}</div>` : ""}
        ${instructions ? paymentBox(instructions) : ""}
        <a class="ff-btn" href="/track-order?order=${encodeURIComponent(orderNo)}">Track Order</a>
      </div>`;
  }

  function paymentBox(instructions){
    return `<div class="ff-card compact">
      <h3>Manual payment instructions</h3>
      <p><strong>Bank:</strong> ${esc(instructions.bank.bankName)}</p>
      <p><strong>Account holder:</strong> ${esc(instructions.bank.accountHolder)}</p>
      <p><strong>Account number:</strong> ${esc(instructions.bank.accountNumber)}</p>
      <p><strong>Reference:</strong> ${esc(instructions.reference)}</p>
      <p class="ff-muted">${esc(instructions.instructions)}</p>
      <a class="ff-btn secondary" href="${esc(instructions.whatsappUrl)}">Send POP on WhatsApp</a>
    </div>`;
  }

  async function setupPop(){
    const form = qs("#popForm");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const file = await fileToData(fd.get("file"));
      try {
        await api("/api/pop-submissions", { method:"POST", body: JSON.stringify({ kind: fd.get("kind") || "order", reference: fd.get("reference"), contact: fd.get("contact"), note: fd.get("note"), ...(file || {}) }) });
        toast("Proof of payment submitted.");
        form.reset();
      } catch(err) { toast(err.message, "error"); }
    });
  }

  async function setupTracking(){
    const form = qs("#trackForm");
    const out = qs("#trackResult");
    if (!form) return;
    const orderParam = new URLSearchParams(location.search).get("order");
    if (orderParam) form.orderNumber.value = orderParam;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const data = await api("/api/orders/track", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        out.innerHTML = `<div class="ff-card ff-stack">
          <h2>${esc(data.order.orderNumber)}</h2>
          <div>${badge(data.order.paymentStatus)} ${badge(data.order.orderStatus || data.order.fulfillmentStatus)}</div>
          <p>${esc(data.order.customer.name)}</p>
          <div class="ff-stack">${(data.order.items || []).map(i => lineItem(i, { compact:true })).join("")}</div>
          <p>Tracking: <strong>${esc(data.order.trackingNumber || "Not added yet")}</strong></p>
        </div>`;
      } catch(err) { out.innerHTML = `<div class="ff-empty">${esc(err.message)}</div>`; }
    });
  }

  async function setupReviews(){
    const list = qs("#reviewsList");
    const form = qs("#reviewForm");
    if (list) {
      const data = await api("/api/reviews");
      list.innerHTML = data.reviews.map(r => `<article class="ff-card"><strong>${esc(r.name)}</strong><p>${"★".repeat(Number(r.rating || 5))}</p><p>${esc(r.text)}</p></article>`).join("") || `<div class="ff-empty">No approved testimonials yet.</div>`;
    }
    if (form) form.addEventListener("submit", async e => {
      e.preventDefault();
      try { await api("/api/reviews", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); toast("Review submitted for approval."); form.reset(); }
      catch(err){ toast(err.message, "error"); }
    });
  }

  async function setupReturns(){
    const form = qs("#returnForm");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try { await api("/api/returns", { method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); toast("Return request submitted."); form.reset(); }
      catch(err){ toast(err.message, "error"); }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "home") loadProducts("featuredProducts", 3);
    if (page === "products") loadProducts("products");
    if (page === "product") loadProductDetail();
    if (page === "cart") renderCart();
    if (page === "checkout") setupCheckout();
    if (page === "thank-you") thankYou();
    setupPop();
    setupTracking();
    setupReviews();
    setupReturns();
  });
})();
