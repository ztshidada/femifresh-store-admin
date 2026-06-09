const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (server.includes("AFFILIATE_SUBDOMAIN_ROUTING_V1")) {
  console.log("Affiliate subdomain routing already installed.");
  process.exit(0);
}

const subdomainCode = `

// AFFILIATE_SUBDOMAIN_ROUTING_V1
function isAffiliateHostV1(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return host.startsWith("affiliates.femifresh.co.za") || host.startsWith("affiliates.");
}

app.get("/", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "join.html"));
  }
  next();
});

app.get("/login", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "affiliate-login.html"));
  }
  next();
});

app.get("/dashboard", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "affiliate-dashboard.html"));
  }
  next();
});

app.get("/success", (req, res, next) => {
  if (isAffiliateHostV1(req)) {
    return res.sendFile(path.join(__dirname, "public", "join-success.html"));
  }
  next();
});
// END AFFILIATE_SUBDOMAIN_ROUTING_V1
`;

server = server.replace(/app\.listen\(/, subdomainCode + "\napp.listen(");

fs.writeFileSync(serverFile, server);

console.log("Affiliate subdomain routing patch created and applied.");
