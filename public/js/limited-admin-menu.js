
(function(){
  function getText(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isOrdersAdmin(){
    const text = getText();
    return text.includes("orders admin") || text.includes("orders_admin");
  }

  function cleanMenu(){
    if(!isOrdersAdmin()) return;

    document.querySelectorAll("aside a, .sidebar a, nav a").forEach(a => {
      const label = (a.innerText || "").toLowerCase().trim();
      const href = (a.getAttribute("href") || "").toLowerCase();

      const allowed =
        label.includes("dashboard") ||
        label.includes("orders") ||
        label.includes("joining") ||
        label.includes("logout") ||
        href.includes("dashboard") ||
        href.includes("orders") ||
        href.includes("joining-fees");

      if(!allowed){
        a.remove();
      }

      if(label.includes("affiliates") || href.includes("affiliates")){
        a.innerText = "Joining Fees";
        a.setAttribute("href", "/admin/joining-fees.html");
      }
    });

    document.querySelectorAll("aside, .sidebar").forEach(side => {
      if(!side.querySelector('a[href*="joining-fees"]')){
        const link = document.createElement("a");
        link.href = "/admin/joining-fees.html";
        link.textContent = "Joining Fees";
        side.appendChild(link);
      }
    });

    if(location.pathname.includes("/admin/affiliates")){
      location.replace("/admin/joining-fees.html");
    }
  }

  document.addEventListener("DOMContentLoaded", cleanMenu);
  setTimeout(cleanMenu, 500);
  setTimeout(cleanMenu, 1500);
})();
