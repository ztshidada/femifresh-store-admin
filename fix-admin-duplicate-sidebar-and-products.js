const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");
const indexFile = path.join(publicDir, "index.html");
const adminJsFile = path.join(publicDir, "js", "admin-unified.js");
const cssFile = path.join(publicDir, "css", "femifresh-unified.css");

/* 1) Fix homepage featured products: no more blank image blocks */
let index = fs.readFileSync(indexFile, "utf8");

/* Remove floating cart because Cart is now in header */
index = index.replace(/<a class="floating-cart"[\s\S]*?<\/a>/gi, "");

/* Stronger featured product image loader */
index = index.replace(
/function productImage\(p\)\{[\s\S]*?function productPrice\(p\)\{/,
`function productImage(p){
      let img =
        p.image ||
        p.imageUrl ||
        p.image_url ||
        p.photo ||
        p.photoUrl ||
        p.thumbnail ||
        p.mainImage ||
        p.main_image ||
        p.picture ||
        p.productImage ||
        p.product_image ||
        "";

      if (!img && Array.isArray(p.images) && p.images.length) {
        const first = p.images[0];
        img = typeof first === "string" ? first : (first.url || first.src || first.image || "");
      }

      if (!img && Array.isArray(p.gallery) && p.gallery.length) {
        const first = p.gallery[0];
        img = typeof first === "string" ? first : (first.url || first.src || first.image || "");
      }

      if (img && img.startsWith("uploads/")) img = "/" + img;
      if (img && img.startsWith("public/")) img = img.replace("public", "");

      return img || "/images/femifresh-logo.jpg";
    }

    function productPrice(p){`
);

/* Make product image rendering always show image, never blank text block */
index = index.replace(
/<div class="product-img \$\{img \? "" : "no-image"\}">\s*\$\{img \? `\<img src="\$\{img\}" alt="\$\{name\}" loading="lazy"\>` : name\}\s*<\/div>/,
`<div class="product-img">
                <img src="\${img}" alt="\${name}" loading="lazy" onerror="this.src='/images/femifresh-logo.jpg'">
              </div>`
);

/* If regex missed because code changed, add fallback replacement */
index = index.replace(
/<div class="product-img" style="\$\{img \? `background-image:url\('\$\{img\}'\);background-size:cover;background-position:center;color:transparent;` : ""\}">\s*\$\{name\}\s*<\/div>/,
`<div class="product-img">
                <img src="\${img || '/images/femifresh-logo.jpg'}" alt="\${name}" loading="lazy" onerror="this.src='/images/femifresh-logo.jpg'">
              </div>`
);

fs.writeFileSync(indexFile, index);

/* 2) Fix admin duplicate sidebar properly */
let adminJs = fs.existsSync(adminJsFile) ? fs.readFileSync(adminJsFile, "utf8") : "";

adminJs = `
(function(){
  const isLogin = location.pathname.includes("login");
  document.body.classList.add(isLogin ? "ff-admin-login" : "ff-admin-body");

  function looksLikeOldAdminMenu(el){
    if (!el || el.classList?.contains("ff-admin-sidebar")) return false;
    const txt = (el.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();

    const hasMenu =
      txt.includes("dashboard") &&
      txt.includes("orders") &&
      txt.includes("products") &&
      txt.includes("affiliates") &&
      txt.includes("delivery");

    const hasBrand = txt.includes("femifresh admin");

    return hasMenu && hasBrand;
  }

  function removeDuplicateOldMenus(){
    document.querySelectorAll("aside, nav, .sidebar, .admin-sidebar, .menu, .side-menu, div").forEach(el => {
      if (el.closest(".ff-admin-sidebar")) return;
      if (el.closest(".ff-admin-login-card")) return;

      if (looksLikeOldAdminMenu(el)) {
        el.remove();
      }
    });
  }

  function buildSidebar(){
    const sidebar = document.createElement("aside");
    sidebar.className = "ff-admin-sidebar";
    sidebar.innerHTML = \`
      <div class="ff-admin-logo">
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
        <span>FemiFresh Admin</span>
      </div>
      <nav class="ff-admin-menu">
        <a href="/admin/dashboard.html">Dashboard</a>
        <a href="/admin/orders.html">Orders</a>
        <a href="/admin/products.html">Products</a>
        <a href="/admin/affiliates.html">Affiliates</a>
        <a href="/admin/delivery.html">Delivery</a>
        <a href="/admin/logs.html">Logs</a>
      </nav>
    \`;

    const pathNow = location.pathname;
    sidebar.querySelectorAll("a").forEach(a => {
      if (pathNow.includes(a.getAttribute("href"))) a.classList.add("active");
    });

    return sidebar;
  }

  function wrapAdminPage(){
    if (isLogin) return;

    removeDuplicateOldMenus();

    if (document.querySelector(".ff-admin-layout")) {
      removeDuplicateOldMenus();
      return;
    }

    const bodyChildren = Array.from(document.body.children);
    const scripts = bodyChildren.filter(el => el.tagName === "SCRIPT");
    const content = bodyChildren.filter(el => el.tagName !== "SCRIPT");

    const layout = document.createElement("div");
    layout.className = "ff-admin-layout";

    const sidebar = buildSidebar();

    const main = document.createElement("main");
    main.className = "ff-admin-main";

    content.forEach(el => {
      if (!looksLikeOldAdminMenu(el)) main.appendChild(el);
    });

    layout.appendChild(sidebar);
    layout.appendChild(main);
    document.body.prepend(layout);

    scripts.forEach(s => document.body.appendChild(s));

    removeDuplicateOldMenus();
  }

  function polishAdminHeadings(){
    if (isLogin) return;

    const main = document.querySelector(".ff-admin-main");
    if (!main) return;

    const firstH1 = main.querySelector("h1");
    if (firstH1 && !firstH1.closest(".ff-admin-title")) {
      const top = document.createElement("div");
      top.className = "ff-admin-top";
      const title = document.createElement("div");
      title.className = "ff-admin-title";

      firstH1.parentNode.insertBefore(top, firstH1);
      top.appendChild(title);
      title.appendChild(firstH1);

      const p = title.nextElementSibling;
      if (p && p.tagName === "P") title.appendChild(p);
    }
  }

  function polishLogin(){
    if (!isLogin) return;

    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
      if (form.closest(".ff-admin-login-card")) return;

      const card = document.createElement("div");
      card.className = "ff-admin-login-card ff-card";
      card.innerHTML = \`
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
        <h1>Admin Login</h1>
        <p>Manage FemiFresh orders, products and affiliates.</p>
      \`;

      form.parentNode.insertBefore(card, form);
      card.appendChild(form);
    });
  }

  function removePhoneNumbers(){
    document.body.innerHTML = document.body.innerHTML
      .replace(/\\+27\\s*61\\s*450\\s*3120/gi, "femifresh02@gmail.com")
      .replace(/0\\s*61\\s*450\\s*3120/gi, "femifresh02@gmail.com")
      .replace(/061\\s*450\\s*3120/gi, "femifresh02@gmail.com")
      .replace(/27614503120/gi, "femifresh02@gmail.com")
      .replace(/064\\s*761\\s*0299/gi, "");
  }

  document.addEventListener("DOMContentLoaded", function(){
    removePhoneNumbers();
    polishLogin();
    wrapAdminPage();
    polishAdminHeadings();

    setTimeout(removeDuplicateOldMenus, 300);
    setTimeout(removeDuplicateOldMenus, 1000);
  });
})();
`;

fs.writeFileSync(adminJsFile, adminJs);

/* 3) CSS cleanup: remove floating cart and make featured images look premium */
let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("FINAL_ADMIN_AND_PRODUCT_CLEANUP_V1")) {
  css += `

/* FINAL_ADMIN_AND_PRODUCT_CLEANUP_V1 */

/* Cart is now in the header */
.floating-cart {
  display: none !important;
}

/* Product image cards must never look empty */
.product-img {
  height: 230px !important;
  min-height: 230px !important;
  display: block !important;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 45%, rgba(244,167,216,.30), transparent 38%),
    linear-gradient(135deg,#5b1b55,#b247a4) !important;
}

.product-img img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}

.product-img::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(104,35,95,.08));
  pointer-events: none;
}

/* Fix admin double sidebar layout */
.ff-admin-layout {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}

.ff-admin-main {
  min-width: 0;
  overflow-x: auto;
}

.ff-admin-main > .ff-admin-sidebar,
.ff-admin-main aside,
.ff-admin-main nav.sidebar,
.ff-admin-main .sidebar,
.ff-admin-main .admin-sidebar {
  display: none !important;
}

/* Admin tables cleaner */
.ff-admin-main table {
  background: rgba(255,255,255,.86);
}

.ff-admin-main .card,
.ff-admin-main .panel,
.ff-admin-main .table-card {
  margin-bottom: 18px;
}

/* Remove any old purple block that was duplicated */
.ff-admin-main > div:first-child:has(a[href*="dashboard"]):has(a[href*="orders"]):has(a[href*="products"]) {
  display: none !important;
}

/* Desktop admin improvement */
@media(min-width:901px){
  .ff-admin-sidebar {
    width: 280px;
  }

  .ff-admin-main {
    padding: 42px;
  }
}

/* Mobile admin improvement */
@media(max-width:900px){
  .ff-admin-sidebar {
    position: relative !important;
    height: auto !important;
  }

  .ff-admin-menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
`;
}

fs.writeFileSync(cssFile, css);

console.log("Fixed admin duplicate sidebar, removed floating cart, improved featured product images.");
