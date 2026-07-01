from pathlib import Path
import re
import shutil
import time

root = Path.cwd()
backup = root / ".femifresh-backups" / f"payfast-policies-{int(time.time())}"
backup.mkdir(parents=True, exist_ok=True)

server_file = root / "server.js"
ui_file = root / "public/js/femifresh-ui.js"
css_file = root / "public/css/femifresh-system.css"

for f in [server_file, ui_file, css_file]:
    if not f.exists():
        raise SystemExit(f"Missing required file: {f}")
    shutil.copy2(f, backup / f.name)

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("Updated:", path.relative_to(root))

header = '''
<header class="ff-header">
  <nav class="ff-container ff-nav">
    <a class="ff-brand" href="/"><img src="/images/femifresh-logo.jpg" alt="FemiFresh logo">FemiFresh</a>
    <button class="ff-menu" data-menu>Menu</button>
    <div class="ff-links" data-links>
      <a href="/products">Products</a>
      <a href="/track-order">Track Order</a>
      <a href="/contact">Contact</a>
    </div>
  </nav>
</header>
'''

def page(title, intro, body):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title} | FemiFresh</title>
  <meta name="description" content="{title} for FemiFresh">
  <link rel="icon" href="/images/femifresh-logo.jpg">
  <link rel="stylesheet" href="/css/femifresh-system.css">
</head>
<body>
{header}
<main class="ff-container ff-section ff-stack" style="max-width:920px">
  <div>
    <p class="ff-eyebrow" style="color:var(--ff-purple)">FemiFresh Policies</p>
    <h1 class="ff-page-title" style="font-size:48px">{title}</h1>
    <p class="ff-lead">{intro}</p>
    <p class="ff-muted">Last updated: 1 July 2026</p>
  </div>

  <article class="ff-card ff-stack">
    {body}
  </article>
</main>
<script src="/js/femifresh-ui.js"></script>
</body>
</html>
'''

terms = page(
    "Terms and Conditions",
    "Please read these terms before placing an order or registering as a FemiFresh distributor.",
    '''
<section>
  <h2>1. About FemiFresh</h2>
  <p>FemiFresh supplies wellness and personal-care products in South Africa. By using this website, placing an order, or registering as a distributor, you agree to these Terms and Conditions.</p>
</section>

<section>
  <h2>2. Product information</h2>
  <p>Product information is provided for general information only and is not medical advice. Please read product labels carefully. If you are pregnant, breastfeeding, have a medical condition, take medication, or have concerns about ingredients, consult a qualified healthcare professional before use.</p>
</section>

<section>
  <h2>3. Orders and payment</h2>
  <p>All orders are subject to product availability and acceptance. Prices are displayed in South African Rand and may change without notice. Where manual payment is selected, an order is confirmed only after payment has been verified by FemiFresh. Customers must use the order reference supplied at checkout when making payment.</p>
</section>

<section>
  <h2>4. Delivery</h2>
  <p>Delivery begins after payment is verified and the order is ready for dispatch. Delivery estimates are not guarantees and may be affected by courier operations, location, public holidays, weather, or other circumstances outside our reasonable control.</p>
</section>

<section>
  <h2>5. Returns and refunds</h2>
  <p>Returns and refunds are handled under our <a href="/refund-policy" style="color:var(--ff-purple);font-weight:800">Refund and Returns Policy</a>. Please contact FemiFresh before returning any item.</p>
</section>

<section>
  <h2>6. Distributor accounts</h2>
  <p>Distributor registration is subject to approval and the applicable FemiFresh distributor rules. Distributors are responsible for keeping their account, bank, referral, and contact information accurate. FemiFresh may review, suspend, or close an account where there is suspected fraud, misuse, misleading claims, or a breach of these terms.</p>
</section>

<section>
  <h2>7. Privacy</h2>
  <p>FemiFresh uses personal information to process orders, maintain customer and distributor accounts, provide support, and meet operational requirements. We take reasonable steps to protect personal information.</p>
</section>

