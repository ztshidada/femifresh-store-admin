from pathlib import Path
import re
import shutil
import time
import sys

root = Path.cwd()

server_file = root / "server.js"
affiliate_file = root / "src/services/affiliateService.js"
settings_file = root / "src/services/settingsService.js"
service_file = root / "src/services/commissionRebuildService.js"
ui_file = root / "public/js/product-commission-rebuild-ui.js"

required = [server_file, affiliate_file, settings_file]
for file in required:
    if not file.exists():
        raise SystemExit(f"Missing file: {file}")

backup_dir = root / ".femifresh-backups" / f"commission-rebuild-{int(time.time())}"
backup_dir.mkdir(parents=True, exist_ok=True)

for file in required:
    shutil.copy2(file, backup_dir / file.name)

def save(file, content):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content)
    print("Updated:", file.relative_to(root))

# =========================================================
# 1. Product commission rebuild service
# =========================================================
service = r'''const { read, write } = require("../db");
const affiliateService = require("./affiliateService");

function now() {
  return new Date().toISOString();
}

function normalise(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productText(product = {}) {
  return normalise([
    product.id,
    product.name,
    product.title,
    product.category,
    product.description,
    product.slug
  ].filter(Boolean).join(" "));
}

function isTshirt(product = {}) {
  const text = productText(product);
  return text.includes("t shirt") || text.includes("tshirt");
}

function isHalfVersion(product = {}) {
  const text = productText(product);

  return [
    "half stock",
    "half package",
    "half pack",
    "half product",
    "half version",
    "5 pack",
    "5pack",
    "5 products",
    "stock of 5"
  ].some(flag => text.includes(flag));
}

function isCranberryFatBurnerSilverPackage(product = {}) {
  const text = productText(product);

  return (
    text.includes("cranberry") &&
    text.includes("fat burner") &&
    (
      text.includes("silver") ||
      text.includes("package") ||
      text.includes("bundle")
    )
  );
}

function commissionForProduct(product = {}) {
  if (isTshirt(product)) return 0;

  const half = isHalfVersion(product);

  if (isCranberryFatBurnerSilverPackage(product)) {
    return half ? 200 : 400;
  }

  return half ? 150 : 300;
}

function findCurrentProduct(item, products) {
  const productId = String(item.productId || item.id || "").trim();

  if (productId) {
    const found = products.find(p => String(p.id || "") === productId);
    if (found) return found;
  }

  const itemName = normalise(item.name || item.title || "");

  if (!itemName) return null;

  return products.find(p => {
    const productName = normalise(p.name || p.title || "");
    return productName && productName === itemName;
  }) || null;
}

function lineCommission(item = {}) {
  const total = Number(item.directReferralCommissionTotal);

  if (Number.isFinite(total) && total >= 0) {
    return total;
  }

  const unit = Number(item.directReferralCommission || 0);
  const qty = Math.max(1, Number(item.qty || item.quantity || 1));

  return unit * qty;
}

function paidOrderMonths(orders) {
  const months = new Set();

  for (const order of orders) {
    if (String(order.paymentStatus || "").toLowerCase() !== "paid") continue;

    const date = new Date(order.paidAt || order.createdAt || Date.now());

    if (!Number.isNaN(date.getTime())) {
      months.add(date.toISOString().slice(0, 7));
    }
  }

  months.add(affiliateService.monthKey());

  for (const statement of read("commissionStatements", [])) {
    if (statement.month) months.add(String(statement.month));
  }

  return [...months].sort();
}

function previewCommissionRebuild() {
  const products = read("products", []);
  const orders = read("orders", []);

  const productChanges = products.map(product => {
    const next = commissionForProduct(product);
    const current = Number(product.commissionRules?.directReferralCommission || 0);

    return {
      id: product.id,
      name: product.name || product.title || "Unnamed product",
      version: isTshirt(product)
        ? "T-shirt"
        : isHalfVersion(product)
          ? "Half version"
          : "Full version",
      currentCommission: current,
      nextCommission: next,
      changed: current !== next
    };
  });

  const paidOrders = orders.filter(order =>
    String(order.paymentStatus || "").toLowerCase() === "paid"
  );

  const paidLineItems = paidOrders.reduce(
    (sum, order) => sum + (Array.isArray(order.items) ? order.items.length : 0),
    0
  );

  return {
    rules: {
      normalFull: 300,
      normalHalf: 150,
      cranberryFatBurnerFull: 400,
      cranberryFatBurnerHalf: 200,
      tshirt: 0
    },
    products: productChanges,
    paidOrdersToRecalculate: paidOrders.length,
    paidOrderItemsToRecalculate: paidLineItems,
    monthsToRebuild: paidOrderMonths(orders)
  };
}

function applyCommissionRebuild(actor = {}) {
  const products = read("products", []);
  const orders = read("orders", []);
  const affiliates = read("affiliates", []);
  const preview = previewCommissionRebuild();
  const rebuiltAt = now();

  let productsChanged = 0;
  let orderItemsChanged = 0;
  let paidOrdersRecalculated = 0;

  for (const product of products) {
    const directReferralCommission = commissionForProduct(product);
    const current = Number(product.commissionRules?.directReferralCommission || 0);

    if (current !== directReferralCommission) {
      product.commissionRules = {
        ...(product.commissionRules || {}),
        directReferralCommission
      };
      product.updatedAt = rebuiltAt;
      productsChanged += 1;
    }
  }

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    let changedThisOrder = false;

    for (const item of items) {
      const product = findCurrentProduct(item, products);
      const commissionSource = product || item;
      const unitCommission = commissionForProduct(commissionSource);
      const qty = Math.max(1, Number(item.qty || item.quantity || 1));
      const totalCommission = unitCommission * qty;

      if (
        Number(item.directReferralCommission || 0) !== unitCommission ||
        Number(item.directReferralCommissionTotal || 0) !== totalCommission
      ) {
        item.directReferralCommission = unitCommission;
        item.directReferralCommissionTotal = totalCommission;
        item.commissionRules = {
          ...(item.commissionRules || {}),
          directReferralCommission: unitCommission
        };
        changedThisOrder = true;
        orderItemsChanged += 1;
      }
    }

    if (changedThisOrder) {
      order.commissionRecalculatedAt = rebuiltAt;
      order.updatedAt = rebuiltAt;
    }

    if (String(order.paymentStatus || "").toLowerCase() === "paid") {
      paidOrdersRecalculated += 1;
    }
  }

  write("products", products);
  write("orders", orders);

  const months = preview.monthsToRebuild;
  let statementsRebuilt = 0;

  for (const affiliate of affiliates) {
    for (const month of months) {
      const statement = affiliateService.generateCommissionStatement(affiliate.id, month);

      if (statement) {
        statement.recalculatedAt = rebuiltAt;
        statement.recalculatedBy = actor.email || actor.name || "super_admin";
        statementsRebuilt += 1;
      }
    }
  }

  const logs = read("commissionRebuildLogs", []);

  logs.unshift({
    id: `commission-rebuild-${Date.now()}`,
    actor: actor.email || actor.name || "super_admin",
    createdAt: rebuiltAt,
    rules: preview.rules,
    productsChanged,
    orderItemsChanged,
    paidOrdersRecalculated,
    statementsRebuilt,
    monthsRebuilt: months
  });

  write("commissionRebuildLogs", logs);

  return {
    success: true,
    message: "Product commission rules and existing paid-order commissions were rebuilt.",
    productsChanged,
    orderItemsChanged,
    paidOrdersRecalculated,
    statementsRebuilt,
    monthsRebuilt: months,
    rules: preview.rules
  };
}

module.exports = {
  commissionForProduct,
  previewCommissionRebuild,
  applyCommissionRebuild,
  lineCommission
};
'''

