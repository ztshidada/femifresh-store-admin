const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const publicDir = path.join(__dirname, "public");
const cssFile = path.join(publicDir, "css", "style.css");
const jsFile = path.join(publicDir, "js", "store.js");

/* =========================
   1) ADD CUSTOMER LOGIN API
========================= */
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("app.post('/api/customer/register'")) {
  server = server.replace(
`app.get('/api/delivery-methods', (req, res) => res.json({ success: true, deliveryMethods: read('deliveryMethods', []).filter(d => d.active !== false) }));`,
`app.get('/api/delivery-methods', (req, res) => res.json({ success: true, deliveryMethods: read('deliveryMethods', []).filter(d => d.active !== false) }));

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
});`
  );

  server = server.replace(
`const { customer, items, deliveryMethodId, referralCode, paymentMethod = 'yoco' } = req.body;`,
`const { customer, items, deliveryMethodId, referralCode, customerId = "", paymentMethod = 'yoco' } = req.body;`
  );

  server = server.replace(
`id: uuid(), orderNumber: nextOrderNumber(), customer, items: totals.items,`,
`id: uuid(), orderNumber: nextOrderNumber(), customerId, customer, items: totals.items,`
  );

  fs.writeFileSync(serverFile, server);
}

/* =========================
   2) CHECKOUT PAGE
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

<main class="checkout-clean-page">
  <section class="container checkout-clean-wrap">
    <div class="checkout-left">
      <div class="login-strip" id="loginStrip">
        <span>Have an account?</span>
        <button type="button" onclick="showCustomerLogin()">Log in</button>
      </div>

      <div class="customer-box" id="customerLoggedBox" style="display:none;">
        <div>
          <strong id="customerLoggedName">Logged in</strong>
          <p id="customerLoggedEmail">Customer account connected</p>
        </div>
        <button type="button" class="link-btn" onclick="customerLogout()">Logout</button>
      </div>

      <div class="customer-auth-box" id="customerAuthBox" style="display:none;">
        <div class="auth-tabs">
          <button type="button" class="active" id="loginTab" onclick="switchAuthTab('login')">Login</button>
          <button type="button" id="registerTab" onclick="switchAuthTab('register')">Create account</button>
        </div>

        <form id="customerLoginForm" class="checkout-form" onsubmit="customerLogin(event)">
          <label>Email
            <input class="input" name="email" type="email" required>
          </label>
          <label>Password
            <input class="input" name="password" type="password" required>
          </label>
          <button class="dark-btn" type="submit">Login</button>
        </form>

        <form id="customerRegisterForm" class="checkout-form" style="display:none;" onsubmit="customerRegister(event)">
          <div class="two-grid">
            <label>First name
              <input class="input" name="firstName" required>
            </label>
            <label>Last name
              <input class="input" name="lastName" required>
            </label>
          </div>
          <label>Email
            <input class="input" name="email" type="email" required>
          </label>
          <label>Phone
            <input class="input" name="phone" required>
          </label>
          <label>Password
            <input class="input" name="password" type="password" required>
          </label>
          <button class="dark-btn" type="submit">Create account</button>
        </form>
      </div>

      <form id="checkoutForm" class="checkout-clean-form" onsubmit="submitOrder(event)">
        <h1>Customer details</h1>

        <label>Email *
          <input class="big-input" name="email" type="email" required>
        </label>

        <div class="two-grid">
          <label>First name *
            <input class="big-input" name="firstName" required>
          </label>

          <label>Last name *
            <input class="big-input" name="lastName" required>
          </label>
        </div>

        <label>Phone *
          <input class="big-input" name="phone" placeholder="+27..." required>
        </label>

        <label>Add Locker or Paxi number or your nearest mall *
          <input class="big-input" name="lockerOrMall" placeholder="You can find the codes at the Paxi or Pudo website" required>
        </label>

        <h2>Delivery details</h2>

        <label>Country/region *
          <select class="big-input" name="country" required>
            <option value="South Africa">South Africa</option>
            <option value="Botswana">Botswana</option>
            <option value="Lesotho">Lesotho</option>
            <option value="Namibia">Namibia</option>
            <option value="Zimbabwe">Zimbabwe</option>
            <option value="Eswatini">Eswatini</option>
          </select>
        </label>

        <label>Address *
          <input class="big-input" name="address" required>
        </label>

        <label>City *
          <input class="big-input" name="city" required>
        </label>

        <label>Region *
          <select class="big-input" name="region" required>
            <option value="">Select region</option>
            <option>Gauteng</option>
            <option>Limpopo</option>
            <option>Mpumalanga</option>
            <option>North West</option>
            <option>Free State</option>
            <option>KwaZulu-Natal</option>
            <option>Eastern Cape</option>
            <option>Western Cape</option>
            <option>Northern Cape</option>
            <option>Other</option>
          </select>
        </label>

        <label>Zip / Postal code *
          <input class="big-input" name="postalCode" required>
        </label>

        <button class="dark-btn" type="button" onclick="showDeliveryPayment()">Continue</button>

        <div class="checkout-section-muted" id="deliveryPaymentArea">
          <h2>Delivery method</h2>
          <select class="big-input" name="deliveryMethodId" id="deliveryMethodId" onchange="renderCheckoutSummary()"></select>

          <h2>Payment</h2>
          <div class="payment-box">
            <strong>Online payment</strong>
            <p>Yoco payment will be connected when the live keys are ready. For now, the system will create the order for testing.</p>
          </div>

          <label>Referral code / affiliate code optional
            <input class="big-input" name="referralCode" placeholder="Enter code if you have one">
          </label>

          <button class="primary-btn full-btn" type="submit">Place Order</button>
        </div>
      </form>
    </div>

    <aside class="checkout-right">
      <div class="summary-card sticky-summary">
        <h3>Order Summary</h3>
        <div id="checkoutSummary"></div>
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
   3) STORE JS UPDATE
========================= */
let js = fs.readFileSync(jsFile, "utf8");

