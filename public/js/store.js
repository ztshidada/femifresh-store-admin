const api = async (url, opts = {}) => {
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
  el.innerHTML = data.products.map(p => `
    <article class="card product">
      <img src="${p.image || '/images/femifresh-logo-source.jpg'}" alt="${p.name}">
      <span class="badge">${p.category || 'FemiFresh'}</span>
      <h3>${p.name}</h3>
      <p class="muted">${p.description || ''}</p>
      <div class="price">${money(p.price)}</div>
      <button class="btn" onclick='cart.add(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Add to cart</button>
    </article>
  `).join("");
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
      itemsEl.innerHTML = `
        <div class="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add your favourite FemiFresh products to continue shopping.</p>
          <a class="primary-btn" href="/products">Shop Products</a>
        </div>
      `;
    } else {
      itemsEl.innerHTML = items.map(item => `
        <article class="cart-item-card">
          <div class="cart-item-media">
            <img src="${item.image || '/images/femifresh-logo-source.jpg'}" alt="${item.name}">
          </div>

          <div class="cart-item-info">
            <h3>${item.name}</h3>
            <p class="muted">Price: ${money(item.price)}</p>
            <div class="qty-row">
              <button type="button" class="qty-btn" onclick="cart.updateQty('${item.productId}', ${item.qty - 1})">−</button>
              <span class="qty-value">${item.qty}</span>
              <button type="button" class="qty-btn" onclick="cart.updateQty('${item.productId}', ${item.qty + 1})">+</button>
            </div>
          </div>

          <div class="cart-item-side">
            <strong>${money(item.price * item.qty)}</strong>
            <button type="button" class="link-btn" onclick="cart.remove('${item.productId}')">Remove</button>
          </div>
        </article>
      `).join("");
    }
  }

  if (summaryEl) {
    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    summaryEl.innerHTML = `
      <div class="summary-line"><span>Items</span><strong>${totalItems}</strong></div>
      <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Delivery</span><strong>Calculated at checkout</strong></div>
      <div class="summary-line total"><span>Total</span><strong>${money(subtotal)}</strong></div>
    `;
  }
}

async function loadCheckout() {
  const select = document.getElementById("deliveryMethodId");
  if (!select) return;

  const data = await api("/api/delivery-methods");
  select.innerHTML = data.deliveryMethods.map(x => `
    <option value="${x.id}" data-price="${Number(x.price || 0)}">${x.name} - ${money(x.price)}</option>
  `).join("");

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const el = document.getElementById("checkoutSummary");
  if (!el) return;

  const { items, subtotal } = cartTotals();

  if (!items.length) {
    el.innerHTML = `
      <div class="empty-state compact">
        <h3>No items in cart</h3>
        <p>Please add products before checking out.</p>
      </div>
    `;
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

  el.innerHTML = `
    <div class="summary-items">
      ${items.map(item => `
        <div class="mini-product-row">
          <span>${item.name} × ${item.qty}</span>
          <strong>${money(item.price * item.qty)}</strong>
        </div>
      `).join("")}
    </div>

    <hr class="soft-line">

    <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
    <div class="summary-line"><span>${deliveryName}</span><strong>${money(deliveryFee)}</strong></div>
    <div class="summary-line total"><span>Total</span><strong>${money(total)}</strong></div>
  `;
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

  if (res.payment === "placeholder") {
    alert("Order created, but online payment is not fully connected yet. Check Render online payment_SECRET_KEY.");
  }

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
    summary.innerHTML = `
      <div class="thank-summary-box">
        <h3>Order Summary</h3>
        ${items.length ? items.map(item => `
          <div class="mini-product-row">
            <span>${item.name} × ${item.qty}</span>
            <strong>${money(item.price * item.qty)}</strong>
          </div>
        `).join("") : '<p class="muted">Your order details will be confirmed by our team.</p>'}
        ${total ? '<div class="summary-line total"><span>Total</span><strong>' + money(total) + '</strong></div>' : ''}
      </div>
    `;
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


/* ===== Customer account + detailed checkout ===== */
function getCustomerAccount() {
  return JSON.parse(localStorage.getItem("ff_customer") || "null");
}

function setCustomerAccount(customer, token) {
  localStorage.setItem("ff_customer", JSON.stringify(customer));
  localStorage.setItem("ff_customer_token", token || "");
  refreshCustomerUI();
}

function customerLogout() {
  localStorage.removeItem("ff_customer");
  localStorage.removeItem("ff_customer_token");
  refreshCustomerUI();
}

function showCustomerLogin() {
  const box = document.getElementById("customerAuthBox");
  if (box) box.style.display = box.style.display === "none" ? "block" : "none";
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("customerLoginForm");
  const registerForm = document.getElementById("customerRegisterForm");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");

  if (!loginForm || !registerForm) return;

  if (tab === "login") {
    loginForm.style.display = "grid";
    registerForm.style.display = "none";
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "grid";
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
  }
}

async function customerLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await api("/api/customer/login", {
    method: "POST",
    body: JSON.stringify({
      email: fd.get("email"),
      password: fd.get("password")
    })
  });

  if (!res.success) {
    alert(res.message || "Login failed.");
    return;
  }

  setCustomerAccount(res.customer, res.token);
  alert("Logged in successfully.");
}

async function customerRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await api("/api/customer/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      password: fd.get("password")
    })
  });

  if (!res.success) {
    alert(res.message || "Registration failed.");
    return;
  }

  setCustomerAccount(res.customer, res.token);
  alert("Account created successfully.");
}

