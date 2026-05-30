const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const cssFile = path.join(publicDir, "css", "style.css");
const jsFile = path.join(publicDir, "js", "store.js");

/* =========================
   CART PAGE
========================= */
const cartHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cart - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="/index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="/index.html">Home</a>
      <a href="/products.html">Products</a>
      <a href="/policies.html">Policies</a>
      <a href="/contact.html">Contact</a>
      <a class="cart-pill" href="/cart.html">Cart (<span data-cart-count>0</span>)</a>
    </nav>
    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">SHOPPING CART</p>
      <h1>Your FemiFresh Cart</h1>
      <p>Review your selected items, update quantities and continue to secure checkout.</p>
    </div>
  </section>

  <section class="container shop-layout">
    <div class="shop-main">
      <div class="section-head">
        <h2>Cart Items</h2>
        <button class="ghost-btn" onclick="clearCartFlow()">Clear cart</button>
      </div>
      <div id="cartItems"></div>
    </div>

    <aside class="shop-side">
      <div class="summary-card">
        <h3>Order Summary</h3>
        <div id="cartSummary"></div>
        <div class="summary-actions">
          <a class="primary-btn full-btn" href="/checkout.html">Proceed to Checkout</a>
          <a class="secondary-btn full-btn" href="/products.html">Continue Shopping</a>
        </div>
      </div>
    </aside>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, "cart.html"), cartHtml);

/* =========================
   CHECKOUT PAGE
========================= */
const checkoutHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Checkout - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="/index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="/index.html">Home</a>
      <a href="/products.html">Products</a>
      <a href="/policies.html">Policies</a>
      <a href="/contact.html">Contact</a>
      <a class="cart-pill" href="/cart.html">Cart (<span data-cart-count>0</span>)</a>
    </nav>
    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">SECURE CHECKOUT</p>
      <h1>Complete Your Order</h1>
      <p>Enter your delivery details below and review your order before placing it.</p>
    </div>
  </section>

  <section class="container shop-layout">
    <div class="shop-main">
      <div class="checkout-card">
        <div class="section-head">
          <h2>Customer Details</h2>
        </div>

        <form class="checkout-form" onsubmit="submitOrder(event)">
          <div class="form-grid">
            <label>
              Full Name
              <input class="input" name="name" placeholder="Enter full name" required>
            </label>

            <label>
              Phone Number
              <input class="input" name="phone" placeholder="+27..." required>
            </label>

            <label>
              Email Address
              <input class="input" type="email" name="email" placeholder="you@example.com" required>
            </label>

            <label>
              Delivery Method
              <select name="deliveryMethodId" id="deliveryMethodId" onchange="renderCheckoutSummary()"></select>
            </label>

            <label class="full-span">
              Delivery Address
              <textarea class="input" name="address" rows="4" placeholder="Street address, area, city, province"></textarea>
            </label>

            <label class="full-span">
              Referral Code (Optional)
              <input class="input" name="referralCode" placeholder="Enter referral code if you have one">
            </label>
          </div>

          <div class="checkout-note">
            <strong>Important:</strong> Please make sure your contact and delivery information is correct before placing your order.
          </div>

          <button class="primary-btn" type="submit">Place Order</button>
        </form>
      </div>
    </div>

    <aside class="shop-side">
      <div class="summary-card">
        <h3>Order Summary</h3>
        <div id="checkoutSummary"></div>
      </div>

      <div class="mini-info-card">
        <h4>Why shop with FemiFresh?</h4>
        <ul class="clean-list">
          <li>Quality feminine-care products</li>
          <li>Simple and secure ordering</li>
          <li>Fast customer support</li>
          <li>Confidence in every wash</li>
        </ul>
      </div>
    </aside>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, "checkout.html"), checkoutHtml);

