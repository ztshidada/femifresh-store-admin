const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
const profileFile = path.join(__dirname, "public", "admin", "affiliate-profile.html");

let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("SUPER_ADMIN_DELETE_AFFILIATE_V1")) {
  const endpoint = `

// SUPER_ADMIN_DELETE_AFFILIATE_V1
function isFemiSuperAdminForDelete(req) {
  const u = req.adminUser || req.user || req.admin || {};
  const role = String(u.role || u.adminRole || u.type || "").toLowerCase();
  const email = String(u.email || "").toLowerCase();

  return (
    role === "super_admin" ||
    role === "superadmin" ||
    role === "super admin" ||
    role === "owner" ||
    email === "admin@femifresh.local" ||
    email === "ztshidada@gmail.com"
  );
}

function deleteAffiliateAccountHandler(req, res) {
  try {
    if (!isFemiSuperAdminForDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can delete affiliate accounts."
      });
    }

    const affiliateId = req.params.id;
    const confirm = String(req.body.confirm || "").trim();

    if (confirm !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Type DELETE to confirm account deletion."
      });
    }

    const affiliates = read("affiliates", []);
    const index = affiliates.findIndex(a => String(a.id) === String(affiliateId));

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Affiliate account not found."
      });
    }

    const deleted = affiliates[index];

    const deletedLogs = read("deletedAffiliates", []);
    deletedLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      deletedAt: new Date().toISOString(),
      deletedBy: req.adminUser || null,
      affiliate: deleted
    });

    affiliates.splice(index, 1);

    // Remove this deleted affiliate as sponsor/upline from direct recruits
    for (const a of affiliates) {
      if (String(a.sponsorId || "") === String(deleted.id)) {
        a.sponsorId = "";
      }

      if (String(a.sponsorCode || "") === String(deleted.referralCode || "")) {
        a.sponsorCode = "";
      }

      if (String(a.referredByCode || "") === String(deleted.referralCode || "")) {
        a.referredByCode = "";
      }

      if (Array.isArray(a.uplineChain)) {
        a.uplineChain = a.uplineChain.filter(x =>
          String(x.id || x.affiliateId || x) !== String(deleted.id) &&
          String(x.referralCode || x.code || x) !== String(deleted.referralCode || "")
        );
      }
    }

    write("affiliates", affiliates);
    write("deletedAffiliates", deletedLogs.slice(0, 500));

    return res.json({
      success: true,
      message: "Affiliate account deleted.",
      deletedAffiliate: {
        id: deleted.id,
        email: deleted.email,
        referralCode: deleted.referralCode,
        fullName: deleted.fullName
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
}

app.post("/api/aff-admin/affiliates/:id/delete", affiliateSystemAdminAuth, deleteAffiliateAccountHandler);
app.delete("/api/aff-admin/affiliates/:id", affiliateSystemAdminAuth, deleteAffiliateAccountHandler);
// END SUPER_ADMIN_DELETE_AFFILIATE_V1
`;

  server = server.replace(/app\.listen\(/, endpoint + "\napp.listen(");
  fs.writeFileSync(serverFile, server);
  console.log("Delete affiliate endpoint added.");
} else {
  console.log("Delete affiliate endpoint already exists.");
}

if (fs.existsSync(profileFile)) {
  let html = fs.readFileSync(profileFile, "utf8");

  if (!html.includes("deleteAffiliateAccount()")) {
    html = html.replace(
      `<button onclick="unblockPayout()">Unblock Payout</button>`,
      `<button onclick="unblockPayout()">Unblock Payout</button>
          <button style="background:#b00020;color:white;" onclick="deleteAffiliateAccount()">Delete Account</button>`
    );

    const fn = `
function deleteAffiliateAccount() {
  const confirmText = prompt("This will permanently delete this affiliate account. Type DELETE to confirm.");

  if (confirmText !== "DELETE") {
    showError("Delete cancelled. You must type DELETE exactly.");
    return;
  }

  postAction("/api/aff-admin/affiliates/" + id + "/delete", {
    confirm: "DELETE"
  }).then(() => {
    alert("Affiliate account deleted.");
    location.href = "/admin/affiliates.html";
  });
}
`;

    html = html.replace(`function logoutAdmin() {`, fn + "\nfunction logoutAdmin() {");

    fs.writeFileSync(profileFile, html);
    console.log("Delete button added to affiliate profile.");
  } else {
    console.log("Delete button already exists.");
  }
}
