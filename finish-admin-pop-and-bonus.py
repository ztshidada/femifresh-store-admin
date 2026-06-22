from pathlib import Path
import re
import shutil
import time
import sys

root = Path.cwd()
file = root / "public/js/admin-platform.js"

if not file.exists():
    raise SystemExit("admin-platform.js was not found. Make sure you are inside femifresh-store-admin-v1.")

backup_dir = root / ".femifresh-backups" / f"admin-pop-fix-{int(time.time())}"
backup_dir.mkdir(parents=True, exist_ok=True)
shutil.copy2(file, backup_dir / "admin-platform.js.bak")

text = file.read_text()

# -------------------------------------------------------
# Replace the complete Admin Order Detail section safely
# -------------------------------------------------------
pattern = r'  async function orderDetail\(\)\{.*?\n  function select\(name, values, current\)\{'

replacement = r'''  async function orderDetail(){
    const root = await shell("Orders");
    const id = new URLSearchParams(location.search).get("id");

    const [data, popData] = await Promise.all([
      api("/api/admin/orders"),
      api("/api/admin/pop-submissions")
    ]);

    const o = data.orders.find(x =>
      String(x.id) === String(id) ||
      String(x.orderNumber) === String(id)
    );

    if (!o) {
      root.innerHTML = `<div class="ff-empty">Order not found.</div>`;
      return;
    }

    const relatedPops = (popData.submissions || []).filter(p =>
      String(p.kind || "") === "order" &&
      (
        String(p.reference || "") === String(o.orderNumber || "") ||
        String(p.reference || "") === String(o.id || "")
      )
    );

    root.innerHTML = `
      <section class="ff-grid two">
        <div class="ff-card ff-stack">
          <h2>${esc(o.orderNumber)}</h2>
          <p>${badge(o.paymentStatus)} ${badge(o.orderStatus || o.fulfillmentStatus)}</p>

          <p>
            <strong>${esc(o.customer?.name || "")}</strong><br>
            ${esc(o.customer?.email || "")}<br>
            ${esc(o.customer?.phone || "")}
          </p>

          <p class="ff-muted">${esc(o.customer?.address || "")}</p>

          <h3>Items</h3>
          ${(o.items || []).map(i => `
            <div class="ff-row">
              <span>${esc(i.qty)}x ${esc(i.name)}</span>
              <strong>${money(i.subtotal)}</strong>
            </div>
          `).join("")}

          <hr>
          <div class="ff-row">
            <span>Total</span>
            <strong>${money(o.total)}</strong>
          </div>

          <div id="orderPopPanel"></div>
        </div>

        <div class="ff-card ff-stack">
          <h2>Workflow</h2>

          ${select("paymentStatus", ["pending","pop_submitted","under_review","paid","failed","refunded","cancelled"], o.paymentStatus)}

          ${select("orderStatus", ["new","pop_submitted","under_review","paid","packing","packed","fulfilled","tracking_added","delivered","cancelled"], o.orderStatus || o.fulfillmentStatus)}

          <label class="ff-field">
            Tracking Number
            <input id="trackingNumber" value="${esc(o.trackingNumber || "")}">
          </label>

          <label class="ff-field">
            Admin Note
            <textarea id="adminNote">${esc(o.adminNote || "")}</textarea>
          </label>

          <button class="ff-btn" onclick="saveOrder('${esc(o.id)}')">
            Save Order
          </button>

          <button class="ff-btn secondary" onclick="markWhatsappPop('${esc(o.id)}')">
            Mark POP via WhatsApp
          </button>

          <button class="ff-btn secondary" onclick="printSlip()">
            Print Packing Slip
          </button>

          ${me.role === "super_admin"
            ? `<button class="ff-btn danger" onclick="deleteOrder('${esc(o.id)}')">Delete Order</button>`
            : ""}
        </div>
      </section>

      <section class="ff-print-slip">
        <h1>FemiFresh Packing Slip</h1>
        <h2>${esc(o.orderNumber)}</h2>
        <p>
          ${esc(o.customer?.name || "")}<br>
          ${esc(o.customer?.phone || "")}<br>
          ${esc(o.customer?.address || "")}
        </p>
        ${(o.items || []).map(i => `<p>${esc(i.qty)}x ${esc(i.name)}</p>`).join("")}
      </section>
    `;

    renderOrderPops(relatedPops);
  }

  function renderOrderPops(pops){
    const target = qs("#orderPopPanel");
    if (!target) return;

    if (!pops.length) {
      target.innerHTML = `
        <section class="ff-card ff-stack">
          <h3>Proof of Payment</h3>
          <div class="ff-empty">No proof of payment has been submitted yet.</div>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <section class="ff-card ff-stack">
        <h3>Proof of Payment</h3>

        ${pops.map(p => {
          const source = p.channel === "whatsapp"
            ? "Received via WhatsApp"
            : "Uploaded through website";

          const preview = p.file
            ? (
              String(p.file.fileType || "").startsWith("image/")
                ? `<a href="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" target="_blank" rel="noopener">
                    <img class="ff-pop-preview" src="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" alt="Proof of payment">
                   </a>`
                : `<a class="ff-btn secondary" href="/api/admin/pop-submissions/${encodeURIComponent(p.id)}/file" target="_blank" rel="noopener">
                    Open Uploaded POP
                   </a>`
            )
            : `<p class="ff-muted">No file was uploaded. POP was received through WhatsApp.</p>`;

          const approveButton = p.status !== "approved"
            ? `<button class="ff-btn" onclick="approveOrderPop('${esc(p.id)}')">Approve POP & Mark Paid</button>`
            : "";

          return `
            <div class="ff-card ff-stack" style="padding:16px">
              <div class="ff-row ff-wrap">
                <div>
                  <strong>${esc(source)}</strong>
                  <p class="ff-muted">${esc(p.createdAt || "")}</p>
                </div>
                <div>${badge(p.status || "submitted")}</div>
              </div>

              <p><strong>Customer note:</strong> ${esc(p.note || "No note added.")}</p>
              ${preview}
              ${approveButton}
            </div>
          `;
        }).join("")}
      </section>
    `;
  }

  function select(name, values, current){'''

