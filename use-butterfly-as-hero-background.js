const fs = require("fs");
const path = require("path");

const cssFile = path.join(__dirname, "public", "css", "glass-home-refresh.css");
const jsFile = path.join(__dirname, "public", "js", "glass-home-refresh.js");

let js = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, "utf8") : "";

/* Stop creating the glass logo card */
js = js.replaceAll("ensureGlassShowcase(hero);", `
    document.querySelectorAll(".ff-glass-showcase").forEach(el => el.remove());
`);

js = js.replaceAll("removeOldHeroVisual();", `
    removeOldHeroVisual();
    document.querySelectorAll(".ff-glass-showcase").forEach(el => el.remove());
`);

fs.writeFileSync(jsFile, js);

let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("BUTTERFLY_AS_HERO_BACKGROUND_V1")) {
  css += `

/* BUTTERFLY_AS_HERO_BACKGROUND_V1 */

/* Remove the glass card completely */
.ff-glass-showcase,
.ff-glass-panel,
.ff-glass-logo-box,
.ff-glass-caption {
  display: none !important;
}

/* Remove desktop two-column layout from previous version */
@media (min-width: 900px) {
  .ff-home-hero,
  .hero,
  .hero-section {
    display: block !important;
    min-height: 82vh;
  }

  .ff-home-hero > *,
  .hero > *,
  .hero-section > * {
    grid-column: auto !important;
  }
}

/* Clean premium hero with butterfly as background */
.ff-home-hero,
.hero,
.hero-section {
  position: relative !important;
  overflow: hidden !important;
  isolation: isolate;
  background:
    radial-gradient(circle at 18% 22%, rgba(255,255,255,.18), transparent 22%),
    radial-gradient(circle at 86% 30%, rgba(255,183,226,.28), transparent 28%),
    radial-gradient(circle at 78% 84%, rgba(255,255,255,.10), transparent 25%),
    linear-gradient(135deg, #5b1b58 0%, #74236c 45%, #e678c9 100%) !important;
}

/* Big soft butterfly watermark */
.ff-home-hero::after,
.hero::after,
.hero-section::after {
  content: "";
  position: absolute;
  right: -7%;
  top: 8%;
  width: min(620px, 58vw);
  height: min(620px, 58vw);
  background-image: url("/images/femifresh-glass-butterfly.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: .18;
  filter: blur(.2px) saturate(1.2) drop-shadow(0 0 55px rgba(255,190,235,.34));
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 0;
  animation: ffButterflyGlow 6s ease-in-out infinite alternate;
}

/* Extra glossy light movement */
.ff-home-hero::before,
.hero::before,
.hero-section::before {
  content: "";
  position: absolute;
  inset: -25%;
  background:
    radial-gradient(circle at 22% 22%, rgba(255,255,255,.18), transparent 18%),
    radial-gradient(circle at 80% 20%, rgba(255,175,226,.24), transparent 22%),
    radial-gradient(circle at 55% 82%, rgba(255,255,255,.10), transparent 24%);
  animation: ffHeroLights 9s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}

@keyframes ffButterflyGlow {
  from {
    transform: translateY(0) scale(1);
    opacity: .14;
  }
  to {
    transform: translateY(-10px) scale(1.04);
    opacity: .24;
  }
}

@keyframes ffHeroLights {
  from {
    transform: translate(-2%, -2%) rotate(0deg);
    opacity: .55;
  }
  to {
    transform: translate(3%, 2%) rotate(6deg);
    opacity: .9;
  }
}

/* Keep hero content above the background */
.ff-home-hero > *,
.hero > *,
.hero-section > * {
  position: relative;
  z-index: 2;
}

/* Make text feel alive but premium */
.ff-live-title,
.hero h1,
.hero-section h1 {
  background: linear-gradient(120deg, #fff7fc 0%, #ffd6f1 30%, #f7a6dc 55%, #fff1fb 80%, #e8c8ff 100%) !important;
  background-size: 240% 240% !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
  animation: ffTextGlowMove 5.5s ease-in-out infinite;
  text-shadow: none !important;
  filter: drop-shadow(0 16px 32px rgba(40, 4, 38, .20));
}

@keyframes ffTextGlowMove {
  0% {
    background-position: 0% 50%;
    transform: translateY(0);
  }
  50% {
    background-position: 100% 50%;
    transform: translateY(-2px);
  }
  100% {
    background-position: 0% 50%;
    transform: translateY(0);
  }
}

.ff-live-subtext,
.hero p,
.hero-section p {
  color: rgba(255,245,252,.88) !important;
  text-shadow: 0 8px 24px rgba(47,5,44,.22);
}

/* Make buttons glossy */
.ff-store-aff-btn.primary,
.btn,
button {
  box-shadow: 0 16px 38px rgba(70, 8, 67, .20);
}

.ff-store-aff-btn.primary {
  background: linear-gradient(135deg, #77236e, #a42f95, #f28bd2) !important;
}

.ff-store-aff-btn.secondary {
  background: rgba(255,255,255,.90) !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

/* Mobile */
@media (max-width: 760px) {
  .ff-home-hero::after,
  .hero::after,
  .hero-section::after {
    width: 430px;
    height: 430px;
    right: -170px;
    top: 110px;
    opacity: .16;
  }

  .ff-home-hero,
  .hero,
  .hero-section {
    min-height: auto !important;
  }

  .ff-live-title,
  .hero h1,
  .hero-section h1 {
    font-size: clamp(46px, 14vw, 72px) !important;
    line-height: 1.05 !important;
  }
}
`;
}

fs.writeFileSync(cssFile, css);

console.log("Removed glass card and added butterfly hero background.");
