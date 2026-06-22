require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { read, write, ensureDbReady, dataDir } = require("../src/db");
const productService = require("../src/services/productService");
const settingsService = require("../src/services/settingsService");

const mode = process.argv.includes("--apply") ? "apply" : "preview";

function ensureArrayStore(name) {
  const storePath = path.join(dataDir, `${name}.json`);
  if (mode !== "apply" && !fs.existsSync(storePath)) return { name, created: false, count: 0, missing: true };
  const current = read(name, []);
  if (Array.isArray(current)) return { name, created: false, count: current.length };
  if (mode === "apply") write(name, []);
  return { name, created: mode === "apply", count: 0 };
}

function ensureObjectStore(name) {
  const storePath = path.join(dataDir, `${name}.json`);
  if (mode !== "apply" && !fs.existsSync(storePath)) return { name, created: false, missing: true };
  const current = read(name, {});
  if (current && typeof current === "object" && !Array.isArray(current)) return { name, created: false };
  if (mode === "apply") write(name, {});
  return { name, created: mode === "apply" };
}

function snapshot() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "..", "backups", `migration-${stamp}`);
  if (mode !== "apply") return null;
  fs.mkdirSync(backupDir, { recursive: true });
  for (const file of fs.readdirSync(dataDir)) {
    if (file.endsWith(".json")) fs.copyFileSync(path.join(dataDir, file), path.join(backupDir, file));
  }
  return backupDir;
}

async function main() {
  await ensureDbReady();

  const report = {
    mode,
    dataDir,
    backupDir: snapshot(),
    stores: [],
    settings: null,
    products: null
  };

  for (const name of [
    "affiliates",
    "commissionStatements",
    "deletedAffiliates",
    "deletedOrders",
    "discountCodes",
    "emailEventState",
    "fraudFlags",
    "notifications",
    "payoutHistory",
    "popSubmissions",
    "resources",
    "returns",
    "reviews"
  ]) {
    report.stores.push(ensureArrayStore(name));
  }

  report.stores.push(ensureObjectStore("settings"));

  const settingsBefore = settingsService.getSettings();
  if (mode === "apply") settingsService.saveSettings(settingsBefore);
  report.settings = { initialized: true, paymentMethod: settingsBefore.payment.activeMethod };

  report.products = mode === "apply"
    ? productService.applyProductMigration()
    : productService.productMigrationPreview();

  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
