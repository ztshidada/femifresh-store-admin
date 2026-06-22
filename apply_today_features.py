from pathlib import Path
import shutil
import time
import sys

ROOT = Path.cwd()
BACKUP = ROOT / ".femifresh-backups" / f"today-features-{int(time.time())}"
BACKUP.mkdir(parents=True, exist_ok=True)

files = {
    "server": ROOT / "server.js",
    "settings": ROOT / "src/services/settingsService.js",
    "affiliate": ROOT / "src/services/affiliateService.js",
    "order": ROOT / "src/services/orderService.js",
    "admin": ROOT / "public/js/admin-platform.js",
    "affiliate_js": ROOT / "public/js/affiliate-platform.js",
    "join": ROOT / "public/join.html",
    "css": ROOT / "public/css/femifresh-system.css",
}

for name, file in files.items():
    if not file.exists():
        raise SystemExit(f"Missing file: {file}")
    shutil.copy2(file, BACKUP / file.name)

def load(name):
    return files[name].read_text()

def save(name, content):
    files[name].write_text(content)
    print("Updated:", files[name].relative_to(ROOT))

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"\nSTOPPED: Could not find expected code for: {label}\nNothing after this point was changed.")
    return text.replace(old, new, 1)

# ---------------------------------------------------------
# 1. Add editable system-wide commission settings
# ---------------------------------------------------------
settings = load("settings")

if "referralBonusPerActiveDirect" not in settings:
    settings = replace_once(
        settings,
        '''  payment: {
    activeMethod: "manual",
    yocoEnabled: false,
    joiningFeeAmount: 100,
    manualInstructions: "Please make payment and send proof of payment to WhatsApp 0632180372. Use your order number or registered email as reference."
  },
  deliveryZones:''',
        '''  payment: {
    activeMethod: "manual",
    yocoEnabled: false,
    joiningFeeAmount: 100,
    manualInstructions: "Please make payment and send proof of payment to WhatsApp 0632180372. Use your order number or registered email as reference."
  },
  commission: {
    referralBonusPerActiveDirect: 300,
    targetActiveDirects: 10,
    targetBonusAmount: 1000
  },
  deliveryZones:''',
        "commission settings defaults"
    )
    save("settings", settings)
else:
    print("Skipped: Commission settings already exist.")

# ---------------------------------------------------------
# 2. Sponsor code compulsory and target bonus calculated
# ---------------------------------------------------------
affiliate = load("affiliate")

if 'getSettings } = require("./settingsService")' not in affiliate:
    affiliate = replace_once(
        affiliate,
        'const { paymentInstructions } = require("./settingsService");',
        'const { paymentInstructions, getSettings } = require("./settingsService");',
        "affiliate settings import"
    )

if "targetBonusProgress" not in affiliate:
    affiliate = replace_once(
        affiliate,
        '''  const referralBonusCounted = activeDirects.length * 300;
  const targetBonusCounted = activeDirects.length >= 10 ? 1000 : 0;''',
        '''  const commission = getSettings().commission || {};
  const referralBonusPerActiveDirect = Number(commission.referralBonusPerActiveDirect ?? 300);
  const targetActiveDirects = Math.max(1, Number(commission.targetActiveDirects ?? 10));
  const targetBonusAmount = Number(commission.targetBonusAmount ?? 1000);
  const referralBonusCounted = activeDirects.length * referralBonusPerActiveDirect;
  const targetBonusCounted = activeDirects.length >= targetActiveDirects ? targetBonusAmount : 0;''',
        "dynamic referral and target bonus calculation"
    )

    affiliate = replace_once(
        affiliate,
        '''    blockedReason,
    needsForTarget: Math.max(0, 10 - activeDirects.length)
  };''',
        '''    blockedReason,
    referralBonusPerActiveDirect,
    targetActiveDirects,
    targetBonusAmount,
    needsForTarget: Math.max(0, targetActiveDirects - activeDirects.length),
    targetBonusProgress: {
      current: activeDirects.length,
      required: targetActiveDirects,
      remaining: Math.max(0, targetActiveDirects - activeDirects.length),
      amount: targetBonusAmount,
      status: activeDirects.length >= targetActiveDirects ? "qualified" : "pending"
    }
  };''',
        "target bonus dashboard data"
    )

