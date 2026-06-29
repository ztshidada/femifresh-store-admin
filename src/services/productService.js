const { v4: uuid } = require("uuid");
const { read, write } = require("../db");

function now() {
  return new Date().toISOString();
}

function normalizeProduct(product) {
  const stock = Number(product.stock ?? product.quantity ?? 0);
  const active = product.active !== false && product.status !== "archived";
  const outOfStock = product.outOfStock === true || product.status === "out_of_stock" || stock <= 0;
  return {
    lowStockThreshold: 3,
    type: "product",
    bundleItems: [],
    specialPrice: null,
    commissionRules: {},
    ...product,
    stock,
    active,
    outOfStock,
    inStock: !outOfStock,
    available: active && !outOfStock
  };
}

function comparable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(femifresh|full|half|stock|package|pack|product)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function allProducts({ includeInactive = false } = {}) {
  const products = read("products", []).map(normalizeProduct);
  return includeInactive ? products : products.filter(p => p.active !== false);
}

function publicProducts() {
  return allProducts().filter(p => p.active !== false);
}

function findProduct(id) {
  return allProducts({ includeInactive: true }).find(p => String(p.id) === String(id) || String(p.slug || "") === String(id)) || null;
}

function resolveProductSnapshot(item = {}) {
  const products = allProducts({ includeInactive: true });
  const rawKeys = [
    item.productId,
    item.id,
    item.sku,
    item.slug,
    item.productSlug
  ].filter(Boolean).map(v => String(v).toLowerCase());

  let product = products.find(p => {
    const productKeys = [p.id, p.sku, p.slug].filter(Boolean).map(v => String(v).toLowerCase());
    return rawKeys.some(key => productKeys.includes(key));
  });

  if (!product) {
    const itemName = comparable(item.name || item.title || item.productName);
    product = products.find(p => {
      const productName = comparable(p.name || p.title);
      return itemName && productName && (productName === itemName || productName.includes(itemName) || itemName.includes(productName));
    });
  }

  return product || null;
}

function orderItemSnapshot(item = {}) {
  const product = resolveProductSnapshot(item) || {};
  const quantity = Math.max(1, Number(item.qty || item.quantity || 1));
  const unitPrice = Number(item.unitPrice ?? item.price ?? product.price ?? 0);
  const lineTotal = Number(item.lineTotal ?? item.subtotal ?? (unitPrice * quantity));
  const image = item.image || item.imageUrl || product.image || "/images/femifresh-logo.jpg";
  const commissionRules = item.commissionRules || product.commissionRules || {};
  const directReferralCommission = Number(item.directReferralCommission ?? commissionRules.directReferralCommission ?? 0);
  return {
    ...item,
    productId: item.productId || product.id || item.id || "",
    sku: item.sku || product.sku || "",
    slug: item.slug || product.slug || "",
    name: item.name || product.name || "FemiFresh product",
    qty: quantity,
    quantity,
    price: unitPrice,
    unitPrice,
    subtotal: lineTotal,
    lineTotal,
    image,
    imageUrl: image,
    commissionRules,
    directReferralCommission,
    directReferralCommissionTotal: Number(item.directReferralCommissionTotal ?? (directReferralCommission * quantity))
  };
}

function validateCartItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error("Cart is empty.");
  const products = allProducts();
  return items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product || product.active === false) throw new Error("Product not found.");
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    if (product.outOfStock || Number(product.stock || 0) <= 0) {
      throw new Error(`${product.name} is out of stock.`);
    }
    if (qty > Number(product.stock || 0)) {
      throw new Error(`Only ${product.stock} of ${product.name} is available.`);
    }
    return orderItemSnapshot({
      productId: product.id,
      sku: product.sku || "",
      slug: product.slug || "",
      name: product.name,
      unitPrice: Number(product.price || 0),
      quantity: qty,
      lineTotal: Number(product.price || 0) * qty,
      image: product.image || "",
      commissionRules: product.commissionRules || {},
      directReferralCommission: Number(product.commissionRules?.directReferralCommission || 0)
    });
  });
}

function adjustStock(items, direction = -1) {
  const rows = read("products", []);
  for (const item of items || []) {
    const index = rows.findIndex(p => String(p.id) === String(item.productId));
    if (index < 0) continue;
    const current = Number(rows[index].stock ?? rows[index].quantity ?? 0);
    rows[index].stock = Math.max(0, current + (Number(item.qty || 1) * direction));
    rows[index].quantity = rows[index].stock;
    rows[index].outOfStock = rows[index].stock <= 0;
    rows[index].inStock = rows[index].stock > 0;
    rows[index].available = rows[index].active !== false && rows[index].stock > 0;
    rows[index].updatedAt = now();
  }
  write("products", rows);
  return rows.map(normalizeProduct);
}

function lowStockProducts() {
  return allProducts({ includeInactive: true }).filter(p =>
    p.active !== false &&
    Number(p.stock || 0) <= Number(p.lowStockThreshold ?? 3)
  );
}

