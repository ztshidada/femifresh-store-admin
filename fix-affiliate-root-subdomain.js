const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (server.includes("AFFILIATE_SUBDOMAIN_EARLY_ROUTER_V1")) {
  console.log("Affiliate early router already installed.");
  process.exit(0);
}

const earlyRouter = `
// AFFILIATE_SUBDOMAIN_EARLY_ROUTER_V1
function isAffiliateSubdomainEarly(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return host.startsWith("affiliates.");
}

app.use((req, res, next) => {
  if (!isAffiliateSubdomainEarly(req)) return next();

  if (req.path === "/" || req.path === "/join") {
    return res.sendFile(path.join(__dirname, "public", "join.html"));
  }

  if (req.path === "/login" || req.path === "/affiliate-login") {
    return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  }

  if (req.path === "/dashboard" || req.path === "/affiliate-dashboard") {
    return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  }

  if (req.path === "/success" || req.path === "/join-success") {
    return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  }

  return next();
});
// END AFFILIATE_SUBDOMAIN_EARLY_ROUTER_V1

`;

server = server.replace(
  `app.use(express.static(path.join(__dirname, "public")));`,
  earlyRouter + `app.use(express.static(path.join(__dirname, "public")));`
);

fs.writeFileSync(serverFile, server);

console.log("Affiliate root subdomain fixed.");
