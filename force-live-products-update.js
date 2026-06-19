const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("FORCE_LIVE_PRODUCTS_SILVER_TSHIRT_V1")) {
  const block = `

// FORCE_LIVE_PRODUCTS_SILVER_TSHIRT_V1
async function forceLiveProductsSilverAndTshirtOnce() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") {
      console.log("Product sync skipped: read/write not ready.");
      return;
    }

    let products = read("products", []);
    if (!Array.isArray(products)) products = [];

    function norm(v) {
      return String(v || "").toLowerCase().trim();
    }

    function upsert(product) {
      const index = products.findIndex(p => String(p.id) === String(product.id));

      if (index >= 0) {
        products[index] = {
          ...products[index],
          ...product,
          updatedAt: new Date().toISOString()
        };
      } else {
        products.push({
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Remove only duplicated T-shirt Full Stock / Half Stock products.
    // Keep one T-shirt product only at R280.
    products = products.filter(p => {
      const name = norm(p.name || p.title);
      const category = norm(p.category);
      const image = norm(p.image || p.imageUrl);

      const isTshirt =
        name.includes("t-shirt") ||
        name.includes("tshirt") ||
        image.includes("tshirt");

      if (!isTshirt) return true;

      const isStockVersion =
        name.includes("full stock") ||
        name.includes("half stock") ||
        category === "full stock" ||
        category === "half stock";

      return !isStockVersion;
    });

    upsert({
      id: "femifresh-distributor-t-shirt",
      name: "FemiFresh Distributor T-Shirt",
      category: "Merchandise",
      price: 280,
      stock: 100,
      status: "active",
      inStock: true,
      available: true,
      image: "/images/products/distributor-tshirt.jpeg",
      description: "FemiFresh branded distributor T-shirt. One T-shirt."
    });

    upsert({
      id: "femifresh-silver-package-cranberry-fat-burner",
      name: "FemiFresh Silver Package - Cranberry Tea + Fat Burner Capsules",
      category: "Silver Package",
      price: 1350,
      stock: 100,
      status: "active",
      inStock: true,
      available: true,
      image: "/images/products/silver-cranberry-fat-burner.jpeg",
      description: "Silver Package: 5 Cranberry Teas + 5 Fat Burner Capsules. Stock of 10."
    });

    upsert({
      id: "femifresh-silver-package-fat-burner-tummy-control",
      name: "FemiFresh Silver Package - Fat Burner + Tummy Control Capsules",
      category: "Silver Package",
      price: 1350,
      stock: 100,
      status: "active",
      inStock: true,
      available: true,
      image: "/images/products/silver-fat-burner-tummy-control.jpeg",
      description: "Silver Package: 5 Fat Burner Capsules + 5 Tummy Control Capsules. Stock of 10."
    });

    write("products", products);

    console.log("LIVE PRODUCTS UPDATED:");
    console.log("- Added Silver Package Cranberry Tea + Fat Burner");
    console.log("- Added Silver Package Fat Burner + Tummy Control");
    console.log("- T-shirt fixed to one product at R280");
    console.log("Products count:", products.length);
  } catch (e) {
    console.error("Could not force live products update:", e.message);
  }
}

setTimeout(forceLiveProductsSilverAndTshirtOnce, 2500);
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

console.log("Live product sync added to server.js");