if 'if (!String(sponsorCode || "").trim()) throw new Error("Sponsor code is required.");' not in affiliate:
    affiliate = replace_once(
        affiliate,
        '''  const { firstName, lastName, phone, email, password, sponsorCode = "" } = input || {};
  if (!firstName || !lastName || !phone || !email || !password) throw new Error("Please complete all required fields.");
  const affiliates = read("affiliates", []);''',
        '''  const { firstName, lastName, phone, email, password, sponsorCode = "" } = input || {};
  if (!firstName || !lastName || !phone || !email || !password) throw new Error("Please complete all required fields.");
  if (!String(sponsorCode || "").trim()) throw new Error("Sponsor code is required.");
  const affiliates = read("affiliates", []);''',
        "required sponsor code validation"
    )

    affiliate = replace_once(
        affiliate,
        '''  const sponsor = sponsorCode ? affiliates.find(a => String(a.referralCode || "").toUpperCase() === String(sponsorCode).toUpperCase()) : null;
  const referralCode = makeUniqueCode(firstName, lastName, affiliates);''',
        '''  const sponsor = affiliates.find(a =>
    String(a.referralCode || "").toUpperCase() === String(sponsorCode).trim().toUpperCase()
  );

  if (!sponsor) throw new Error("Please enter a valid sponsor code.");

  const referralCode = makeUniqueCode(firstName, lastName, affiliates);''',
        "valid sponsor code validation"
    )

save("affiliate", affiliate)

# ---------------------------------------------------------
# 3. Add POP channel fields to orders
# ---------------------------------------------------------
order = load("order")

if '"popChannel"' not in order:
    order = replace_once(
        order,
        'const allowed = ["paymentStatus", "orderStatus", "fulfillmentStatus", "trackingNumber", "adminNote", "returnStatus", "refundStatus"];',
        '''const allowed = [
    "paymentStatus",
    "orderStatus",
    "fulfillmentStatus",
    "trackingNumber",
    "adminNote",
    "returnStatus",
    "refundStatus",
    "popChannel",
    "popReceivedAt"
  ];''',
        "POP fields allowed on order"
    )

    order = replace_once(
        order,
        '''    file,
    status: "submitted",''',
        '''    file,
    channel: file ? "website_upload" : "website_reference",
    status: "submitted",''',
        "POP channel record"
    )

    save("order", order)
else:
    print("Skipped: POP fields already exist.")

# ---------------------------------------------------------
# 4. Secure POP file viewing and POP received via WhatsApp
# ---------------------------------------------------------
server = load("server")

if "FEMIFRESH_POP_FILE_VIEW_V1" not in server:
    if 'const fs = require("fs");' not in server:
        server = replace_once(
            server,
            'const path = require("path");',
            'const path = require("path");\nconst fs = require("fs");',
            "fs import"
        )

    server = server.replace(
        'const { read, write } = require("./src/db");',
        'const { read, write, dataDir } = require("./src/db");'
    )

    pop_routes = r'''
// FEMIFRESH_POP_FILE_VIEW_V1
app.get("/api/admin/pop-submissions/:id/file", requireAdmin, requirePermission("pop:review"), (req, res) => {
  const submission = read("popSubmissions", []).find(p => String(p.id) === String(req.params.id));

  if (!submission || !submission.file || !submission.file.storedName) {
    return res.status(404).json({ success: false, message: "Proof file not found." });
  }

  const safeName = path.basename(String(submission.file.storedName));
  const filePath = path.join(dataDir, "private", "pop", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Proof file is unavailable." });
  }

  res.setHeader("Content-Type", submission.file.fileType || "application/octet-stream");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(filePath);
});

app.post("/api/admin/orders/:id/pop-whatsapp", requireAdmin, requirePermission("pop:review"), (req, res) => {
  const orders = read("orders", []);
  const order = orders.find(o =>
    String(o.id) === String(req.params.id) ||
    String(o.orderNumber) === String(req.params.id)
  );

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  const createdAt = new Date().toISOString();
  const submissions = read("popSubmissions", []);

  const submission = {
    id: uuid(),
    kind: "order",
    reference: order.orderNumber,
    contact: order.customer?.email || order.customer?.phone || "",
    note: String(req.body?.note || "Proof of payment received via WhatsApp."),
    file: null,
    channel: "whatsapp",
    status: "submitted",
    createdAt,
    updatedAt: createdAt
  };

  submissions.unshift(submission);
  write("popSubmissions", submissions);

  const updatedOrder = orderService.updateOrder(order.id, {
    paymentStatus: "pop_submitted",
    orderStatus: "pop_submitted",
    popChannel: "whatsapp",
    popReceivedAt: createdAt
  }, req.user);

  ok(res, { submission, order: updatedOrder });
});

'''

    anchor = 'app.get("/api/admin/pop-submissions", requireAdmin, requirePermission("pop:review"),'
    server = replace_once(
        server,
        anchor,
        pop_routes + "\n" + anchor,
        "admin POP routes"
    )
    save("server", server)
else:
    print("Skipped: Secure POP routes already exist.")

# ---------------------------------------------------------
# 5. Make Sponsor Code compulsory in visual signup form
# ---------------------------------------------------------
join = load("join")

