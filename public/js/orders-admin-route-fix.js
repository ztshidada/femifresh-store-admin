
(function(){
  function isOrdersAdmin(){
    return (document.body.innerText || "").toLowerCase().includes("orders_admin") ||
           (document.body.innerText || "").toLowerCase().includes("orders admin");
  }

  function fix(){
    if(!isOrdersAdmin()) return;

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase().trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      if(label === "orders" || href.endsWith("/admin/orders.html") || href.includes("orders.html")){
        a.setAttribute("href", "/admin/staff-orders.html?v=5200");
      }

      if(label.includes("affiliates") || href.includes("affiliates")){
        a.innerText = "Joining Fees";
        a.setAttribute("href", "/admin/joining-fees.html?v=5200");
      }
    });

    if(location.pathname.toLowerCase() === "/admin/orders.html"){
      location.replace("/admin/staff-orders.html?v=5200");
    }
  }

  document.addEventListener("DOMContentLoaded", fix);
  setTimeout(fix, 100);
  setTimeout(fix, 700);
  setTimeout(fix, 1600);
})();