/* =========================
   THANK YOU PAGE
========================= */
const thankYouHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Thank You - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="/index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="/index.html">Home</a>
      <a href="/products.html">Products</a>
      <a href="/policies.html">Policies</a>
      <a href="/contact.html">Contact</a>
      <a class="cart-pill" href="/cart.html">Cart (<span data-cart-count>0</span>)</a>
    </nav>
    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">ORDER CONFIRMED</p>
      <h1>Thank You for Your Order</h1>
      <p>Your FemiFresh order has been received successfully.</p>
    </div>
  </section>

  <section class="container thankyou-wrap">
    <div class="thankyou-card">
      <div class="success-badge">✓</div>
      <h2>Order Received</h2>
      <p class="muted center-text">Thank you for shopping with FemiFresh. We have received your order and our team will begin processing it.</p>

      <div class="order-meta">
        <div class="meta-box">
          <span>Order Number</span>
          <strong id="thankOrderNumber">Loading...</strong>
        </div>
        <div class="meta-box">
          <span>Payment Status</span>
          <strong id="thankPaymentStatus">Pending</strong>
        </div>
      </div>

      <div class="thank-summary" id="thankOrderSummary"></div>

      <div class="thank-note">
        A confirmation email may be sent to you after the order is processed. If you need help, please contact the FemiFresh support team.
      </div>

      <div class="thank-actions">
        <a class="primary-btn" href="/index.html">Back Home</a>
        <a class="secondary-btn" href="/products.html">Shop More</a>
      </div>
    </div>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, "thank-you.html"), thankYouHtml);