join = join.replace(
    '<label class="ff-field">Sponsor code optional<input class="ff-input" name="sponsorCode"></label>',
    '<label class="ff-field">Sponsor Code *<input class="ff-input" name="sponsorCode" required autocomplete="off" placeholder="Enter your sponsor code"></label>'
)
save("join", join)

# ---------------------------------------------------------
# 6. Add target bonus progress card on distributor dashboard
# ---------------------------------------------------------
affiliate_js = load("affiliate_js")

if "Target Bonus Progress" not in affiliate_js:
    old = '''        <section class="ff-card ff-stack">
          <h2>Referral Tools</h2>'''

    new = '''        <section class="ff-card ff-stack">
          <div class="ff-row ff-wrap">
            <div>
              <p class="ff-eyebrow" style="color:#68235f">Target Bonus Progress</p>
              <h2>${esc(String(data.stats.targetBonusProgress?.current ?? 0))} / ${esc(String(data.stats.targetBonusProgress?.required ?? 10))} Active Direct Referrals</h2>
              <p class="ff-muted">${data.stats.targetBonusProgress?.status === "qualified" ? "You have qualified for the target bonus." : "You need " + String(data.stats.targetBonusProgress?.remaining ?? 10) + " more active direct referral(s)."}</p>
            </div>
            <div>
              ${badge(data.stats.targetBonusProgress?.status || "pending")}
              <p><strong>Target Bonus: ${money(data.stats.targetBonusProgress?.amount || 0)}</strong></p>
            </div>
          </div>
        </section>

        <section class="ff-card ff-stack">
          <h2>Referral Tools</h2>'''

    affiliate_js = replace_once(
        affiliate_js,
        old,
        new,
        "target bonus dashboard card"
    )
    save("affiliate_js", affiliate_js)
else:
    print("Skipped: Target bonus card already exists.")

# ---------------------------------------------------------
# 7. POP preview inside exact Admin order detail
# ---------------------------------------------------------
admin = load("admin")

if "renderOrderPops(relatedPops)" not in admin:
    admin = replace_once(
        admin,
        '''    const data = await api("/api/admin/orders");
    const o = data.orders.find(x => String(x.id) === String(id) || String(x.orderNumber) === String(id));''',
        '''    const [data, popData] = await Promise.all([
      api("/api/admin/orders"),
      api("/api/admin/pop-submissions")
    ]);
    const o = data.orders.find(x => String(x.id) === String(id) || String(x.orderNumber) === String(id));
    const relatedPops = (popData.submissions || []).filter(p =>
      String(p.kind || "") === "order" &&
      (
        String(p.reference || "") === String(o?.orderNumber || "") ||
        String(p.reference || "") === String(o?.id || "")
      )
    );''',
        "load POPs for order detail"
    )

    admin = replace_once(
        admin,
        '''           <hr><div class="ff-row"><span>Total</span><strong>${money(o.total)}</strong></div>
         </div>''',
        '''           <hr><div class="ff-row"><span>Total</span><strong>${money(o.total)}</strong></div>
           <div id="orderPopPanel"></div>
         </div>''',
        "POP panel placement"
    )

    admin = replace_once(
        admin,
        '''           <button class="ff-btn" onclick="saveOrder('${esc(o.id)}')">Save Order</button>
           <button class="ff-btn secondary" onclick="printSlip()">Print Packing Slip</button>''',
        '''           <button class="ff-btn" onclick="saveOrder('${esc(o.id)}')">Save Order</button>
           <button class="ff-btn secondary" onclick="markWhatsappPop('${esc(o.id)}')">Mark POP via WhatsApp</button>
           <button class="ff-btn secondary" onclick="printSlip()">Print Packing Slip</button>''',
        "WhatsApp POP button"
    )

    admin = replace_once(
        admin,
        '''       </section>`;
  }
  function select(name, values, current){''',
        '''       </section>`;
    renderOrderPops(relatedPops);
  }

  function renderOrderPops(pops){
    const target = qs("#orderPopPanel");
    if (!target) return;

    if (!pops.length) {
      target.innerHTML = '<section class="ff-card ff-stack"><h3>Proof of Payment</h3><div class="ff-empty">No proof of payment has been submitted yet.</div></section>';
      return;
    }

    target.innerHTML = '<section class="ff-card ff-stack"><h3>Proof of Payment</h3>' + pops.map(p => {
      const source = p.channel === "whatsapp" ? "Received via WhatsApp" : "Uploaded through website";
      const details = p.file
        ? (String(p.file.fileType || "").startsWith("image/")
          ? '<a href="/api/admin/pop-submissions/' + encodeURIComponent(p.id) + '/file" target="_blank" rel="noopener"><img class="ff-pop-preview" src="/api/admin/pop-submissions/' + encodeURIComponent(p.id) + '/file" alt="Proof of payment"></a>'
          : '<a class="ff-btn secondary" href="/api/admin/pop-submissions/' + encodeURIComponent(p.id) + '/file" target="_blank" rel="noopener">Open Uploaded POP</a>')
        : '<p class="ff-muted">No file was uploaded. POP was received via WhatsApp.</p>';

      const approve = p.status !== "approved"
        ? '<button class="ff-btn" onclick="approveOrderPop(\\'' + esc(p.id) + '\\')">Approve POP & Mark Paid</button>'
        : '';

      return '<div class="ff-card ff-stack" style="padding:16px"><div class="ff-row ff-wrap"><div><strong>' + esc(source) + '</strong><p class="ff-muted">' + esc(p.createdAt || "") + '</p></div><div>' + badge(p.status || "submitted") + '</div></div><p><strong>Customer note:</strong> ' + esc(p.note || "No note added.") + '</p>' + details + approve + '</div>';
    }).join("") + '</section>';
  }

  function select(name, values, current){''',
        "POP panel renderer"
    )

    admin = replace_once(
        admin,
        '''  window.printSlip = () => window.print();''',
        '''  window.approveOrderPop = async function(id){
    try {
      await api("/api/admin/pop-submissions/" + encodeURIComponent(id) + "/review", {
        method:"POST",
        body: JSON.stringify({ status:"approved" })
      });
      toast("POP approved and order marked paid.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.markWhatsappPop = async function(orderId){
    try {
      await api("/api/admin/orders/" + encodeURIComponent(orderId) + "/pop-whatsapp", {
        method:"POST",
        body: JSON.stringify({ note:"Proof of payment received via WhatsApp." })
      });
      toast("WhatsApp POP recorded.");
      location.reload();
    } catch(err) {
      toast(err.message, "error");
    }
  };

  window.printSlip = () => window.print();''',
        "admin POP action functions"
    )

    save("admin", admin)
