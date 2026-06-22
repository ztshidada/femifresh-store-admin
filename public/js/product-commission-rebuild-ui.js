(function(){
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
})();