/* =========================
   NEW STORE.JS
========================= */
const storeJs = `const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  return r.json();
};

const money = (n) => "R" + Number(n || 0).toFixed(2);

const cart = {
  get() {
    return JSON.parse(localStorage.getItem("ff_cart") || "[]");
  },
  set(v) {
    localStorage.setItem("ff_cart", JSON.stringify(v));
    updateCartCount();
  },
  add(product) {
    const c = this.get();
    const ex = c.find(i => i.productId === product.id);
    if (ex) ex.qty += 1;
    else c.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image || "/images/femifresh-logo-source.jpg",
      qty: 1
    });
    this.set(c);
    alert("Added to cart");
    renderCartPage();
    renderCheckoutSummary();
  },
  updateQty(productId, qty) {
    const c = this.get();
    const item = c.find(i => i.productId === productId);
    if (!item) return;
    item.qty = Math.max(1, Number(qty || 1));
    this.set(c);
    renderCartPage();
    renderCheckoutSummary();
  },
  remove(productId) {
    const c = this.get().filter(i => i.productId !== productId);
    this.set(c);
    renderCartPage();
    renderCheckoutSummary();
  },
  clear() {
    this.set([]);
    renderCartPage();
    renderCheckoutSummary();
  }
};

function clearCartFlow() {
  if (confirm("Clear all items from cart?")) {
    cart.clear();
  }
}

function updateCartCount() {
  const count = cart.get().reduce((s, i) => s + Number(i.qty || 1), 0);
  document.querySelectorAll("[data-cart-count]").forEach(el => {
    el.textContent = count;
  });
}

async function loadProducts() {
  const el = document.getElementById("products");
  if (!el) return;
  const data = await api("/api/products");
  el.innerHTML = data.products.map(p => \`
    <article class="card product">
      <img src="\${p.image || '/images/femifresh-logo-source.jpg'}" alt="\${p.name}">
      <span class="badge">\${p.category || 'FemiFresh'}</span>
      <h3>\${p.name}</h3>
      <p class="muted">\${p.description || ''}</p>
      <div class="price">\${money(p.price)}</div>
      <button class="btn" onclick='cart.add(\${JSON.stringify(p).replace(/'/g, "&#39;")})'>Add to cart</button>
    </article>
  \`).join("");
}

function cartTotals() {
  const items = cart.get();
  const subtotal = items.reduce((s, i) => s + (Number(i.price) * Number(i.qty)), 0);
  return { items, subtotal };
}

function renderCartPage() {
  const itemsEl = document.getElementById("cartItems");
  const summaryEl = document.getElementById("cartSummary");
  if (!itemsEl && !summaryEl) return;

  const { items, subtotal } = cartTotals();

  if (itemsEl) {
    if (!items.length) {
      itemsEl.innerHTML = \`
        <div class="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add your favourite FemiFresh products to continue shopping.</p>
          <a class="primary-btn" href="/products.html">Shop Products</a>
        </div>
      \`;
    } else {
      itemsEl.innerHTML = items.map(item => \`
        <article class="cart-item-card">
          <div class="cart-item-media">
            <img src="\${item.image || '/images/femifresh-logo-source.jpg'}" alt="\${item.name}">
          </div>

          <div class="cart-item-info">
            <h3>\${item.name}</h3>
            <p class="muted">Price: \${money(item.price)}</p>
            <div class="qty-row">
              <button type="button" class="qty-btn" onclick="cart.updateQty('\${item.productId}', \${item.qty - 1})">−</button>
              <span class="qty-value">\${item.qty}</span>
              <button type="button" class="qty-btn" onclick="cart.updateQty('\${item.productId}', \${item.qty + 1})">+</button>
            </div>
          </div>

          <div class="cart-item-side">
            <strong>\${money(item.price * item.qty)}</strong>
            <button type="button" class="link-btn" onclick="cart.remove('\${item.productId}')">Remove</button>
          </div>
        </article>
      \`).join("");
    }
  }

  if (summaryEl) {
    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    summaryEl.innerHTML = \`
      <div class="summary-line"><span>Items</span><strong>\${totalItems}</strong></div>
      <div class="summary-line"><span>Subtotal</span><strong>\${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Delivery</span><strong>Calculated at checkout</strong></div>
      <div class="summary-line total"><span>Total</span><strong>\${money(subtotal)}</strong></div>
    \`;
  }
}

async function loadCheckout() {
  const select = document.getElementById("deliveryMethodId");
  if (!select) return;

  const data = await api("/api/delivery-methods");
  select.innerHTML = data.deliveryMethods.map(x => \`
    <option value="\${x.id}" data-price="\${Number(x.price || 0)}">\${x.name} - \${money(x.price)}</option>
  \`).join("");

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const el = document.getElementById("checkoutSummary");
  if (!el) return;

  const { items, subtotal } = cartTotals();

  if (!items.length) {
    el.innerHTML = \`
      <div class="empty-state compact">
        <h3>No items in cart</h3>
        <p>Please add products before checking out.</p>
      </div>
    \`;
    return;
  }

  const select = document.getElementById("deliveryMethodId");
  let deliveryName = "Delivery";
  let deliveryFee = 0;

  if (select && select.selectedOptions && select.selectedOptions[0]) {
    deliveryName = select.selectedOptions[0].textContent.split(" - ")[0];
    deliveryFee = Number(select.selectedOptions[0].dataset.price || 0);
  }

  const total = subtotal + deliveryFee;

  el.innerHTML = \`
    <div class="summary-items">
      \${items.map(item => \`
        <div class="mini-product-row">
          <span>\${item.name} × \${item.qty}</span>
          <strong>\${money(item.price * item.qty)}</strong>
        </div>
      \`).join("")}
    </div>

    <hr class="soft-line">

    <div class="summary-line"><span>Subtotal</span><strong>\${money(subtotal)}</strong></div>
    <div class="summary-line"><span>\${deliveryName}</span><strong>\${money(deliveryFee)}</strong></div>
    <div class="summary-line total"><span>Total</span><strong>\${money(total)}</strong></div>
  \`;
}

async function submitOrder(e) {
  e.preventDefault();

  const currentCart = cart.get();
  if (!currentCart.length) {
    alert("Your cart is empty.");
    return;
  }

  const fd = new FormData(e.target);
  const body = {
    customer: {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      address: fd.get("address")
    },
    deliveryMethodId: fd.get("deliveryMethodId"),
    referralCode: fd.get("referralCode"),
    items: currentCart
  };

  const res = await api("/api/orders", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!res.success) {
    alert(res.message || "Failed to place order.");
    return;
  }

  localStorage.setItem("ff_last_order", JSON.stringify(res.order));
  cart.clear();
  location.href = res.checkoutUrl;
}

function loadThankYouPage() {
  const orderEl = document.getElementById("thankOrderNumber");
  if (!orderEl) return;

  const params = new URLSearchParams(location.search);
  const queryOrder = params.get("order");
  const lastOrder = JSON.parse(localStorage.getItem("ff_last_order") || "null");

  const orderNumber = queryOrder || lastOrder?.orderNumber || "Order received";
  const paymentStatus = lastOrder?.paymentStatus || "Pending";
  const total = Number(lastOrder?.total || 0);
  const items = Array.isArray(lastOrder?.items) ? lastOrder.items : [];

  document.getElementById("thankOrderNumber").textContent = orderNumber;
  document.getElementById("thankPaymentStatus").textContent =
    paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);

  const summary = document.getElementById("thankOrderSummary");
  if (summary) {
    summary.innerHTML = \`
      <div class="thank-summary-box">
        <h3>Order Summary</h3>
        \${items.length ? items.map(item => \`
          <div class="mini-product-row">
            <span>\${item.name} × \${item.qty}</span>
            <strong>\${money(item.price * item.qty)}</strong>
          </div>
        \`).join("") : '<p class="muted">Your order details will be confirmed by our team.</p>'}
        \${total ? '<div class="summary-line total"><span>Total</span><strong>' + money(total) + '</strong></div>' : ''}
      </div>
    \`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  loadProducts();
  renderCartPage();
  loadCheckout();
  renderCheckoutSummary();
  loadThankYouPage();
});
`;

