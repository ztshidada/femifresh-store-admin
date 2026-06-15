
(function () {
  if (document.getElementById("ff-affiliate-store-buttons")) return;

  const isStorePage = !location.pathname.includes("/admin");
  if (!isStorePage) return;

  const wrap = document.createElement("div");
  wrap.id = "ff-affiliate-store-buttons";
  wrap.className = "ff-affiliate-hero-actions";
  wrap.innerHTML = `
    <a class="ff-store-aff-btn primary" href="https://affiliates.femifresh.co.za">Become an Affiliate</a>
    <a class="ff-store-aff-btn secondary" href="https://affiliates.femifresh.co.za/login">Affiliate Back Office</a>
  `;

  const heroActions =
    document.querySelector(".hero-actions") ||
    document.querySelector(".hero .actions") ||
    document.querySelector(".hero-buttons") ||
    document.querySelector(".hero .buttons") ||
    document.querySelector(".actions");

  if (heroActions) {
    heroActions.insertAdjacentElement("afterend", wrap);
    return;
  }

  const hero =
    document.querySelector(".hero") ||
    document.querySelector("section") ||
    document.querySelector("main") ||
    document.body;

  hero.appendChild(wrap);
})();
