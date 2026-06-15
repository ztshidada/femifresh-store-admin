
(function () {
  const HOME = location.pathname === "/" || /index\.html?$/.test(location.pathname);
  const LOGO_PATH = "/images/femifresh-glass-butterfly.png";
  const PRODUCTS_URL = "/products.html";
  const AFFILIATE_URL = "https://affiliates.femifresh.co.za";
  const BACKOFFICE_URL = "https://affiliates.femifresh.co.za/login";

  function byText(selectors, pattern) {
    const items = Array.from(document.querySelectorAll(selectors));
    return items.find(el => pattern.test((el.textContent || "").trim()));
  }

  function fixLiteralNewline() {
    if (document.body && document.body.firstChild && document.body.firstChild.nodeType === 3) {
      document.body.firstChild.textContent = document.body.firstChild.textContent.replace(/\\n/g, "");
    }

    document.querySelectorAll("body, body *").forEach(el => {
      if (el.childNodes && el.childNodes.length) {
        el.childNodes.forEach(node => {
          if (node.nodeType === 3 && /\\n/.test(node.textContent || "")) {
            node.textContent = (node.textContent || "").replace(/\\n/g, "");
          }
        });
      }
    });
  }

  function getHero() {
    return (
      document.querySelector(".hero") ||
      document.querySelector(".hero-section") ||
      Array.from(document.querySelectorAll("section")).find(sec => sec.querySelector("h1")) ||
      document.querySelector("main")
    );
  }

  function styleHero(hero) {
    if (!hero) return;
    hero.classList.add("ff-home-hero");

    const title = hero.querySelector("h1");
    if (title) title.classList.add("ff-live-title");

    const paras = hero.querySelectorAll("p");
    if (paras[0]) paras[0].classList.add("ff-live-subtext");
  }

  function findHeroInsertPoint(hero) {
    return (
      hero.querySelector(".hero-actions") ||
      hero.querySelector(".actions") ||
      hero.querySelector(".buttons") ||
      hero.querySelector(".hero-buttons") ||
      hero.querySelector("p:last-of-type") ||
      hero.querySelector("h1") ||
      hero
    );
  }

  function ensureHomeButtons(hero) {
    if (!hero) return;

    document.querySelectorAll("#ff-affiliate-store-buttons, .ff-affiliate-hero-actions").forEach(el => {
      if (!hero.contains(el)) el.remove();
    });

    let wrap = hero.querySelector(".ff-affiliate-hero-actions");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "ff-affiliate-hero-actions";
      wrap.innerHTML = `
        <a class="ff-store-aff-btn primary" href="${AFFILIATE_URL}">Become an Affiliate</a>
        <a class="ff-store-aff-btn secondary" href="${BACKOFFICE_URL}">Affiliate Back Office</a>
      `;

      const anchor = findHeroInsertPoint(hero);
      if (anchor && anchor !== hero) anchor.insertAdjacentElement("afterend", wrap);
      else hero.appendChild(wrap);
    }
  }

  function ensureGlassShowcase(hero) {
    if (!hero) return;

    let box = hero.querySelector(".ff-glass-showcase");
    if (!box) {
      box = document.createElement("div");
      box.className = "ff-glass-showcase";
      box.innerHTML = `
        <div class="ff-glass-panel">
          <div class="ff-glass-logo-box">
            <img src="${LOGO_PATH}" alt="FemiFresh Butterfly Logo">
          </div>
          <div class="ff-glass-caption">
            <strong>FemiFresh</strong>
            <span>Confidence in every wash.</span>
          </div>
        </div>
      `;

      const buttons = hero.querySelector(".ff-affiliate-hero-actions");
      if (buttons) buttons.insertAdjacentElement("afterend", box);
      else hero.appendChild(box);
    }
  }

  function removeNonHomeAffiliateButtons() {
    document.querySelectorAll("a").forEach(a => {
      const text = (a.textContent || "").trim().toLowerCase();
      const href = (a.getAttribute("href") || "").toLowerCase();

      const isAffiliateButton =
        text.includes("become an affiliate") ||
        text.includes("affiliate back office") ||
        href.includes("affiliates.femifresh.co.za");

      if (isAffiliateButton) {
        const holder =
          a.closest(".ff-affiliate-hero-actions") ||
          a.closest("#ff-affiliate-store-buttons") ||
          a.closest("div") ||
          a;
        if (holder) holder.remove();
      }
    });
  }

  function hideBigOverflowingPromo() {
    const hero = getHero();
    const allImgs = Array.from(document.querySelectorAll("main img, section img, body img"));

    const candidates = allImgs.filter(img => {
      const src = (img.getAttribute("src") || "").toLowerCase();
      if (src.includes("glass-butterfly")) return false;
      if (img.closest(".ff-glass-showcase")) return false;
      if (img.closest("header,.site-header,.navbar")) return false;
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      return (w >= 250 || h >= 250);
    });

    const target = candidates.find(img => {
      const container = img.closest(".card,.panel,section > div,section,div");
      if (!container) return false;
      if (hero && hero.contains(container)) return false;
      const txt = (container.textContent || "").toLowerCase();
      if (txt.includes("featured products")) return false;
      return true;
    });

    if (target) {
      const block = target.closest(".card,.panel,section > div,section,div");
      if (block) block.classList.add("ff-hide-overflow-card");
    }
  }

  function cleanupFeaturedProducts() {
    const sections = Array.from(document.querySelectorAll("section, div"));
    const featured = sections.find(el => {
      const heading = el.querySelector("h1,h2,h3,h4");
      return heading && /featured products/i.test((heading.textContent || "").trim());
    });

    if (!featured) return;
    featured.classList.add("ff-featured-section");

    const productGrid =
      featured.querySelector(".product-grid") ||
      featured.querySelector(".products-grid") ||
      featured.querySelector("[class*='product-grid']") ||
      featured.querySelector("[class*='products-grid']") ||
      Array.from(featured.querySelectorAll(".grid, .cards, .products")).find(el =>
        /product|price|cart/i.test(el.textContent || "")
      );

    if (productGrid) {
      const directKids = Array.from(featured.children);
      directKids.forEach(child => {
        if (child === productGrid) return;
        if (child.querySelector && child.querySelector("h1,h2,h3,h4")) return;

        const hasProductFeel = /price|add to cart|shop now|buy/i.test(child.textContent || "");
        if (!hasProductFeel) {
          const imgOnly = child.querySelector("img") && !child.querySelector("button,a[href*='product'],a[href*='cart']");
          if (imgOnly) child.remove();
        }
      });
    }

    if (!featured.querySelector(".ff-featured-cta")) {
      const cta = document.createElement("div");
      cta.className = "ff-featured-cta";
      cta.innerHTML = `<a class="ff-view-more-btn" href="${PRODUCTS_URL}">View More</a>`;
      featured.appendChild(cta);
    }
  }

  function addSoftGlassToCards() {
    document.querySelectorAll(".card,.panel,.product-card,.auth-card,.join-card").forEach(el => {
      el.classList.add("ff-soft-glass");
    });
  }

  function runHome() {
    const hero = getHero();
    if (!hero) return;

    styleHero(hero);
    ensureHomeButtons(hero);
    ensureGlassShowcase(hero);
    hideBigOverflowingPromo();
    cleanupFeaturedProducts();
    addSoftGlassToCards();
  }

  function runOtherPages() {
    removeNonHomeAffiliateButtons();
    addSoftGlassToCards();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fixLiteralNewline();
    if (HOME) runHome();
    else runOtherPages();
  });
})();