save(service_file, service)

# =========================================================
# 2. Replace calculateCommission fully.
# Product-specific paid order commission only.
# =========================================================
affiliate = affiliate_file.read_text()

pattern = r'function calculateCommission\(affiliate, affiliates, month = monthKey\(\)\) \{.*?\n\}\n\nfunction onboardingChecklist'

replacement = r'''function calculateCommission(affiliate, affiliates, month = monthKey()) {
  const directs = directReferrals(affiliate, affiliates);
  const activeDirects = directs.filter(a => affiliateActive(a, month));
  const selfActive = affiliateActive(affiliate, month);

  const settings = getSettings();
  const commissionSettings = settings.commission || {};
  const targetActiveDirects = Math.max(1, Number(commissionSettings.targetActiveDirects ?? 10));
  const targetBonusAmount = Number(commissionSettings.targetBonusAmount ?? 1000);

  const productCommissions = read("orders", [])
    .filter(order =>
      String(order.referralCode || "").toUpperCase() ===
      String(affiliate.referralCode || "").toUpperCase()
    )
    .filter(order => String(order.paymentStatus || "").toLowerCase() === "paid")
    .reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemSum, item) => {
        const quantity = Math.max(1, Number(item.qty || item.quantity || 1));
        const total = Number(item.directReferralCommissionTotal);

        if (Number.isFinite(total) && total >= 0) {
          return itemSum + total;
        }

        return itemSum + (Number(item.directReferralCommission || item.commission || 0) * quantity);
      }, 0);
    }, 0);

  const targetBonusCounted = activeDirects.length >= targetActiveDirects
    ? targetBonusAmount
    : 0;

  const totalCounted = productCommissions + targetBonusCounted;
  const payoutBlocked = affiliate.payoutBlocked === true;
  const totalPayable = selfActive && !payoutBlocked ? totalCounted : 0;
  const totalBlocked = totalCounted - totalPayable;

  let blockedReason = "";

  if (totalCounted > 0 && !selfActive) {
    blockedReason = "Distributor is not active for this month.";
  }

  if (totalCounted > 0 && payoutBlocked) {
    blockedReason = affiliate.payoutBlockedReason || "Payout is blocked by admin review.";
  }

  return {
    month,
    selfActive,
    directRecruits: directs.length,
    activeDirectRecruits: activeDirects.length,
    referralBonusCounted: productCommissions,
    targetBonusCounted,
    productCommissions,
    totalCounted,
    totalPayable,
    totalBlocked,
    blockedReason,
    targetActiveDirects,
    targetBonusAmount,
    needsForTarget: Math.max(0, targetActiveDirects - activeDirects.length),
    targetBonusProgress: {
      current: activeDirects.length,
      required: targetActiveDirects,
      remaining: Math.max(0, targetActiveDirects - activeDirects.length),
      amount: targetBonusAmount,
      status: activeDirects.length >= targetActiveDirects ? "qualified" : "pending"
    }
  };
}

function onboardingChecklist'''

