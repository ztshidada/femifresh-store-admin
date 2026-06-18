
(function(){
  function text(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isOrdersAdmin(){
    const t = text();
    return t.includes("orders_admin") || t.includes("orders admin");
  }

  function fix(){
    if(!isOrdersAdmin()) return;

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase().trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      if(label === "orders" || href.includes("/admin/orders.html")){
        a.setAttribute("href", "/admin/staff-orders.html?v=5300");
      }

      if(label.includes("affiliates") || href.includes("/admin/affiliates")){
        a.innerText = "Joining Fees";
        a.setAttribute("href", "/admin/joining-fees.html?v=5300");
      }

      if(
        label.includes("products") ||
        label.includes("delivery") ||
        label.includes("admin users") ||
        label.includes("payment") ||
        label.includes("logs") ||
        href.includes("products") ||
        href.includes("delivery") ||
        href.includes("users") ||
        href.includes("logs") ||
        href.includes("settings") ||
        href.includes("manual-payments")
      ){
        a.remove();
      }
    });

    if(location.pathname.toLowerCase() === "/admin/orders.html"){
      location.replace("/admin/staff-orders.html?v=5300");
    }

    if(location.pathname.toLowerCase().includes("/admin/affiliates")){
      location.replace("/admin/joining-fees.html?v=5300");
    }
  }

  document.addEventListener("DOMContentLoaded", fix);
  setTimeout(fix, 100);
  setTimeout(fix, 700);
  setTimeout(fix, 1500);
})();
