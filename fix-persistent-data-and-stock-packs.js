const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.join(__dirname, "server.js")) || !fs.existsSync(path.join(__dirname, ".git"))) {
  console.error("Wrong folder. Please cd into femifresh-store-admin-v1 first.");
  process.exit(1);
}

/* =========================
   1) Make data persistent on Render
========================= */

const dbFile = path.join(__dirname, "src", "db.js");

if (fs.existsSync(dbFile)) {
  let db = fs.readFileSync(dbFile, "utf8");

  if (!db.includes("PERSISTENT_DATA_DIR_V1")) {
    db = db.replace(
      /const\s+DATA_DIR\s*=\s*[^;]+;/,
      `// PERSISTENT_DATA_DIR_V1
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");`
    );

    fs.writeFileSync(dbFile, db);
    console.log("✅ Persistent DATA_DIR support added to src/db.js");
  } else {
    console.log("✅ Persistent DATA_DIR already exists");
  }
}

/* =========================
   2) Add Full Stock and Half Stock packs
========================= */

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanBaseName(name) {
  return String(name || "FemiFresh Product")
    .replace(/\s*-\s*full stock.*$/i, "")
    .replace(/\s*-\s*half stock.*$/i, "")
    .replace(/\s*\(10 products\).*$/i, "")
    .replace(/\s*\(5 products\).*$/i, "")
    .trim();
}

const possibleProductFiles = [
  path.join(__dirname, "data", "products.json"),
  path.join(__dirname, "src", "data", "products.json"),
  path.join(__dirname, "products.json")
];

let updatedAny = false;

for (const file of possibleProductFiles) {
  if (!fs.existsSync(file)) continue;

  const products = readJson(file);
  if (!Array.isArray(products)) continue;

  const baseProducts = products.filter(p => {
    const name = String(p.name || p.title || "").toLowerCase();
    const id = String(p.id || "").toLowerCase();

    return !name.includes("full stock") &&
      !name.includes("half stock") &&
      !id.includes("full-stock") &&
      !id.includes("half-stock");
  });

  const finalProducts = [...baseProducts];

  for (const p of baseProducts) {
    const baseName = cleanBaseName(p.name || p.title || "FemiFresh Product");
    const baseId = slug(baseName);

    finalProducts.push({
      ...p,
      id: baseId + "-full-stock",
      name: baseName + " - Full Stock",
      title: baseName + " - Full Stock",
      category: "Full Stock",
      packType: "full_stock",
      packQuantity: 10,
      quantity: 10,
      units: 10,
      price: 1350,
      stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 100,
      description: "Full stock package: 10 FemiFresh products. Qualifies as a full stock package."
    });

    finalProducts.push({
      ...p,
      id: baseId + "-half-stock",
      name: baseName + " - Half Stock",
      title: baseName + " - Half Stock",
      category: "Half Stock",
      packType: "half_stock",
      packQuantity: 5,
      quantity: 5,
      units: 5,
      price: 675,
      stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 100,
      description: "Half stock package: 5 FemiFresh products. Half of the full stock package."
    });
  }

  writeJson(file, finalProducts);
  updatedAny = true;
  console.log("✅ Updated products:", file);
}

if (!updatedAny) {
  console.log("⚠️ No products.json found. Product packs were not added.");
}

console.log("✅ Patch completed.");
