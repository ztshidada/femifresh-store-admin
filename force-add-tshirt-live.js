const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("FORCE_LIVE_TSHIRT_R280_V1")) {
  const block = `

// FORCE_LIVE_TSHIRT_R280_V1
async function forceLiveTshirtR280Once() {
  try {
    if (global.ensureFemiDbReady) await global.ensureFemiDbReady();

    if (typeof read !== "function" || typeof write !== "function") {
      console.log("T-shirt sync skipped: read/write not ready.");
      return;
    }

    let products = read("products", []);
    if (!Array.isArray(products)) products = [];

    function norm(v) {
      return String(v || "").toLowerCase().trim();
    }

    // Remove T-shirt Full Stock / Half Stock duplicates
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

    const tshirt = {
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
    };

    const index = products.findIndex(p =>
      String(p.id || "") === tshirt.id ||
      String(p.name || p.title || "").toLowerCase().includes("distributor t-shirt") ||
      String(p.name || p.title || "").toLowerCase().includes("distributor tshirt")
    );

    if (index >= 0) {
      products[index] = {
        ...products[index],
        ...tshirt,
        updatedAt: new Date().toISOString()
      };
    } else {
      products.push({
        ...tshirt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    write("products", products);

    console.log("LIVE T-SHIRT UPDATED:");
    console.log("- One T-shirt product only");
    console.log("- Price: R280");
    console.log("- Full/Half stock T-shirt removed");
  } catch (e) {
    console.error("Could not force live T-shirt update:", e.message);
  }
}

setTimeout(forceLiveTshirtR280Once, 2200);
`;

  const idx = server.lastIndexOf("app.listen(");
  if (idx === -1) throw new Error("Could not find app.listen in server.js");

  server = server.slice(0, idx) + block + "\n" + server.slice(idx);
  fs.writeFileSync(serverFile, server);
}

console.log("Live T-shirt R280 sync added.");
