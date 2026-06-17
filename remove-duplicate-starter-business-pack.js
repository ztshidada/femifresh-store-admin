const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "data", "products.json"),
  path.join(__dirname, "public", "data", "products.json")
];

function isBaseDuplicate(p) {
  const name = String(p.name || p.title || "").toLowerCase().trim();
  const id = String(p.id || "").toLowerCase().trim();

  return (
    name === "femifresh starter business pack" ||
    id === "c0b2094f-e853-43b6-be7c-6bc9830f0ed8"
  );
}

function isStarterStockPack(p) {
  const text = [
    p.name,
    p.title,
    p.category,
    p.description,
    p.id,
    p.image,
    p.imageUrl
  ].filter(Boolean).join(" ").toLowerCase();

  return (
    text.includes("starter business pack") ||
    text.includes("starter-business-pack")
  );
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let products = JSON.parse(fs.readFileSync(file, "utf8"));

  const before = products.length;

  // Remove the duplicate base product only
  products = products.filter(p => !isBaseDuplicate(p));

  // Keep Full Stock + Half Stock but keep them out of stock for now
  products = products.map(p => {
    if (!isStarterStockPack(p)) return p;

    return {
      ...p,
      stock: 0,
      quantity: 0,
      inStock: false,
      available: false,
      status: "out_of_stock",
      badge: "Out of Stock"
    };
  });

  fs.writeFileSync(file, JSON.stringify(products, null, 2));

  console.log("Updated:", file);
  console.log("Before:", before, "After:", products.length);
}

/*
 Live/Supabase cleanup on server start.
 This removes the duplicate base product from the live database too.
*/
const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("CLEAN_DUPLICATE_STARTER_BUSINESS_PACK_V1")) {
  const cleanup = `

// CLEAN_DUPLICATE_STARTER_BUSINESS_PACK_V1
async function cleanDuplicateStarterBusinessPackOnce() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") return;

    let products = read("products", []);
    if (!Array.isArray(products)) return;

    const before = products.length;

    products = products.filter(p => {
      const name = String(p.name || p.title || "").toLowerCase().trim();
      const id = String(p.id || "").toLowerCase().trim();

      return !(
        name === "femifresh starter business pack" ||
        id === "c0b2094f-e853-43b6-be7c-6bc9830f0ed8"
      );
    });

    products = products.map(p => {
      const text = [
        p.name,
        p.title,
        p.category,
        p.description,
        p.id,
        p.image,
        p.imageUrl
      ].filter(Boolean).join(" ").toLowerCase();

      if (
        text.includes("starter business pack") ||
        text.includes("starter-business-pack")
      ) {
        return {
          ...p,
          stock: 0,
          quantity: 0,
          inStock: false,
          available: false,
          status: "out_of_stock",
          badge: "Out of Stock"
        };
      }

      return p;
    });

    if (products.length !== before || products.some(p => String(p.status || "").includes("out_of_stock"))) {
      write("products", products);
      console.log("Cleaned duplicate starter business pack. Before:", before, "After:", products.length);
    }
  } catch (e) {
    console.error("Could not clean duplicate starter business pack:", e.message);
  }
}

setTimeout(cleanDuplicateStarterBusinessPackOnce, 3000);
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + cleanup + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

console.log("Duplicate base starter business pack removed. Full/Half stock kept but out of stock.");
