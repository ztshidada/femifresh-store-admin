const { read, write } = require("../db");
const affiliateService = require("./affiliateService");

function now() {
  return new Date().toISOString();
}

function normalise(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productText(product = {}) {
  return normalise([
    product.id,
    product.name,
    product.title,
    product.category,
    product.description,
    product.slug
  ].filter(Boolean).join(" "));
}

function isTshirt(product = {}) {
  const text = productText(product);
  return text.includes("t shirt") || text.includes("tshirt");
}

function isHalfVersion(product = {}) {
  const text = productText(product);

  return [
    "half stock",
    "half package",
    "half pack",
    "half product",
    "half version",
    "5 pack",
    "5pack",
    "5 products",
    "stock of 5"
  ].some(flag => text.includes(flag));
}

function isCranberryFatBurnerSilverPackage(product = {}) {
  const text = productText(product);

  return (
    text.includes("cranberry") &&
    text.includes("fat burner") &&
    (
      text.includes("silver") ||
      text.includes("package") ||
      text.includes("bundle")
    )
  );
}

function commissionForProduct(product = {}) {
  if (isTshirt(product)) return 0;

  const half = isHalfVersion(product);

  if (isCranberryFatBurnerSilverPackage(product)) {
    return half ? 200 : 400;
  }

  return half ? 150 : 300;
}

function findCurrentProduct(item, products) {
  const productId = String(item.productId || item.id || "").trim();

  if (productId) {
    const found = products.find(p => String(p.id || "") === productId);
    if (found) return found;
  }

  const itemName = normalise(item.name || item.title || "");

  if (!itemName) return null;

  return products.find(p => {
    const productName = normalise(p.name || p.title || "");
    return productName && productName === itemName;
  }) || null;
}

function lineCommission(item = {}) {
  const total = Number(item.directReferralCommissionTotal);

  if (Number.isFinite(total) && total >= 0) {
    return total;
  }

  const unit = Number(item.directReferralCommission || 0);
  const qty = Math.max(1, Number(item.qty || item.quantity || 1));

  return unit * qty;
}

function paidOrderMonths(orders) {
  const months = new Set();

  for (const order of orders) {
    if (String(order.paymentStatus || "").toLowerCase() !== "paid") continue;

    const date = new Date(order.paidAt || order.createdAt || Date.now());

    if (!Number.isNaN(date.getTime())) {
      months.add(date.toISOString().slice(0, 7));
    }
  }

  months.add(affiliateService.monthKey());

  for (const statement of read("commissionStatements", [])) {
    if (statement.month) months.add(String(statement.month));
  }

  return [...months].sort();
}

function previewCommissionRebuild() {
  const products = read("products", []);
  const orders = read("orders", []);

  const productChanges = products.map(product => {
    const next = commissionForProduct(product);
    const current = Number(product.commissionRules?.directReferralCommission || 0);

    return {
      id: product.id,
      name: product.name || product.title || "Unnamed product",
      version: isTshirt(product)
        ? "T-shirt"
        : isHalfVersion(product)
          ? "Half version"
          : "Full version",
      currentCommission: current,
      nextCommission: next,
      changed: current !== next
    };
  });

  const paidOrders = orders.filter(order =>
    String(order.paymentStatus || "").toLowerCase() === "paid"
  );

  const paidLineItems = paidOrders.reduce(
    (sum, order) => sum + (Array.isArray(order.items) ? order.items.length : 0),
    0
  );

  return {
    rules: {
      normalFull: 300,
      normalHalf: 150,
      cranberryFatBurnerFull: 400,
      cranberryFatBurnerHalf: 200,
      tshirt: 0
    },
    products: productChanges,
    paidOrdersToRecalculate: paidOrders.length,
    paidOrderItemsToRecalculate: paidLineItems,
    monthsToRebuild: paidOrderMonths(orders)
  };
}

function applyCommissionRebuild(actor = {}) {
  const products = read("products", []);
  const orders = read("orders", []);
  const affiliates = read("affiliates", []);
  const preview = previewCommissionRebuild();
  const rebuiltAt = now();

  let productsChanged = 0;
  let orderItemsChanged = 0;
  let paidOrdersRecalculated = 0;

  for (const product of products) {
    const directReferralCommission = commissionForProduct(product);
    const current = Number(product.commissionRules?.directReferralCommission || 0);

    if (current !== directReferralCommission) {
      product.commissionRules = {
        ...(product.commissionRules || {}),
        directReferralCommission
      };
      product.updatedAt = rebuiltAt;
      productsChanged += 1;
    }
  }

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    let changedThisOrder = false;

    for (const item of items) {
      const product = findCurrentProduct(item, products);
      const commissionSource = product || item;
      const unitCommission = commissionForProduct(commissionSource);
      const qty = Math.max(1, Number(item.qty || item.quantity || 1));
      const totalCommission = unitCommission * qty;

      if (
        Number(item.directReferralCommission || 0) !== unitCommission ||
        Number(item.directReferralCommissionTotal || 0) !== totalCommission
      ) {
        item.directReferralCommission = unitCommission;
        item.directReferralCommissionTotal = totalCommission;
        item.commissionRules = {
          ...(item.commissionRules || {}),
          directReferralCommission: unitCommission
        };
        changedThisOrder = true;
        orderItemsChanged += 1;
      }
    }

    if (changedThisOrder) {
      order.commissionRecalculatedAt = rebuiltAt;
      order.updatedAt = rebuiltAt;
    }

    if (String(order.paymentStatus || "").toLowerCase() === "paid") {
      paidOrdersRecalculated += 1;
    }
  }

  write("products", products);
  write("orders", orders);

  const months = preview.monthsToRebuild;
  let statementsRebuilt = 0;

  for (const affiliate of affiliates) {
    for (const month of months) {
      const statement = affiliateService.generateCommissionStatement(affiliate.id, month);

      if (statement) {
        statement.recalculatedAt = rebuiltAt;
        statement.recalculatedBy = actor.email || actor.name || "super_admin";
        statementsRebuilt += 1;
      }
    }
  }

  const logs = read("commissionRebuildLogs", []);

  logs.unshift({
    id: `commission-rebuild-${Date.now()}`,
    actor: actor.email || actor.name || "super_admin",
    createdAt: rebuiltAt,
    rules: preview.rules,
    productsChanged,
    orderItemsChanged,
    paidOrdersRecalculated,
    statementsRebuilt,
    monthsRebuilt: months
  });

  write("commissionRebuildLogs", logs);

  return {
    success: true,
    message: "Product commission rules and existing paid-order commissions were rebuilt.",
    productsChanged,
    orderItemsChanged,
    paidOrdersRecalculated,
    statementsRebuilt,
    monthsRebuilt: months,
    rules: preview.rules
  };
}

module.exports = {
  commissionForProduct,
  previewCommissionRebuild,
  applyCommissionRebuild,
  lineCommission
};
