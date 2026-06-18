const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const adminDir = path.join(publicDir, "admin");
const jsDir = path.join(publicDir, "js");
const serverFile = path.join(root, "server.js");

fs.mkdirSync(jsDir, { recursive: true });

let server = fs.readFileSync(serverFile, "utf8");

/* 1. Add backend delete API for super_admin only */
if (!server.includes("SUPERADMIN_DELETE_ORDERS_V1")) {
  const block = `

// SUPERADMIN_DELETE_ORDERS_V1
function superAdminDeleteOrderGuard(req, res, next) {
  if (typeof requireAdmin === "function") {
    return requireAdmin(req, res, function () {
      const user = req.adminUser || req.user || req.admin || {};
      const role = String(user.role || user.type || "").toLowerCase();

      if (role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Only super admin can delete orders."
        });
      }

      next();
    });
  }

  return res.status(401).json({
    success: false,
    message: "Admin login required."
  });
}

function superAdminOrderMatches(order, id) {
  const keys = [
    order.id,
    order.orderId,
    order.orderNumber,
    order.orderNo,
    order.reference,
    order.cleanOrderNumber
  ].filter(Boolean).map(String);

  return keys.includes(String(id));
}

app.delete("/api/admin/orders/:id", superAdminDeleteOrderGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);

  const index = orders.findIndex(o => superAdminOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  const deletedOrder = orders[index];

  const deletedOrders = read("deletedOrders", []);

  deletedOrders.push({
    ...deletedOrder,
    deletedAt: new Date().toISOString(),
    deletedBy: (req.adminUser || req.user || req.admin || {}).email || "super_admin"
  });

  orders.splice(index, 1);

  write("orders", orders);
  write("deletedOrders", deletedOrders);

  res.json({
    success: true,
    message: "Order deleted.",
    deletedOrder
  });
});

app.post("/api/admin/orders/:id/delete", superAdminDeleteOrderGuard, (req, res) => {
  const id = req.params.id;
  const orders = read("orders", []);

  const index = orders.findIndex(o => superAdminOrderMatches(o, id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  const deletedOrder = orders[index];

  const deletedOrders = read("deletedOrders", []);

  deletedOrders.push({
    ...deletedOrder,
    deletedAt: new Date().toISOString(),
    deletedBy: (req.adminUser || req.user || req.admin || {}).email || "super_admin"
  });

  orders.splice(index, 1);

  write("orders", orders);
  write("deletedOrders", deletedOrders);

  res.json({
    success: true,
    message: "Order deleted.",
    deletedOrder
  });
});
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
  console.log("Super admin delete order API added.");
}

/* 2. Add frontend delete button only when super_admin text is visible */
fs.writeFileSync(path.join(jsDir, "superadmin-delete-orders.js"), `
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

    const ff = text.match(/FF[-\\s]*[0-9-]+/i);
    if (ff) return ff[0].replace(/\\s+/g, "");

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
`);

/* 3. Inject script into admin orders and order detail pages */
const targetFiles = [
  path.join(adminDir, "orders.html"),
  path.join(adminDir, "order-detail.html")
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/<script[^>]+superadmin-delete-orders\.js[^>]*><\/script>\s*/gi, "");
  html = html.replace("</body>", '  <script src="/js/superadmin-delete-orders.js?v=5400"></script>\n</body>');

  fs.writeFileSync(file, html);
  console.log("Injected delete order script:", path.relative(publicDir, file));
}

console.log("Super admin can now delete orders.");
