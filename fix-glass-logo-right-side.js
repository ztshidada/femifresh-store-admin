const fs = require("fs");
const path = require("path");

const cssFile = path.join(__dirname, "public", "css", "glass-home-refresh.css");
const jsFile = path.join(__dirname, "public", "js", "glass-home-refresh.js");

let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("FIX_GLASS_RIGHT_SIDE_V2")) {
  css += `

/* FIX_GLASS_RIGHT_SIDE_V2 */

/* Make desktop hero feel like two columns */
@media (min-width: 900px) {
  .ff-home-hero,
  .hero,
  .hero-section {
    display: grid !important;
    grid-template-columns: minmax(420px, 1fr) minmax(360px, 520px) !important;
    align-items: center !important;
    gap: 44px !important;
    min-height: 78vh;
  }

  .ff-home-hero > *:not(.ff-glass-showcase),
  .hero > *:not(.ff-glass-showcase),
  .hero-section > *:not(.ff-glass-showcase) {
    grid-column: 1;
  }

  .ff-glass-showcase {
    grid-column: 2 !important;
    grid-row: 1 / span 8 !important;
    align-self: center !important;
    justify-self: center !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 520px !important;
  }
}

/* Bigger premium glass card */
.ff-glass-panel {
  width: 100% !important;
  min-height: 430px;
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 34px !important;
  background:
    linear-gradient(145deg, rgba(255,255,255,.26), rgba(255,255,255,.09)),
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.34), transparent 28%),
    radial-gradient(circle at 80% 85%, rgba(246,163,216,.28), transparent 32%) !important;
  border: 1px solid rgba(255,255,255,.34) !important;
  box-shadow:
    0 30px 80px rgba(48, 4, 50, .26),
    inset 0 1px 0 rgba(255,255,255,.34),
    inset 0 -1px 0 rgba(255,255,255,.10) !important;
  transform: rotate(1.2deg);
}

/* Logo image box */
.ff-glass-logo-box {
  width: 300px !important;
  height: 300px !important;
  border-radius: 34px !important;
  overflow: hidden !important;
  background:
    linear-gradient(145deg, rgba(255,255,255,.34), rgba(255,255,255,.12)) !important;
  border: 1px solid rgba(255,255,255,.36) !important;
  box-shadow:
    0 26px 55px rgba(78, 12, 75, .23),
    inset 0 1px 0 rgba(255,255,255,.45) !important;
}

/* Make the square image feel cleaner */
.ff-glass-logo-box img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 28px !important;
  display: block !important;
  mix-blend-mode: normal;
  filter: saturate(1.08) contrast(1.04) drop-shadow(0 16px 28px rgba(246,163,216,.20)) !important;
}

/* Caption */
.ff-glass-caption strong {
  font-size: 26px !important;
  color: #fff7fc !important;
  text-shadow: 0 8px 22px rgba(37, 3, 35, .20);
}

.ff-glass-caption span {
  font-size: 17px !important;
  color: rgba(255,255,255,.84) !important;
}

/* Hero text better */
.ff-live-title {
  color: #ffe7f7 !important;
  background: linear-gradient(120deg, #fff8fd 0%, #ffd7f1 35%, #f6a3d8 58%, #fff0fa 100%) !important;
  background-size: 220% 220% !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

/* Mobile: keep logo below text but clean */
@media (max-width: 899px) {
  .ff-glass-showcase {
    margin-top: 26px !important;
    width: 100% !important;
  }

  .ff-glass-panel {
    min-height: auto !important;
    padding: 26px 18px !important;
    transform: none !important;
  }

  .ff-glass-logo-box {
    width: 220px !important;
    height: 220px !important;
  }
}
`;
}

fs.writeFileSync(cssFile, css);

/* Ensure the glass card is appended directly inside hero, not nested weirdly */
let js = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, "utf8") : "";

js = js.replace(
`      const buttons = hero.querySelector(".ff-affiliate-hero-actions");
      if (buttons) buttons.insertAdjacentElement("afterend", box);
      else hero.appendChild(box);`,
`      hero.appendChild(box);`
);

fs.writeFileSync(jsFile, js);

console.log("Glass logo moved to premium right-side hero card.");
