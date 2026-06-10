const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (!server.includes("AFFILIATE_ADMIN_SAFE_MIDDLEWARE_V1")) {
  const middleware = `

// AFFILIATE_ADMIN_SAFE_MIDDLEWARE_V1
function affiliateAdminSafeAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin login required." });
    }

    const users = read("users", []);
    const user = users.find(u => u.token === token || u.adminToken === token);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid admin session." });
    }

    const role = user.role || user.type || user.adminRole || "";

    if (role !== "super_admin" && role !== "superadmin" && role !== "admin") {
      return res.status(403).json({ success: false, message: "Super Admin only." });
    }

    req.adminUser = user;
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
// END AFFILIATE_ADMIN_SAFE_MIDDLEWARE_V1
`;

  server = server.replace(/\/\/ AFFILIATE_ADMIN_API_V1/, middleware + "\n// AFFILIATE_ADMIN_API_V1");
}

server = server.replaceAll(
  'requireAdmin, requireRole(["super_admin"]),',
  'affiliateAdminSafeAuth,'
);

fs.writeFileSync(serverFile, server);

console.log("Fixed affiliate admin middleware.");
