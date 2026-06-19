const fs = require("fs");
const path = require("path");

const root = __dirname;
const productsFile = path.join(root, "data", "products.json");
const imgDir = path.join(root, "public", "images", "products");

fs.mkdirSync(imgDir, { recursive: true });

const imageSources = [
  {
    from: path.join(process.env.HOME, "Downloads", "silver-cranberry-fat-burner.jpeg"),
    to: path.join(imgDir, "silver-cranberry-fat-burner.jpeg")
  },
  {
    from: path.join(process.env.HOME, "Downloads", "silver-fat-burner-tummy-control.jpeg"),
    to: path.join(imgDir, "silver-fat-burner-tummy-control.jpeg")
  }
];

for (const img of imageSources) {
  if (!fs.existsSync(img.from)) {
    throw new Error("Image missing: " + img.from);
  }

  fs.copyFileSync(img.from, img.to);
  console.log("Saved image:", img.to);
}

let products = JSON.parse(fs.readFileSync(productsFile, "utf8"));

function norm(v) {
  return String(v || "").toLowerCase().trim();
}

function upsert(product) {
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

/* Remove only T-shirt Full Stock / Half Stock versions */
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

/* One T-shirt only */
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

/* New Silver Package 1 */
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

/* New Silver Package 2 */
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

fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

console.log("Done.");
console.log("Added 2 Silver Package products.");
console.log("T-shirt fixed to one product at R280.");
console.log("Products count:", products.length);
