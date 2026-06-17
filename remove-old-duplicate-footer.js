const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile() && full.endsWith(".html")) out.push(full);
  }

  return out;
}

const files = walk(publicDir).filter(file => !file.includes(path.join("public", "admin")));

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  const original = html;

  // Remove old simple footer blocks but keep our new ff-clean-footer
  html = html.replace(/<footer(?![^>]*ff-clean-footer)[\s\S]*?<\/footer>/gi, "");

  // Remove old visible centered FemiFresh copyright footer section
  html = html.replace(
    /<div[^>]*>\s*<strong>\s*FemiFresh\s*<\/strong>\s*<br>\s*Confidence in every wash\.\s*©\s*2026\s*<\/div>/gi,
    ""
  );

  html = html.replace(
    /<section[^>]*>\s*<[^>]*>\s*FemiFresh\s*<\/[^>]*>\s*<[^>]*>\s*Confidence in every wash\.\s*©\s*2026\s*<\/[^>]*>\s*<\/section>/gi,
    ""
  );

  // Remove loose old copyright text if it exists
  html = html.replace(/FemiFresh\s*[\s\S]{0,80}?Confidence in every wash\.\s*©\s*2026/gi, "");

  if (html !== original) {
    fs.writeFileSync(file, html);
    console.log("Removed old footer from:", path.relative(publicDir, file));
  }
}

/* Add CSS to hide any old footer still injected by older scripts */
const cssFile = path.join(publicDir, "css", "femi-store-stable.css");
let css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : "";

if (!css.includes("HIDE_OLD_FOOTER_DUPLICATES_V1")) {
  css += `

/* HIDE_OLD_FOOTER_DUPLICATES_V1 */
body > footer:not(.ff-clean-footer) {
  display: none !important;
}

body > section:last-of-type:has(+ .ff-clean-footer) {
  display: none !important;
}
`;
}

fs.writeFileSync(cssFile, css);

console.log("Old duplicate footer removed.");
