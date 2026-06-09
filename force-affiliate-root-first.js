const fs = require("fs");
const path = require("path");

const serverFile = path.join(__dirname, "server.js");
let server = fs.readFileSync(serverFile, "utf8");

if (server.includes("AFFILIATE_FORCE_TOP_ROUTER_V2")) {
  console.log("Affiliate force top router already installed.");
  process.exit(0);
}

const forceRouter = `

// AFFILIATE_FORCE_TOP_ROUTER_V2
app.use((req, res, next) => {
  const host = String(req.get("host") || "").toLowerCase();

  if (!host.startsWith("affiliates.")) {
    return next();
  }

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
// END AFFILIATE_FORCE_TOP_ROUTER_V2

`;

/*
  Put affiliate router immediately after app is created.
  This makes it run before public website routes.
*/
server = server.replace(
  /const app = express\(\);/,
  `const app = express();${forceRouter}`
);

fs.writeFileSync(serverFile, server);

console.log("Affiliate root router forced to the top of server.js.");