<section>
  <h2>8. Contact</h2>
  <p>For questions about these terms, orders, or policies, contact us through the <a href="/contact" style="color:var(--ff-purple);font-weight:800">Contact page</a> or WhatsApp 0632180372.</p>
</section>
'''
)

delivery = page(
    "Delivery Policy",
    "How FemiFresh prepares, dispatches, and delivers customer orders.",
    '''
<section>
  <h2>1. Order processing</h2>
  <p>Orders are processed after payment has been verified. Manual-payment orders may require proof of payment and a successful payment verification before they are prepared for dispatch.</p>
</section>

<section>
  <h2>2. Dispatch and delivery timeframes</h2>
  <p>FemiFresh aims to dispatch confirmed orders as soon as possible after payment verification and stock confirmation. Delivery timeframes depend on the courier, delivery destination, public holidays, and operational conditions.</p>
</section>

<section>
  <h2>3. Delivery address</h2>
  <p>You are responsible for providing a correct and complete delivery address, contact number, and email address. FemiFresh cannot accept responsibility for delays or failed delivery caused by incorrect or incomplete customer details.</p>
</section>

<section>
  <h2>4. Tracking</h2>
  <p>Where a tracking number is available, it will be added to your order. Customers can check progress through the <a href="/track-order" style="color:var(--ff-purple);font-weight:800">Track Order</a> page.</p>
</section>

<section>
  <h2>5. Delivery delays</h2>
  <p>Although we work to meet estimated delivery timeframes, courier delays can occur. We will assist with reasonable order-tracking enquiries, but delivery dates cannot always be guaranteed.</p>
</section>

<section>
  <h2>6. Missing or damaged parcels</h2>
  <p>Please inspect your parcel when it arrives. Report a missing, incorrect, or visibly damaged parcel to FemiFresh as soon as possible, with your order number and supporting photos where applicable.</p>
</section>

<section>
  <h2>7. Contact</h2>
  <p>For delivery support, use our <a href="/contact" style="color:var(--ff-purple);font-weight:800">Contact page</a> or WhatsApp 0632180372.</p>
</section>
'''
)

refund = page(
    "Refund and Returns Policy",
    "How to request help for an incorrect, damaged, or unsuitable FemiFresh order.",
    '''
<section>
  <h2>1. Contact us first</h2>
  <p>Please contact FemiFresh before sending any product back. Include your order number, contact details, reason for the request, and photos where the product or parcel is damaged, incorrect, or defective.</p>
</section>

<section>
  <h2>2. Eligible return requests</h2>
  <p>We review requests involving products that arrived damaged, defective, incorrect, or incomplete. We may ask for photos, proof of purchase, and other reasonable details so that we can investigate the issue.</p>
</section>

<section>
  <h2>3. Hygiene and safety products</h2>
  <p>For health, safety, and hygiene reasons, opened, used, tampered-with, or unsealed personal-care and wellness products may not be eligible for return unless the item is defective or was supplied incorrectly.</p>
</section>

<section>
  <h2>4. Refunds and replacements</h2>
  <p>Where a request is approved, FemiFresh may offer a replacement, store credit, or refund, depending on the issue and stock availability. Approved refunds are returned using a reasonable method agreed with the customer.</p>
</section>

<section>
  <h2>5. Return shipping</h2>
  <p>Where FemiFresh confirms that an item was supplied incorrectly, damaged, or defective, return arrangements will be communicated to you. Please do not send products back without instructions from FemiFresh.</p>
</section>

<section>
  <h2>6. How to submit a request</h2>
  <p>You may submit a request through the <a href="/returns" style="color:var(--ff-purple);font-weight:800">Return / Refund Request form</a> or contact us through the <a href="/contact" style="color:var(--ff-purple);font-weight:800">Contact page</a>.</p>