affiliate, count = re.subn(pattern, replacement, affiliate, flags=re.S)

if count != 1:
    raise SystemExit("Could not safely replace calculateCommission in affiliateService.js")

save(affiliate_file, affiliate)

# =========================================================
# 3. Remove wrong global referral-bonus setting.
# =========================================================
settings = settings_file.read_text()

settings = settings.replace(
    "    referralBonusPerActiveDirect: 300,\n",
    ""
)

save(settings_file, settings)

# =========================================================
# 4. Add Super Admin preview/apply endpoints.
# =========================================================
server = server_file.read_text()

if 'commissionRebuildService' not in server:
    anchor = 'const opsService = require("./src/services/opsService");'
    if anchor not in server:
        raise SystemExit("Could not find services section in server.js")

    server = server.replace(
        anchor,
        anchor + '\nconst commissionRebuildService = require("./src/services/commissionRebuildService");',
        1
    )

if '/api/admin/commission-rebuild/preview' not in server:
    anchor = 'app.get("/api/admin/products", requireAdmin, requirePermission("products:read"),'

    routes = r'''
app.get("/api/admin/commission-rebuild/preview", requireAdmin, requireRole("super_admin"), (req, res) => {
  ok(res, commissionRebuildService.previewCommissionRebuild());
});

app.post("/api/admin/commission-rebuild/apply", requireAdmin, requireRole("super_admin"), (req, res) => {
  ok(res, commissionRebuildService.applyCommissionRebuild(req.user));
});

'''

    if anchor not in server:
        raise SystemExit("Could not find admin product routes in server.js")

    server = server.replace(anchor, routes + anchor, 1)

save(server_file, server)

