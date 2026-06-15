const fs = require("fs");
const path = require("path");

const jsFile = path.join(__dirname, "public", "js", "glass-home-refresh.js");
const cssFile = path.join(__dirname, "public", "css", "glass-home-refresh.css");

let js = fs.readFileSync(jsFile, "utf8");

/*
  Remove old hero visual/logo image on the right.
  Keep only the new glass butterfly showcase.
*/
const extraJs = `
function removeOldHeroVisual() {
  const hero =
    document.querySelector(".hero") ||
    document.querySelector(".hero-section") ||
    Array.from(document.querySelectorAll("section")).find(sec => sec.querySelector("h1"));

  if (!hero) return;

  const imgs = Array.from(hero.querySelectorAll("img"));

  imgs.forEach(img => {
    if (img.closest(".ff-glass-showcase")) return;
    if (img.closest("header,.site-header,.navbar")) return;

    const src = (img.getAttribute("src") || "").toLowerCase();
    const alt = (img.getAttribute("alt") || "").toLowerCase();

    if (
      src.includes("femifresh") ||
      alt.includes("femifresh") ||
      img.width > 180 ||
      img.height > 120
    ) {
      const block =
        img.closest(".hero-image") ||
        img.closest(".hero-visual") ||
        img.closest(".image-card") ||
        img.closest(".visual") ||
        img.closest(".card") ||
        img.closest("div");

      if (block && !block.classList.contains("ff-glass-showcase")) {
        block.style.display = "none";
      }
    }
  });
}
`;

if (!js.includes("function removeOldHeroVisual()")) {
  js = js.replace("function runHome() {", extraJs + "\nfunction runHome() {");
}

js = js.replace(
`    ensureGlassShowcase(hero);
    hideBigOverflowingPromo();`,
`    ensureGlassShowcase(hero);
    removeOldHeroVisual();
    hideBigOverflowingPromo();`
);

fs.writeFileSync(jsFile, js);

let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("FIX_GLASS_SHOWCASE_ONLY")) {
  css += `

/* FIX_GLASS_SHOWCASE_ONLY */
.ff-glass-showcase {
  width: min(520px, 100%);
  margin-top: 28px;
}

.ff-glass-logo-box img {
  display: block !important;
  opacity: 1 !important;
}

.ff-glass-logo-box {
  background: linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.10));
}

/* Hide old hero image containers when JS marks them */
.hero-image[style*="display: none"],
.hero-visual[style*="display: none"],
.image-card[style*="display: none"],
.visual[style*="display: none"] {
  display: none !important;
}
`;
}

fs.writeFileSync(cssFile, css);

console.log("Fixed homepage: glass logo will show and old right image will be removed.");
