
(function(){
  const isLogin = location.pathname.includes("login");
  document.body.classList.add(isLogin ? "ff-admin-login" : "ff-admin-body");

  function looksLikeOldAdminMenu(el){
    if (!el || el.classList?.contains("ff-admin-sidebar")) return false;
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

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
    sidebar.innerHTML = `
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
    `;

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
      card.innerHTML = `
        <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
        <h1>Admin Login</h1>
        <p>Manage FemiFresh orders, products and affiliates.</p>
      `;

      form.parentNode.insertBefore(card, form);
      card.appendChild(form);
    });
  }

  function removePhoneNumbers(){
    document.body.innerHTML = document.body.innerHTML
      .replace(/\+27\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
      .replace(/0\s*61\s*450\s*3120/gi, "femifresh02@gmail.com")
      .replace(/061\s*450\s*3120/gi, "femifresh02@gmail.com")
      .replace(/27614503120/gi, "femifresh02@gmail.com")
      .replace(/064\s*761\s*0299/gi, "");
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