# =========================================================
# 5. Add separate Product Commission admin UI.
# No risky rewrite of existing admin platform.
# =========================================================
ui = r'''(function(){
  const page = document.body.dataset.adminPage || "";

  if (!["products", "settings"].includes(page)) return;

  function waitForAdmin(callback, attempts = 0) {
    const root = document.querySelector("#adminRoot");

    if (root && window.Femi) {
      callback(root);
      return;
    }

    if (attempts < 40) {
      setTimeout(() => waitForAdmin(callback, attempts + 1), 250);
    }
  }

  function hideWrongGlobalReferralBonus() {
    document.querySelectorAll("label").forEach(label => {
      const text = (label.innerText || "").toLowerCase();

      if (text.includes("referral bonus per active direct")) {
        label.remove();
      }
    });

    document.querySelectorAll("h2").forEach(title => {
      if ((title.innerText || "").trim() === "Commission & Target Bonus Settings") {
        title.innerText = "Target Bonus Settings";
      }
    });
  }

  function money(value) {
    return "R" + Number(value || 0).toFixed(2);
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function addProductCommissionPanel(root) {
    if (document.querySelector("#commissionRebuildPanel")) return;

    const panel = document.createElement("section");
    panel.id = "commissionRebuildPanel";
    panel.className = "ff-card ff-stack";
    panel.innerHTML = `
      <h2>Product Commission Rules</h2>
      <p class="ff-muted">
        Full normal products: <strong>R300</strong> ·
        Half normal products: <strong>R150</strong> ·
        Cranberry Tea + Fat Burner Silver Package full: <strong>R400</strong> ·
        Half version: <strong>R200</strong> ·
        Distributor T-Shirt: <strong>R0</strong>.
      </p>
      <p class="ff-muted">
        This will also recalculate commissions from all existing paid orders and rebuild commission statements.
        Already-recorded payout history will not be deleted.
      </p>
      <div class="ff-row ff-wrap">
        <button class="ff-btn secondary" id="previewCommissionRebuild">Preview Changes</button>
        <button class="ff-btn" id="applyCommissionRebuild">Apply Rules & Recalculate Commissions</button>
      </div>
      <div id="commissionPreview"></div>
    `;

    root.prepend(panel);

    const { api, toast, confirmModal } = window.Femi;

    async function preview() {
      try {
        const data = await api("/api/admin/commission-rebuild/preview");

        const changed = (data.products || []).filter(product => product.changed);

        document.querySelector("#commissionPreview").innerHTML = `
          <div class="ff-card ff-stack" style="padding:16px">
            <p><strong>Paid orders to recalculate:</strong> ${esc(data.paidOrdersToRecalculate)}</p>
            <p><strong>Paid order items to recalculate:</strong> ${esc(data.paidOrderItemsToRecalculate)}</p>
            <p><strong>Months to rebuild:</strong> ${esc((data.monthsToRebuild || []).join(", "))}</p>
            <h3>Product changes</h3>
            ${changed.length
              ? `<div class="ff-table-wrap"><table class="ff-table">
                  <thead><tr><th>Product</th><th>Version</th><th>Old</th><th>New</th></tr></thead>
                  <tbody>
                    ${changed.map(product => `
                      <tr>
                        <td>${esc(product.name)}</td>
                        <td>${esc(product.version)}</td>
                        <td>${money(product.currentCommission)}</td>
                        <td><strong>${money(product.nextCommission)}</strong></td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table></div>`
              : `<div class="ff-empty">All current product commission rules already match.</div>`
            }
          </div>
        `;
      } catch(error) {
        toast(error.message || "Could not load commission preview.", "error");
      }
    }

    document.querySelector("#previewCommissionRebuild").addEventListener("click", preview);

    document.querySelector("#applyCommissionRebuild").addEventListener("click", async () => {
      const accepted = await confirmModal({
        title: "Recalculate all product commissions?",
        message: "This applies the FemiFresh full/half commission rules and recalculates all existing paid-order commission statements.",
        confirmText: "Apply & Recalculate",
        danger: false
      });

      if (!accepted) return;

      try {
        const result = await api("/api/admin/commission-rebuild/apply", {
          method: "POST"
        });

        toast(result.message || "Commission rebuild completed.");
        await preview();
      } catch(error) {
        toast(error.message || "Could not rebuild commissions.", "error");
      }
    });
  }

  waitForAdmin(root => {
    if (page === "settings") {
      setTimeout(hideWrongGlobalReferralBonus, 400);
      setTimeout(hideWrongGlobalReferralBonus, 1200);
    }

    if (page === "products") {
      setTimeout(() => addProductCommissionPanel(root), 350);
      setTimeout(() => addProductCommissionPanel(root), 1200);
    }
  });
})();'''

save(ui_file, ui)

# =========================================================
# 6. Inject UI script into products and settings admin pages.
# =========================================================
for page_name in ["products.html", "settings.html"]:
    page = root / "public/admin" / page_name

    if not page.exists():
        print("Skipped missing admin page:", page.relative_to(root))
        continue

    content = page.read_text()
    script_tag = '<script src="/js/product-commission-rebuild-ui.js?v=6200"></script>'

    content = re.sub(
        r'<script[^>]+product-commission-rebuild-ui\.js[^>]*></script>\s*',
        "",
        content,
        flags=re.I
    )

    if "</body>" not in content:
        raise SystemExit(f"Could not inject script into: {page}")

    content = content.replace("</body>", f"  {script_tag}\n</body>", 1)
    save(page, content)

print("")
print("DONE.")
print("Commission rules:")
print("- Normal full products: R300")
print("- Normal half products: R150")
print("- Cranberry + Fat Burner Silver full: R400")
print("- Cranberry + Fat Burner Silver half: R200")
print("- T-shirt: R0")
print("Backup folder:", backup_dir)