</section>
'''
)

write(root / "public/terms.html", terms)
write(root / "public/delivery-policy.html", delivery)
write(root / "public/refund-policy.html", refund)

# Update server clean routes.
server = server_file.read_text(encoding="utf-8")

old_routes = '''app.get("/returns", sendCleanRoute("returns.html"));
app.get("/contact", sendCleanRoute("contact.html"));
app.get("/policies", sendCleanRoute("policies.html"));'''

new_routes = '''app.get("/returns", sendCleanRoute("returns.html"));
app.get("/terms", sendCleanRoute("terms.html"));
app.get("/delivery-policy", sendCleanRoute("delivery-policy.html"));
app.get("/refund-policy", sendCleanRoute("refund-policy.html"));
app.get("/contact", sendCleanRoute("contact.html"));
app.get("/policies", sendCleanRoute("policies.html"));'''

if old_routes not in server:
    raise SystemExit("STOPPED: Could not find clean route section in server.js.")

server = server.replace(old_routes, new_routes, 1)
write(server_file, server)

# Replace global customer footer.
ui = ui_file.read_text(encoding="utf-8")

pattern = r'''  function footer\(\)\{.*?\n  \}\n\n  window\.Femi'''

replacement = '''  function footer(){
    if (document.body.dataset.adminPage || qs(".ff-footer")) return;

    const el = document.createElement("footer");
    el.className = "ff-footer";
    el.innerHTML = `
      <div class="ff-container ff-footer-inner">
        <div class="ff-footer-brand">
          <a class="ff-brand" href="/"><img src="/images/femifresh-logo.jpg" alt="FemiFresh logo">FemiFresh</a>
          <p class="ff-muted">Fresh care, clear orders, stronger distributors.</p>
          <p class="ff-muted">Support via WhatsApp: <a href="https://wa.me/27632180372" target="_blank" rel="noopener">063 218 0372</a></p>
        </div>

        <div>
          <strong>Shop & Support</strong>
          <p><a href="/products">Shop Products</a></p>
          <p><a href="/track-order">Track Order</a></p>
          <p><a href="/contact">Contact Us</a></p>
          <p><a href="/returns">Return Request</a></p>
        </div>

        <div>
          <strong>Policies</strong>
          <p><a href="/terms">Terms & Conditions</a></p>
          <p><a href="/delivery-policy">Delivery Policy</a></p>
          <p><a href="/refund-policy">Refund & Returns Policy</a></p>
        </div>

        <div>
          <strong>Distributors</strong>
          <p><a href="/join">Become a Distributor</a></p>
          <p><a href="/affiliate-login">Distributor Login</a></p>
        </div>
      </div>

      <div class="ff-container ff-footer-bottom">
        <span>© ${new Date().getFullYear()} FemiFresh. All rights reserved.</span>
        <span>Secure manual payment verification and order tracking.</span>
      </div>`;
    document.body.appendChild(el);
  }

  window.Femi'''

ui, count = re.subn(pattern, replacement, ui, flags=re.S)
if count != 1:
    raise SystemExit(f"STOPPED: Could not safely update global footer. Found {count} matches.")

write(ui_file, ui)

# Add footer layout styling.
css = css_file.read_text(encoding="utf-8")
if ".ff-footer-bottom" not in css:
    css += '''

/* Public website footer */
.ff-footer {
  margin-top: 56px;
  padding: 40px 0 18px;
  border-top: 1px solid var(--ff-line);
  background: rgba(255,255,255,.82);
}
.ff-footer-inner {
  display: grid;
  grid-template-columns: 1.45fr 1fr 1fr 1fr;
  gap: 28px;
  align-items: start;
}
.ff-footer p { margin: 9px 0 0; }
.ff-footer strong { color: var(--ff-purple-900); }
.ff-footer a:hover { color: var(--ff-purple); text-decoration: underline; }
.ff-footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid var(--ff-line);
  color: var(--ff-muted);
  font-size: 13px;
}
@media (max-width: 760px) {
  .ff-footer-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 500px) {
  .ff-footer-inner { grid-template-columns: 1fr; }
}
'''
    write(css_file, css)
else:
    print("Footer CSS already exists, skipped.")

print("")
print("DONE: Payfast policy pages and footer were added.")
print("Backup:", backup)
