const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "data", "products.json"),
  path.join(__dirname, "public", "data", "products.json")
];

const baseNamesToRemove = [
  "femifresh anti-chafe balm",
  "femifresh cranberries urinary tract tea",
  "femifresh distributor t-shirt",
  "femifresh starter business pack"
];

function normalize(v) {
  return String(v || "").toLowerCase().trim();
}

function isBaseDuplicate(p) {
  const name = normalize(p.name || p.title);
  const category = normalize(p.category);

  return (
    baseNamesToRemove.includes(name) &&
    !name.includes("full stock") &&
    !name.includes("half stock") &&
    category !== "full stock" &&
    category !== "half stock"
  );
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let products = JSON.parse(fs.readFileSync(file, "utf8"));
  const before = products.length;

  const removed = products.filter(isBaseDuplicate);
  products = products.filter(p => !isBaseDuplicate(p));

  fs.writeFileSync(file, JSON.stringify(products, null, 2));

  console.log("Updated:", file);
  console.log("Before:", before, "After:", products.length);
  console.log("Removed:");
  removed.forEach(p => console.log("-", p.name || p.title));
}

/* Clean live data on server start too */
const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("CLEAN_BASE_PRODUCT_DUPLICATES_V1")) {
  const cleanup = `

// CLEAN_BASE_PRODUCT_DUPLICATES_V1
async function cleanBaseProductDuplicatesOnce() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") return;

    const baseNamesToRemove = [
      "femifresh anti-chafe balm",
      "femifresh cranberries urinary tract tea",
      "femifresh distributor t-shirt",
      "femifresh starter business pack"
    ];

    function normalize(v) {
      return String(v || "").toLowerCase().trim();
    }

    function isBaseDuplicate(p) {
      const name = normalize(p.name || p.title);
      const category = normalize(p.category);

      return (
        baseNamesToRemove.includes(name) &&
        !name.includes("full stock") &&
        !name.includes("half stock") &&
        category !== "full stock" &&
        category !== "half stock"
      );
    }

    let products = read("products", []);
    if (!Array.isArray(products)) return;

    const before = products.length;
    products = products.filter(p => !isBaseDuplicate(p));

    if (products.length !== before) {
      write("products", products);
      console.log("Cleaned base product duplicates. Before:", before, "After:", products.length);
    }
  } catch (e) {
    console.error("Could not clean base product duplicates:", e.message);
  }
}

setTimeout(cleanBaseProductDuplicatesOnce, 3500);
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + cleanup + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

console.log("Base product duplicates removed. Full/Half stock products kept.");
