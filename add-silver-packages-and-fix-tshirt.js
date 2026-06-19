const fs = require("fs");
const path = require("path");

const productsFile = path.join(__dirname, "data", "products.json");

if (!fs.existsSync(productsFile)) {
  throw new Error("data/products.json not found");
}

let products = JSON.parse(fs.readFileSync(productsFile, "utf8"));

function norm(v) {
  return String(v || "").toLowerCase().trim();
}

function upsertProduct(product) {
  const index = products.findIndex(p => p.id === product.id);

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

/*
  Remove only the duplicated T-shirt stock versions.
  We keep/create one normal T-shirt product at R280.
*/
products = products.filter(p => {
  const name = norm(p.name || p.title);
  const category = norm(p.category);
  const image = norm(p.image || p.imageUrl);

  const isTshirt = name.includes("t-shirt") || name.includes("tshirt") || image.includes("tshirt");

  if (!isTshirt) return true;

  const isFullOrHalf =
    name.includes("full stock") ||
    name.includes("half stock") ||
    category === "full stock" ||
    category === "half stock";

  return !isFullOrHalf;
});

/* One T-shirt product only */
upsertProduct({
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

/* Add Silver Package 1 */
upsertProduct({
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

/* Add Silver Package 2 */
upsertProduct({
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

fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

console.log("Done.");
console.log("Products count:", products.length);
console.log("Added 2 Silver Packages.");
console.log("T-shirt fixed to one product at R280.");