else:
    print("Skipped: Admin POP detail panel already exists.")

# ---------------------------------------------------------
# 8. Add editable commission settings section to Admin Settings
# ---------------------------------------------------------
admin = load("admin")

if 'id="commissionSettingsForm"' not in admin:
    anchor = '''      catch(err){ toast(err.message, "error"); }
    };
  }
  async function logs(){'''

    replacement = '''      catch(err){ toast(err.message, "error"); }
    };

    root.insertAdjacentHTML("beforeend", `
      <section class="ff-card">
        <h2>Commission & Target Bonus Settings</h2>
        <form class="ff-form" id="commissionSettingsForm">
          <label class="ff-field">Referral Bonus Per Active Direct (R)
            <input class="ff-input" name="referralBonusPerActiveDirect" type="number" min="0" value="${esc(s.commission?.referralBonusPerActiveDirect ?? 300)}">
          </label>
          <label class="ff-field">Target Active Direct Referrals
            <input class="ff-input" name="targetActiveDirects" type="number" min="1" value="${esc(s.commission?.targetActiveDirects ?? 10)}">
          </label>
          <label class="ff-field">Target Bonus Amount (R)
            <input class="ff-input" name="targetBonusAmount" type="number" min="0" value="${esc(s.commission?.targetBonusAmount ?? 1000)}">
          </label>
          <button class="ff-btn">Save Commission Settings</button>
        </form>
      </section>
    `);

    qs("#commissionSettingsForm").onsubmit = async e => {
      e.preventDefault();
      const form = new FormData(e.target);
      const commission = {
        referralBonusPerActiveDirect: Number(form.get("referralBonusPerActiveDirect") || 0),
        targetActiveDirects: Number(form.get("targetActiveDirects") || 10),
        targetBonusAmount: Number(form.get("targetBonusAmount") || 0)
      };
      try {
        await api("/api/admin/settings", {
          method:"POST",
          body: JSON.stringify({ commission })
        });
        toast("Commission settings saved.");
      } catch(err) {
        toast(err.message, "error");
      }
    };
  }
  async function logs(){'''

    admin = replace_once(
        admin,
        anchor,
        replacement,
        "commission settings form"
    )
    save("admin", admin)
else:
    print("Skipped: Commission settings form already exists.")

# ---------------------------------------------------------
# 9. POP image preview styling
# ---------------------------------------------------------
css = load("css")

if ".ff-pop-preview" not in css:
    css += '''

/* POP preview inside Admin Order Detail */
.ff-pop-preview {
  display: block;
  width: min(100%, 360px);
  max-height: 420px;
  object-fit: contain;
  border: 1px solid rgba(104,35,95,.16);
  border-radius: 16px;
  background: #fff;
  padding: 8px;
  margin: 10px 0;
}
'''
    save("css", css)
else:
    print("Skipped: POP preview CSS already exists.")

print("\nDONE. Today's additions were applied.")
print("Backup folder:", BACKUP)