fs.writeFileSync(jsFile, storeJs);

/* =========================
   APPEND CSS
========================= */
const cssAdd = `

/* ===== Professional shop flow upgrade ===== */
.container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 18px;
}

.shop-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr;
  gap: 22px;
  margin-top: -28px;
  position: relative;
  z-index: 2;
  padding-bottom: 50px;
}

.shop-main,
.shop-side,
.checkout-card,
.summary-card,
.mini-info-card,
.thankyou-card,
.empty-state,
.cart-item-card {
  background: #fff;
  border: 1px solid rgba(107, 31, 100, 0.12);
  box-shadow: 0 18px 40px rgba(107, 31, 100, 0.10);
  border-radius: 24px;
}

.shop-main,
.checkout-card,
.summary-card,
.mini-info-card,
.thankyou-card,
.empty-state {
  padding: 24px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.section-head h2,
.summary-card h3,
.checkout-card h2,
.thankyou-card h2 {
  margin: 0;
}

.ghost-btn,
.link-btn,
.secondary-btn {
  border: 1px solid rgba(107, 31, 100, 0.18);
  background: #fff;
  color: #6b1f64;
  border-radius: 999px;
  padding: 11px 16px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.secondary-btn {
  background: #f8ebf6;
}

.primary-btn {
  border: 0;
  background: #6b1f64;
  color: #fff;
  border-radius: 999px;
  padding: 13px 20px;
  font-weight: 900;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.full-btn {
  width: 100%;
}

.summary-actions {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #f1e4ef;
}

.summary-line.total {
  font-size: 18px;
  font-weight: 900;
  border-bottom: 0;
  padding-top: 14px;
}

.cart-item-card {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  gap: 18px;
  padding: 18px;
  margin-bottom: 14px;
}

.cart-item-media img {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 18px;
  background: #f7edf5;
}

.cart-item-info h3 {
  margin: 0 0 8px;
}

.cart-item-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.qty-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  background: #f9eff7;
  border-radius: 999px;
  padding: 6px 10px;
}

.qty-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #6b1f64;
  color: white;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-weight: 900;
}

.empty-state {
  text-align: center;
}

.empty-state.compact {
  padding: 18px;
}

.checkout-form {
  display: grid;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 16px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 800;
  color: #2a162f;
}

.full-span {
  grid-column: 1 / -1;
}

.checkout-note,
.thank-note {
  background: #fbf1f8;
  border: 1px solid #f0d8ea;
  color: #5e375b;
  padding: 16px;
  border-radius: 18px;
}

.mini-info-card h4 {
  margin-top: 0;
}

.clean-list {
  margin: 0;
  padding-left: 18px;
  color: #5d4b5f;
  line-height: 1.8;
}

.summary-items,
.thank-summary-box {
  display: grid;
  gap: 10px;
}

.mini-product-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.soft-line {
  border: 0;
  border-top: 1px solid #f0e2ee;
  margin: 14px 0;
}

.thankyou-wrap {
  margin-top: -28px;
  position: relative;
  z-index: 2;
  padding-bottom: 60px;
}

.thankyou-card {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.success-badge {
  width: 76px;
  height: 76px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #6b1f64;
  color: white;
  font-size: 32px;
  font-weight: 900;
}

.center-text {
  text-align: center;
}

.order-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin: 22px 0;
}

.meta-box {
  background: #fbf2f9;
  border: 1px solid #f0dfec;
  border-radius: 18px;
  padding: 18px;
  text-align: left;
}

.meta-box span {
  display: block;
  color: #7a6577;
  font-size: 13px;
  margin-bottom: 6px;
}

.meta-box strong {
  font-size: 18px;
  color: #2a162f;
}

.thank-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .shop-layout {
    grid-template-columns: 1fr;
    margin-top: -18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .cart-item-card {
    grid-template-columns: 1fr;
  }

  .cart-item-media img {
    height: 220px;
  }

  .cart-item-side {
    align-items: flex-start;
  }

  .order-meta {
    grid-template-columns: 1fr;
  }
}
`;

if (!fs.readFileSync(cssFile, "utf8").includes("Professional shop flow upgrade")) {
  fs.appendFileSync(cssFile, cssAdd);
}

console.log("Cart, checkout and thank-you pages upgraded successfully.");