if (!js.includes("function getCustomerAccount")) {
  js += `

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
  ].join("\\n");

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
  location.href = res.checkoutUrl;
};

document.addEventListener("DOMContentLoaded", refreshCustomerUI);
`;
}

fs.writeFileSync(jsFile, js);

/* =========================
   4) CSS
========================= */
const cssAdd = `

/* ===== Detailed checkout + customer login ===== */
.checkout-clean-page {
  background: #fff;
  min-height: 100vh;
}

.checkout-clean-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 34px;
  padding-top: 36px;
  padding-bottom: 60px;
}

.checkout-left {
  max-width: 920px;
}

.login-strip {
  background: #f0f0f0;
  border-radius: 10px;
  padding: 20px 26px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  margin-bottom: 38px;
}

.login-strip button {
  border: 0;
  background: transparent;
  text-decoration: underline;
  font: inherit;
  cursor: pointer;
}

.customer-box,
.customer-auth-box {
  background: #f7f1f6;
  border: 1px solid #ead6e7;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 28px;
}

.customer-box {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.customer-box p {
  margin: 5px 0 0;
  color: #6f6470;
}

.auth-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.auth-tabs button {
  border: 1px solid #d9bdd5;
  background: #fff;
  padding: 12px 18px;
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
}

.auth-tabs button.active {
  background: #6b1f64;
  color: #fff;
}

.checkout-clean-form {
  display: grid;
  gap: 30px;
}

.checkout-clean-form h1 {
  font-size: clamp(34px, 5vw, 52px);
  margin: 0;
}

.checkout-clean-form h2 {
  font-size: clamp(28px, 4vw, 42px);
  margin: 14px 0 0;
}

.checkout-clean-form label,
.checkout-form label {
  display: grid;
  gap: 12px;
  font-size: 22px;
  color: #111;
}

.two-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 34px;
}

.big-input {
  width: 100%;
  min-height: 70px;
  border: 2px solid #999;
  border-radius: 8px;
  background: #fff;
  padding: 0 26px;
  font-size: 24px;
  font: inherit;
}

textarea.big-input {
  padding-top: 18px;
}

.dark-btn {
  width: 100%;
  min-height: 76px;
  border: 0;
  background: #000;
  color: #fff;
  border-radius: 8px;
  font-size: 24px;
  cursor: pointer;
}

.checkout-section-muted {
  display: none;
  border-top: 1px solid #ccc;
  padding-top: 34px;
  margin-top: 10px;
  gap: 28px;
}

.checkout-section-muted.show {
  display: grid;
}

.payment-box {
  background: #f7f7f7;
  border: 1px solid #ddd;
  border-radius: 14px;
  padding: 20px;
}

.payment-box p {
  margin-bottom: 0;
  color: #666;
}

.checkout-right {
  position: relative;
}

.sticky-summary {
  position: sticky;
  top: 100px;
}

@media (max-width: 980px) {
  .checkout-clean-wrap {
    grid-template-columns: 1fr;
  }

  .checkout-right {
    order: -1;
  }

  .sticky-summary {
    position: static;
  }
}

@media (max-width: 680px) {
  .two-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .checkout-clean-form label,
  .checkout-form label {
    font-size: 18px;
  }

  .big-input {
    min-height: 62px;
    font-size: 18px;
    padding: 0 18px;
  }

  .dark-btn {
    min-height: 66px;
    font-size: 20px;
  }

  .login-strip {
    font-size: 17px;
    padding: 16px;
  }
}
`;

if (!fs.readFileSync(cssFile, "utf8").includes("Detailed checkout + customer login")) {
  fs.appendFileSync(cssFile, cssAdd);
}

console.log("Checkout upgraded with detailed delivery fields and customer login/register.");