function saveProduct(input, id = "") {
  const rows = read("products", []);
  const clean = normalizeProduct({
    ...input,
    price: Number(input.price || 0),
    stock: Number(input.stock || 0),
    lowStockThreshold: Number(input.lowStockThreshold ?? 3),
    updatedAt: now()
  });

  if (id) {
    const index = rows.findIndex(p => String(p.id) === String(id));
    if (index < 0) return null;
    rows[index] = normalizeProduct({ ...rows[index], ...clean, id: rows[index].id });
    write("products", rows);
    return rows[index];
  }

  const row = normalizeProduct({
    id: input.id || uuid(),
    active: true,
    createdAt: now(),
    ...clean
  });
  rows.unshift(row);
  write("products", rows);
  return row;
}

function archiveProduct(id) {
  const rows = read("products", []);
  const row = rows.find(p => String(p.id) === String(id));
  if (!row) return null;
  row.active = false;
  row.status = "archived";
  row.updatedAt = now();
  write("products", rows);
  return row;
}

function productMigrationPreview() {
  const products = read("products", []);
  const changes = [];

  const tshirts = products.filter(p => {
    const text = `${p.id || ""} ${p.name || ""} ${p.title || ""} ${p.category || ""}`.toLowerCase();
    return text.includes("t-shirt") || text.includes("tshirt");
  });

  for (const p of tshirts) {
    const text = `${p.name || ""} ${p.category || ""}`.toLowerCase();
    if (text.includes("full stock") || text.includes("half stock")) {
      changes.push({ action: "archive_duplicate_tshirt", id: p.id, name: p.name });
    }
  }

  const required = [
    {
      id: "femifresh-distributor-t-shirt",
      name: "FemiFresh Distributor T-Shirt",
      category: "Merchandise",
      type: "product",
      price: 280,
      stock: 100,
      quantity: 100,
      image: "/images/products/distributor-tshirt.jpeg",
      description: "FemiFresh branded distributor T-shirt.",
      commissionRules: {}
    },
    {
      id: "femifresh-silver-package-cranberry-fat-burner",
      name: "Silver Package: Cranberry Tea + Fat Burner Capsules",
      category: "Silver Package",
      type: "bundle",
      price: 1350,
      stock: 10,
      quantity: 10,
      lowStockThreshold: 3,
      image: "/images/products/silver-cranberry-fat-burner.jpeg",
      description: "Silver Package: 5 Cranberry Teas + 5 Fat Burner Capsules.",
      commissionRules: { directReferralCommission: 400 }
    },
    {
      id: "femifresh-silver-package-fat-burner-tummy-control",
      name: "Silver Package: Fat Burner Capsules + Tummy Control Capsules",
      category: "Silver Package",
      type: "bundle",
      price: 1350,
      stock: 10,
      quantity: 10,
      lowStockThreshold: 3,
      image: "/images/products/silver-fat-burner-tummy-control.jpeg",
      description: "Silver Package: 5 Fat Burner Capsules + 5 Tummy Control Capsules.",
      commissionRules: {}
    }
  ];

  for (const product of required) {
    const current = products.find(p => String(p.id) === product.id);
    if (!current) changes.push({ action: "create_product", id: product.id, name: product.name });
    else {
      const normalized = normalizeProduct(current);
      const delta = {};
      for (const key of ["name", "category", "type", "price", "stock", "image", "description"]) {
        if (JSON.stringify(normalized[key]) !== JSON.stringify(product[key])) delta[key] = { from: normalized[key], to: product[key] };
      }
      if (JSON.stringify(normalized.commissionRules || {}) !== JSON.stringify(product.commissionRules || {})) {
        delta.commissionRules = { from: normalized.commissionRules || {}, to: product.commissionRules || {} };
      }
      if (Object.keys(delta).length) changes.push({ action: "update_product", id: product.id, name: product.name, delta });
    }
  }

  return { changes, required };
}

function applyProductMigration() {
  const preview = productMigrationPreview();
  let rows = read("products", []);

  rows = rows.map(p => {
    const text = `${p.id || ""} ${p.name || ""} ${p.title || ""} ${p.category || ""}`.toLowerCase();
    const isTshirt = text.includes("t-shirt") || text.includes("tshirt");
    const isDuplicateStockVersion = isTshirt && (text.includes("full stock") || text.includes("half stock"));
    if (!isDuplicateStockVersion) return p;
    return { ...p, active: false, status: "archived", updatedAt: now(), archivedReason: "Duplicate T-shirt stock version removed by rebuild migration." };
  });

  for (const product of preview.required) {
    const index = rows.findIndex(p => String(p.id) === product.id);
    const row = normalizeProduct({
      active: true,
      status: "active",
      ...product,
      updatedAt: now()
    });
    if (index >= 0) rows[index] = { ...rows[index], ...row };
    else rows.push({ ...row, createdAt: now() });
  }

  write("products", rows);
  return { ...preview, products: rows.map(normalizeProduct) };
}

module.exports = {
  normalizeProduct,
  allProducts,
  publicProducts,
  findProduct,
  resolveProductSnapshot,
  orderItemSnapshot,
  validateCartItems,
  adjustStock,
  lowStockProducts,
  saveProduct,
  archiveProduct,
  productMigrationPreview,
  applyProductMigration
};
