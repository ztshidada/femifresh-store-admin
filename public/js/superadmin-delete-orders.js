
(function(){
  function pageText(){
    return (document.body.innerText || "").toLowerCase();
  }

  function isSuperAdmin(){
    const t = pageText();
    return (
      t.includes("super_admin") ||
      t.includes("super admin")
    );
  }

  function getOrderIdFromRow(row){
    const link = row.querySelector('a[href*="order-detail"], a[href*="id="]');
    if (link) {
      try {
        const url = new URL(link.href, location.origin);
        const id = url.searchParams.get("id");
        if (id) return id;
      } catch(e){}
    }

    const btn = row.querySelector("button[data-order-id], a[data-order-id]");
    if (btn && btn.dataset.orderId) return btn.dataset.orderId;

    const text = row.innerText || "";
    const uuid = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuid) return uuid[0];

    const ff = text.match(/FF[-\s]*[0-9-]+/i);
    if (ff) return ff[0].replace(/\s+/g, "");

    return "";
  }

  async function deleteOrder(id, row){
    if (!id) {
      alert("Could not find order ID.");
      return;
    }

    const ok = confirm("Delete this order permanently? It will be moved to deletedOrders backup.");
    if (!ok) return;

    const res = await fetch("/api/admin/orders/" + encodeURIComponent(id), {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json().catch(() => ({}));

    if (!data.success) {
      alert(data.message || "Could not delete order.");
      return;
    }

    row.remove();

    if (typeof loadOrders === "function") {
      try { loadOrders(); } catch(e){}
    }

    alert("Order deleted.");
  }

  function addDeleteButtons(){
    if (!isSuperAdmin()) return;

    const tables = document.querySelectorAll("table");

    tables.forEach(table => {
      const headers = Array.from(table.querySelectorAll("thead th")).map(th => (th.innerText || "").toLowerCase());
      const looksLikeOrders =
        headers.some(h => h.includes("order")) &&
        headers.some(h => h.includes("name") || h.includes("customer"));

      if (!looksLikeOrders) return;

      table.querySelectorAll("tbody tr").forEach(row => {
        if (row.querySelector(".ff-delete-order-btn")) return;

        const id = getOrderIdFromRow(row);

        let cell = row.querySelector("td:last-child");
        if (!cell) {
          cell = document.createElement("td");
          row.appendChild(cell);
        }

        const btn = document.createElement("button");
        btn.className = "ff-delete-order-btn";
        btn.type = "button";
        btn.textContent = "Delete";
        btn.style.cssText = "margin-left:6px;background:#b00020!important;color:white!important;border:0;border-radius:999px;min-height:42px;padding:10px 16px;font-weight:950;cursor:pointer;";

        btn.addEventListener("click", function(){
          deleteOrder(id || getOrderIdFromRow(row), row);
        });

        cell.appendChild(btn);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", addDeleteButtons);
  setTimeout(addDeleteButtons, 500);
  setTimeout(addDeleteButtons, 1500);
  setInterval(addDeleteButtons, 3000);
})();