new_text, count = re.subn(pattern, replacement, text, flags=re.S)

if count != 1:
    raise SystemExit(f"STOPPED: Could not safely replace Admin Order Detail. Found {count} matching sections.")

text = new_text

# -------------------------------------------------------
# Add POP action functions
# -------------------------------------------------------
old_print = '  window.printSlip = () => window.print();'

new_print = r'''  window.approveOrderPop = async function(id){
    try {
      await api("/api/admin/pop-submissions/" + encodeURIComponent(id) + "/review", {
        method: "POST",
        body: JSON.stringify({ status: "approved" })
      });
      toast("POP approved and order marked paid.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.markWhatsappPop = async function(orderId){
    try {
      await api("/api/admin/orders/" + encodeURIComponent(orderId) + "/pop-whatsapp", {
        method: "POST",
        body: JSON.stringify({
          note: "Proof of payment received via WhatsApp."
        })
      });
      toast("WhatsApp POP recorded.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.printSlip = () => window.print();'''

if old_print not in text:
    raise SystemExit("STOPPED: Could not find Print Packing Slip function.")

text = text.replace(old_print, new_print, 1)

# -------------------------------------------------------
# Replace Settings function fully to include bonuses
# -------------------------------------------------------
settings_pattern = r'  async function settings\(\)\{.*?\n  async function logs\(\)\{'

