
(function(){
  document.body.classList.add(location.pathname.includes("login") ? "ff-admin-login" : "ff-admin-body");

  if (!location.pathname.includes("login") && !document.querySelector(".ff-admin-layout")) {
    const bodyChildren = Array.from(document.body.children);
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

    const main = document.createElement("main");
    main.className = "ff-admin-main";

    bodyChildren.forEach(el => {
      if (el.tagName !== "SCRIPT") main.appendChild(el);
    });

    const layout = document.createElement("div");
    layout.className = "ff-admin-layout";
    layout.appendChild(sidebar);
    layout.appendChild(main);

    document.body.prepend(layout);
  }

  if (location.pathname.includes("login")) {
    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
      if (!form.closest(".ff-admin-login-card")) {
        const card = document.createElement("div");
        card.className = "ff-admin-login-card ff-card";
        card.innerHTML = `
          <img src="/images/femifresh-logo.jpg" alt="FemiFresh">
          <h1>Admin Login</h1>
          <p>Manage FemiFresh orders, products and affiliates.</p>
        `;
        form.parentNode.insertBefore(card, form);
        card.appendChild(form);
      }
    });
  }

  document.querySelectorAll("h1").forEach(h => {
    if (!h.closest(".ff-admin-title") && !location.pathname.includes("login")) {
      const wrap = document.createElement("div");
      wrap.className = "ff-admin-top";
      wrap.innerHTML = `<div class="ff-admin-title"></div>`;
      h.parentNode.insertBefore(wrap, h);
      wrap.querySelector(".ff-admin-title").appendChild(h);
    }
  });
})();