function refreshCustomerUI() {
  const customer = getCustomerAccount();

  const loginStrip = document.getElementById("loginStrip");
  const loggedBox = document.getElementById("customerLoggedBox");
  const authBox = document.getElementById("customerAuthBox");
  const nameEl = document.getElementById("customerLoggedName");
  const emailEl = document.getElementById("customerLoggedEmail");
  const form = document.getElementById("checkoutForm");

  if (!form) return;

  if (customer) {
    if (loginStrip) loginStrip.style.display = "none";
    if (authBox) authBox.style.display = "none";
    if (loggedBox) loggedBox.style.display = "flex";

    if (nameEl) nameEl.textContent = customer.firstName + " " + customer.lastName;
    if (emailEl) emailEl.textContent = customer.email;

    if (form.email) form.email.value = customer.email || "";
    if (form.firstName) form.firstName.value = customer.firstName || "";
    if (form.lastName) form.lastName.value = customer.lastName || "";
    if (form.phone) form.phone.value = customer.phone || "";
  } else {
    if (loginStrip) loginStrip.style.display = "flex";
    if (loggedBox) loggedBox.style.display = "none";
  }
}

function showDeliveryPayment() {
  const form = document.getElementById("checkoutForm");
  const area = document.getElementById("deliveryPaymentArea");
  if (!form || !area) return;

  const required = ["email", "firstName", "lastName", "phone", "lockerOrMall", "country", "address", "city", "region", "postalCode"];
  for (const name of required) {
    if (!form[name] || !form[name].value.trim()) {
      alert("Please complete all required customer and delivery fields first.");
      form[name]?.focus();
      return;
    }
  }

  area.classList.add("show");
  area.scrollIntoView({ behavior: "smooth", block: "start" });
}

const oldSubmitOrder = typeof submitOrder === "function" ? submitOrder : null;

submitOrder = async function(e) {
  e.preventDefault();

  const currentCart = cart.get();
  if (!currentCart.length) {
    alert("Your cart is empty.");
    return;
  }

  const fd = new FormData(e.target);
  const customerAccount = getCustomerAccount();

  const fullName = String(fd.get("firstName") || "").trim() + " " + String(fd.get("lastName") || "").trim();

  const deliveryAddress = [
    "Locker/Paxi/Nearest mall: " + String(fd.get("lockerOrMall") || ""),
    "Address: " + String(fd.get("address") || ""),
    "City: " + String(fd.get("city") || ""),
    "Region: " + String(fd.get("region") || ""),
    "Country: " + String(fd.get("country") || ""),
    "Postal code: " + String(fd.get("postalCode") || "")
  ].join("\n");

  const body = {
    customerId: customerAccount?.id || "",
    customer: {
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      name: fullName,
      phone: fd.get("phone"),
      email: fd.get("email"),
      lockerOrMall: fd.get("lockerOrMall"),
      country: fd.get("country"),
      address: deliveryAddress,
      city: fd.get("city"),
      region: fd.get("region"),
      postalCode: fd.get("postalCode")
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

  if (res.payment === "placeholder") {
    alert("Order created, but online payment is not fully connected yet. Check Render online payment_SECRET_KEY.");
  }

  location.href = res.checkoutUrl;
};

document.addEventListener("DOMContentLoaded", refreshCustomerUI);