settings_replacement = r'''  async function settings(){
    const root = await shell("Settings");
    const data = await api("/api/admin/settings");
    const s = data.settings;

    root.innerHTML = `
      <section class="ff-card">
        <form class="ff-form" id="settingsForm">
          <h2>Business</h2>
          <input class="ff-input" name="business.email" value="${esc(s.business.email || "")}" placeholder="Business email">
          <input class="ff-input" name="business.whatsapp" value="${esc(s.business.whatsapp || "")}" placeholder="WhatsApp number">

          <h2>Bank</h2>
          <input class="ff-input" name="bank.bankName" value="${esc(s.bank.bankName || "")}" placeholder="Bank name">
          <input class="ff-input" name="bank.accountHolder" value="${esc(s.bank.accountHolder || "")}" placeholder="Account holder">
          <input class="ff-input" name="bank.accountNumber" value="${esc(s.bank.accountNumber || "")}" placeholder="Account number">

          <h2>Manual Payment Message</h2>
          <textarea class="ff-input" name="payment.manualInstructions">${esc(s.payment.manualInstructions || "")}</textarea>

          <button class="ff-btn">Save Business Settings</button>
        </form>
      </section>

      <section class="ff-card">
        <form class="ff-form" id="commissionSettingsForm">
          <h2>Commission & Target Bonus Settings</h2>

          <label class="ff-field">
            Referral Bonus Per Active Direct (R)
            <input class="ff-input" name="referralBonusPerActiveDirect" type="number" min="0" value="${esc(s.commission?.referralBonusPerActiveDirect ?? 300)}">
          </label>

          <label class="ff-field">
            Target Active Direct Referrals
            <input class="ff-input" name="targetActiveDirects" type="number" min="1" value="${esc(s.commission?.targetActiveDirects ?? 10)}">
          </label>

          <label class="ff-field">
            Target Bonus Amount (R)
            <input class="ff-input" name="targetBonusAmount" type="number" min="0" value="${esc(s.commission?.targetBonusAmount ?? 1000)}">
          </label>

          <button class="ff-btn">Save Commission Settings</button>
        </form>
      </section>
    `;

    qs("#settingsForm").onsubmit = async e => {
      e.preventDefault();

      const patch = {};
      new FormData(e.target).forEach((value, key) => {
        const [group, field] = key.split(".");
        patch[group] ||= {};
        patch[group][field] = value;
      });

      try {
        await api("/api/admin/settings", {
          method: "POST",
          body: JSON.stringify(patch)
        });
        toast("Business settings saved.");
      } catch(err) {
        toast(err.message, "error");
      }
    };

    qs("#commissionSettingsForm").onsubmit = async e => {
      e.preventDefault();
      const form = new FormData(e.target);

      try {
        await api("/api/admin/settings", {
          method: "POST",
          body: JSON.stringify({
            commission: {
              referralBonusPerActiveDirect: Number(form.get("referralBonusPerActiveDirect") || 0),
              targetActiveDirects: Number(form.get("targetActiveDirects") || 10),
              targetBonusAmount: Number(form.get("targetBonusAmount") || 0)
            }
          })
        });
        toast("Commission settings saved.");
      } catch(err) {
        toast(err.message, "error");
      }
    };
  }

  async function logs(){'''

text, count = re.subn(settings_pattern, settings_replacement, text, flags=re.S)

if count != 1:
    raise SystemExit(f"STOPPED: Could not safely replace Settings section. Found {count} matching sections.")

# -------------------------------------------------------
# Show referral bonus in product list
# -------------------------------------------------------
old_products = '''table(["Name","Price","Stock","Status","Action"], data.products.map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${badge(p.available ? "Active" : "Out of stock")}</td><td><button class="ff-btn secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`))'''

new_products = '''table(["Name","Price","Referral Bonus","Stock","Status","Action"], data.products.map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${money(p.commissionRules?.directReferralCommission || 0)}</td><td>${p.stock}</td><td>${badge(p.available ? "Active" : "Out of stock")}</td><td><button class="ff-btn secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`))'''

if old_products in text:
    text = text.replace(old_products, new_products, 1)

file.write_text(text)
print("Updated:", file.relative_to(root))
print("Backup:", backup_dir)
print("Admin POP review, WhatsApp POP, target settings, and bonus visibility are ready.")
