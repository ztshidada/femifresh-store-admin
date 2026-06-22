from pathlib import Path
import re
import shutil
import time
import sys

root = Path.cwd()

affiliate_file = root / "src/services/affiliateService.js"
settings_file = root / "src/services/settingsService.js"
admin_file = root / "public/js/admin-platform.js"

for file in [affiliate_file, settings_file, admin_file]:
    if not file.exists():
        raise SystemExit(f"Missing file: {file}")

backup_dir = root / ".femifresh-backups" / f"product-specific-commission-{int(time.time())}"
backup_dir.mkdir(parents=True, exist_ok=True)

for file in [affiliate_file, settings_file, admin_file]:
    shutil.copy2(file, backup_dir / file.name)

def save(file, content):
    file.write_text(content)
    print("Updated:", file.relative_to(root))

# ---------------------------------------------------------
# 1. COMMISSION CALCULATION:
# Remove the wrong global active-direct referral bonus.
# Use only paid orders and each product's own commission.
# ---------------------------------------------------------
affiliate = affiliate_file.read_text()

old_block_pattern = r'''  const commission = getSettings\(\)\.commission \|\| \{\};\n  const referralBonusPerActiveDirect = Number\(commission\.referralBonusPerActiveDirect \?\? 300\);\n  const targetActiveDirects = Math\.max\(1, Number\(commission\.targetActiveDirects \?\? 10\)\);\n  const targetBonusAmount = Number\(commission\.targetBonusAmount \?\? 1000\);\n  const referralBonusCounted = activeDirects\.length \* referralBonusPerActiveDirect;\n  const targetBonusCounted = activeDirects\.length >= targetActiveDirects \? targetBonusAmount : 0;'''

new_block = '''  const commission = getSettings().commission || {};
  const targetActiveDirects = Math.max(1, Number(commission.targetActiveDirects ?? 10));
  const targetBonusAmount = Number(commission.targetBonusAmount ?? 1000);
  const targetBonusCounted = activeDirects.length >= targetActiveDirects ? targetBonusAmount : 0;'''

affiliate, count = re.subn(old_block_pattern, new_block, affiliate)

if count != 1:
    raise SystemExit(
        "STOPPED: Could not find the current global referral-bonus calculation. "
        "No files were changed."
    )

old_total = '''  const totalCounted = referralBonusCounted + targetBonusCounted + productCommissions;'''

new_total = '''  // Referral commission comes only from paid orders and the commission
  // configured on each purchased product.
  const referralBonusCounted = productCommissions;
  const totalCounted = referralBonusCounted + targetBonusCounted;'''

if old_total not in affiliate:
    raise SystemExit(
        "STOPPED: Could not find the total commission calculation. "
        "No files were changed."
    )

affiliate = affiliate.replace(old_total, new_total, 1)

affiliate = affiliate.replace(
    '''    referralBonusPerActiveDirect,
    targetActiveDirects,''',
    '''    targetActiveDirects,''',
    1
)

affiliate_file.write_text(affiliate)
print("Updated:", affiliate_file.relative_to(root))

# ---------------------------------------------------------
# 2. SETTINGS:
# Remove the unused global referral bonus setting.
# Keep target-bonus settings global.
# ---------------------------------------------------------
settings = settings_file.read_text()

settings = settings.replace(
    '''    referralBonusPerActiveDirect: 300,
''',
    "",
    1
)

settings_file.write_text(settings)
print("Updated:", settings_file.relative_to(root))

# ---------------------------------------------------------
# 3. ADMIN SCREEN:
# Remove general referral bonus setting.
# Keep per-product commission editing and target-bonus settings.
# ---------------------------------------------------------
admin = admin_file.read_text()

admin = re.sub(
    r'''\s*<label class="ff-field">\s*Referral Bonus Per Active Direct \(R\)\s*<input class="ff-input" name="referralBonusPerActiveDirect" type="number" min="0" value="\$\{esc\(s\.commission\?\.referralBonusPerActiveDirect \?\? 300\)\}">\s*</label>''',
    "",
    admin,
    count=1,
    flags=re.S
)

admin = admin.replace(
    "Commission & Target Bonus Settings",
    "Target Bonus Settings"
)

# Ensure product table visibly shows the product-specific commission.
old_product_table = '''table(["Name","Price","Stock","Status","Action"], data.products.map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${badge(p.available ? "Active" : "Out of stock")}</td><td><button class="ff-btn secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`))'''

new_product_table = '''table(["Name","Price","Direct Commission","Stock","Status","Action"], data.products.map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${money(p.commissionRules?.directReferralCommission || 0)}</td><td>${p.stock}</td><td>${badge(p.available ? "Active" : "Out of stock")}</td><td><button class="ff-btn secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`))'''

if old_product_table in admin:
    admin = admin.replace(old_product_table, new_product_table, 1)

# Keep only target settings when saving settings.
admin = admin.replace(
    '''        referralBonusPerActiveDirect: Number(form.get("referralBonusPerActiveDirect") || 0),
        targetActiveDirects: Number(form.get("targetActiveDirects") || 10),''',
    '''        targetActiveDirects: Number(form.get("targetActiveDirects") || 10),''',
    1
)

admin_file.write_text(admin)
print("Updated:", admin_file.relative_to(root))

print("")
print("DONE: Commission is now product-specific.")
print("Each product controls its own Direct Referral Commission.")
print("Target Bonus remains a separate system-wide 0 / 10 setting.")
print("Backup saved at:", backup_dir)
