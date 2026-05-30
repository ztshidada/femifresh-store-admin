const fs = require("fs");
const path = require("path");

const productsFile = path.join(__dirname, "public", "products.html");
const policiesFile = path.join(__dirname, "public", "policies.html");
const contactFile = path.join(__dirname, "public", "contact.html");
const indexFile = path.join(__dirname, "public", "index.html");

function replaceInFile(file, replacements) {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  for (const [from, to] of replacements) {
    html = html.replaceAll(from, to);
  }

  fs.writeFileSync(file, html);
  console.log("Updated:", file);
}

/* Remove admin/developer wording from products page */
replaceInFile(productsFile, [
  [
    "You can edit products, prices and stock from the admin panel.",
    "Explore our FemiFresh collection designed for daily freshness, comfort and confidence."
  ],
  [
    "Update quantities and details in admin.",
    "Perfect starter option for customers and business builders."
  ],
  [
    "Starter stock pack for distributors. Update quantities and details in admin.",
    "A powerful starter pack created for people who want to start selling FemiFresh and build their own income."
  ]
]);

/* Remove admin wording from home page */
replaceInFile(indexFile, [
  [
    "You can edit products, prices and stock from the admin panel.",
    "Shop our trusted FemiFresh range and start your journey with confidence."
  ],
  [
    "Premium FemiFresh intimate-care store and distributor platform built for fast orders, clean admin control and future affiliate growth.",
    "Premium feminine-care products created for freshness, comfort and everyday confidence."
  ]
]);

/* Replace policies page with professional customer wording */
const policiesPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Policies - FemiFresh</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="index.html">
      <img src="/images/femifresh-logo-source.jpg" alt="FemiFresh Logo">
      <span>FemiFresh</span>
    </a>

    <nav class="main-nav" id="mainNav">
      <a href="index.html">Home</a>
      <a href="products.html">Products</a>
      <a href="policies.html">Policies</a>
      <a href="contact.html">Contact</a>
      <a class="cart-pill" href="cart.html">Cart (<span id="cartCount">0</span>)</a>
    </nav>

    <button class="menu-btn" id="menuBtn" type="button">☰</button>
  </div>
</header>

<main>
  <section class="page-hero small-hero">
    <div class="container">
      <p class="eyebrow">CUSTOMER CARE</p>
      <h1>Store Policies</h1>
      <p>We want every FemiFresh customer to shop with confidence. Please read our order, delivery, refund and privacy information below.</p>
    </div>
  </section>

  <section class="container policy-layout">
    <article class="policy-card">
      <span>01</span>
      <h2>Orders</h2>
      <p>All orders are processed after payment has been confirmed. Please make sure your contact details and delivery information are correct before completing checkout.</p>
    </article>

    <article class="policy-card">
      <span>02</span>
      <h2>Delivery</h2>
      <p>Delivery times may differ depending on your location and selected delivery option. Once your order is prepared, you will receive updates about the progress of your order.</p>
    </article>

    <article class="policy-card">
      <span>03</span>
      <h2>Payments</h2>
      <p>Payments must be completed successfully before an order can be packed or released. If there is a payment issue, our support team may contact you for confirmation.</p>
    </article>

    <article class="policy-card">
      <span>04</span>
      <h2>Refunds & Returns</h2>
      <p>Refund and return requests are reviewed carefully. Due to the nature of personal-care products, opened or used items may not qualify for return for hygiene reasons.</p>
    </article>

    <article class="policy-card">
      <span>05</span>
      <h2>Product Care</h2>
      <p>Please store products in a clean, cool and dry place. Always follow the usage instructions provided with the product packaging.</p>
    </article>

    <article class="policy-card">
      <span>06</span>
      <h2>Privacy</h2>
      <p>Your personal information is used only to process orders, arrange delivery, provide customer support and communicate important updates about your purchase.</p>
    </article>
  </section>
</main>

<script src="/js/store.js"></script>
<script src="/js/mobile-header-fix.js"></script>
</body>
</html>`;

fs.writeFileSync(policiesFile, policiesPage);
console.log("Policies page rewritten professionally.");

/* Improve contact intro wording */
replaceInFile(contactFile, [
  [
    "Need help with an order, product information or distributor support? Reach out to us and our team will assist you.",
    "Have a question about your order, delivery or FemiFresh products? Our support team is ready to assist you."
  ],
  [
    "Fast support for orders, delivery and product questions.",
    "Quick assistance for orders, delivery updates and product questions."
  ]
]);

console.log("Done. Public pages now use professional customer-facing wording.");
