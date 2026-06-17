
(function(){
  function isOutOfStockCard(card){
    const text = (card.innerText || "").toLowerCase();

    return (
      text.includes("out of stock") ||
      text.includes("business pack") ||
      text.includes("starter business pack")
    );
  }

  function applyOutOfStock(){
    document.querySelectorAll(".product-card, .product, .card").forEach(card => {
      if (!isOutOfStockCard(card)) return;

      const nameText = (card.innerText || "").toLowerCase();

      if (!(nameText.includes("business pack") || nameText.includes("starter business pack"))) return;

      if (!card.querySelector(".ff-out-stock-badge")) {
        const badge = document.createElement("div");
        badge.className = "ff-out-stock-badge";
        badge.textContent = "Out of Stock";
        badge.style.cssText = "display:inline-flex;margin:10px 0;padding:8px 14px;border-radius:999px;background:#fff1fa;color:#68235f;font-weight:950;border:1px solid rgba(104,35,95,.14);";
        card.appendChild(badge);
      }

      card.querySelectorAll("button, a").forEach(btn => {
        const t = (btn.innerText || "").toLowerCase();

        if (
          t.includes("add") ||
          t.includes("cart") ||
          t.includes("buy") ||
          t.includes("shop")
        ) {
          btn.disabled = true;
          btn.innerText = "Out of Stock";
          btn.style.opacity = ".55";
          btn.style.pointerEvents = "none";
          btn.style.cursor = "not-allowed";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", applyOutOfStock);
  setTimeout(applyOutOfStock, 800);
  setTimeout(applyOutOfStock, 1800);
})();
